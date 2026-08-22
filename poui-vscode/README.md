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

## QA manual

Com o Extension Development Host rodando (F5) e `examples/modulo-compras`
(módulo `compras`) aberto como workspace, executar e registrar o resultado
(pass/fail + notas) de cada cenário:

1. **Sem workspace aberto** — feche a pasta do workspace e rode `PO-UI: Gerar
   Page List` → esperado: o erro "abra uma pasta de projeto Angular antes de
   gerar um componente" e nenhum prompt adicional.
2. **Sem API key configurada** — com um workspace aberto, mas antes de rodar
   `PO-UI: Configurar API Key`, rode `PO-UI: Gerar Page List` → esperado: o erro
   com o botão "Configurar API Key"; clicar nele abre a caixa de entrada da key.
3. **Nome em minúsculas** — configure a API key e rode o comando novamente com o
   nome de entidade `fornecedores` → esperado: o aviso "nome corrigido para
   PascalCase: Fornecedores" e a geração prosseguindo.
4. **Módulo inválido** — digite `Compras Financeiro` (contém espaço/maiúscula)
   no prompt de módulo → esperado: mensagem de validação inline bloqueando o
   envio até ser corrigido para `compras`.
5. **Caminho feliz** — entidade `Fornecedores`, módulo `compras`, aceitando o
   endpoint padrão → esperado: saída em streaming no output channel "PO-UI",
   uma notificação final com a contagem de arquivos e, ao clicar em "Abrir
   arquivo gerado", o `.component.ts` gerado abre no editor.
6. **Build real** — em um terminal, `cd examples/modulo-compras && npm run build`
   (ou `ng build`) → esperado: compilação bem-sucedida com os arquivos recém
   gerados incluídos, sem erros de TypeScript.

## Escopo desta fase

Só o comando `PO-UI: Gerar Page List` (tipo `page-list`) está implementado.
Os demais tipos de geração e os outros comandos do plugin `poui-specialist`
ficam para fases futuras — ver
`docs/superpowers/specs/2026-08-21-vscode-extension-phase0-design.md`.
