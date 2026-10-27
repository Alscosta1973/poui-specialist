# Plano — doctor, proxy dev com login, smoke-protheus e docs do po-combo

Origem: projeto RCA/FFM (27/10/2026). O `.app` reempacotado sem a pasta do app na raiz travou o
`FwCallApp` em "Verificando atualizações..."; o proxy de dev precisou de script próprio (Basic lido
de arquivo, `tenantId`, remoção do `Origin` — sem CORS o REST responde 401 a requisição com Origin);
a abertura pelo menu foi validada com Playwright próprio; o filtro de status com bolinha da legenda
usou `p-combo-option-template` + `p-remove-initial-filter` (ausente da referência).

Versões: plugin 1.16.2 → **1.17.0**; extensão poui-vscode 1.3.1 → **1.4.0**.
Fechamento: testes verdes (plugin `npm test`, extensão `npm run test:unit` + compile), commit,
push para origin, tag, `.vsix`. `latest_version` do gist fica com o Andre (`bump-version --no-gist`).

## Fase 1 — Docs do po-combo (plugin)
- `skills/poui-components/form-fields.md`: `p-remove-initial-filter` e padrão "bolinha da legenda no
  combo" (template de opção + bolinha do selecionado sobreposta + teste com `jasmine.objectContaining`,
  pois o po-combo grava `selected` nas opções).
- `skills/poui-patterns/po-ui-quirks.md`: quirk 19 (combo abre filtrado pelo valor atual).

## Fase 2 — Proxy dev com login (plugin + extensão)
- Novo formato `proxy.conf.js` (alvo, usuário e tenantId no arquivo; senha/token lidos em tempo de
  execução de `protheus-dev.psw`, só com a senha, no `.gitignore`),
  `Authorization` sobrescrito no `proxyReq` (o ProtheusLibCore manda `Bearer` vazio fora do Protheus),
  `tenantId` opcional, `Origin` removido; `configure` (Vite, Angular 17+) e `onProxyReq` (webpack).
- Extensão: `protheusProxy.ts` → `buildProxyConfigJs()`; `generateConnect.ts` grava `proxy.conf.js` +
  arquivo de senha (gitignored) em vez de Basic em base64 no `proxy.conf.json`; testes unitários.
- Plugin: `skills/poui-connect/SKILL.md`, `commands/connect.md`, `skills/poui-e2e/SKILL.md` com o novo formato.

## Fase 3 — doctor (plugin + extensão)
- Extensão: `appDoctor.ts` (puro: lê o diretório central do zip sem dependências; analisa raiz
  `<app>/`, `index.html`, entradas fora da raiz, prefixo `dist/`; varre `<RootPath>/http-root/app-root`
  por arquivos soltos do pacote e pela pasta `<app>_env_*`, compara `index.html` extraído × pacote)
  + `generateDoctor.ts` (`poui.doctor`, setting `poui.protheusRootPath`) + menu/árvore + package.json + testes.
- Plugin: `commands/doctor.md` (mesmas checagens via PowerShell) + troubleshooting.

## Fase 4 — smoke-protheus (plugin + extensão)
- Script Playwright reaproveitável (`assets/smoke/smoke-protheus.mjs` na extensão; mesmo conteúdo
  referenciado pelo comando do plugin): WebApp → programa inicial → ambiente → login (senha de arquivo)
  → pesquisa no menu → captura rede/console → resultado: frame `<app>_env_` carregado, chamadas da API
  (status), erros de console, screenshot. Seletores descobertos na WebApp local.
- Extensão: `poui.smokeProtheus` + settings (`webAppUrl`, `program`, `environment`, `user`,
  `passwordFile`, `menuSearch`) + testes da lógica de análise do log.
- Plugin: `commands/smoke-protheus.md`.

## Fase 5 — Documentação e release
- README/CHANGELOG do plugin e da extensão, `docs/quickstart.md`, `test-plugin.js` (arquivos obrigatórios),
  `DESENVOLVIMENTO.md` (QA manual dos 3 comandos).
- `node scripts/bump-version.js 1.17.0 --no-gist`, extensão 1.4.0, `npm test`, `npm run test:unit`,
  `npm run package` (vsix), commit, tag, push. `sync-to-cache.ps1` para o cache local.

## Estado
- [ ] Fase 1  - [ ] Fase 2  - [ ] Fase 3  - [ ] Fase 4  - [ ] Fase 5
