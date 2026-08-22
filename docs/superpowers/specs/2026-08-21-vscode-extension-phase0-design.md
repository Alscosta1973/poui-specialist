# Extensão VS Code para poui-specialist — Fase 0 (fundação + prova de conceito)

## Contexto

O `poui-specialist` hoje é um plugin do Claude Code: 5 agentes, 14 skills e 12
comandos slash, todos em markdown, interpretados pelo runtime do Claude Code
(Task tool para subagentes, ferramentas nativas de arquivo/bash, `Skill` tool).
Não há lógica própria em código — quem executa é sempre o agente de IA por
trás do Claude Code.

O objetivo de longo prazo é ter uma **extensão VS Code standalone**, com UI
própria (paleta de comandos, sidebar), que **não dependa do Claude Code
CLI/licença** — mas que preserve a inteligência atual (geração contextual,
loop de correção de build, análise de screenshot) chamando a API da Anthropic
diretamente.

Esse projeto é grande demais para um spec só. Foi fatiado em fases (ver seção
"Fases futuras" no fim). Este documento cobre **apenas a Fase 0**: o
esqueleto da extensão e um primeiro comando ponta a ponta, para provar o
padrão antes de portar o restante do catálogo.

## Decisão de arquitetura (motor)

A extensão embute o **Claude Agent SDK** (`@anthropic-ai/claude-agent-sdk`,
pacote npm oficial da Anthropic para Node/TypeScript) em vez de reimplementar
um agent loop do zero ou depender do CLI do Claude Code.

Por quê: o SDK expõe o mesmo harness do Claude Code (tools built-in de
arquivo/bash, subagentes, hooks, permissões, streaming) como biblioteca —
"harness only", roda no processo/infra da própria extensão. Autenticação é
só via `ANTHROPIC_API_KEY` (sem OAuth), o que inclusive é uma exigência
contratual da Anthropic para produtos de terceiros construídos sobre o SDK
(não é permitido oferecer login do claude.ai). Isso bate exatamente com o
requisito de não depender do Claude Code/licença.

Alternativa descartada: reimplementar a integração sobre a Language Model
API do GitHub Copilot Chat. Descartada porque a API de Chat Participant do
VS Code não tem equivalente nativo de subagentes/Task, exigiria reescrever a
orquestração, e amarraria o projeto à assinatura Copilot em vez da Anthropic.

Fatos técnicos confirmados na documentação oficial (`code.claude.com/docs/en/agent-sdk`):
- Função principal: `query({ prompt, options }) → Query` (`Query extends AsyncGenerator<SDKMessage, void>`) — streaming nativo, sem polling.
- `options.cwd` define o diretório de trabalho — as tools built-in de arquivo operam relativas a ele, o que dá o escopo "restrito ao workspace" sem reimplementar Read/Write.
- `options.systemPrompt` aceita string customizada ou preset `claude_code` com `append` — permite reaproveitar o conteúdo atual dos arquivos `agents/*.md` quase literalmente.
- `options.agents` define subagentes (equivalente ao Task tool).
- Autenticação: variável de ambiente `ANTHROPIC_API_KEY` (via `process.env` ou `options.env`) — sem parâmetro dedicado de key no SDK.
- O SDK carrega skills/commands automaticamente de uma pasta `.claude/`, igual ao Claude Code — abre a possibilidade (a validar durante a implementação, não bloqueante para a Fase 0) de reaproveitar `skills/` e `commands/` do plugin quase sem alteração, em vez de reescrever cada um como prompt avulso.

## Escopo da Fase 0

Portar **um único comando ponta a ponta** — `/generate` no modo `page-list` —
como prova de conceito, mais o esqueleto mínimo de extensão necessário para
isso funcionar. Sidebar, tree view e os demais 11 comandos ficam para fases
seguintes.

## Componentes

1. **Esqueleto da extensão** (`poui-vscode/`, projeto TypeScript novo)
   - `package.json` de extensão: `activationEvents: onCommand`, contribui o
     comando `poui.generate.pageList` (paleta: "PO-UI: Gerar Page List") e
     configurações (`poui.model`, `poui.effort`, default `claude-opus-5` /
     `high`)
   - `extension.ts`: `activate()` registra os comandos

