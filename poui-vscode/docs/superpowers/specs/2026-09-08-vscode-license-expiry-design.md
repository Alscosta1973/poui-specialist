# Expiração, bloqueio, aviso por e-mail e emissão de licença paga (poui-vscode)

Status: aprovado para virar plano de implementação
Data: 2026-09-08

## Contexto e motivação

O licenciamento pago hoje ([2026-09-06-vscode-license-gating-design.md](2026-09-06-vscode-license-gating-design.md))
é **permanente até revogação manual** — `LicenseRecord` não tem nenhuma
data de expiração. Isso não reflete o modelo de negócio real (assinatura
mensal/trimestral/anual): nada bloqueia automaticamente quem parou de
pagar, e o autor não tem nenhum sinal de que uma assinatura venceu além
de acompanhar pagamentos manualmente fora do sistema.

Esta spec adiciona três peças que faltam, todas decididas nesta sessão:

1. **Expiração e bloqueio** — uma licença paga passa a ter `expiresAt`;
   vencida, cai automaticamente no mesmo caminho de fallback que
   "revogada" já usa hoje (sem bloqueio novo, reaproveita o existente).
2. **Aviso por e-mail pro autor** — quando uma licença vence, o Worker
   dispara um e-mail (via Resend) avisando qual chave/cliente venceu,
   já que isso hoje é o único sinal automático que o autor teria (o
   pagamento em si ainda não é automatizado).
3. **Script de emissão/renovação** — hoje criar ou renovar uma chave
   significa editar JSON à mão no KV via `wrangler kv key put`. Um
   script CLI substitui isso.

## Objetivo

1. `LicenseRecord` ganha `expiresAt` (ISO) e `notifiedExpiredAt`
   (ISO | null) — mesmo padrão de flag idempotente já usado por
   `firstUsedAt` no trial.
2. `resolveStatus` só retorna `tier: 'paid'` se, além das condições já
   existentes (`status === 'active'`, `boundMachineHash` bate),
   `now < expiresAt`. Vencida cai pro cálculo de trial/expirado — igual
   já acontece hoje pra "revogada" ou "vinculada a outro dispositivo".
3. Na primeira vez que uma licença paga é detectada vencida
   (`notifiedExpiredAt` ainda `null`), o Worker envia um e-mail pro
   autor via Resend e marca a flag — nunca reenvia pro mesmo vencimento.
4. Um dev com licença paga vendo o vencimento chegando (poucos dias)
   recebe o mesmo tipo de aviso que o trial já mostra hoje (status bar +
   notificação), com o mesmo botão de "renovar" — reaproveita a UI, não
   cria uma nova.
