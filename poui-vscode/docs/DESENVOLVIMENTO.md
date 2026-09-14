# Desenvolvimento — notas internas (uso pessoal, Andre Costa)

Este arquivo existe só para referência própria durante o desenvolvimento
da extensão. Não faz parte da documentação pública (README.md, exibido na
aba "Detalhes" do VS Code) porque não há contribuição externa prevista —
ninguém além de mim mexe neste código-fonte.

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
11. Ou rode `PO-UI: Gerar Teste E2E (Playwright)` (depois de já ter
    rodado o Preview nesse componente pelo menos uma vez, pra rota
    existir), selecione o `.component.ts` e aguarde
    `e2e/<nome>.e2e.spec.ts` ser escrito

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
11b. **Aviso de Karma ausente — continuar sem configurar** — num projeto
     sem target `test` em `angular.json` (ou renomeie temporariamente o
     `angular.json` do `modulo-compras`), rode `PO-UI: Gerar Teste
     Unitário` → esperado: aviso "este projeto não parece ter o Karma
     configurado..." com dois botões, **"Configurar Karma"** e
     **"Continuar sem configurar"** → clique no segundo → esperado: segue
     normal pro diálogo de arquivo e gera o teste. Fechar o aviso sem
     clicar em nenhum botão cancela o comando inteiro (decisão explícita
     exigida, diferente das fases anteriores).
