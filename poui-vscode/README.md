# PO-UI Specialist — extensão VS Code (Fase 1)

Gera componentes Angular PO-UI da família Lista/Browse diretamente do VS
Code: `page-list`, `page-dynamic-search`, `stacked-browse`,
`two-panel-browse`, `action-list` e `master-detail`. Roda o Claude Code
CLI (`claude`) como subprocesso, reaproveitando a sessão já autenticada
no claude.ai — sem API key separada, mas dependente do CLI instalado na
máquina.

## Rodando em desenvolvimento

1. Tenha o [Claude Code CLI](https://code.claude.com) instalado e logado
   (`claude` no PATH, `claude --version` funcionando — a extensão usa a
   mesma sessão do claude.ai já autenticada, sem API key separada)
2. `cd poui-vscode && npm install`
3. Pressione **F5** no VS Code (roda a task `npm: compile` e abre um
   "Extension Development Host")
4. Abra uma pasta de projeto Angular (ex: `examples/modulo-compras` deste
   repo) como workspace do host de desenvolvimento
5. Rode `PO-UI: Gerar Componente` na paleta (`Ctrl+Shift+P`), escolha o
   tipo (page-list, page-dynamic-search, stacked-browse, two-panel-browse,
   action-list ou master-detail) e informe o nome da entidade e o módulo
   de destino

## Testes

- `npm run test:unit` — testes rápidos (Mocha, sem Electron)
- `npm test` — testes de integração via `@vscode/test-electron` (baixa um
  binário do VS Code na primeira execução — precisa de internet)

## QA manual

Com o Extension Development Host rodando (F5) e `examples/modulo-compras`
(módulo `compras`) aberto como workspace, executar e registrar o resultado
(pass/fail + notas) de cada cenário:

1. **Sem workspace aberto** — feche a pasta do workspace e rode `PO-UI: Gerar
   Componente` → esperado: o erro "abra uma pasta de projeto Angular antes de
   gerar um componente" e nenhum prompt adicional (nem o `QuickPick` de tipo).
2. **CLI não instalado/não logado** — renomeie temporariamente o binário
   `claude` do PATH (ou rode num ambiente sem ele) e rode `PO-UI: Gerar
   Componente` → esperado: erro orientando instalar/logar o Claude Code CLI,
   sem travar a extensão.
3. **Nome em minúsculas** — rode `PO-UI: Gerar Componente`, escolha `Page
   List`, use o nome de entidade `fornecedores` → esperado: o aviso "nome
   corrigido para PascalCase: Fornecedores" e a geração prosseguindo.
4. **Módulo inválido** — digite `Compras Financeiro` (contém espaço/maiúscula)
   no prompt de módulo → esperado: mensagem de validação inline bloqueando o
   envio até ser corrigido para `compras`.
5. **Caminho feliz** — entidade `Fornecedores`, módulo `compras`, aceitando o
   endpoint padrão → esperado: saída em streaming no output channel "PO-UI",
   uma notificação final com a contagem de arquivos e, ao clicar em "Abrir
   arquivo gerado", o `.component.ts` gerado abre no editor.
6. **Build real** — em um terminal, `cd examples/modulo-compras && npm run build`
   (ou `ng build --configuration development`, já que os `budgets` padrão de
   produção desse projeto de exemplo são apertados demais mesmo sem nenhum
   componente novo) → esperado: compilação bem-sucedida com os arquivos
   recém gerados incluídos, sem erros de TypeScript.
7. **Outro tipo da família Lista** — rode `PO-UI: Gerar Componente` de novo,
   escolha um tipo diferente (ex: `Stacked Browse` ou `Action List`) →
   esperado: geração usando os arquivos de referência daquele tipo
   específico (não os de `page-list`), mesmo fluxo de nome/módulo/endpoint.

## Escopo desta fase

6 tipos da família Lista/Browse disponíveis via `PO-UI: Gerar Componente`:
`page-list`, `page-dynamic-search`, `stacked-browse`, `two-panel-browse`,
`action-list` e `master-detail`. A sidebar tree view e os demais tipos/
comandos do plugin `poui-specialist` ficam para fases futuras — ver
`docs/superpowers/specs/2026-08-21-vscode-extension-phase0-design.md`.