5. Script `license-worker/scripts/issue-license.mjs`, dois modos:
   - `--new --email <email> --plan <mensal|trimestral|anual>` — gera
     chave nova (`POUI-XXXX-XXXX-XXXX`), grava no KV.
   - `--renew <chave> --plan <mensal|trimestral|anual>` — estende a
     mesma chave: soma os dias do plano ao `expiresAt` atual se ainda
     não venceu; se já venceu, conta a partir de agora (sem "tempo
     restante" negativo pra somar). Zera `notifiedExpiredAt` de volta
     pra `null` (a licença fica ativa de novo, precisa poder notificar
     de novo se vencer no futuro).

## Não-objetivos

- Sem automação de pagamento (Asaas) — a emissão/renovação continua
  sendo o autor rodando o script manualmente depois de confirmar o
  pagamento fora do sistema. Isso substitui só a parte de "editar JSON
  à mão", não a cobrança em si.
- Sem e-mail pro **cliente** (o dev que comprou) — só pro autor. O
  aviso que o dev vê continua sendo dentro da própria extensão (status
  bar/notificação), não e-mail.
- Sem múltiplos planos simultâneos por chave, sem prorata, sem
  cancelamento antecipado com reembolso — mesmo escopo v0 já aceito
  pro licenciamento em geral.
- Sem domínio verificado no Resend — usa o domínio de teste/compartilhado
  deles (`onboarding@resend.dev` ou equivalente), já que o e-mail só vai
  pro autor. Verificar um domínio próprio fica pra quando (se) o produto
  precisar mandar e-mail pro cliente também.
- Não altera `boundMachineHash` nem o modelo de 1-dispositivo-por-chave
  — renovação só mexe em `expiresAt`/`notifiedExpiredAt`.

## Arquitetura

```
license-worker/scripts/           poui-vscode (extensão)         Cloudflare Worker              KV / Resend
issue-license.mjs (CLI, local) ──────────────────────────────▶ wrangler kv key put ────────▶ license:<key>
                                   licenseCheck.ts ────HTTPS───▶ /license/status              (expiresAt,
                                   requireLicense.ts             /trial/consume                notifiedExpiredAt)
                                                                 ├─ resolveStatus (bloqueio)
                                                                 └─ shouldNotifyExpiry ──────▶ api.resend.com
```

Único componente novo de infraestrutura: a chamada HTTPS do Worker pro
Resend (`api.resend.com/emails`), autenticada por um secret
(`RESEND_API_KEY`, via `wrangler secret put`, nunca no código).

## Componentes

### `license-worker/src/licenseLogic.ts` (lógica pura, estendida)

```typescript
export interface LicenseRecord {
  email: string;
  status: 'active' | 'revoked';
  createdAt: string;
  boundMachineHash: string | null;
  expiresAt: string;              // NOVO
  notifiedExpiredAt: string | null; // NOVO
}

export const PLAN_DAYS = { mensal: 30, trimestral: 90, anual: 365 } as const;
export type PlanId = keyof typeof PLAN_DAYS;
```

`resolveStatus` — a condição do ramo `paid` ganha mais uma cláusula, e a
resposta passa a incluir `daysUntilExpiry` (sempre, não só quando perto
— o servidor devolve o dado bruto, é o cliente que decide o limiar pra
mostrar aviso, mesmo padrão já usado pra `usedPct`/dias do trial):

```typescript
if (
  machine.licenseKey &&
  license &&
  license.status === 'active' &&
  license.boundMachineHash === machineHash &&
  nowIso < license.expiresAt   // NOVO
) {
  return {
    tier: 'paid',
    licenseKey: machine.licenseKey,
    daysUntilExpiry: computeDaysLeft(license.expiresAt, nowIso), // NOVO — reaproveita a função já existente
  };
}
```

Sem outra mudança em `resolveStatus` — vencida já cai no `else` que hoje
trata revogada/trocada de dispositivo, calculando trial/expirado a
partir de `machine.firstUsedAt`/`creditsUsed` normalmente.

Nova função pura, usada pelo Worker (não pela extensão):

```typescript
/** true só na primeira vez que uma licença ativa é vista vencida —
 * nunca true de novo pro mesmo vencimento, mesmo chamada repetidamente
 * (idêntico em espírito ao `firstUsedAt` do trial: seta uma vez, nunca
 * reescreve até a próxima renovação zerar a flag). */
export function shouldNotifyExpiry(license: LicenseRecord | undefined, nowIso: string): boolean {
  return (
    license !== undefined &&
    license.status === 'active' &&
    nowIso >= license.expiresAt &&
    license.notifiedExpiredAt === null
  );
}
```

Nova função pura pro cálculo de renovação (usada pelo script, não pelo
Worker em runtime — mas fica em `licenseLogic.ts` por ser lógica de
negócio pura, testável sem `wrangler`/rede):

```typescript
/** Data de expiração depois de uma renovação. Se ainda não venceu, soma
 * os dias do plano ao expiresAt atual (nenhum dia pago é perdido). Se já
 * venceu, conta a partir de agora (não tem "tempo restante" negativo
 * pra somar). */
export function computeRenewedExpiresAt(currentExpiresAt: string, planDays: number, nowIso: string): string {
  const base = currentExpiresAt > nowIso ? currentExpiresAt : nowIso;
  const baseMs = new Date(base).getTime();
  return new Date(baseMs + planDays * 24 * 60 * 60 * 1000).toISOString();
}
```

### `license-worker/src/worker.ts` (wiring HTTP + chamada ao Resend)

Nos dois pontos que já leem `license` (`/license/status` e
`/trial/consume`, ambos já fazem
`readJson<LicenseRecord>('license:...')` quando `machine.licenseKey`
existe), depois de resolver o status: se `shouldNotifyExpiry(license,
now)`, dispara o e-mail e persiste a flag antes de responder.

```typescript
async function sendExpiryEmail(apiKey: string, license: LicenseRecord): Promise<void> {
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'PO-UI Specialist <onboarding@resend.dev>',
      to: 'andre.andrelscosta@gmail.com',
      subject: `PO-UI: licença de ${license.email} expirou`,
      text: `A licença de ${license.email} (venceu em ${license.expiresAt}) expirou e o acesso pago foi bloqueado automaticamente.`,
    }),
  });
}
```

Chamada é **best-effort, não bloqueia a resposta ao cliente** — se o
Resend falhar (rede, chave inválida, etc.), a licença já foi
corretamente bloqueada de qualquer forma (isso não depende do e-mail);
só o autor não é avisado dessa vez. `notifiedExpiredAt` só é marcado
**depois** de uma tentativa de envio (sucesso ou falha) pra não tentar
reenviar em loop a cada request se o Resend estiver fora do ar —
aceito: uma falha pontual de e-mail é menos grave que um loop de
tentativas.

`Env` ganha `RESEND_API_KEY: string` (secret, não var pública).

### `poui-vscode/src/licenseCheck.ts` e `requireLicense.ts` (aviso de renovação pro dev pagante)

`resolveStatus` no Worker passa a incluir, no ramo `paid`, um
`daysUntilExpiry` (calculado igual a `computeDaysLeft`, só que a partir
de `expiresAt` em vez de `firstUsedAt`) — a extensão usa isso pra
decidir se mostra aviso, mesmo padrão do trial:

```typescript
// StatusResult ganha:
daysUntilExpiry?: number; // presente sempre que tier === 'paid'; o cliente decide o limiar de aviso
```

No lado da extensão, `formatStatusBarItem`/`shouldShowExpiryWarning`
ganham um ramo pra `tier === 'paid' && daysUntilExpiry <= 7`: mesmo
texto/botão "Ativar Licença" → mas trocando pra "Renovar Licença"
(mesmo fluxo de `poui.activateLicense`, cola a chave renovada — não
precisa de comando novo).

### `license-worker/scripts/issue-license.mjs` (novo, CLI local)

Script Node puro (sem dependência nova — usa `child_process` pra
chamar `wrangler kv key put`/`get`, que já está instalado como
devDependency do `license-worker`), dois modos:

```bash
node scripts/issue-license.mjs --new --email cliente@empresa.com --plan mensal
# Gera POUI-XXXX-XXXX-XXXX, expiresAt = agora + 30 dias, imprime a chave.

node scripts/issue-license.mjs --renew POUI-ABCD-1234-EFGH --plan anual
# Lê o registro atual, aplica computeRenewedExpiresAt, zera notifiedExpiredAt,
# grava de volta, imprime o novo expiresAt.
```

Formato da chave: `POUI-` + 3 blocos de 4 caracteres alfanuméricos
maiúsculos aleatórios (`crypto.randomBytes`), mesmo estilo já usado
pelas chaves de teste existentes (`POUI-TEST-0001` é só um exemplo
manual, o gerador não precisa seguir esse formato exato, só o prefixo
`POUI-`).

## Fluxo de dados

1. **Emissão**: autor confirma pagamento fora do sistema → roda
   `issue-license.mjs --new` → chave impressa → autor manda pro
   cliente.
2. **Ativação**: cliente cola a chave em `poui.activateLicense` (fluxo
   já existente, sem mudança).
3. **Uso normal**: toda checagem de status já passa por `resolveStatus`,
   que agora também valida `expiresAt`.
4. **Vencimento**: primeira checagem depois do vencimento →
   `resolveStatus` já bloqueia (cai pra trial/expirado) **e**
   `shouldNotifyExpiry` dispara o e-mail pro autor, marca a flag.
5. **Renovação**: autor confirma novo pagamento → roda
   `issue-license.mjs --renew <chave>` → `expiresAt` estendido,
   `notifiedExpiredAt` zerado → próxima checagem do cliente já mostra
   `paid` de novo, sem precisar reativar a chave na extensão.

## Tratamento de erro

- **Resend fora do ar / chave inválida**: bloqueio da licença não
  depende disso (já aconteceu via `resolveStatus`); só o e-mail falha,
  silenciosamente — `notifiedExpiredAt` ainda é marcado pra não tentar
  de novo a cada request (ver justificativa acima).
- **Script rodado com `--renew` numa chave que não existe**: erro claro,
  não cria nada (renovação exige que a chave já exista — `--new` é o
  caminho pra chave nova).
- **Script rodado sem `wrangler` autenticado**: erro do próprio
  `wrangler kv key put/get`, propagado pro terminal — mesmo
  comportamento de qualquer uso manual de `wrangler` hoje.

## Testes

- **`licenseLogic.ts`**: `resolveStatus` com licença vencida (cai pra
  trial/expirado, mesmos casos já cobertos pra revogada/outro
  dispositivo, agora também pra `expiresAt` passado); `shouldNotifyExpiry`
  (não notifica se já notificado, não notifica se ainda não venceu, não
  notifica se revogada — só notifica active+vencida+não notificada
  ainda); `computeRenewedExpiresAt` (soma se não venceu, conta do zero
  a partir de agora se já venceu).
- **`worker.ts`**: sem suíte automatizada pro HTTP em si (mesmo padrão
  já estabelecido) — verificação manual via `wrangler dev` + `curl`,
  incluindo simular uma licença vencida e confirmar que só a 1ª chamada
  dispararia o e-mail (mock/stub do `fetch` pro Resend nesse teste
  manual, não uma chamada de verdade repetida).
- **`licenseCheck.ts`/extensão**: `formatStatusBarItem`/
  `shouldShowExpiryWarning` com o novo ramo `paid` + `daysUntilExpiry`
  perto do limite.
- **`issue-license.mjs`**: sem suíte automatizada (script CLI fino que
  só orquestra `wrangler`) — verificado manualmente rodando `--new`
  seguido de `--renew` contra o KV real e conferindo o resultado via
  `wrangler kv key get`.

## Riscos conhecidos, aceitos por enquanto

- E-mail sai do domínio de teste do Resend, não de um domínio próprio —
  aceitável porque o destinatário é sempre o próprio autor (sem
  problema de credibilidade/spam-score pro cliente final, que nunca vê
  esse e-mail).
- Sem automação de pagamento — o "sinal" de que alguém deveria renovar
  ainda depende do autor acompanhar o Asaas/extrato manualmente; o
  e-mail de expiração é um lembrete depois do fato, não uma cobrança
  proativa antes do vencimento.
- Se o Worker cair bem no momento exato da 1ª checagem pós-vencimento,
  o e-mail pode não disparar até a checagem seguinte — sem impacto no
  bloqueio em si (que não depende do e-mail), só atraso no aviso.