11c. **Configurar Karma pelo botão** — mesmo cenário acima, mas clique em
     **"Configurar Karma"** → esperado: barra de progresso "PO-UI:
     configurando Karma...", output channel narrando cada passo (`npm
     install`, `karma.conf.js`, `angular.json`, `tsconfig.spec.json`/
     `tsconfig.json`), notificação final "Karma configurado! Rode... de
     novo", e o comando encerra sem abrir o diálogo de arquivo (rode `PO-UI:
     Gerar Teste Unitário` de novo pra confirmar que o aviso não aparece
     mais).
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
20. **E2E sem rota registrada** — rode `PO-UI: Gerar Teste E2E
    (Playwright)` num componente que nunca passou pelo Preview →
    esperado: erro "a rota `<módulo>/<nome>` ainda não está registrada
    em app.routes.ts — rode PO-UI: Preview no Browser neste componente
    primeiro", sem subir dev server nem chamar o CLI.
21. **E2E de verdade** — rode `PO-UI: Preview no Browser` no
    `fornecedores-list` primeiro (garante a rota), depois `PO-UI: Gerar
    Teste E2E (Playwright)` no mesmo componente → esperado: dev server
    sobe, output channel narra o agente usando `browser_navigate`/
    `browser_snapshot` (bloco `→ mcp__playwright__browser_...`),
    `e2e/fornecedores-list.e2e.spec.ts` é escrito com seletores reais
    (não genéricos) descobertos no snapshot, notificação final "teste
    E2E gerado. Rode `npx playwright test` manualmente...".
22. **Configurar Playwright pelo botão** — num projeto sem
    `playwright.config.ts`/`.js`, rode `PO-UI: Gerar Teste E2E
    (Playwright)` → aviso com os botões **"Configurar Playwright"**/
    **"Continuar sem configurar"** → clique em "Configurar Playwright" →
    esperado: barra de progresso avisando que pode demorar (download do
    Chromium), output channel narrando `npm install`, instalação do
    Chromium e criação do `playwright.config.ts`, notificação final
    "Playwright configurado! Rode... de novo". Rode o comando de novo
    depois e confirme que o aviso não aparece mais.

## Decisões de escopo adiadas deliberadamente

Não são bugs — decisão de escopo por orçamento de tempo/tokens da sessão,
ver memória do projeto: a skill `discover` (analisa um endpoint REST
fazendo uma chamada HTTP real contra um backend Protheus — arquitetura
bem diferente dos geradores). A correção automática de `H01`/`H02`
(`*ngIf`/`*ngFor` → `@if`/`@for`) no lint — ficam só como relatório
porque a reescrita segura exigiria balancear a tag de fechamento em HTML
arbitrário, risco maior do que vale nesta fatia. A sidebar tree view, um
comando de "parar o dev server" (preview e e2e sobem servidores que
ficam rodando), e rodar `npx playwright test`/`ng test` automaticamente
depois de gerar (mesma decisão em ambos: gerar é útil mesmo antes do
runner estar configurado) ficam para depois — ver
`docs/superpowers/specs/2026-08-21-vscode-extension-phase0-design.md`.

## Fase 4 — histórico de implementação

`PO-UI: Reverter Componente Gerado` (`poui.undo`, equivalente à skill
`poui-undo`) — igual a `poui.lint`/`poui.quality`, não usa o Claude Code
CLI. Localiza todo arquivo com o marcador `@generated  poui-specialist`
sob `src/app`, agrupa por diretório, mostra um `QuickPick` com os
componentes gerados encontrados, confirma (modal, lista os arquivos)
antes de remover a rota correspondente de `app.routes.ts` e apagar os
arquivos — remove só os arquivos `@generated` do diretório escolhido,
preserva o resto se o diretório for compartilhado com outros arquivos.

`PO-UI: Gerar a partir de Screenshot` (`poui.generate.screenshot`,
equivalente à skill `poui-screenshot`) — diálogo de arquivo pra
escolher uma imagem local (png/jpg/jpeg/gif/webp; **sem suporte a URL**
nesta fatia — exigiria liberar `WebFetch` pro agente, hoje restrito a
`Read,Write,Edit,Glob,Grep`). Em duas fases: (1) análise — chama o CLI
só com a skill `poui-screenshot` como referência e `tools: 'Read,Glob'`
(sem escrita), pedindo um manifesto estruturado (`TYPE:`/`MODULE:`/
`ENTITY:`/`API_PATH:`/`FIELDS:`/`RULES:`) em vez do laudo em texto
livre do plugin original; (2) confirmação real (mostra o manifesto,
pergunta "Gerar agora?") seguida da geração propriamente dita,
reaproveitando 100% o mesmo pipeline de `poui.generate.component`
(`buildGeneratorSystemPrompt`/`buildGeneratorUserPrompt`/
`runClaudeAgent`/`runBuildFixLoop`) com o tipo/nome/módulo/campos
vindos da análise em vez de digitados. **Sem `generate-batch`** — gera
só o componente principal (+ service, se o tipo pedir), não múltiplos
componentes de um manifesto. Validado com um teste real de visão
(`login-preview.png` de `examples/modulo-compras`): o Read leu a
imagem e o modelo devolveu o manifesto exato esperado (`page-edit`,
campos `usuario`/`senha`, regra do ícone de mostrar/ocultar senha).

`PO-UI: Empacotar Projeto (.app)` (`poui.package`, equivalente a
`/poui-specialist:package`) — também não usa o Claude Code CLI, é 100%
determinístico (mesmo padrão de `poui.undo`): corrige o `outputPath` do
`angular.json` se necessário (`{ base: "dist/<projeto>", browser: "" }`
— sem isso o Protheus falha com "Falha ao Ajustar os arquivos Index"),
roda `ng build --configuration production`, compacta `dist/<projeto>`
com 7-Zip preservando `<projeto>/` como raiz do zip (**nunca**
`Compress-Archive` do PowerShell silenciosamente — conhecido por gerar
um `.app` que o Protheus falha ao extrair; se o 7-Zip não for
encontrado, avisa e pede confirmação explícita antes desse fallback
arriscado), verifica a estrutura de verdade (não declara sucesso sem
confirmar `<projeto>/` como raiz via `7z l`), copia para
`Resource/<projeto>.app` e atualiza o `.gitignore`. **Corte de
escopo:** sem `--skip-build`/caminho de projeto externo — sempre builda
fresco no workspace aberto. Validado de ponta a ponta contra
`examples/modulo-compras` de verdade: build (achou e reportou
corretamente uma falha real de orçamento de bundle na primeira
tentativa — comportamento correto, não um bug), depois com orçamento
temporariamente relaxado só para o teste, o caminho completo (build →
zip → verificação → cópia) funcionou e o `.app` gerado foi conferido
de forma independente com `7z l` — `modulo-compras/` confirmado como
raiz do zip.

`PO-UI: Conectar ao Protheus` (`poui.connect`, equivalente à skill
`poui-connect`) — a fatia mais arriscada da Fase 4: mexe em arquivos
reais existentes (não cria novos) e envolve dados de conexão,
possivelmente credenciais. **Desenho em duas partes, diferente do
plugin original** por um motivo de segurança real: o modo `-p`
não-interativo do CLI passa o prompt como argumento literal do
processo — visível a qualquer processo na máquina que liste processos
(Task Manager, WMI). O plugin original roda dentro do chat interativo,
sem esse risco; a extensão precisa evitar introduzi-lo.
- **Parte determinística** (`protheusProxy.ts`, sem CLI) — monta e
  escreve `proxy.conf.json` localmente (URL + header `Authorization`
  Basic/Bearer computado em Node puro), corrige `angular.json`
  (`serve.options.proxyConfig`) e `.gitignore` (`proxy.conf.json` nunca
  vai ao repo). A credencial nunca sai daqui.
- **Parte agentiva** (`connectPromptBuilder.ts` + CLI) — recebe só
  informação não-sensível (caminho do componente, prefixo da API,
  endpoint ou regras de negócio pro contrato TLPP, ações extras,
  preferência de tratamento do interceptor escolhida antes via
  `QuickPick`) e reaproveita o mesmo pipeline de `runClaudeAgent`/
  `runBuildFixLoop`. `ConnectParams` não tem nenhum campo de credencial
  — garantia em tempo de compilação, reforçada por teste unitário que
  varre o prompt gerado por palavras como "senha"/"token"/
  "Authorization".
- Seleção do componente via `showOpenDialog` em `*.component.ts`,
  módulo/classe derivados automaticamente (reaproveita
  `deriveRouteRegistration` do `poui.preview`). **Sem rodar `ng test`
  automaticamente** — mesma política já usada em `poui.generate.test`.

**Validado com uma chamada real e completa** contra um fixture
propositalmente criado com mock (`of(MOCK_ITEMS).pipe(delay(700))` +
interceptor mock registrado em `app.config.ts`) em
`examples/modulo-compras`: o agente diagnosticou os dois mocks
corretamente, reescreveu o service para `this.http.get(...)` real,
removeu o import e o registro do interceptor de `app.config.ts`
(Opção A, como pedido), nunca tocou em `proxy.conf.json` (instruído a
não tocar), e o build passou de primeira. O prompt real enviado ao CLI
foi inspecionado à mão — zero menção a credenciais. Fixture removido
depois — `examples/modulo-compras` voltou limpo.

`PO-UI: Criar Novo Projeto (Scaffold)` (`poui.scaffold`, equivalente a
`/poui-specialist:scaffold`) — a última peça da Fase 4, e a maior
(706 linhas no comando original). **Inteiramente determinístico**,
sem CLI do Claude — `ng new` + dois `ng add` + `npm install` +
edições de `angular.json`/`tsconfig.json` + escrita do shell da
aplicação + `proxy.conf.json` + `git init`/commit + verificação de
build. Diferente de todos os outros comandos, **não exige workspace
aberto** — pergunta a pasta-pai via diálogo de pasta, roda `ng new`
lá dentro, e ao final oferece abrir a pasta nova no VS Code ou iniciar
o servidor (reaproveitando `ensureDevServer` do `poui.preview`/
`poui.generate.e2e`). **Cortes de escopo**: sem `--with-dark-mode`/
`--with-i18n`; sem `--skip-install` (sempre instala); `--demo` virou
uma pergunta sim/não.

**3 bugs reais achados e corrigidos rodando o scaffold de ponta a
ponta de verdade** (não só testes unitários — `ng new`/`ng add`/
`npm install`/`ng build` reais, repetido a cada correção):
1. `tsconfig.json` gerado por `ng new` tem comentários de bloco no
   topo — `JSON.parse` quebra nisso. Corrigido pra busca-e-substituição
   em texto puro (`fixTsconfigStrictness`), igual ao Passo 5 do
   comando original — que já usava texto, não JSON, por esse motivo.
2. **Achado de escopo mais importante**: o Angular CLI 21 atual gera o
   componente raiz como `app.ts`/`app.html`/`app.scss` com a classe
   `App` — não mais `app.component.ts`/`AppComponent` (convenção
   antiga que tanto minha primeira tentativa quanto o
   `commands/scaffold.md` original do plugin assumiam).
   `main.ts` já importa `App` de `./app/app`. Corrigido pra escrever
   nos arquivos certos com o nome de classe certo — **vale propagar
   essa correção pro `commands/scaffold.md` do plugin também**, é o
   mesmo bug lá.
3. `git init`/`add`/`commit` falhava com "Author identity unknown"
   nesta máquina (sem `user.name`/`user.email` configurados
   globalmente) e derrubava o scaffold inteiro por causa disso.
   Corrigido pra melhor-esforço — avisa e continua; o projeto em si
   (o que realmente importa) já estava pronto e não deveria ser
   reportado como falha por uma configuração de git não relacionada.

Validado com 4 execuções reais completas (`qa-scaffold-teste`, com
demo) numa pasta isolada — a última terminou `success: true`, com
`ng build` limpo e `angular.json`/rotas conferidos manualmente contra
os arquivos gerados de verdade. Projeto de teste removido depois.

**Com isso, a Fase 4 está completa** — os 5 comandos restantes do
plugin original (undo, screenshot, package, connect, scaffold) foram
portados. `migrate` ficou de fora deliberadamente (coberto por
`standalone-migrate`).

## Pós-Fase 4 — achados da auditoria de paridade

Uma auditoria plugin×extensão depois da Fase 4 achou dois itens reais:

- **`/poui-specialist:docs` nunca tinha sido portado nem documentado
  como decisão** (diferente de `discover`/`migrate`, que são
  explicitamente fora de escopo). Portado agora: `PO-UI: Consultar
  Documentação de Componente` (`poui.docs`). Como o CLI não consegue
  ler dinamicamente os arquivos de referência da extensão (eles vivem
  fora do `cwd` do agente), a extensão faz o roteamento ela mesma —
  `docsPromptBuilder.ts` parseia a própria tabela "Component Reference
  Files" de `poui-components/SKILL.md` (sem hardcodar a lista de
  componentes) pra achar qual único arquivo de categoria carregar,
  evitando concatenar as ~4300 linhas de todos os 11 arquivos de uma
  vez. Só leitura (`tools: 'Read'`). Validado com uma consulta real
  (`po-lookup` → roteado certo pra `form-fields.md`, resposta completa
  e correta, zero arquivos escritos).
- **`poui.connect` perguntava a preferência de tratamento de
  interceptor mesmo quando o componente não tinha nenhum mock** —
  cosmético, mas sem sentido. Corrigido: `connectDiagnostics.ts`
  (`findMockInterceptors`) roda a mesma checagem do Passo 2b da skill
  *antes* de perguntar — só mostra o `QuickPick` se achar de fato um
  interceptor referenciando o componente. Confirmado contra um
  componente real sem mock (`fornecedores-list` de
  `examples/modulo-compras`): retorna vazio, pergunta não aparece.

259 testes unitários (era 247) + TypeScript limpo. Suíte de
integração não rodou nesta fatia (exige nenhuma instância do VS Code
aberta — outras janelas reais do usuário estavam abertas); registro
de comando/`package.json` seguem o mesmo padrão já coberto pelas 12
outras entradas já testadas.
