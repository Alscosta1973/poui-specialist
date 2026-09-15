# Changelog

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
