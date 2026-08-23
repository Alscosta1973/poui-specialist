# PO-UI Specialist — extensão VS Code (Fase 0)

Prova de conceito: gera um componente Angular PO-UI `page-list` diretamente
do VS Code. Roda o Claude Code CLI (`claude`) como subprocesso,
reaproveitando a sessão já autenticada no claude.ai — sem API key
separada, mas dependente do CLI instalado na máquina.

## Rodando em desenvolvimento

1. Tenha o [Claude Code CLI](https://code.claude.com) instalado e logado
   (`claude` no PATH, `claude --version` funcionando — a extensão usa a
   mesma sessão do claude.ai já autenticada, sem API key separada)
2. `cd poui-vscode && npm install`
3. Pressione **F5** no VS Code (roda a task `npm: compile` e abre um
   "Extension Development Host")
4. Abra uma pasta de projeto Angular (ex: `examples/modulo-compras` deste
   repo) como workspace do host de desenvolvimento
5. Rode `PO-UI: Gerar Page List` na paleta (`Ctrl+Shift+P`), informe o
   nome da entidade e o módulo de destino

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
2. **CLI não instalado/não logado** — renomeie temporariamente o binário
   `claude` do PATH (ou rode num ambiente sem ele) e rode `PO-UI: Gerar
   Page List` → esperado: erro orientando instalar/logar o Claude Code CLI,
   sem travar a extensão.
3. **Nome em minúsculas** — rode `PO-UI: Gerar Page List` com o
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
