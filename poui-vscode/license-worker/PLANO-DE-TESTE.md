# Plano de teste manual — poui-license-worker

Objetivo: validar de ponta a ponta que emissão, ativação, consumo de
créditos e expiração de licença funcionam contra o worker em produção
(ou local via `wrangler dev`), antes de liberar uma chave real para um
cliente.

> Os testes automatizados (`npm test` em `license-worker/` e os testes da
> extensão em `poui-vscode/`) cobrem a lógica pura (`licenseLogic.ts`).
> Este plano cobre o que eles não cobrem: o worker publicado de verdade,
> o KV real e a extensão consumindo o worker via HTTP.

## Pré-requisitos

- `npx wrangler whoami` autenticado na conta correta.
- `RESEND_API_KEY` configurada (`npx wrangler secret list`) se for testar
  o e-mail de expiração (passo 6).
- Um `machineHash` de teste — não precisa ser real, qualquer string fixa
  serve para os testes via `curl` (ex.: `test-machine-001`). Para testar a
  extensão de verdade, use uma instância limpa do VS Code (perfil novo:
  `code --user-data-dir <pasta-temp>`) para não colidir com sua licença
  real.

## 1. Trial começa do zero

```bash
curl -s -X POST "<WORKER_URL>/trial/start" \
  -H "Content-Type: application/json" \
  -d '{"machineHash":"test-machine-001"}'
```

**Esperado:** `{"tier":"trial","daysLeft":14,"usedPct":0}`.

Rode de novo com o mesmo `machineHash` — deve continuar `trial`, mesmo
`daysLeft` (o relógio só começa a contar no primeiro consumo, não no
`trial/start`).

## 2. Consumo de crédito avança o trial

```bash
curl -s -X POST "<WORKER_URL>/trial/consume" \
  -H "Content-Type: application/json" \
  -d '{"machineHash":"test-machine-001","credits":3}'
```

**Esperado:** `tier: "trial"`, `usedPct` em torno de `8` (3/40 créditos ≈
7.5%, arredondado). Repita a chamada mais 12 vezes (13 × 3 = 39 créditos)
e confirme que `usedPct` sobe monotonicamente e nunca passa de 100.

**Esperado no limite:** na chamada que cruza 40 créditos usados,
`tier` vira `"expired"`.

## 3. Trial expirado bloqueia sem consumir mais

```bash
curl -s -X POST "<WORKER_URL>/trial/consume" \
  -H "Content-Type: application/json" \
  -d '{"machineHash":"test-machine-001","credits":1}'
```

**Esperado:** `{"tier":"expired"}` — sem `usedPct`/`daysLeft` (ou com eles
saturados), e sem erro 500.

Na extensão (perfil de teste com este `machineHash` — ou aguardando o
trial local expirar), confirme que os 8 comandos pagos mostram a
mensagem de trial expirado e oferecem "Ativar Licença" / "Comprar
Licença" (`requireLicense.ts`).

## 4. Emitir e ativar uma licença paga

```bash
cd license-worker
npm run license -- --new --email teste@exemplo.com --plan mensal
# anote a chave impressa, ex.: POUI-AB12-CD34-EF56
```

```bash
curl -s -X POST "<WORKER_URL>/license/activate" \
  -H "Content-Type: application/json" \
  -d '{"machineHash":"test-machine-001","licenseKey":"POUI-AB12-CD34-EF56"}'
```

**Esperado:** `{"ok":true,"tier":"paid"}`.

```bash
curl -s "<WORKER_URL>/license/status?machineHash=test-machine-001"
```

**Esperado:** `{"tier":"paid","licenseKey":"POUI-AB12-CD34-EF56","daysUntilExpiry":29}`
(ou 30, dependendo do arredondamento de horário).

Na extensão, use o comando **PO-UI: Ativar Licença**, cole essa chave, e
confirme que os 8 comandos pagos liberam sem aviso de trial.

## 5. Licença paga nunca consome crédito de trial

```bash
curl -s -X POST "<WORKER_URL>/trial/consume" \
  -H "Content-Type: application/json" \
  -d '{"machineHash":"test-machine-001","credits":3}'
```

**Esperado:** `{"tier":"paid", ...}` idêntico ao passo anterior — sem
gravar nada novo (confirme lendo o registro `machine:test-machine-001` no
KV e vendo que `creditsUsed` não mudou).

## 6. Segunda ativação na mesma chave é recusada

Repita o `POST /license/activate` do passo 4 com um `machineHash`
diferente (`test-machine-002`), mesma `licenseKey`.

**Esperado:** `{"ok":false,"reason":"invalid_key"}` com status HTTP 400
— a chave já está vinculada a `test-machine-001`
(`shouldActivate`/`resolveStatus` comparam `boundMachineHash`).

## 7. Renovação estende o vencimento sem perder dias

```bash
npm run license -- --renew POUI-AB12-CD34-EF56 --plan anual
```

**Esperado:** saída "Chave renovada" com novo vencimento ≈ data atual +
30 dias (o que sobrava do plano mensal) + 365 dias (o plano anual), não
apenas +365 dias a partir de hoje.

Confirme via `GET /license/status?machineHash=test-machine-001` que
`daysUntilExpiry` refletiu o novo prazo.

## 8. Expiração real dispara e-mail (opcional, requer RESEND_API_KEY)

1. Emita uma licença com `--plan mensal`, ative-a, e no KV edite
   manualmente `expiresAt` para uma data já passada
   (`npx wrangler kv key get/put "license:<CHAVE>" --binding=LICENSES --remote`).
2. Chame `GET /license/status?machineHash=<hash-vinculado>`.
3. **Esperado:** resposta imediata com `tier` não-pago (o e-mail roda em
   `ctx.waitUntil`, não atrasa a resposta).
4. Confira a caixa de entrada configurada em `sendExpiryEmail`
   (`andre.andrelscosta@gmail.com`, hardcoded em `src/worker.ts`) — deve
   chegar "PO-UI: licença de teste@exemplo.com expirou".
5. Chame o mesmo `GET /license/status` de novo — **esperado:** nenhum
   e-mail novo (idempotência via `notifiedExpiredAt`, coberta também por
   `shouldNotifyExpiry` nos testes automatizados).

## 9. Licença revogada bloqueia mesmo antes de expirar

1. No KV, edite a licença de teste para `"status": "revoked"`.
2. `GET /license/status?machineHash=<hash-vinculado>` → **esperado:**
   `tier` não-pago, mesmo com `expiresAt` ainda no futuro.
3. Tente ativar essa chave numa máquina nova (`POST /license/activate`)
   → **esperado:** `{"ok":false,"reason":"invalid_key"}`.

## Limpeza pós-teste

- Apague os registros de teste do KV (`npx wrangler kv key delete "machine:test-machine-001" --binding=LICENSES --remote`
  e o mesmo para `test-machine-002` e `license:POUI-AB12-CD34-EF56`) para
  não poluir o namespace de produção.
- Se testou a extensão com um perfil temporário do VS Code
  (`--user-data-dir`), pode apagar a pasta depois.

## Critério de aceite

Liberar uma licença real para um cliente só depois de:
- [ ] Passos 1–7 executados sem erro e com as respostas esperadas.
- [ ] `npm test` verde em `license-worker/` (testes automatizados de
      `licenseLogic.ts`).
- [ ] Suite da extensão (`poui-vscode/`) verde, cobrindo
      `licenseCheck.ts`/`requireLicense.ts`.
- [ ] Passo 8 (e-mail) validado pelo menos uma vez desde o último deploy
      que tocou `sendExpiryEmail`/`notifyIfExpired`.
