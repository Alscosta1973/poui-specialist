# Configuração de motor de IA dentro da extensão poui-vscode

Status: aprovado para virar plano de implementação
Data: 2026-09-05

## Contexto e motivação

A extensão `poui-vscode` já suporta três motores de IA plugáveis
(`EngineAdapter`: `claude`, `codex`, `gemini`, ver `src/engineTypes.ts`,
`src/engineRegistry.ts`). Hoje, porém, nenhum motor tem uma forma de ser
configurado *dentro* da extensão:

- **Claude**: depende da CLI `claude` já estar logada na máquina (login
  próprio, fora da extensão).
- **Codex**: precisa de `codex login` (OAuth) ou `OPENAI_API_KEY` no
  ambiente do processo.
- **Gemini**: precisa de login OAuth interativo (primeira execução do
  `gemini`) ou `GEMINI_API_KEY`/`GOOGLE_API_KEY` no ambiente.

`agentRuntime.ts:buildSubprocessEnv()` hoje só espelha `process.env` —
não existe nenhum ponto de injeção de credencial vindo da própria
extensão. A única forma de usar Codex/Gemini hoje é o usuário exportar
a env var manualmente no SO antes de abrir o VS Code.

A extensão ainda não foi lançada ao mercado — o público-alvo (devs
Protheus) vai precisar configurar isso sozinho, sem suporte
individualizado. Isso reforça dois requisitos não-negociáveis deste
design:

1. Minimizar quanto o usuário precisa saber/fazer fora da extensão
   (não pode assumir que ele sabe editar `settings.json` ou exportar
   env var no SO).
2. **Toda operação que espera algo (rede, CLI externa) precisa de
   feedback visual explícito** (`vscode.window.withProgress`) — sem
   isso, o dev pode achar que a extensão travou, especialmente sendo
   uma extensão nova e ainda sem reputação estabelecida.

## Objetivo

Um comando `PO-UI: Configurar Motor de IA` (`poui.configureEngine`)
que permite escolher qual motor usar e configurar exatamente o que
aquele motor precisa (diagnóstico para Claude; login OAuth ou API key
para Codex/Gemini), validando a configuração com uma chamada real
antes de confirmar, e definindo o motor escolhido como ativo
(`poui.aiEngine`).

## Não-objetivos

- Não inclui gerenciamento de billing/plano dos provedores — só
  credencial de acesso.
- Não inclui suporte a múltiplas credenciais por motor (ex.: perfis
  diferentes) — uma credencial ativa por motor, guardada globalmente
  por usuário.
- Não centraliza o padrão `capabilityWarning` repetido em 5 comandos
  (mencionado em memória de sessões anteriores) — fora de escopo
  deste design.

## Componentes

- **`src/engineCredentials.ts`** (novo, vscode-aware)
  - Mapa fixo engine → nome de env var:
    `{ codex: 'OPENAI_API_KEY', gemini: 'GEMINI_API_KEY' }`. Claude não
    entra neste mapa (não tem credencial gerenciada pela extensão).
  - `getCredentialEnv(context: vscode.ExtensionContext, engineId: EngineId): Promise<Record<string,string>>`
    — lê `context.secrets.get('poui.credential.<engineId>')`; se não
    houver nada salvo, devolve `{}` (fallback: comportamento atual via
    env var do SO continua valendo, nada quebra pra quem já configurou
    do jeito antigo).
  - `storeCredential(context, engineId, value): Promise<void>` —
    `context.secrets.store(...)`.
  - `deleteCredential(context, engineId): Promise<void>` —
    `context.secrets.delete(...)`.
  - `hasCredential(context, engineId): Promise<boolean>` — usado pelo
    comando pra decidir se mostra a opção "Remover credencial salva".

- **`src/agentRuntime.ts`** (alteração mínima e aditiva)
  - `runAgentWithAdapter` e `runAgent` ganham um novo parâmetro
    opcional `credentialEnv: Record<string,string> = {}`.
  - Linha do spawn passa a mesclar
    `{ ...buildSubprocessEnv(), ...credentialEnv, ...env }` (env do
    adapter, ex. `GEMINI_SYSTEM_MD` do Gemini, continua podendo
    sobrepor — não há colisão de chaves hoje entre os dois).
  - Nenhuma outra mudança: a função continua pura/testável sem
    importar `vscode`.