2. **Armazenamento da API key** — `vscode.SecretStorage` (`context.secrets`).
   Comando dedicado `PO-UI: Configurar API Key` usa `showInputBox({ password: true })`
   para capturar e persistir a key. Nenhuma key é lida de variável de
   ambiente do sistema nem hardcoded.

3. **Módulo de runtime do agente** (`agentRuntime.ts`) — encapsula a chamada
   a `query()`:
   - `cwd`: `vscode.workspace.workspaceFolders[0].uri.fsPath`
   - `systemPrompt`: conteúdo do agente `agents/code-generator-list.md`
     atual, empacotado como asset da extensão
   - `env.ANTHROPIC_API_KEY`: lida do `SecretStorage` no momento da chamada
   - `permissionMode`: modo que não abre prompts de confirmação repetidos
     para o usuário, mas mantendo a restrição de escopo ao `cwd` (a validar
     qual dos modos documentados — `default`/`bypassPermissions` com
     `allowDangerouslySkipPermissions` — é o correto durante a implementação)

4. **Saída** — `vscode.window.createOutputChannel("PO-UI")`. Cada mensagem
   do stream (`SDKTextMessage`, `SDKToolUseMessage`, `SDKToolResultMessage`)
   é escrita em tempo real. Ao final (mensagem de conclusão do `Query`), a
   extensão localiza o(s) arquivo(s) gerado(s) e mostra uma notificação
   "Abrir arquivo gerado".

5. **Entrada** — `QuickInput` simples: nome da entidade/componente e
   endpoint REST alvo (equivalente ao que `/generate` pergunta hoje
   interativamente). Tipo de geração fixo em `page-list` nesta fase.

## Fluxo de dados

Usuário aciona `PO-UI: Gerar Page List` na paleta → `QuickInput` coleta nome
da entidade e endpoint REST → módulo de runtime monta o prompt final
(system prompt do agente + dados informados) → chama `query()` com `cwd` do
workspace e a key injetada via `env` → mensagens do stream são escritas no
`OutputChannel` em tempo real → ao terminar, notificação oferece abrir o
arquivo gerado no editor.

## Tratamento de erro

- **API key ausente/inválida**: notificação de erro com atalho direto para
  `PO-UI: Configurar API Key`. Detecção via `AuthenticationError`/erro 401
  da API.
- **Nenhuma pasta aberta no VS Code**: comando é bloqueado antes de chamar
  o agente, com aviso "abra um projeto Angular primeiro".
- **Falha de rede/rate limit**: erro aparece no `OutputChannel`; a extensão
  não trava e o usuário pode tentar novamente.
- **Falha ao iniciar o subprocesso do Agent SDK** (plataforma não suportada,
  Node ausente): mensagem amigável, não stack trace cru.

## Testes

- **Unitários** (Mocha + `@vscode/test-electron`, padrão de extensão VS
  Code) cobrindo as partes determinísticas: montagem do prompt final,
  resolução do `cwd`, leitura/gravação da key no `SecretStorage`. A chamada
  a `query()` do SDK é mockada — nenhum teste automatizado depende de
  chamada real à API (custo e flakiness).
- **Manual, ponta a ponta**: rodar o comando contra o projeto de exemplo
  `examples/modulo-compras` (já versionado no repo) e confirmar que o
  `.ts`/`.html` gerado compila com `ng build`. Cobertura de "a geração está
  correta" fica neste passo manual nesta fase — não há teste automatizado
  de qualidade de output de LLM na Fase 0.

## Fases futuras (fora de escopo deste spec)

- **Fase 1** — Família Lista/Browse completa (`page-dynamic-search`,
  `stacked-browse`, `two-panel-browse`, `action-list`, `master-detail`) +
  sidebar tree view.
- **Fase 2** — Família Formulários + Infra (`page-edit`, `page-detail`,
  `modal-crud`, `stepper-form`, `service`, `module`, `dashboard`,
  `tlpp-contract`, `auth-login`, `refactor`) + skill `discover`.
- **Fase 3** — Qualidade e ciclo de build (`poui-build-fix`, `test`, `e2e`,
  `preview`, `lint`, `review`, `quality`).
- **Fase 4** — Recursos avançados (`connect`, `undo`, `screenshot`,
  `migrate`, `scaffold`, `package`).
- **Fase 5** — Distribuição: empacotamento `.vsix`, escolha de marketplace
  privado/registry interno, port da lógica de `poui-license-check`.

Cada fase acima segue seu próprio ciclo spec → plano → implementação.
