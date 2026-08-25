# PO-UI Specialist — extensão VS Code (Fase 3)

Gera componentes Angular PO-UI de 3 famílias diretamente do VS Code —
**Lista/Browse** (`page-list`, `page-dynamic-search`, `stacked-browse`,
`two-panel-browse`, `action-list`, `master-detail`), **Formulários**
(`page-edit`, `page-detail`, `modal-crud`, `stepper-form`) e
**Infraestrutura** (`service`, `dashboard`, `tlpp-contract`,
`auth-login`). Roda o Claude Code CLI (`claude`) como subprocesso,
reaproveitando a sessão já autenticada no claude.ai — sem API key
separada, mas dependente do CLI instalado na máquina.

Após gerar os arquivos com sucesso, a extensão roda `ng build
--configuration development` automaticamente para verificar o
resultado. Se o build falhar com erros localizados nos arquivos que ela
acabou de gerar, tenta corrigi-los sozinha (até 3 tentativas, cada uma
seguida de uma nova verificação de build); erros pré-existentes no
projeto (fora dos arquivos gerados nesta execução) nunca são "corrigidos"
automaticamente — só reportados.

Também gera testes unitários Karma + Jasmine (`PO-UI: Gerar Teste
Unitário`) para qualquer `.component.ts`/`.service.ts` do projeto —
gerado pelo plugin ou legado — via um seletor de arquivo. Diferente da
geração de componentes, não roda `ng test` automaticamente depois: o
spec é escrito e cabe a você rodar `ng test` para verificar.

`PO-UI: Lint de Componentes` e `PO-UI: Auditoria de Qualidade` **não
usam o Claude Code CLI** — são só análise por regex/texto sobre arquivos
já no disco. O lint roda 14 verificações conhecidas (`ChangeDetectionStrategy.OnPush`
ausente, `*ngIf`/`*ngFor` legados, `p-selected-rows`/`p-max-length`
incorretos em `po-table`/`po-input`, etc.) numa pasta escolhida, com
correção automática opcional para 7 delas; a auditoria de qualidade
varre `src/app` inteiro procurando componentes gerados pelo plugin
(marca `@generated  poui-specialist`) e classifica cada um em
Aprovado/Atenção/Crítico — só leitura, nunca modifica nada.

`PO-UI: Revisar Código` volta a usar o Claude Code CLI — pede um arquivo
ou pasta e um foco (boas práticas, performance, acessibilidade,
segurança, quirks PO-UI, qualidade, ou todas), e reporta os achados como
texto no output channel. Diferente dos demais comandos que chamam o
CLI, roda com um conjunto de ferramentas restrito a leitura
(`Read,Glob,Grep` — sem `Write`/`Edit`), já que revisão nunca deve poder
alterar código sozinha.

`PO-UI: Preview no Browser` **não usa o Claude Code CLI nem Playwright**
— diferente do `poui-preview`/`poui-e2e` originais (que rodam num chat
sem tela e por isso precisam de MCP + screenshot), a extensão roda no
computador do usuário com um browser de verdade disponível. O comando
registra a rota em `app.routes.ts` (se ainda não existir), sobe
`ng serve` numa porta livre (4200-4209, detectada via `net` do Node) e
abre a URL no browser padrão do sistema via `vscode.env.openExternal`.
O dev server continua rodando em background depois — não há comando de
"parar" nesta fatia.

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
   tipo no `QuickPick` (agrupado por família: Lista/Browse, Formulários,
   Infraestrutura) e informe o nome da entidade e o módulo de destino
   (pulado automaticamente para `auth-login`, que sempre vai em
   `src/app/auth/`)
6. Ou rode `PO-UI: Gerar Teste Unitário` na paleta, selecione um
   `.component.ts`/`.service.ts` existente no diálogo de arquivo (começa
   em `src/app`) e aguarde o `.spec.ts` ser escrito ao lado
7. Ou rode `PO-UI: Lint de Componentes`, selecione uma pasta, veja o
   relatório no output channel "PO-UI" e escolha se quer aplicar as
   correções automáticas disponíveis
8. Ou rode `PO-UI: Auditoria de Qualidade` (sem escolher nada) para ver o
   relatório de todos os componentes gerados pelo plugin em `src/app`
9. Ou rode `PO-UI: Revisar Código`, selecione um arquivo ou pasta,
   escolha o foco no `QuickPick` e veja o relatório de achados no output
   channel "PO-UI"