- **`src/runAgentForCommand.ts`** (novo, vscode-aware — Abordagem B
  aprovada)
  - `runAgentForCommand(context: vscode.ExtensionContext, engineId: EngineId, options: RunAgentOptions, sink: OutputSink, spawnFn?: SpawnFn): Promise<GenerateResult>`
  - Resolve `getCredentialEnv(context, engineId)` e delega para
    `runAgent(options, sink, engineId, spawnFn, credentialEnv)`.
  - Os 8 arquivos de comando (`generateComponent.ts`,
    `generateConnect.ts`, `generateDocs.ts`, `generateE2e.ts`,
    `generateReview.ts`, `generateScreenshot.ts`, `generateTest.ts` e
    qualquer outro que chame `runAgent` diretamente hoje) trocam a
    chamada de `runAgent(...)` para `runAgentForCommand(context, ...)`
    — troca de uma linha, sem lógica nova em cada arquivo.

- **`src/configureEngine.ts`** (novo comando `poui.configureEngine`)
  - Orquestra o fluxo descrito abaixo. A lógica pura (montar opções do
    QuickPick dado o estado de `secrets`, montar o `RunAgentOptions` de
    teste, interpretar `GenerateResult` em mensagem) fica em funções
    extraídas e testáveis sem depender de UI real do VS Code.

- **`package.json`**
  - Novo comando na paleta: `{ "command": "poui.configureEngine", "title": "PO-UI: Configurar Motor de IA" }`.

## Fluxo do comando

1. QuickPick nível 1 — Claude / Codex / Gemini, com o motor ativo
   (`poui.aiEngine`) marcado na descrição.

2. **Se Claude**: dentro de `withProgress` (título "Verificando CLI do
   Claude..."), roda `checkEngineAvailable('claude')` (já existe em
   `cliCheck.ts`). Mostra `showInformationMessage` com o resultado (CLI
   encontrada + versão, ou instrução de instalação). Segue para o
   passo 5 (perguntar se define como ativo) independente do resultado
   — é só diagnóstico, não bloqueia.

3. **Se Codex/Gemini**: QuickPick nível 2, opções montadas
   dinamicamente:
   - "Login gratuito (abre navegador)" — sempre presente.
   - "Tenho uma API key" — sempre presente.
   - "Remover credencial salva" — só aparece se
     `hasCredential(context, engineId)` for `true`. Selecionar encerra
     o fluxo aqui (chama `deleteCredential`, confirma, não segue pro
     passo 4/5).

4. Configuração:
   - **OAuth**: abre um terminal integrado (`vscode.window.createTerminal`)
     rodando o comando de login do motor. Codex: `codex login`
     (confirmado). Gemini: **TODO a confirmar antes da implementação**
     — pesquisa preliminar indica que o login OAuth é disparado pela
     própria execução interativa do `gemini` sem `-p` (não há
     subcomando `login` dedicado confirmado); validar contra
     `gemini --help` real antes de codificar esse caminho, seguindo o
     mesmo padrão de TODOs já presente em `codexAdapter.ts`/
     `geminiAdapter.ts`. Depois de abrir o terminal, mostra um
     `showInformationMessage` modal com o botão "Concluí o login".
   - **API key**: `showInputBox({ password: true, prompt: '...' })`,
     salva via `storeCredential`.
   - Em ambos os casos, ao confirmar (clique no botão, ou key
     digitada), roda a **validação** (seção seguinte) dentro de
     `withProgress` (título "Testando conexão com <motor>...").
   - Validação falhou: mostra o erro (`errorMessage` do
     `GenerateResult`, distinguindo `isAuthError` de outros erros) e
     oferece "Tentar de novo" (volta ao QuickPick nível 2) ou
     "Cancelar" (encerra sem alterar `poui.aiEngine`).
   - Validação ok: segue pro passo 5.

5. Pergunta final (`showInformationMessage` com botões Sim/Não):
   "Definir <motor> como motor ativo?". Se sim,
   `vscode.workspace.getConfiguration('poui').update('aiEngine', engineId, vscode.ConfigurationTarget.Global)`.

## Validação (chamada de teste real)

- Usa `runAgentForCommand` com um `RunAgentOptions` mínimo:
  `systemPrompt` curto/genérico, `userPrompt: 'Responda apenas OK.'`,
  sem `tools`/`addDir`/`mcpConfig`.
- Credencial recém-salva (API key) é injetada normalmente pelo
  wrapper; no caminho OAuth não há `credentialEnv` — a sessão já fica
  no ambiente do próprio CLI depois do login.
