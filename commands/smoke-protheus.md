---
description: Open a PO-UI app through the Protheus WebApp menu with Playwright (login, session, menu search) and report whether it loaded, its API calls and console errors — the real FwCallApp path, not ng serve
allowed-tools: Read, Write, Glob, Grep, Bash, PowerShell, AskUserQuestion, Skill
argument-hint: "[project-path]"
---

**IMPORTANT:** Always respond in the same language the user is writing in. If the user writes in Portuguese, respond in Portuguese.

## Passo 0 — Verificação de licença

Invocar a skill `poui-specialist:poui-license-check` antes de qualquer outra ação.
Se a skill retornar `status: expirado` ou `status: revogado`, encerrar imediatamente.

---

# /poui-specialist:smoke-protheus

Teste de fumaça **pelo caminho real do usuário**: WebApp → login → sessão → pesquisa no menu →
rotina com `FwCallApp` → app PO-UI. Diferente do `/poui-specialist:e2e` (que roda no `ng serve`),
aqui o app é o `.app` compilado no RPO e as chamadas de API passam pelo canal do `FwCallApp`
(`:<porta TCP>/app-root/<rota>`). Use depois do `/poui-specialist:package` + compilação, e antes de
entregar.

## Exemplos

```bash
/poui-specialist:smoke-protheus
/poui-specialist:smoke-protheus C:\caminho\do\projeto
```

---

## Passo 1 — Pré-requisitos

1. Pasta do projeto Angular (`[project-path]` ou a atual) com `angular.json`; `$appName` = primeiro
   projeto do `angular.json`.
2. Playwright no projeto: `node_modules/@playwright/test` ou `node_modules/playwright-core`. Se não
   houver: orientar `npm i -D @playwright/test` e `npx playwright install chromium` (sem navegador do
   Playwright o script tenta Edge/Chrome instalados).
3. Script: `smoke-protheus.cjs` desta skill — localizar com Glob em
   `~/.claude/plugins/**/poui-specialist/**/skills/poui-smoke/smoke-protheus.cjs` (usar o de versão
   mais alta).

## Passo 2 — Configuração

Ler `smoke.config.json` na raiz do projeto, se existir. Para o que faltar, perguntar
(AskUserQuestion / texto) e gravar o arquivo:

```json
{
  "webAppUrl": "http://localhost:8080/webapp/",
  "program": "SIGAFIN",
  "environment": "PROTHEUS_LOCAL",
  "user": "admin",
  "passwordFile": "protheus-dev.secret",
  "menuSearch": "Monitor RCA",
  "menuItem": "",
  "appName": "<appName>",
  "outDir": "smoke-results",
  "timeoutSec": 90
}
```

**Senha:** nunca perguntar no chat, nunca ler nem exibir o arquivo. Pedir ao usuário que grave a
senha (uma linha) no `passwordFile` — caminho relativo ao `smoke.config.json` ou absoluto.

Garantir no `.gitignore`: `smoke-results/`, `smoke.config.json` (tem usuário/URL interna) e o
`passwordFile` quando estiver dentro do projeto.

## Passo 3 — Executar

Na raiz do projeto Angular (o script resolve o Playwright a partir da pasta atual):

```powershell
node "<caminho>\smoke-protheus.cjs" smoke.config.json
```

Tempo típico: 30–60 s. O script fecha o navegador ao fim (a sessão do Protheus cai junto).
Código de saída 2 = configuração inválida (mensagem no stderr).

## Passo 4 — Analisar `smoke-results/smoke-events.json`

Eventos: `step` (`webapp`, `login`, `sessao`, `menu`, `app` com `ok`/`error`), `app-frame` (frame
`/app-root/<app>_env_*` carregado), `api` (método, URL, status), `console-error` (texto + `frame`),
`page-error`, `request-failed`.

| Achado | Nível | Orientação |
|---|---|---|
| `step` com `ok:false` | ✗ | `webapp`: URL/programa/ambiente/serviço · `login`: usuário/senha/licença · `sessao`: aviso pós-login (rodar com `"headless": false`) · `menu`: ajustar `menuSearch`/`menuItem` · `app`: rodar `/poui-specialist:doctor` |
| `app-frame` presente | ✓ | "app abriu em N s" (campo `t` em ms) |
| `api` status < 400 | ✓ | listar |
| `api` 401 / 404 / 5xx | ⚠ | 401 = sessão/acesso do usuário; 404 = rota/prefixo ou fonte REST fora do RPO; 5xx = console.log do AppServer |
| app abriu e nenhuma `api` | ℹ | normal se a tela inicial não busca dados |
| `console-error` cujo `frame` contém `/app-root/<app>_env_` | ⚠ | erro do app (ignorar os da WebApp, ex.: `loadFont`) |
| `page-error`, `request-failed` | ⚠ | listar |

## Passo 5 — Relatório

```
🔥 Smoke no Protheus — <appName>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ O app abriu em 14,4 s (http://localhost:1237/app-root/rca-poui_env_protheus_local/index.html)
✓ GET http://localhost:1237/app-root/rca/regras → 200

Nenhum problema encontrado.
Screenshot: smoke-results/smoke.png
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Mostrar o `smoke-results/smoke.png` (Read) ao usuário.

## Notas para o agente

- Seletores usados (WebApp 10.x / Protheus 12.1.2410+, confirmados em 2026-10-27):
  `#selectStartProg input`, `#selectEnv input`, `wa-button[part="btn-ok"] button`; login no iframe
  `protheuslib-tface` (`input[name="login"]`, `input[name="password"]`, botão "Entrar"); sessão
  `po-button[name="submmit"]`; menu `input[placeholder="Pesquisar"]` + botão da lupa (Enter **não**
  pesquisa). Se a WebApp mudar, ajustar o script e esta lista.
- Cada execução consome uma licença enquanto o navegador está aberto — não rodar em loop.
- Não usar `RpcSetEnv`/senha em atalho de WebApp: falha de login grava parâmetros no console.log.
