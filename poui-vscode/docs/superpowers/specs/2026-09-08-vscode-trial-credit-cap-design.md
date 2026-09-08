# Trial por dias + créditos ponderados (poui-vscode)

Status: aprovado para virar plano de implementação
Data: 2026-09-08

## Contexto e motivação

Este documento estende o licenciamento já desenhado em
[2026-09-06-vscode-license-gating-design.md](2026-09-06-vscode-license-gating-design.md)
(trial de 14 dias por instalação, backend no Cloudflare Worker, resistente
a reset de storage local).

O usuário identificou uma brecha real: 14 dias corridos são tempo
suficiente pra um dev competente (ajudado pela própria ferramenta)
construir um projeto Protheus inteiro, empacotar (`poui.package`) e
entregar ao cliente **sem nunca pagar** — o `.app` gerado roda dentro do
Protheus, sem nenhuma dependência de rede com a extensão ou o Worker de
licença, então não existe jeito de "desligar" um pacote já entregue depois
que o trial acaba (analisado e descartado nesta sessão: injetar um
kill-switch no código gerado é tecnicamente frágil — visível e removível
pelo próprio dev antes de compilar —, quebra clientes pagantes em redes
Protheus sem saída internet, e contradiz a cláusula do próprio `LICENSE`
que já permite usar/adaptar o código gerado).

A mitigação decidida não tenta prender o artefato gerado — reduz a janela
de abuso limitando **quanto** dá pra gerar durante o trial, não só por
quanto tempo. Um limite por volume (número de gerações) foi refinado, a
pedido do usuário, pra um limite por **crédito ponderado pelo esforço**
(`poui.effort`) — mais justo entre uma tela grande e um comando pequeno —
e por fim pra rodar **junto** com os 14 dias (o que vier primeiro encerra
o trial), com o relógio de dias só começando no primeiro uso pago real,
não na instalação.

## Objetivo

1. Trial expira no que vier primeiro: **14 dias corridos desde o primeiro
   comando pago** OU **40 créditos consumidos** (peso por `poui.effort`:
   `low`/`medium` = 1, `high` = 2, `xhigh`/`max` = 3).
2. O relógio de 14 dias só começa a contar quando qualquer um dos 8
   comandos pagos roda pela primeira vez — instalar e não usar não gasta
   trial. Os 6 comandos grátis (`configureEngine`, `docs`, `lint`,
   `quality`, `preview`, `undo`) nunca disparam o início do trial nem
   consomem crédito.
3. Créditos só existem pra `tier: 'trial'` — licença paga (`tier: 'paid'`)
   nunca consome nem reporta nada, acesso continua ilimitado como hoje.
4. Interface mostra uma **porcentagem única** de trial usado (o maior
   entre "% dos 14 dias" e "% dos 40 créditos"), não dias/créditos crus —
   mais fácil de entender de relance e evita a pergunta "por que essa ação
   gastou mais crédito que aquela".

## Não-objetivos

- Não resolve o risco original por completo — reduz a janela de abuso,
  não elimina (um dev ainda pode gerar bastante coisa dentro de 40
  créditos). Aceito: o objetivo é elevar o custo do abuso, não bani-lo.
- Sem mudança no mecanismo de licença paga / vínculo por dispositivo (ver
  spec anterior) — só afeta o cálculo de status durante `tier: 'trial'`.
- Sem orçamento de crédito diferente por comando (ex: `review` custar
  menos que `generate.component`) — todos os 8 comandos pagos compartilham
  o mesmo saldo, só o peso do `poui.effort` diferencia.
- Sem migração retroativa cuidadosa pra quem já testou o trial antigo
  (registros de `machine:*` já existentes no KV, criados nesta mesma
  sessão de testes) — ver "Riscos conhecidos" abaixo.
- Sem mudar `/license/activate` nem o modelo de 1-dispositivo-por-chave.

## Arquitetura

```
poui-vscode (extensão)              Cloudflare Worker              KV
┌──────────────────────┐   HTTPS    ┌──────────────────┐         ┌────────────┐
│ licenseCheck.ts       │───────────▶│ /trial/start      │────────▶│ machine:*  │
│ requireLicense.ts     │◀───────────│ /trial/consume    │◀────────│ license:*  │
│ licenseStatusBar.ts   │            │ /license/status   │         └────────────┘
│ activateLicense.ts    │            │ /license/activate │
└──────────────────────┘            └──────────────────┘
```

Única mudança estrutural: um endpoint novo (`/trial/consume`) e dois
campos novos no registro de máquina. Nada muda no fluxo de licença paga.

## Componentes

### Backend — `license-worker/src/licenseLogic.ts` (lógica pura, já testada)

`MachineRecord` ganha dois campos:

```typescript
export interface MachineRecord {
  firstSeen: string;
  lastSeen: string;
  licenseKey: string | null;
  firstUsedAt: string | null;  // NOVO — quando o 1º comando pago rodou; null = trial ainda não começou
  creditsUsed: number;         // NOVO — soma dos créditos gastos, 0 até o 1º uso pago
}

export const TRIAL_CREDIT_BUDGET = 40; // mesmo padrão de TRIAL_DAYS
```

Novas funções puras:

```typescript
// % dos 14 dias decorridos desde firstUsedAt (0 se firstUsedAt é null — trial não começou).
// Inteiro arredondado (Math.round) — nunca expor decimal na UI.
export function computeDaysUsedPct(firstUsedAt: string | null, nowIso: string, trialDays = TRIAL_DAYS): number

// % dos créditos consumidos, também inteiro arredondado. Clampado em [0, 100]
// nos dois casos — mesmo se creditsUsed ultrapassar o budget momentaneamente
// (ex: última execução que estourou o limite), a UI nunca mostra > 100%.
export function computeCreditsUsedPct(creditsUsed: number, budget = TRIAL_CREDIT_BUDGET): number

// peso do poui.effort em créditos — usado tanto no Worker (defesa em profundidade,
// não confia só no valor que o cliente manda) quanto espelhado no cliente
export function effortToCredits(effort: string): number
```

`resolveStatus` passa a considerar os dois eixos: se `firstUsedAt` é
`null`, trial não começou (`daysUsedPct = 0`, `creditsUsedPct` reflete
`creditsUsed` mesmo assim — não deveria acontecer na prática já que
créditos só são reportados depois que `firstUsedAt` é setado, mas a
função fica correta de qualquer forma). `tier` vira `'expired'` quando
`daysUsedPct >= 100` **ou** `creditsUsedPct >= 100`, o que vier primeiro.
`StatusResult` ganha `usedPct` (o maior dos dois, já calculado no
servidor — única fonte de verdade, cliente só exibe) e mantém `daysLeft`
por compatibilidade/depuração.

### Backend — `license-worker/src/worker.ts`

**`POST /trial/consume`** (novo) — body `{ machineHash, credits }`.
- Resolve o registro de máquina + licença como os outros endpoints já
  fazem. Se `resolveStatus(...).tier === 'paid'`: **no-op**, devolve o
  status pago normal, não grava nada (confirma a decisão: paga nunca
  consome).
- Senão: se `machine.firstUsedAt` é `null`, seta pra `nowIso` (dispara o
  relógio dos 14 dias agora). Soma `credits` em `machine.creditsUsed`.
  Persiste, recalcula `resolveStatus` com os valores atualizados, devolve.
- `credits` recebido do cliente é **clampeado** no servidor pro maior peso
  válido (3) antes de somar — o cliente já manda o valor certo via
  `effortToCredits`, mas o servidor não confia cegamente nele (evita que
  alguém chame o endpoint direto com `credits: -1000` pra zerar o
  consumo).

`/trial/start` e `/license/status` continuam como estão, só passam a
propagar os campos novos (`firstUsedAt: null`, `creditsUsed: 0`) ao criar
um registro de máquina novo, e a usar o `resolveStatus` atualizado.

### Extensão — `src/licenseCheck.ts` (puro, já existe)

- `LicenseStatus` ganha `usedPct?: number`.
- Nova função pura `effortToCredits(effort: string): number` — mesmo
  mapeamento do Worker (`low`/`medium` → 1, `high` → 2, `xhigh`/`max` → 3,
  qualquer outro valor → 1 como fallback seguro).
- Nova `fetchConsumeCredits(baseUrl, machineHash, credits, fetchFn): Promise<LicenseStatus>`
  — mesmo padrão de `fetchTrialStart`/`fetchLicenseStatus` (POST, `fetchFn`
  injetável pra teste).
- `formatStatusBarItem` e `formatPaidBadge` trocam `daysLeft` por
  `usedPct` no texto: `` `$(clock) PO-UI: trial ${usedPct}% usado` `` /
  `` `🔒 trial — ${usedPct}% usado` ``. Continuam escondidos por completo
  pra `tier: 'paid'`.
- `shouldShowExpiryWarning` troca o limiar de `daysLeft <= 3` pra
  `usedPct >= 80` (aproximadamente equivalente — 11/14 dias ≈ 78,6%).

### Extensão — `src/requireLicense.ts` (vscode-aware, já existe)

Dentro do ramo que já libera o comando (`isAccessAllowed(sessionStatus)`),
se `sessionStatus?.tier === 'trial'`: lê `poui.effort` da configuração,
converte com `effortToCredits`, dispara (fire-and-forget, não bloqueia a
liberação do comando) `fetchConsumeCredits(...)` e atualiza o cache com o
`LicenseStatus` retornado — mesmo padrão de "não bloquear a UI por uma
chamada de rede" já usado pro resto do arquivo. Se `tier === 'paid'`, essa
chamada nem acontece.

