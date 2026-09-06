# Licenciamento e gate por comando (poui-vscode)

Status: aprovado para virar plano de implementação
Data: 2026-09-06

## Contexto e motivação

A extensão `poui-vscode` está prestes a ser distribuída como `.vsix` pra um
grupo de devs pra teste, com o objetivo explícito de monetizar depois. O
usuário identificou o risco real: mesmo distribuindo só pra contatos de
confiança, o `.vsix` pode circular além do controle direto ("um conhecido
de confiança também pode ter um conhecido de confiança"), então qualquer
mecanismo só-local (data fixa, `context.globalState` sem backend) é
trivialmente resetável — basta limpar o storage da extensão ou reinstalar
o VS Code pra ganhar outro período de trial.

O plugin `poui-specialist` já tem um mecanismo de licença (skill
`poui-license-check`: data de expiração fixa local + checagem remota via
gist só-leitura, valida um campo `"plugin"` no JSON pra evitar forjar
apontando pra outro gist). Esse padrão foi desenhado pra um problema
diferente — uma distribuição controlada via marketplace do Claude, com uma
única data de expiração global pro beta inteiro — e não resolve o problema
de trial por instalação com reset resistente a burla. Este documento
desenha um mecanismo novo, específico pra `poui-vscode`, que reaproveita a
mesma filosofia (v0 pragmático, sem automação de pagamento ainda) mas com
um backend mínimo real, porque o problema de anti-abuso exige um lugar que
"lembra" o estado mesmo depois que o storage local é limpo.

## Objetivo

1. Trial de 14 dias por instalação, com início registrado num backend
   (não só local), resistente a "limpar storage e recomeçar".
2. Gate por comando: 6 comandos determinísticos/infra ficam sempre
   grátis; 8 comandos que chamam o motor de IA exigem trial ativo ou
   licença paga.
3. Comando novo `PO-UI: Ativar Licença` (`poui.activateLicense`) pra
   colar a chave depois do pagamento.
4. Licença paga vinculada a **1 dispositivo por vez** — reativar em outro
   dispositivo substitui o vínculo anterior (sem fluxo de suporte
   manual), mas dois dispositivos simultâneos exigem duas licenças.

## Não-objetivos

- Sem integração automática com webhook do Asaas nesta fase — as chaves
  são geradas/revogadas manualmente no KV do Cloudflare quando um
  pagamento é confirmado (mesmo espírito "v0 sem automação" já decidido
  no backlog da Fase 5, só que a lista mora no KV em vez de um gist).
- Sem sistema de conta (email/senha) — a chave de licença sozinha é a
  credencial.
- Sem múltiplos assentos por chave, sem pró-rata, sem reembolso
  automatizado.
- Não migra nem altera o mecanismo de licença já existente do plugin
  `poui-specialist` (gist read-only) — são sistemas independentes.
- Sem telemetria além do estritamente necessário pra aplicar o
  licenciamento (hash da máquina, nunca o `machineId` cru).

## Arquitetura

```
poui-vscode (extensão)              Cloudflare Worker              KV
┌──────────────────────┐   HTTPS    ┌──────────────────┐         ┌────────────┐
│ licenseCheck.ts       │───────────▶│ /trial/start      │────────▶│ machine:*  │
│ requireLicense.ts     │◀───────────│ /license/status   │◀────────│ license:*  │
│ activateLicense.ts    │            │ /license/activate │         └────────────┘
└──────────────────────┘            └──────────────────┘
```

Threat model: como o Worker é um endpoint HTTPS que só o autor controla
(não um gist público editável por qualquer um que conheça a URL), não há
risco de forjar a resposta — a URL em si já é o discriminador. Isso
também resolve, por construção, a preocupação original de "impedir que um
gist forjado desbloqueie tanto o plugin quanto a extensão": não há gist
compartilhado nenhum neste mecanismo.

## Componentes

### Backend — Cloudflare Worker + KV

Um namespace KV único (`POUI_LICENSES`), duas famílias de chave:

- `machine:<machineHash>` → `{ firstSeen: ISO8601, lastSeen: ISO8601, licenseKey: string | null }`
- `license:<licenseKey>` → `{ email: string, status: 'active' | 'revoked', createdAt: ISO8601, boundMachineHash: string | null }`

**`POST /trial/start`** — body `{ machineHash }`.
- Se `machine:<hash>` não existe: cria com `firstSeen = agora`,
  `licenseKey = null`. **Idempotente**: se já existe, só atualiza
  `lastSeen`, nunca reescreve `firstSeen`.
- Resposta: `{ tier: 'trial', trialStart, daysLeft }` (ou `{ tier: 'paid', licenseKey }`
  se já houver uma licença vinculada a essa máquina).

**`GET /license/status?machineHash=<hash>`**
- `machine:<hash>` não encontrado → `{ tier: 'unknown' }` (a extensão
  ainda não chamou `/trial/start` — não deveria acontecer em uso normal).
- `machine:<hash>.licenseKey` presente e `license:<key>.status === 'active'`
  e `license:<key>.boundMachineHash === hash` → `{ tier: 'paid', licenseKey }`.
- Caso contrário (sem chave vinculada, chave revogada, ou vinculada a
  **outro** hash — isto é, essa máquina perdeu a licença porque a chave
  foi reativada em outro dispositivo) → calcula trial a partir de
  `firstSeen`: `{ tier: 'trial', daysLeft }` se `daysLeft > 0`, senão
  `{ tier: 'expired' }`.

**`POST /license/activate`** — body `{ machineHash, licenseKey }`.
- `license:<licenseKey>` ausente ou `status !== 'active'` →
  `{ ok: false, reason: 'invalid_key' }`.
- Encontrada e ativa: seta `license:<key>.boundMachineHash = machineHash`
  (substitui qualquer vínculo anterior — é assim que a "reativação
  substitui a anterior" acontece, sem lógica extra) e
  `machine:<hash>.licenseKey = licenseKey`. Resposta:
  `{ ok: true, tier: 'paid' }`.
- Efeito colateral esperado e desejado: o dispositivo que tinha a chave
  antes vê `boundMachineHash !== seuHash` na próxima `/license/status` e
  cai de volta pro cálculo de trial/expirado — sem precisar de push
  notification nem lógica de "desconectar" explícita.

Emissão de chave: manual, feita pelo usuário no painel/CLI do Cloudflare
KV quando um pagamento é confirmado no Asaas (fora de escopo automatizar
agora). Formato sugerido: `POUI-XXXX-XXXX-XXXX` (sem exigência
criptográfica — a validação real é a existência da entrada no KV, não o
formato da string).

### Configuração da URL do Worker

A URL base do Worker (ex: `https://poui-license.<subdomínio>.workers.dev`)
é uma **constante fixa no código** (`licenseCheck.ts`), não um setting
`poui.*` configurável pelo usuário — se fosse configurável, qualquer um
poderia apontar pra um servidor falso que sempre responde "licença
válida" e derrubar o mecanismo inteiro. Consequência de ordem pro plano
de implementação: **o Worker precisa ser deployado primeiro** (Task de
infraestrutura), a URL real obtida, e só então hardcoded na extensão —
não dá pra escrever `licenseCheck.ts` com a URL final antes do deploy
existir.

### Extensão — `src/licenseCheck.ts` (novo, puro — sem `import vscode`)

Segue a mesma convenção já estabelecida no projeto: lógica testável via
`mocha`+`ts-node` nunca importa `vscode` diretamente.

- `computeMachineHash(machineId: string, salt: string): string` — SHA-256
  de `machineId + salt` (módulo `node:crypto`, disponível no host da
  extensão). O `salt` é uma constante fixa no código
  (`'poui-vscode-license-v1'`), não secreta — só evita reusar o
  `machineId` cru como impressão digital fora deste propósito.
- `fetchTrialStart(baseUrl, machineHash, fetchFn): Promise<LicenseStatus>`
- `fetchLicenseStatus(baseUrl, machineHash, fetchFn): Promise<LicenseStatus>`
- `activateLicenseKey(baseUrl, machineHash, licenseKey, fetchFn): Promise<ActivationResult>`
- Tipos: `LicenseTier = 'trial' | 'paid' | 'expired' | 'unknown'`,
  `LicenseStatus = { tier: LicenseTier; daysLeft?: number; licenseKey?: string }`.
- `fetchFn` é injetável (mesmo padrão de `spawnFn` já usado em
  `agentRuntime.ts`) — testável com um fake HTTP sem rede real.

### Extensão — `src/requireLicense.ts` (novo, vscode-aware, fino)

- `initializeLicenseStatus(context: vscode.ExtensionContext): Promise<void>`
  — chamado uma vez em `extension.ts:activate()`. Calcula o hash da
  máquina, chama `/trial/start` (primeira vez) ou `/license/status`
  (já registrada), guarda o resultado num cache em memória de módulo
  (válido pela sessão inteira do VS Code) e persiste o último status
  bem-sucedido + timestamp em `context.globalState` (fallback offline).
- `getCachedLicenseStatus(): LicenseStatus | undefined` — lê o cache em
  memória.
- `requireLicense(context: vscode.ExtensionContext, outputChannel: vscode.OutputChannel): boolean`
  — chamado no topo do handler de cada um dos 8 comandos pagos. `true`
  se `tier` for `trial` ou `paid`; senão mostra
  `showErrorMessage(..., 'Ativar Licença')` (botão que roda
  `poui.activateLicense`) e devolve `false` — o comando retorna
  imediatamente sem fazer nada.

### Extensão — `src/activateLicense.ts` (novo comando `poui.activateLicense`)

`PO-UI: Ativar Licença` — `showInputBox` pra colar a chave, chama
`activateLicenseKey`, salva a chave em `context.secrets` (mesmo
tratamento dos outros segredos desta extensão — nunca em
`settings.json`), atualiza o cache em memória com o novo status, mostra
confirmação.

### Gate nos 8 comandos pagos

Cada um dos 8 `register*Command` (`generateComponent`, `generateTest`,
`generateE2e`, `generateScreenshot`, `review`, `connect`, `scaffold`,
`package`) ganha, logo no início do handler:

```typescript
if (!requireLicense(context, outputChannel)) {
  return;
}
```

Os 6 comandos determinísticos/infra (`configureEngine`, `docs`, `lint`,
`quality`, `preview`, `undo`) **não** ganham essa checagem — continuam
sempre liberados, licenciados ou não.

## Fluxo de dados

1. **Ativação da extensão**: `initializeLicenseStatus` roda uma vez.
   Sem registro prévio → `POST /trial/start`. Já registrada → `GET /license/status`.
2. **Uso de comando pago**: consulta só o cache em memória (nenhuma
   chamada de rede por comando — evita latência em toda invocação).
3. **Ativação de licença**: dev roda `PO-UI: Ativar Licença`, cola a
   chave, `POST /license/activate`. Sucesso → cache atualizado pra
   `paid` na hora, sem precisar reiniciar o VS Code.
4. **Troca de dispositivo**: dev reativa a mesma chave numa máquina nova
   → dispositivo antigo perde acesso na próxima checagem (não há aviso
   ativo pro dispositivo antigo, só reflete no próximo `/license/status`).

## Tratamento de erro

- **Primeira ativação sem rede** (`/trial/start` falha): comandos pagos
  ficam bloqueados com mensagem "conecte-se à internet pra liberar o
  trial" até a primeira sincronização funcionar — evita que alguém use
  só offline pra nunca ser registrado no backend.
- **Checagem de rotina sem rede** (já registrado antes): usa o último
  status confirmado salvo em `context.globalState`, mas só dentro de uma
  **janela de graça de 3 dias** a partir do último sucesso — depois
  disso, bloqueia com "não foi possível confirmar sua licença" em vez de
  permitir uso offline indefinido.
- **Ativação de chave sem rede**: erro claro, pede pra tentar de novo
  online — nunca marca como ativado localmente sem confirmação do
  Worker (isso quebraria o modelo inteiro).
- **Erro interno do Worker** (KV indisponível, etc.): a extensão trata
  como "temporariamente indisponível" (mesma janela de graça de 3 dias),
  nunca confundido com expiração real.
- **`machineId` muda** (reinstalou o SO): aparece como dispositivo novo,
  precisa reativar — limitação aceita, mesma de qualquer licenciamento
  comercial vinculado a dispositivo.
- **Placeholder conhecido do VS Code**: em alguns ambientes (telemetria
  desabilitada, remote/CI), `vscode.env.machineId` pode vir como o valor
  fixo documentado `'someValue.machineId'` — não é um identificador
  confiável de máquina nesse caso. `computeMachineHash` deve detectar
  esse valor exato e logar um aviso (`⚠ machineId não confiável neste
  ambiente`), mas seguir funcionando normalmente (o hash ainda é
  calculado, só não é garantidamente único por máquina nesse caso raro).

## Testes

- **`licenseCheck.ts`**: puro, testado via `mocha`+`ts-node` com um
  `fetchFn` fake — casos: `computeMachineHash` determinístico e estável
  pro mesmo input; `fetchTrialStart`/`fetchLicenseStatus`/
  `activateLicenseKey` interpretando corretamente cada shape de resposta
  (`trial`/`paid`/`expired`/`unknown`/erro de rede); detecção do
  placeholder `'someValue.machineId'`.
- **`requireLicense.ts`**: lógica de decisão (`trial`/`paid` → `true`;
  `expired`/`unknown`/erro-fora-da-janela-de-graça → `false`) extraída
  em função pura testável, separada da parte que só chama
  `vscode.window.showErrorMessage`.
- **Worker**: lógica pura (cálculo de `daysLeft`, validação de
  ativação) separada do glue de request/response — testável sem
  precisar do runtime do Cloudflare. O handler HTTP em si testado
  localmente via `wrangler dev` + `curl` antes do deploy real (sem
  suíte automatizada pesada nesta fase).
- **Integração**: `poui.activateLicense` registrado, mesmo padrão de
  checagem já usado pros outros 15 comandos em
  `src/test/suite/extension.test.ts`.
- **Validação manual final** (Task própria no plano de implementação):
  deploy real no Cloudflare (conta gratuita), instalar o `.vsix` em 2
  perfis/máquinas diferentes pra provar: trial não reseta limpando
  storage local; ativação com chave real funciona; reativar no
  dispositivo 2 realmente tira o 1; janela de graça offline se comporta
  como esperado; os 6 comandos grátis funcionam mesmo sem trial/licença.

## Riscos conhecidos, aceitos por enquanto

- Limite gratuito do Cloudflare Workers (100 mil requisições/dia) — bem
  acima do volume esperado nesta fase; só vira relevante com uma base de
  clientes muito maior.
- Trocar de máquina consome o "1 dispositivo" da licença sem aviso pro
  dispositivo antigo — aceitável pro volume atual; se virar reclamação
  recorrente, um comando futuro de "ver dispositivo vinculado" resolve
  sem mudar o modelo.
- Emissão/revogação de chave é 100% manual (Andre edita o KV) — mesmo
  trade-off já aceito no backlog da Fase 5 pro v0; migrar pra automação
  via webhook do Asaas é trabalho de uma fase seguinte, não deste
  documento.
