# Extensão VS Code poui-specialist — troca de motor para o Claude Code CLI headless

## Contexto

Este spec **substitui a decisão de arquitetura** do
`docs/superpowers/specs/2026-08-21-vscode-extension-phase0-design.md`
(já implementado, revisado e mergeado em `master`). O resto daquele spec —
escopo (só `page-list`), componentes de UI, fluxo de QuickInput, filosofia
de testes — continua valendo e não é reescrito aqui; só a peça que fala
com a IA muda.

**O que motivou a troca:** a versão anterior embutia o Claude Agent SDK
diretamente, autenticado com uma API key própria da Anthropic, cobrada à
parte. O objetivo original era "não depender do Claude Code" — mas o termo
"depender" tinha dois sentidos diferentes que só ficaram claros depois de
implementar: (a) não depender do *binário/CLI* do Claude Code rodando na
máquina, e (b) não ter custo extra além do que já se paga. Essas duas coisas
são **mutuamente exclusivas** por regra da própria Anthropic: o Agent SDK
não pode reaproveitar o login OAuth do claude.ai (documentação oficial:
*"Anthropic does not allow third party developers to offer claude.ai login
or rate limits for their products, including agents built on the Claude
Agent SDK. Use the API key authentication methods described in the
Quickstart instead."*) — então SDK embutido sempre implica key paga
separada.

O usuário só tem assinatura claude.ai (via Claude Code) e priorizou (b):
sem custo extra, aceitando que a extensão passe a depender do binário
`claude` instalado e logado na máquina de quem usar.

## Decisão de arquitetura (revisão)

Em vez de `@anthropic-ai/claude-agent-sdk`, `agentRuntime.ts` roda o
próprio CLI do Claude Code como subprocesso, em modo não-interativo. Fatos
confirmados na documentação oficial (`code.claude.com/docs/en/headless` e
`.../cli-reference`):

- **Autenticação:** sem a flag `--bare`, o modo `-p` usa a mesma sessão
  OAuth já logada (a mesma da extensão/CLI interativo) — sem API key, sem
  cobrança separada. **Nunca usar `--bare`** — essa flag desliga
  justamente a leitura da sessão OAuth e exige `ANTHROPIC_API_KEY`, que é
  o que estamos tentando evitar.
- **Streaming:** `--output-format stream-json --verbose
  --include-partial-messages` emite JSON delimitado por linha no stdout,
  com o mesmo formato de mensagem (`assistant`/`result`/etc., mesmos
  campos `message.content[]`, `is_error`, `subtype`) que o
  `SDKMessage`/`SDKResultMessage` do Agent SDK — a lógica de parsing que já
  escrevemos e testamos em `agentRuntime.ts` (Fase 0, Task 5 + fix wave) é
  reaproveitável quase 1:1, só troca o transporte: ler linha a linha do
  stdout do subprocesso em vez de iterar um `AsyncGenerator`.
- **System prompt sem estourar limite de linha de comando:**
  `--append-system-prompt-file <caminho>` carrega o texto de um arquivo —
  necessário porque o prompt composto (~15-60KB, ver nota M6 da revisão
  final da Fase 0) estouraria limites de tamanho de argumento de linha de
  comando do sistema operacional se passado como `--append-system-prompt
  "<texto>"` direto.
- **Restrição real de ferramentas (equivalente a `tools` do SDK):**
  `--tools "Read,Write,Edit,Glob,Grep"` remove as ferramentas do conjunto
  disponível (diferente de `--allowedTools`, que só auto-aprova sem
  restringir — mesma distinção que já documentamos como ruling na Fase 0
  original).
- **Sem prompt de aprovação interativo:** `--permission-mode acceptEdits`
  (ou modo equivalente) — não há terminal para responder a um prompt de
  aprovação, então a base de permissão precisa ser não-interativa desde o
  início.
- **Isolamento de configurações locais (equivalente a `settingSources:
  []`):** `--setting-sources <lista>` controla quais fontes de
  configuração `.claude/` carregam. **A sintaxe exata para "nenhuma
  fonte"/isolamento total não foi confirmada até este spec** — verificar
  com `claude --setting-sources --help` (ou a doc de CLI reference) durante
  a implementação, não assumir; no mínimo, excluir `project` (a fonte mais
  arriscada, pois vem do workspace Angular aberto pelo usuário, que pode
  ser um repositório de terceiros).
- **Modelo e effort:** `--model <id>` e `--effort <nível>` mapeiam
  diretamente para as settings `poui.model`/`poui.effort` que já existem.

## Escopo desta revisão

Só o "motor" muda. Ficam **exatamente como estão** (código já mergeado,
sem necessidade de reescrever): `naming.ts`, a composição de conteúdo do
`promptBuilder.ts` (os 6 arquivos concatenados + preâmbulo), o fluxo de
QuickInput e o comportamento de abrir o arquivo gerado em
`generatePageList.ts`, o `README.md`, a separação entre testes unitários
rápidos e o único teste de integração via `@vscode/test-electron`.

## Componentes alterados

1. **`agentRuntime.ts` — reescrito.** Em vez de `await
   import('@anthropic-ai/claude-agent-sdk')` + `query()`, usa
   `child_process.spawn('claude', [...], { cwd })` (Node built-in, nenhuma
   dependência nova). Grava o system prompt composto em um arquivo
   temporário (`os.tmpdir()`) antes de spawnar, aponta `claude` para ele
   via `--append-system-prompt-file`, e apaga o arquivo temporário ao
   final (sucesso ou erro). Lê `stdout` linha a linha (`readline` sobre o
   stream), faz `JSON.parse` de cada linha e aplica a mesma lógica de
   narrowing por `message.type`/`message.message.content[].type` já
   testada na Fase 0. Mantém a mesma interface pública
   (`OutputSink`, `GenerateResult`, `RunGenerateOptions`,
   `runGeneratePageList(...)`) — Task 6 (`generatePageList.ts`) não
   precisa mudar sua forma de chamar essa função, só o que ela faz por
   dentro. Adiciona um parâmetro injetável `spawnFn` (mesma técnica de DI
   do antigo `loadQuery`) para que os testes unitários nunca rodem o CLI
   real.
2. **`apiKey.ts` — removido.** Não há mais key para guardar.
3. **`extension.ts` — remove o registro do comando `poui.setApiKey`.**
4. **`generatePageList.ts` — dois guards trocam de lugar:**
   - Remove o guard de "API key ausente" (com o botão "Configurar API
     Key").
   - Adiciona um guard de "CLI não encontrado/não autenticado" antes de
     tentar gerar — ver Tratamento de erro abaixo.
   - O guard de `isAuthError` (adicionado na fix wave da Fase 0) passa a
     mostrar uma mensagem orientando rodar `claude` num terminal para
     logar, em vez do botão de configurar key.
5. **`cliCheck.ts` (novo, nome sujeito a ajuste na implementação)** —
   função que verifica se o binário `claude` está acessível no PATH (ex:
   rodar `claude --version` e checar o código de saída/versão mínima).
6. **`package.json`** — remove a dependência
   `@anthropic-ai/claude-agent-sdk` (não é mais usada).

## Fluxo de dados (revisado)

Usuário aciona o comando → `QuickInput` coleta nome/módulo/endpoint (igual
à Fase 0) → `agentRuntime` verifica se `claude` está disponível (se não,
guard e para) → grava o system prompt composto (via `promptBuilder`, sem
mudança) num arquivo temporário → spawna
`claude -p "<prompt do usuário>" --append-system-prompt-file <tmp>
--output-format stream-json --verbose --include-partial-messages
--tools "Read,Write,Edit,Glob,Grep" --permission-mode acceptEdits
--setting-sources <a confirmar> --model <config> --effort <config>`
com `cwd` = pasta do workspace aberto → lê stdout linha a linha, aplica o
mesmo parsing de mensagem já testado na Fase 0 (streaming para o
`OutputChannel`, coleta de `filesWritten` a partir de blocos `tool_use`
`Write`/`Edit`) → ao receber a mensagem `type: 'result'`, decide sucesso/
falha (`is_error`) e detecta falha de autenticação → apaga o arquivo
temporário → resto do fluxo (notificação final, abrir arquivo gerado)
idêntico à Fase 0.

## Tratamento de erro (revisado)

- **CLI não encontrado no PATH:** guard antes de spawnar, com uma
  mensagem orientando instalar o Claude Code CLI (não há mais o
  fluxo de "Configurar API Key" para redirecionar).
- **Falha de autenticação:** segundo a documentação, isso não é uma
  exceção — o CLI *imprime o resultado da falha no próprio stdout*
  (mensagem `result` com `is_error: true` e um campo de erro
  categorizando a causa, incluindo `authentication_failed`, mesmo
  vocabulário já usado no `SDKResultError`/`SDKAssistantMessageError` do
  Agent SDK). Detectar isso no parsing e mostrar uma mensagem orientando
  rodar `claude` num terminal para logar — sem botão de configurar key.
- **Falha de rede/rate limit:** mesma detecção via `is_error`/categoria de
  erro na mensagem `result`, como já fazíamos com o SDK.
- **Falha ao spawnar o subprocesso** (binário corrompido, sem permissão de
  execução): capturar o evento `error` do `child_process`, mostrar erro
  amigável.

## Testes (revisado)

Mesma filosofia da Fase 0: testes unitários rápidos (Mocha + `ts-node`,
sem Electron) nunca chamam o CLI real. `agentRuntime.ts` recebe um
`spawnFn` injetável (parâmetro com valor padrão que faz o spawn de
verdade) — os testes passam uma função fake que devolve um objeto
`child_process`-like com `stdout`/`stderr` como streams controlados e
`on('exit', ...)`/`on('error', ...)` simulados, seguindo o mesmo padrão de
injeção de dependência que `loadQuery` usava para o SDK. Teste manual
ponta a ponta (contra `examples/modulo-compras`) continua igual, mas agora
exige que o testador tenha o CLI `claude` instalado e logado — não uma API
key configurada.

## Riscos e itens a verificar durante a implementação

Marcados explicitamente como não confirmados neste spec, para não repetir
o erro da Fase 0 original (assumir o formato de uma API sem checar contra
a fonte real):

1. **Sintaxe exata de `--setting-sources` para isolamento total** (lista
   vazia? omitir a flag com outro comportamento? só listar `user`?) — a
   task correspondente deve rodar `claude --help` / consultar a CLI
   reference antes de codar, não assumir por analogia ao SDK.
2. **Formato exato da mensagem de falha de autenticação no wire format do
   `-p --output-format stream-json`** — confirmar que o campo/valor é
   idêntico ao `SDKAssistantMessageError`/`SDKResultError` do SDK (é
   plausível, já que é o mesmo protocolo por trás, mas não confirmado
   neste spec).
3. **Versão mínima do CLI** necessária para as flags usadas aqui
   (`--include-partial-messages`, `--tools`, `--setting-sources`,
   `--append-system-prompt-file`) — checar `claude --version` e decidir se
   vale a pena um guard de versão mínima, análogo ao que
   `code-generator-list.md` já faz para Node/Angular.

## Fases futuras

Sem mudança em relação ao spec original — ver
`docs/superpowers/specs/2026-08-21-vscode-extension-phase0-design.md`
seção "Fases futuras".
