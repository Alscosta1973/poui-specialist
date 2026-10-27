# Changelog

## 1.6.0

- **Novo `PO-UI: Logo do Cliente (customização)`** (gratuito):
  - você escolhe um `.docx` (ex.: o documento do cliente com o logo colado) ou imagens, e indica qual é o logo com nome;
  - a extensão tira o fundo opaco, corta as bordas e, sem símbolo separado, gera o símbolo a partir do logo (a forma da esquerda, sem o texto);
  - grava em `public/assets/logos/` e liga o menu aberto (`p-logo`), o menu recolhido (`p-short-logo`) e o avatar da barra.
- **O Scaffold pergunta "O projeto é uma customização para um cliente?"**: sim aplica o logo do cliente; não mantém o logo TOTVS.
- **Shell do Scaffold no padrão TOTVS revisto:**
  - menu sem o campo "Pesquisar" (como o FINA710);
  - avatar da barra sempre presente (TOTVS por padrão);
  - "Carregando" (`po-loading-overlay`) também no "carregar mais".
## 1.5.0

- **Padrão visual TOTVS no Scaffold** — o projeto novo sai igual aos apps nativos do Protheus (Novo Gestor Financeiro, Análise de Crédito):
  - **Fonte e tamanhos:** NunitoSans e tamanhos do tema; o `styles.scss` não importa mais Open Sans.
  - **Barra superior:** "Nome - vX.Y.Z", com a versão em `src/app/app-version.ts`, e o usuário logado (`ProThreadInfoService`, só dentro do Protheus).
  - **Menu:** fica recolhido e abre ao passar o mouse (`p-automatic-toggle`), com o logo TOTVS (`@totvs/common-assets`, agora instalado). Recolhe a cada navegação.
  - **Ícones:** Animalia (`an an-*`), porque os `po-icon-*` não existem no PO-UI 21.
- **Lint — novas verificações:**
  - **H08:** `po-combo` ligado a valor sem `[p-remove-initial-filter]="true"` (abre mostrando só a opção escolhida), com correção automática.
  - **H09:** `po-menu` sem `p-collapsed`, `p-automatic-toggle` ou `p-logo`.
  - **S01:** `styles.scss` com fonte própria ou tamanhos do tema sobrepostos.
- **Lint — também analisa o shell `app.ts`/`app.html` do Angular 21**, sem L06/L07, que não se aplicam a ele.
## 1.4.0

- Novo `PO-UI: Diagnosticar App no Protheus (doctor)` — para a rotina que fica em "Verificando atualizações...": confere o `Resource/<projeto>.app` (pasta do projeto na raiz do zip, `index.html`, prefixo `dist/`) e, com o RootPath do ambiente (`poui.protheusRootPath`), o que o `FwCallApp` extraiu em `http-root/app-root` (itens soltos de um pacote errado, pasta `<app>_env_*`, build desatualizado). Só leitura, gratuito.
- Novo `PO-UI: Smoke no Protheus (abrir pelo menu)` — Playwright entra na WebApp, faz login (senha lida de arquivo, nunca exibida), confirma a sessão, pesquisa a rotina no menu e relata se o app abriu, as chamadas de API (status) e os erros de console do app, com screenshot em `smoke-results/`. Configuração em `poui.smoke.*`.
- `PO-UI: Conectar ao Protheus` agora gera `proxy.conf.js` em vez de `proxy.conf.json` com `Basic` fixo: a senha/token fica em `protheus-dev.secret` (no `.gitignore`), o `Authorization` é sobrescrito a cada requisição (o ProtheusLibCore manda `Bearer` vazio fora do Protheus), envia `tenantId` e remove o `Origin` — sem CORS o REST do Protheus devolve 401 em POST/PUT/DELETE. Migra o script `start` do scaffold e as outras entradas do `proxy.conf.json`.

## 1.3.1

- README reescrito só pro usuário final (instalação, requisitos, tabela de comandos); notas de desenvolvimento movidas pra `docs/DESENVOLVIMENTO.md`.
- `PO-UI: Gerar Componente` agora confere `angular.json` antes de rodar o CLI — se a pasta aberta não for um projeto Angular, oferece rodar o Scaffold direto, em vez de falhar em prosa no fim.
- MCP isolado por padrão em todo comando que não pede explicitamente (só o E2E usa) — evita vazar conectores pessoais da conta (Google Drive, Windsor.ai etc.) pra dentro de uma geração comum.
- Painel "PO-UI" na activity bar virou uma árvore nativa com ícone por categoria (Exemplos de Comandos, Geração, Integração e Deploy, Qualidade e Revisão, Utilitários, Configuração) — as categorias fora de Exemplos de Comandos rodam o comando direto no clique.
- Novo `PO-UI: Verificar Ambiente` — confere Node, Angular CLI, o motor de IA configurado, Git e 7-Zip; roda sozinho na primeira instalação e oferece instalar o Angular CLI com um clique quando falta.
- Motor **Codex**: corrigido de verdade (estava quebrado desde que o multi-engine foi implementado) — system prompt agora vai por stdin (a flag usada antes não existe), sandbox `danger-full-access` pra escrever sem travar em aprovação, `--skip-git-repo-check`, e detecção de arquivo gerado corrigida.
- Motor **Gemini**: login gratuito removido (Google descontinuou pra contas individuais) — só API key funciona agora; corrigido um resíduo de config que fazia a extensão ignorar uma API key válida; timeout do teste de conexão aumentado e com opção de "Continuar mesmo assim" quando o servidor do provedor está sobrecarregado.

## 1.3.0

- Trial agora expira no que vier primeiro: 14 dias **ou** 40 créditos (peso por `poui.effort`: low/medium=1, high=2, xhigh/max=3) — fecha a brecha de dar pra construir um projeto inteiro dentro dos 14 dias sem nunca pagar.
- O relógio de 14 dias só começa a contar no primeiro comando pago rodado, não na instalação — instalar e não usar não gasta trial.
- Status bar e avisos de trial agora mostram uma porcentagem única de uso, em vez de "N dias restantes".

## 1.2.0

- Item da status bar mostrando o status da licença (trial com dias restantes, ou aviso de licença necessária) — antes só aparecia num toast de 5s ao rodar um comando pago.
- Botão "Comprar Licença" nos avisos de trial/licença expirada, e opção de compra no próprio comando "PO-UI: Ativar Licença".
- Mensagem de boas-vindas na primeira instalação, com atalho pro guia rápido.
- Aviso de "o que há de novo" ao atualizar de versão.
- Extensão empacotada num único arquivo (`esbuild`) — menos arquivos no `.vsix`, ativação mais rápida.

## 1.1.1

- Bump de versão (sem mudança de código).

## 1.1.0

- Galeria de templates: painel "PO-UI" na activity bar listando os 22 tipos que `poui.generate.component` sabe gerar, agrupados por categoria, com preview de tela pros tipos que geram tela.
- Walkthrough nativo do VS Code com um resumo rápido de Gerar Componente, Revisar Código e Lint.
- Ordem alfabética dentro de cada grupo do "PO-UI: Menu".

## 1.0.0

- Primeiro empacotamento `.vsix` pra distribuição interna.
- Licenciamento por trial (14 dias) + chave paga via Cloudflare Worker.