- Interpretação do `GenerateResult`:
  - `succeeded: true` → credencial válida, mensagem de sucesso.
  - `succeeded: false, isAuthError: true` → "key inválida ou sem
    permissão, tente de novo".
  - `succeeded: false` (outro motivo — rede, CLI não encontrada) →
    mostra o erro cru, mesma oferta de tentar de novo.
- **Timeout de 30s**: chamada real de rede a um LLM precisa de um teto
  para não deixar o fluxo pendurado indefinidamente. Implementado em
  `runAgentForCommand` (não no core `agentRuntime.ts`) via
  `Promise.race` entre o resultado real e um timer; ao estourar, trata
  como `{ succeeded: false, errorMessage: 'tempo esgotado aguardando resposta do motor.' }`
  e (importante, requisito do usuário) o `withProgress` que envolve a
  chamada já está mostrando ao usuário que algo está em andamento
  durante esses até 30s — nunca uma tela parada sem indicação.

## Feedback visual (requisito transversal)

Toda operação que espera resposta de um processo externo (CLI ou rede)
usa `vscode.window.withProgress` com uma mensagem específica do que
está acontecendo:

- Diagnóstico Claude → "Verificando CLI do Claude..."
- Chamada de teste Codex/Gemini → "Testando conexão com <motor>..."
- Re-check depois do usuário confirmar o login OAuth → mesma barra de
  progresso da chamada de teste (é a mesma operação).

Nenhum `await` de operação externa acontece sem uma dessas indicações
visíveis — mesmo princípio já usado no indicador de progresso da Fase
3 (`vscode.window.withProgress` envolvendo `runAgent`/
`runBuildFixLoop`), reaplicado aqui para o fluxo de configuração.

## Tratamento de erro

- CLI não instalada (Codex/Gemini): detectado antes de entrar no
  QuickPick nível 2, mostra instrução de instalação (`npm install -g
  ...`) e não avança.
- Erro de rede na validação: tratado como falha não-auth, com opção de
  tentar de novo (rede pode ser instável, não é definitivo).
- Timeout: tratado como falha, mesma oferta de retry.
- Usuário fecha o terminal de login sem concluir: ao clicar "Concluí o
  login" mesmo assim, a validação vai naturalmente falhar como
  `isAuthError`, guiando de volta pro fluxo — não precisa de detecção
  especial de "terminal fechado".

## Testes

- **`engineCredentials.test.ts`** (novo): fake de
  `vscode.SecretStorage` (objeto em memória com `get`/`store`/
  `delete`). Casos: `getCredentialEnv` devolve `{}` sem nada salvo;
  devolve `{ GEMINI_API_KEY: ... }` / `{ OPENAI_API_KEY: ... }`
  conforme o motor; `deleteCredential` remove de fato; Claude nunca
  gera env var.
- **`agentRuntime.test.ts`** (estende arquivo existente): novo caso
  garantindo que `credentialEnv` chega no `env` do `spawnFn` fake,
  mesclado com `buildSubprocessEnv()` e convivendo com o `env` que o
  próprio adapter retorna (caso Gemini + `GEMINI_SYSTEM_MD`).
- **`runAgentForCommand.test.ts`** (novo): testa a resolução da
  credencial antes de delegar pro `runAgent` (com fake de
  `engineCredentials`), e o comportamento de timeout com fake
  timers (Sinon/Mocha) — nunca com `setTimeout` real de 30s na suíte.
- **`configureEngine.test.ts`** (novo): cobre só a lógica pura extraída
  (montagem das opções do QuickPick dado o estado de `secrets`,
  montagem do `RunAgentOptions` de teste, interpretação de
  `GenerateResult` em mensagem de sucesso/erro). A função orquestradora
  fina que chama `vscode.window.showQuickPick`/`showInputBox`/
  `showInformationMessage`/`withProgress` diretamente fica com
  cobertura mais leve via mocks simples, mesmo padrão já usado nos
  outros comandos de UI do projeto (não há testes de integração de UI
  real hoje).

## Riscos / TODOs a confirmar antes de implementar

1. Mecanismo real de login OAuth do Gemini via CLI (subcomando `login`
   vs execução interativa sem `-p`) — confirmar com `gemini --help`
   numa máquina real antes de codificar esse caminho específico.
2. Nome exato de mensagem de erro de auth do Codex na validação (hoje
   `codexAdapter.ts` já tem TODOs próprios sobre flags não confirmadas
   — a validação deste design herda essa incerteza até o Codex ser
   testado de ponta a ponta, conforme já registrado em memória de
   sessão anterior).