10. Ou rode `PO-UI: Preview no Browser`, selecione um `.component.ts` já
    gerado e aguarde o browser abrir sozinho na rota do componente

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
6b. **Build-fix automático** — logo após uma geração bem-sucedida (cenário 5
    ou 7-10), observe o output channel "PO-UI": deve aparecer "Verificando o
    build..." seguido de "✓ Build passou na tentativa 1." (build já limpo) ou,
    se introduzir deliberadamente um erro de tipo num arquivo gerado antes de
    rodar o comando, das mensagens "✗ Build falhou... corrigindo (tentativa
    N/3)..." até "✓ Build passou na tentativa N." → esperado: a notificação
    final some "build ok." ao sucesso, ou "build ainda com erro(s)" (aviso, não
    erro) se as 3 tentativas se esgotarem.
7. **Outro tipo da família Lista** — rode `PO-UI: Gerar Componente` de novo,
   escolha um tipo diferente (ex: `Stacked Browse` ou `Action List`) →
   esperado: geração usando os arquivos de referência daquele tipo
   específico (não os de `page-list`), mesmo fluxo de nome/módulo/endpoint.
8. **Tipo da família Formulários** — escolha `Page Edit` ou `Modal CRUD` →
   esperado: geração usando os arquivos de referência de
   `code-generator-forms.md` (formulário com `po-dynamic-form`), não os de
   Lista/Browse.
9. **Tipo sem módulo (`auth-login`)** — escolha `Auth Login` → esperado: a
   pergunta de módulo é pulada (log no output channel confirmando o destino
   fixo `auth`), geração direto em `src/app/auth/`.
10. **Tipo sem componente Angular (`tlpp-contract` ou `service`)** —
    escolha um dos dois → esperado: geração usando os arquivos de
    referência de `code-generator-infra.md`, sem necessariamente criar
    `.component.ts/html/scss` (conforme a convenção do próprio tipo).
11. **Gerar teste unitário** — rode `PO-UI: Gerar Teste Unitário`, selecione
    um `.component.ts` gerado num cenário anterior (ex: o de `Fornecedores`
    do cenário 5) → esperado: diálogo de arquivo abrindo em `src/app`,
    geração do `.spec.ts` ao lado do componente, notificação final "teste
    gerado. Rode `ng test` manualmente..." (sem `ng test` rodando sozinho).
    Depois, rode `ng test --include="<specPath>" --watch=false` manualmente
    para confirmar que o spec compila e passa.
12. **Gerar teste para arquivo inválido** — rode `PO-UI: Gerar Teste
    Unitário` e tente selecionar algo que não seja `.component.ts`/
    `.service.ts` (ex: um `.html`) → esperado: como o diálogo já filtra por
    `.ts`, selecione um `.ts` que não seja componente/service (ex: um
    `.module.ts`) → erro "selecione um arquivo `.component.ts` ou
    `.service.ts`", sem chamar o CLI.
13. **Lint com problemas corrigíveis** — introduza deliberadamente um
    componente sem `OnPush` e com `p-max-length` no template, rode `PO-UI:
    Lint de Componentes`, selecione a pasta → esperado: relatório no
    output channel listando os achados por severidade, prompt "Aplicar as
    correções automáticas disponíveis?" → escolha "Aplicar correções" →
    esperado: os arquivos são reescritos (`OnPush` adicionado,
    `p-max-length` virou `p-maxlength`), resumo de fixes aplicados +
    pendências manuais, e `ng build --configuration development` continua
    passando depois.
14. **Lint sem problemas** — rode `PO-UI: Lint de Componentes` numa pasta
    já limpa → esperado: "Nenhum problema encontrado." no relatório, sem
    prompt de correção.
15. **Auditoria de qualidade** — rode `PO-UI: Auditoria de Qualidade` (sem
    escolher pasta) → esperado: relatório agrupando os componentes com a
    marca `@generated  poui-specialist` em Aprovados/Atenção/Críticos,
    seção de rotas auditadas se `app.routes.ts` existir, notificação final
    com a contagem de cada categoria.
16. **Revisar código** — rode `PO-UI: Revisar Código`, selecione uma pasta
    (ex: `src/app/financeiro`), escolha o foco "Todas as categorias" →
    esperado: relatório de achados por arquivo/severidade no output
    channel "PO-UI", notificação final "revisão concluída", e nenhum
    arquivo do projeto modificado (confira com `git status` depois).
17. **Revisar com foco específico** — rode `PO-UI: Revisar Código` de novo
    escolhendo "Segurança" → esperado: achados restritos à categoria
    (`bypassSecurityTrust*`, URL hardcoded, concatenação em HTTP), sem
    misturar com os das outras categorias.
18. **Preview de um componente novo** — rode `PO-UI: Preview no Browser`,
    selecione um `.component.ts` gerado num cenário anterior cuja rota
    ainda não existe em `app.routes.ts` → esperado: output channel mostra
    "Rota registrada: <módulo>/<kebab-name>", `app.routes.ts` ganha a
    nova entrada `loadComponent`, "Iniciando dev server na porta 4200...",
    e o browser padrão do sistema abre sozinho em
    `http://localhost:4200/<módulo>/<kebab-name>` mostrando o componente.
