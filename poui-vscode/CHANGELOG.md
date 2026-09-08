# Changelog

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
