# Extensão VS Code poui-vscode — motor de IA plugável (Claude / Codex / Gemini)

## Contexto

Hoje `poui-vscode` roda o Claude Code CLI como único motor de IA
(`agentRuntime.ts`, `spawn('claude', ...)`, formato `stream-json`
específico do Claude — decisão registrada em
`2026-08-23-vscode-extension-cli-backend-design.md`). O usuário levantou
duas preocupações relacionadas, discutidas na mesma sessão:

1. Outros devs que forem usar a extensão podem já ter assinatura de uma IA
   diferente (Codex/ChatGPT, Gemini/Google) em vez de Claude — hoje eles
   não conseguem usar a extensão sem também assinar/logar no Claude.
2. Foi cogitado (e descartado) tirar toda dependência de IA do produto —
   ver `project-no-ai-dependency-pivot` (memória, não documento) para o
   histórico dessa discussão pausada. **Esta sessão seguiu por outro
   caminho**: em vez de eliminar IA, desacoplar *qual* motor de IA roda por
   trás dos comandos existentes, mantendo toda a funcionalidade atual como
   está.

**Decisão de escopo confirmada com o usuário**: este spec cobre **só a
extensão VS Code**. O plugin `poui-specialist` (Claude Code) não entra —
ele só existe como skill/agent dentro de uma sessão do Claude Code, não é
um processo próprio que possa trocar de motor.

**Alternativa considerada e rejeitada**: uma extensão separada por motor
(`poui-vscode-claude`, `poui-vscode-codex`, `poui-vscode-gemini`).
Rejeitada porque a esmagadora maioria do produto (13 comandos, ~260
testes, ~55 arquivos de referência em `assets/agent-prompts/`, toda a
lógica 100% determinística — lint, quality, undo, package, scaffold,
preview) não tem nada a ver com qual motor está rodando; separar
triplicaria manutenção e superfície de bug sem ganho real de isolamento
que módulos bem separados no mesmo projeto já não resolvam. Também
complicaria a monetização já decidida na Fase 5 (assinatura única por
dev — ver `project-vscode-extension-fase5-backlog`, memória).

## Decisão de arquitetura

Extrair a lógica de "falar com o CLI de IA" de `agentRuntime.ts` para uma
interface comum implementada por um adapter por motor. `agentRuntime.ts`
vira orquestração genérica; o comportamento hoje específico do Claude
(montagem de args, parsing de `stream-json`, detecção de erro de auth)
migra para `claudeAdapter.ts` sem mudar de comportamento.

```ts
interface EngineAdapter {
  id: EngineId; // 'claude' | 'codex' | 'gemini'
  checkAvailable(run?: RunVersionCheck): Promise<CliCheckResult>;
  buildCommand(options: RunAgentOptions): { command: string; args: string[] };
  parseLine(line: string): NormalizedEvent | null;
}

type NormalizedEvent =
  | { kind: 'text'; text: string }
  | { kind: 'tool_use'; name: string; input: unknown }
  | { kind: 'result'; success: true }
  | { kind: 'result'; success: false; errorMessage: string; isAuthError: boolean };
```

`runAgent(options, sink, engineId, spawnFn?)` substitui `runClaudeAgent`:
escolhe o adapter via `getEngineAdapter(engineId)` e mantém o mesmo laço
`readline` sobre `stdout` que já existe hoje, trocando o
`JSON.parse(line)` + `if (message.type === 'assistant')` manual por uma
chamada a `adapter.parseLine(line)`. O sink (narração), o rastreio de
`filesWritten` (via evento `tool_use` com `name` `Write`/`Edit`) e o
`GenerateResult` retornado **não mudam de forma** — só passam a ser
alimentados por eventos normalizados em vez do formato bruto do Claude.

## Configuração

`package.json` ganha:

```json
"poui.aiEngine": {
  "type": "string",
  "enum": ["claude", "codex", "gemini"],
  "default": "claude",
  "description": "Motor de IA usado pelos comandos que dependem de raciocínio."
}
```