19. **Preview de rota já registrada** — rode `PO-UI: Preview no Browser`
    de novo apontando pro mesmo componente do cenário 18, sem fechar o
    dev server anterior → esperado: "Rota já registrada: ..." (sem
    duplicar a entrada em `app.routes.ts`); como o comando não rastreia
    servidores já rodando, a porta 4200 aparece ocupada e ele sobe **um
    segundo** `ng serve` na próxima porta livre (4201) e abre o browser
    nela — limitação conhecida desta fatia (sem reaproveitar servidor
    já no ar), ok pra esse teste, mas encerre os processos `ng serve`
    manualmente no terminal ao final.

## Escopo desta fase

14 tipos disponíveis via `PO-UI: Gerar Componente`, agrupados por família
no `QuickPick`:

- **Lista/Browse**: `page-list`, `page-dynamic-search`, `stacked-browse`,
  `two-panel-browse`, `action-list`, `master-detail`
- **Formulários**: `page-edit`, `page-detail`, `modal-crud`, `stepper-form`
- **Infraestrutura**: `service`, `dashboard`, `tlpp-contract`, `auth-login`

Toda geração é seguida automaticamente por uma verificação de build
(`ng build --configuration development`) com correção automática de até
3 tentativas, restrita a erros localizados nos arquivos gerados nesta
mesma execução (equivalente ao `poui-build-fix` do plugin original).

`PO-UI: Gerar Teste Unitário` (comando `poui.generate.test`) gera specs
Karma + Jasmine (equivalente ao `/poui-specialist:test` do plugin
original) para qualquer `.component.ts`/`.service.ts` do projeto,
apontado via um diálogo de arquivo — não roda `ng test` automaticamente.

`PO-UI: Lint de Componentes` (`poui.lint`, equivalente a
`/poui-specialist:lint <path> [--fix]`) e `PO-UI: Auditoria de Qualidade`
(`poui.quality`, equivalente à skill `poui-quality`) não usam o Claude
Code CLI — são regex/texto puro sobre arquivos no disco. O lint cobre as
14 verificações do plugin original; 7 têm correção automática nesta
versão (`L01`, `L02`, `L06`, `L07`, `H03`, `H04`, `H06`) — `H01`/`H02`
(`*ngIf`/`*ngFor` → `@if`/`@for`) ficam só como relatório porque a
reescrita seguraria exigiria balancear a tag de fechamento em HTML
arbitrário, risco maior do que vale nesta fatia.

`PO-UI: Revisar Código` (`poui.review`, equivalente a
`/poui-specialist:review <file|directory> [--focus <categoria>]`) volta
a usar o Claude Code CLI, mas com o conjunto de ferramentas restrito a
`Read,Glob,Grep` (sem `Write`/`Edit`) via o novo campo opcional
`RunAgentOptions.tools` de `agentRuntime.ts` — igual ao comando
original, que também não inclui ferramentas de escrita. Cobre as mesmas
6 categorias (boas práticas, performance, acessibilidade, segurança,
quirks PO-UI, qualidade) via o único arquivo de referência
`agents/code-reviewer.md`.

`PO-UI: Preview no Browser` (`poui.preview`, equivalente ao `poui-
preview` original) **não usa o Claude Code CLI nem Playwright** — a
extensão roda no computador do usuário com um browser real disponível,
então em vez de MCP + screenshot ela registra a rota em
`app.routes.ts` (`src/previewRoutes.ts`), sobe `ng serve` numa porta
livre 4200-4209 (`src/devServer.ts`, detecção via `net` do Node, sem
PowerShell/netstat) e abre o browser padrão do sistema via
`vscode.env.openExternal`. Limitação conhecida: não rastreia servidores
já em execução, então rodar o comando duas vezes sobe dois `ng serve`
em portas diferentes (ver cenário de QA 19).

**Adiados deliberadamente** (não são bugs — decisão de escopo por
orçamento de tempo/tokens da sessão, ver memória do projeto):
`module` (cria um app inteiro do zero, semântica diferente dos demais
tipos), `refactor` (precisa de um passo de seleção de arquivo `.prw`/
`.tlpp` que a extensão ainda não tem) e a skill `discover` (analisa um
endpoint REST fazendo uma chamada HTTP real contra um backend Protheus —
arquitetura bem diferente dos geradores). A correção automática de
`H01`/`H02` no lint (ver acima), a sidebar tree view, um comando de
"parar o dev server" para o preview, e `e2e` (o único item realmente
restante do plugin original — precisa do agente controlando um browser
ao vivo via Playwright/MCP dentro do CLI headless, uma peça de
arquitetura nova que merece sua própria investigação) ficam para depois
— ver
`docs/superpowers/specs/2026-08-21-vscode-extension-phase0-design.md`.
