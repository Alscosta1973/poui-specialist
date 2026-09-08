# Operação de licenças — poui-license-worker

Guia prático para emitir, renovar e liberar licenças pagas da extensão PO-UI
Specialist. Cada seção segue o formato: **preciso disso porque X → faço
assim Y**.

## 1. Um cliente pagou e pediu a chave de licença

**Preciso disso porque:** o cliente fechou o pagamento (Pix, boleto, cartão —
fora deste worker) e precisa de uma `licenseKey` para ativar a extensão.

**Faço assim:**

```bash
cd license-worker
npm run license -- --new --email cliente@empresa.com --plan mensal
```

- `--plan` aceita `mensal` (30 dias), `trimestral` (90 dias) ou `anual` (365 dias).
- O comando grava o registro em `license:<CHAVE>` no KV remoto (`--remote`,
  já embutido no script) e imprime a chave e a data de expiração.
- Envie a chave impressa (`POUI-XXXX-XXXX-XXXX`) para o e-mail do cliente.
  O cliente ativa em VS Code com o comando **PO-UI: Ativar Licença**
  (`poui.activateLicense`), colando a chave.

## 2. Um cliente renovou uma assinatura existente

**Preciso disso porque:** a licença já existe e venceu (ou está prestes a
vencer) — não crio uma chave nova, estendo a validade da que já foi ativada
na máquina do cliente.

**Faço assim:**

```bash
npm run license -- --renew POUI-XXXX-XXXX-XXXX --plan anual
```

- Se a licença ainda não venceu, a nova validade soma o período a partir do
  vencimento atual (`computeRenewedExpiresAt` — não "perde" dias já pagos).
- Se já venceu, a contagem recomeça a partir de agora.
- `notifiedExpiredAt` é resetado para `null`, então se o worker já tinha
  mandado o e-mail de "expirou" antes da renovação, ele volta a poder
  notificar numa expiração futura.
- Não é preciso o cliente reativar nada em VS Code — a mesma `licenseKey`
  continua vinculada à máquina (`boundMachineHash`), e o próximo comando
  pago já lê a nova validade do worker.

## 3. Cliente perdeu a chave ou trocou de máquina

**Preciso disso porque:** `license/activate` grava `boundMachineHash` na
licença — uma chave só ativa numa máquina por vez (`shouldActivate` recusa
ativação numa segunda máquina enquanto a primeira estiver vinculada).

**Faço assim:**

1. Recupere a chave para o cliente (busque por e-mail — não há comando
   pronto de busca por e-mail; conferir manualmente via
   `npx wrangler kv key get "license:<CHAVE>" --binding=LICENSES --remote`
   se você já sabe a chave, ou listar chaves com
   `npx wrangler kv key list --binding=LICENSES --remote` e filtrar por
   `email` no conteúdo).
2. Para trocar de máquina, edite o campo `boundMachineHash` do registro para
   `null` (leia o JSON, ajuste, grave de volta com `wrangler kv key put`) e
   peça para o cliente ativar de novo na máquina nova.

## 4. Verificar o status de uma licença sem alterar nada

**Preciso disso porque:** o cliente reclama que a extensão está bloqueada e
preciso confirmar se é expiração, falta de ativação, ou outra coisa antes de
agir.

**Faço assim:**

```bash
curl "https://<worker-url>/license/status?machineHash=<HASH>"
```

- Retorna o mesmo objeto que a extensão usa internamente
  (`resolveStatus` em `src/licenseLogic.ts`): `tier` (`trial` | `paid` |
  `unknown`), datas de expiração, uso de créditos etc.
- Esse endpoint é read-mostly: ele só grava algo como efeito colateral se a
  licença acabou de expirar (dispara e-mail de aviso via `notifyIfExpired`,
  em background — não atrasa a resposta).
- O `machineHash` do cliente não é o `machineId` do VS Code em texto puro —
  é o hash (`computeMachineHash` em `src/licenseCheck.ts` da extensão). Para
  obter o hash de um cliente específico, peça para ele rodar o comando
  **PO-UI: Mostrar Diagnóstico de Licença** (se existir) ou inspecionar o
  Output Channel da extensão, que loga o hash usado nas chamadas ao worker.

## 5. Bloquear/cancelar uma licença antes do vencimento

**Preciso disso porque:** chargeback, fraude, ou cancelamento antecipado —
preciso revogar o acesso pago imediatamente, sem esperar `expiresAt`.

**Faço assim:**

1. Leia o registro: `npx wrangler kv key get "license:<CHAVE>" --binding=LICENSES --remote`
2. Edite o JSON localmente, mudando `"status": "active"` para
   `"status": "revoked"` — tanto `resolveStatus` quanto `shouldActivate`
   (em `src/licenseLogic.ts`) checam esse campo antes de checar
   `expiresAt`, então isso já é suficiente para bloquear o acesso pago e
   impedir uma nova ativação com essa chave.
3. Grave de volta: `npx wrangler kv key put "license:<CHAVE>" --path <arquivo.json> --binding=LICENSES --remote`
4. Na próxima chamada do cliente a qualquer endpoint pago, `resolveStatus`
   já devolve `tier` não-pago e a extensão bloqueia os 8 comandos gateados.

## Referência rápida — variáveis e infraestrutura

- **KV namespace:** `LICENSES` (id em `wrangler.toml`) — chaves
  `license:<CHAVE>` (assinatura paga) e `machine:<hash>` (trial por
  máquina).
- **Segredo:** `RESEND_API_KEY` — usado só para o e-mail de expiração
  (`sendExpiryEmail` em `src/worker.ts`). Sem ele configurado
  (`npx wrangler secret put RESEND_API_KEY`), o worker continua bloqueando
  licenças vencidas normalmente — só o e-mail de aviso falha (best-effort,
  não derruba a resposta ao cliente).
- **Deploy:** `npm run deploy` (roda `wrangler deploy`, sobe
  `src/worker.ts` para `poui-license.<subdomínio>.workers.dev` ou domínio
  configurado).
- **Todos os comandos `wrangler kv`/`npm run license` acima gravam direto em
  produção** (`--remote`) — não há ambiente de staging separado neste
  worker. Confirme a chave/e-mail antes de rodar `--new` ou `--renew`.