Setting global (não perguntado por execução — decisão do usuário). Default
`claude` preserva o comportamento atual pra quem não mexer em nada. Os 9
chamadores atuais (`generateComponent.ts`, `generateConnect.ts`,
`generateScreenshot.ts`, `generateDocs.ts`, `generateE2e.ts`,
`generateTest.ts`, `generateReview.ts`, `buildFixLoop.ts`, e o teste de
integração) passam a ler `vscode.workspace.getConfiguration('poui').get('aiEngine')`
e repassar o `engineId` pro `runAgent`.

## Componentes novos

- **`src/engines/claudeAdapter.ts`** — realoca a lógica hoje em
  `agentRuntime.ts` (`buildArgs`, parsing de blocos `assistant`/`result`,
  `describeResultFailure`, detecção de `authentication_failed`/
  `oauth_org_not_allowed`/status 401/403). Comportamento idêntico ao
  atual — puro reposicionamento de código, sem mudança de expectativa.
- **`src/engines/codexAdapter.ts`** — monta `codex exec --json <prompt>`
  (mais as flags equivalentes de sandbox/ferramentas, a definir na
  implementação lendo `codex exec --help` de verdade). Parseia JSONL
  `thread.started`/`turn.completed`/`item.*` (schema confirmado via doc
  oficial nesta sessão).
- **`src/engines/geminiAdapter.ts`** — monta `gemini -p <prompt>
  --output-format stream-json`. Parseia JSONL `init`/`message`/
  `tool_use`/`tool_result`/`error`/`result` (schema confirmado via doc
  oficial nesta sessão, incluindo o tipo de evento `error` dedicado, útil
  pra detecção de falha sem depender só do `result` final).
- **`src/engines/registry.ts`** — `getEngineAdapter(id: EngineId):
  EngineAdapter`, switch simples sobre os três adapters.
- **`cliCheck.ts` generalizado** — `checkEngineAvailable(engineId, run?)`
  delega pro `adapter.checkAvailable` do motor configurado. Os 9
  comandos que hoje checam `claude --version` fixo passam a checar o
  binário do motor configurado (`claude`/`codex`/`gemini --version`),
  com mensagem de erro apontando pra instalação daquele CLI específico
  quando ausente — mesmo padrão de erro que já existe hoje.

## Tratamento de erro e capacidade

- Detecção de erro de autenticação vira responsabilidade de cada adapter
  (formato de erro é específico por CLI) — `runAgent` só olha o campo
  normalizado `isAuthError` do evento `result`, sem lógica condicional
  por motor no orquestrador.
- **Aviso de capacidade sem bloqueio** (decisão já aprovada pelo
  usuário): comandos com risco conhecido num motor específico emitem um
  aviso no sink antes de rodar, mas não impedem a execução. Único caso
  concreto hoje: `generateScreenshot.ts` com `engine === 'gemini'` —
  "⚠ suporte a leitura de imagem neste motor ainda não é confiável
  (gap documentado no repositório oficial do Gemini CLI)."
- `checkEngineAvailable` roda antes de qualquer geração, igual ao padrão
  já existente — bloqueia com mensagem clara se o binário do motor
  configurado não estiver instalado, em vez de deixar o `spawn` falhar
  com `ENOENT` genérico.

## Testes

- `claudeAdapter.test.ts` — migra as fixtures que já existem em
  `agentRuntime.test.ts` hoje (mensagens `assistant`/`result`
  fabricadas via `SpawnFn` fake). Mesma cobertura, realocada.
- `codexAdapter.test.ts` / `geminiAdapter.test.ts` — fixtures novas
  baseadas nos schemas confirmados nesta sessão, mesmo padrão de
  `SpawnFn` fake + `RecordingSink`.
- `agentRuntime.test.ts` (o que sobra) — passa a testar só a
  orquestração genérica (seleção de adapter via `engineId`, laço de
  leitura de linha, chamada ao sink) com um `EngineAdapter` fake
  injetado, não mais fixtures específicas do Claude.
- Migração dos 9 chamadores: troca mecânica de
  `runClaudeAgent(options, sink, spawnFn)` por
  `runAgent(options, sink, engineId, spawnFn)`, um arquivo por vez, sem
  lógica nova.
