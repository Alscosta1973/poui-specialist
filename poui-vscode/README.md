# PO-UI Specialist — extensão VS Code (Fase 0)

Prova de conceito: gera um componente Angular PO-UI `page-list` diretamente
do VS Code, sem depender do Claude Code CLI. Usa o Claude Agent SDK
embutido, autenticado com sua própria API key da Anthropic.

## Rodando em desenvolvimento

1. `cd poui-vscode && npm install`
2. Pressione **F5** no VS Code (roda a task `npm: compile` e abre um
   "Extension Development Host")
3. No host de desenvolvimento, rode `PO-UI: Configurar API Key` na paleta
   (`Ctrl+Shift+P`) e informe sua `ANTHROPIC_API_KEY`
4. Abra uma pasta de projeto Angular (ex: `examples/modulo-compras` deste
   repo) como workspace do host de desenvolvimento
5. Rode `PO-UI: Gerar Page List` na paleta, informe o nome da entidade e o
   módulo de destino

## Testes

- `npm run test:unit` — testes rápidos (Mocha, sem Electron)
- `npm test` — testes de integração via `@vscode/test-electron` (baixa um
  binário do VS Code na primeira execução — precisa de internet)

## Escopo desta fase

Só o comando `PO-UI: Gerar Page List` (tipo `page-list`) está implementado.
Os demais tipos de geração e os outros comandos do plugin `poui-specialist`
ficam para fases futuras — ver
`docs/superpowers/specs/2026-08-21-vscode-extension-phase0-design.md`.