Se a chamada falhar (rede indisponível): mesmo comportamento de hoje —
cache local + janela de graça de 3 dias seguem valendo, o comando atual
**não** é bloqueado retroativamente por causa de uma falha nessa chamada
(o crédito daquela execução específica pode não ser contabilizado no
servidor dessa vez — ver "Riscos conhecidos").

## Fluxo de dados

1. **Ativação da extensão**: igual a hoje — `initializeLicenseStatus`
   roda `/trial/start` (1ª vez) ou `/license/status`. `firstUsedAt` segue
   `null`, nenhum crédito consumido, `usedPct = 0`.
2. **1º comando pago liberado**: `requireLicense` libera com base no
   status em cache (`trial`, `usedPct` baixo o suficiente), e dispara
   `/trial/consume` em paralelo. No servidor, esse é o momento que
   `firstUsedAt` é setado — só agora os 14 dias começam a contar de
   verdade.
3. **Comandos seguintes**: cada um dispara `/trial/consume` de novo,
   somando ao `creditsUsed` já existente.
4. **Trial acaba** (dias OU créditos): próxima chamada de `requireLicense`
   já reflete `tier: 'expired'` a partir do cache atualizado pela última
   resposta do servidor — mesmo fluxo de bloqueio + botões "Ativar
   Licença"/"Comprar Licença" já implementado.
5. **Licença paga a qualquer momento**: `/trial/consume` vira no-op a
   partir da ativação, `usedPct` deixa de ser calculado (status bar some).

## Tratamento de erro

Reaproveita integralmente o tratamento já existente (janela de graça de 3
dias, cache em `globalState`, nunca confundir indisponibilidade com
expiração real) — ver spec anterior. A única adição: uma falha específica
na chamada de `/trial/consume` (diferente de `/license/status`) não deve
nunca bloquear o comando que acabou de ser liberado — na pior das
hipóteses, aquela execução específica não é contabilizada no servidor
dessa vez (undercount a favor do usuário, não a favor de quem quer
abusar — ver riscos).

## Testes

- **`licenseLogic.ts`** (Worker): `computeDaysUsedPct`,
  `computeCreditsUsedPct`, `effortToCredits` e o `resolveStatus`
  atualizado — casos: trial não iniciado (`firstUsedAt: null`) sempre
  `usedPct = 0` mesmo com créditos > 0; expira por dias com créditos
  baixos; expira por créditos com dias baixos; paga nunca calcula
  `usedPct`; clamp do peso de crédito recebido do cliente.
- **`licenseCheck.ts`** (extensão): `effortToCredits` (mesmos casos do
  Worker, os dois precisam concordar), `fetchConsumeCredits` com `fetchFn`
  fake, `formatStatusBarItem`/`formatPaidBadge` mostrando porcentagem em
  vez de dias, novo limiar de `shouldShowExpiryWarning`.
- **Worker HTTP**: `/trial/consume` testado localmente via `wrangler dev`
  + `curl` antes do deploy (mesmo nível dos outros 3 endpoints hoje — sem
  suíte automatizada pesada pro roteamento HTTP em si).
- **Integração** (`extension.test.ts`): sem mudança — comandos continuam
  registrados igual, o comportamento de crédito não é observável por esse
  nível de teste (é uma chamada de rede fire-and-forget).
- **Validação manual** (mesma Task 9 pendente da spec anterior, agora
  cobrindo também): rodar um comando pago repetidas vezes até estourar 40
  créditos e confirmar bloqueio antes dos 14 dias; confirmar que licença
  paga nunca soma nada em `creditsUsed`.

## Riscos conhecidos, aceitos por enquanto

- **Migração dos registros de teste já existentes**: as máquinas já
  registradas no KV durante os testes desta sessão (`machine:*` sem
  `firstUsedAt`/`creditsUsed`) ganham, na prática, um trial novo completo
  na próxima chamada (campos ausentes tratados como `null`/`0`) — sem
  problema no estágio atual (sem clientes pagantes reais ainda), mas seria
  um problema se acontecesse depois de já ter usuários pagando por um
  trial "justo".
- **Bloquear seletivamente `/trial/consume`**: alguém sofisticado o
  suficiente pra deixar `/license/status` funcionar mas bloquear só
  `/trial/consume` (ex: via firewall/proxy) evitaria que qualquer crédito
  fosse contabilizado, ficando só com o limite de 14 dias. Ataque
  desproporcional ao valor em risco no estágio atual do produto — mesmo
  patamar de risco já aceito pra janela de graça offline de 3 dias na
  spec anterior.
- **Peso do crédito só considera `poui.effort`, não a complexidade real**
  — uma tela `page-list` simples em `high` custa o mesmo que uma
  `stacked-browse` complexa em `high`. Proxy imperfeito, mas
  suficientemente melhor que "1 execução = 1 crédito sempre" sem precisar
  medir uso de token de verdade (decisão explícita desta sessão: token
  real dos motores de IA foi descartado por exigir parsing específico de
  3 CLIs diferentes, com risco de inconsistência entre eles).