- **Validação real obrigatória antes de declarar Codex/Gemini prontos**
  (mesmo princípio já seguido em `connect`/`e2e`/`scaffold`: nunca
  declarar sucesso sem execução de verdade) — pelo menos uma chamada
  real de cada adapter contra `examples/modulo-compras`, feita quando
  houver acesso a uma conta Codex e/ou Gemini pra testar. Até lá, os
  adapters ficam implementados e testados por fixture, mas marcados
  como não validados em uso real.

## Riscos e pontos de validação pendentes (pesquisados nesta sessão, não confirmáveis sem conta)

Pesquisa feita via documentação oficial (não execução real, por falta de
conta em ambos os serviços):

1. **Codex CLI — reliability pra assinante individual sem API key**:
   `codex exec` reaproveita a sessão salva por `codex login`/`codex login
   --device-auth` (mesmo mecanismo OAuth que o Claude Code CLI já usa hoje
   na extensão). A documentação cobre esse fluxo pra workspaces
   Enterprise/CI de forma explícita, mas **não confirma** se funciona de
   forma confiável pra uma conta ChatGPT Plus individual (público-alvo
   real da extensão) — suposição razoável, não fato verificado.
2. **Formato exato de erro de autenticação em ambos os motores**: a
   estrutura geral dos eventos JSONL está confirmada (Codex:
   `thread.started`/`turn.completed`/`item.*`; Gemini: `init`/`message`/
   `tool_use`/`tool_result`/`error`/`result`), mas o *conteúdo* de um
   evento de falha de autenticação especificamente não está documentado
   publicamente — só aparece rodando de verdade. Os adapters devem tratar
   isso defensivamente (regex sobre mensagem de erro textual, igual ao
   fallback que `claudeAdapter` já faz hoje via `describeResultFailure`).
3. **Gemini CLI — API key pode ser obrigatória mesmo pro usuário final**:
   achado novo desta sessão, muda uma suposição anterior. A doc oficial
   afirma que o modo não-interativo exige `GEMINI_API_KEY`/
   `GOOGLE_API_KEY`/ADC — sugerindo que a sessão OAuth pessoal (login
   interativo `gemini`, free tier generoso) **não** é reaproveitada em
   modo headless, diferente de Claude e Codex. Se confirmado na prática,
   isso reduz a vantagem de custo do Gemini pro público BR (deixa de ser
   "grátis com conta Google pessoal" e passa a exigir gerar/colar uma API
   key) — vale re-mencionar essa consequência ao usuário quando for
   validar de verdade, não só um detalhe técnico.
4. **Gemini CLI — bug conhecido em `--output-format json`**: encerra a
   execução em qualquer erro de tool não-fatal (issue aberta no
   repositório oficial). Risco concreto pro `buildFixLoop`, que depende
   de múltiplas tentativas de correção — o adapter Gemini deve tratar uma
   parada abrupta como possível falso-negativo, não necessariamente falha
   real da tarefa.
5. **Gemini CLI — gap de visão**: confirmado como ainda em aberto (duas
   issues ativas no repositório oficial). Já coberto pela decisão de
   "avisar e tentar mesmo assim" no item "Tratamento de erro e
   capacidade" acima.

Nenhum desses 5 pontos bloqueia a implementação dos adapters — todos
viram comentários/TODOs rastreáveis no código apontando pra esta seção,
e a validação real acontece assim que houver acesso a uma conta Codex
e/ou Gemini.

## Documentação in-app (walkthrough nativo do VS Code)

Requisito adicionado pelo usuário na mesma sessão: usuários precisam
conseguir ver, dentro do próprio VS Code, o que cada comando faz, exemplos
de uso, a versão instalada e — ponto que conecta direto com o motor
plugável — as limitações conhecidas de cada motor de IA (a seção acima).
Hoje isso só existe no `README.md` (visível na aba de detalhes da
extensão) e nos textos de commit/memória, nada apresentado de forma
guiada dentro do editor.

**Mecanismo escolhido: `contributes.walkthroughs`** (nativo do VS Code —
aparece na tela "Get Started"/Bem-vindo, cada passo em Markdown, com
suporte a botões `command:` inline e passos marcados como concluídos
automaticamente). Rejeitado um painel `webview` próprio (mais controle
visual, mas exige manter HTML/CSS/JS de UI só pra isso — esforço sem
benefício real aqui) e rejeitado ficar só no `README.md` (não é
descoberto por quem já instalou a extensão sem procurar ativamente).

### Estrutura de passos

Conteúdo em `assets/walkthrough/*.md`, sincronizado pelo mesmo mecanismo
de arquivo-de-referência que `assets/agent-prompts/` já usa
(`scripts/sync-prompts.mjs`, generalizado para copiar também esta pasta).

1. **Bem-vindo / Sobre** — versão da extensão lida de `package.json` em
   runtime (nunca hardcoded — evita o texto ficar desatualizado a cada
   release), motor de IA configurado no momento (`poui.aiEngine`), link
   pro `README.md` completo.
2. **Configurar o motor de IA** — o que cada motor exige pra funcionar
   (Claude: CLI logado via OAuth; Codex: `codex login --device-auth`;
   Gemini: variável de ambiente com API key, ver risco 3 acima) + botão
   que abre a configuração `poui.aiEngine` direto.
3. **Comandos por família** — um passo por família (Lista/Browse,
   Formulários, Infraestrutura, Qualidade/Teste, Utilitários), cada
   comando com 1-2 frases do que faz + botão "Rodar" via `command:`
   quando fizer sentido (ex: abrir `poui.generate.component` direto).
4. **Limitações conhecidas por motor** — mesmo conteúdo da seção "Riscos
   e pontos de validação pendentes" acima, em linguagem voltada ao
   usuário final (não a linguagem técnica de spec). **Fonte única**: o
   texto deste passo deve derivar do mesmo lugar que a seção de riscos
   deste documento, pra não divergir conforme a validação real for
   confirmando/refutando cada ponto — na implementação, revisar os dois
   juntos sempre que um mudar.

### Internacionalização (PT/EN) — uma extensão só, não duas

Decisão confirmada com o usuário: **não** criar duas extensões
separadas (uma PT, uma EN) — duplicaria os 13 comandos/~260 testes/~55
templates pela segunda vez, pelo mesmo motivo já usado pra rejeitar
"uma extensão por motor de IA" (ver seção "Contexto" acima). Em vez
disso, usa o mecanismo nativo de i18n do VS Code:

- **Strings estáticas** (títulos de comando, descrições de configuração
  em `package.json`) — `package.nls.json` (default, hoje em português) +
  `package.nls.en.json` (tradução), resolvidos automaticamente pelo
  `Display Language` configurado no VS Code do usuário.
- **Strings dinâmicas** (mensagens narradas no output channel durante
  execução, textos de erro) — API `vscode.l10n`, `l10n.t('chave', ...)`
  no código + `l10n/bundle.l10n.json` (default) e
  `l10n/bundle.l10n.en.json` (tradução).
- **Walkthrough**: cada `assets/walkthrough/*.md` ganha uma variante
  `*.en.md`; a entrada em `contributes.walkthroughs` referencia o
  arquivo certo por locale (mecanismo padrão do próprio contribution
  point, sem código extra).

Zero duplicação de extensão, zero decisão do usuário sobre "qual
instalar" — o idioma segue o VS Code, automaticamente.

## Fora de escopo (explícito)

- Motor plugável no plugin `poui-specialist` (Claude Code) — não se
  aplica, ver "Decisão de escopo confirmada" acima.
- Migrar o núcleo de geração (24 tipos) para um motor 100% determinístico
  sem IA — essa era a direção do pivô anterior (`project-no-ai-dependency-pivot`),
  substituída nesta sessão pela ideia de motor plugável. Continua
  registrada como memória, não decidida, caso o usuário queira retomá-la
  separadamente no futuro.
- Auto-detecção de motor instalado — o usuário optou por setting global
  explícito (`poui.aiEngine`), não detecção automática.
