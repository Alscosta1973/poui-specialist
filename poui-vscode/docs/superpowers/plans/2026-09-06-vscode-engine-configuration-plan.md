# Configuração de Motor de IA (poui-vscode) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar um comando `PO-UI: Configurar Motor de IA` (`poui.configureEngine`) à extensão `poui-vscode` que permite escolher e configurar Claude/Codex/Gemini (diagnóstico pro Claude, login OAuth ou API key pro Codex/Gemini, com uma chamada de teste real antes de confirmar), e conectar essa credencial salva a todos os comandos existentes que já usam um motor de IA — incluindo o loop de correção automática de build, que hoje ficaria de fora se só a chamada inicial de cada comando fosse ajustada.

**Architecture:** Um módulo novo e puro (`engineCredentials.ts`) guarda/lê a credencial no `SecretStorage` do VS Code por trás de uma interface local (nunca importa `vscode` — mantém a convenção já usada em todo o projeto de módulos testáveis via `mocha`+`ts-node`). Um wrapper (`runAgentForCommand.ts`) resolve a credencial e delega pro `runAgent` já existente, sem duplicar lógica em cada comando (Abordagem B). O comando novo (`configureEngine.ts`) orquestra o fluxo de UI usando lógica pura extraída (`configureEngineLogic.ts`) pra ficar testável sem depender do VS Code real.

**Tech Stack:** TypeScript, `mocha`+`ts-node` (testes unitários), `@vscode/test-electron` (suite de integração), VS Code Extension API (`SecretStorage`, `QuickPick`, `InputBox`, `Terminal`, `withProgress`).

**Spec:** `poui-vscode/docs/superpowers/specs/2026-09-05-vscode-engine-configuration-design.md` (revisada e corrigida em 2026-09-06, commits `0592add` e `6893524` — 3 gaps reais corrigidos antes deste plano: contagem de arquivos que chamam `runAgent`, wiring de credencial no loop de correção de build, e escopo do timeout de 30s).

## Global Constraints

- Toda espera de rede/CLI precisa de `vscode.window.withProgress` visível — nunca uma tela parada sem indicação (requisito transversal do usuário, spec seção "Feedback visual").
- Credencial nunca vai para `settings.json` — sempre via `context.secrets` (`SecretStorage`).
- Nenhum módulo testável via `npm run test:unit` (`mocha`+`ts-node`) pode `import` o módulo `vscode` — só os arquivos `generate*.ts`/`extension.ts` fazem isso hoje (confirmado por grep em 2026-09-06); módulos novos que precisam do formato de `ExtensionContext` usam uma interface local estrutural em vez do tipo real.
- Não adicionar nenhuma dependência nova (`sinon` incluso) — o timeout é testado com valores pequenos de `timeoutMs` e tempo real, mesmo padrão já usado no resto da suíte (`--timeout 15000` do mocha).
- Baseline atual: `npm run test:unit` = **311 passing**. Cada task abaixo declara o total esperado depois dela.

---

## Task 1: Confirmar mecanismo de login OAuth do Gemini CLI

**Files:** nenhum arquivo de código — só investigação, cujo resultado alimenta a Task 9.

- [ ] **Step 1: Rodar `gemini --help` numa máquina real com o CLI instalado**

Run: `gemini --help`

Resultado já obtido nesta sessão (2026-09-06): a lista de subcomandos é
`gemini mcp`, `gemini extensions`, `gemini skills`, `gemini hooks`,
`gemini gemma`, e `gemini [query..]` (default). **Não existe subcomando
`login`/`auth` dedicado.** A autenticação OAuth acontece na primeira
execução interativa do próprio binário sem `-p`/`--prompt` — rodar
`gemini` sozinho (sem argumentos) abre o modo interativo, que dispara o
fluxo de login na primeira vez que precisar de uma chamada real.

- [ ] **Step 2: Registrar o achado como o comando de terminal a usar na Task 9**

Nenhuma implementação aqui — só documentar: o comando de terminal pro
login OAuth do Gemini é `gemini` (sem argumentos nenhum), não
`gemini login` nem `gemini auth login`. Usado na constante
`ENGINE_LOGIN_COMMAND` da Task 9.

---

## Task 2: Confirmar CLI do Codex (best-effort — sem conta OpenAI disponível nesta sessão)

**Files:** nenhum arquivo de código — só investigação, cujo resultado alimenta a Task 9.

- [ ] **Step 1: Verificar se o Codex CLI está instalado**

Run: `codex --help`

Resultado obtido nesta sessão (2026-09-06): `codex: command not found`
— o binário não está instalado nesta máquina e nenhuma conta OpenAI
está disponível pra autenticar de ponta a ponta agora (mesma limitação
já registrada em `codexAdapter.ts`: nenhum comando desta extensão que
usa Codex foi validado contra o CLI real).

- [ ] **Step 2: Instalar e revalidar, se o usuário decidir fazer isso antes de continuar**

Run (só se o usuário optar por instalar agora): `npm install -g @openai/codex` e depois `codex login --help`.

Se instalado, confirmar que `codex login` é de fato o subcomando de
login (é o que `codexAdapter.ts` já assume) antes de prosseguir pra
Task 9. **Se não for instalado nesta sessão**, a Task 9 usa `codex login`
como está — é a mesma suposição não validada que já existe hoje em
`codexAdapter.ts` (marcada com `TODO(codex)` nos comentários), não uma
suposição nova introduzida por este plano. Registrar esse limite
conhecido no PR/commit da Task 9 em vez de bloquear a implementação por
ele.

---

## Task 3: `engineCredentials.ts` — armazenamento de credencial

**Files:**
- Create: `poui-vscode/src/engineCredentials.ts`
- Test: `poui-vscode/src/test/unit/engineCredentials.test.ts`

**Interfaces:**
- Produces: `SecretStorage` (interface), `CredentialContext` (interface),
  `getCredentialEnv(context: CredentialContext, engineId: EngineId): Promise<Record<string,string>>`,
  `storeCredential(context: CredentialContext, engineId: EngineId, value: string): Promise<void>`,
  `deleteCredential(context: CredentialContext, engineId: EngineId): Promise<void>`,
  `hasCredential(context: CredentialContext, engineId: EngineId): Promise<boolean>` —
  usados pelas Tasks 5 e 9.

- [ ] **Step 1: Escrever o teste**

```typescript
// poui-vscode/src/test/unit/engineCredentials.test.ts
import * as assert from 'node:assert';
import {
  getCredentialEnv,
  storeCredential,
  deleteCredential,
  hasCredential,
  CredentialContext,
  SecretStorage,
} from '../../engineCredentials';

class FakeSecretStorage implements SecretStorage {
  private readonly values = new Map<string, string>();
  async get(key: string): Promise<string | undefined> {
    return this.values.get(key);
  }
  async store(key: string, value: string): Promise<void> {
    this.values.set(key, value);
  }
  async delete(key: string): Promise<void> {
    this.values.delete(key);
  }
}

function makeContext(): CredentialContext {
  return { secrets: new FakeSecretStorage() };
}

describe('engineCredentials', () => {
  it('getCredentialEnv returns {} when nothing is stored', async () => {
    assert.deepStrictEqual(await getCredentialEnv(makeContext(), 'gemini'), {});
  });

  it('getCredentialEnv returns GEMINI_API_KEY for gemini after storeCredential', async () => {
    const context = makeContext();
    await storeCredential(context, 'gemini', 'gk-123');
    assert.deepStrictEqual(await getCredentialEnv(context, 'gemini'), { GEMINI_API_KEY: 'gk-123' });
  });

  it('getCredentialEnv returns OPENAI_API_KEY for codex after storeCredential', async () => {
    const context = makeContext();
    await storeCredential(context, 'codex', 'ok-456');
    assert.deepStrictEqual(await getCredentialEnv(context, 'codex'), { OPENAI_API_KEY: 'ok-456' });
  });

  it('getCredentialEnv always returns {} for claude, even if something were stored under its key', async () => {
    const context = makeContext();
    await context.secrets.store('poui.credential.claude', 'irrelevant');
    assert.deepStrictEqual(await getCredentialEnv(context, 'claude'), {});
  });

  it('deleteCredential removes a stored key', async () => {
    const context = makeContext();
    await storeCredential(context, 'gemini', 'gk-123');
    await deleteCredential(context, 'gemini');
    assert.deepStrictEqual(await getCredentialEnv(context, 'gemini'), {});
  });

  it('hasCredential reflects whether a key is stored', async () => {
    const context = makeContext();
    assert.strictEqual(await hasCredential(context, 'codex'), false);
    await storeCredential(context, 'codex', 'ok-456');
    assert.strictEqual(await hasCredential(context, 'codex'), true);
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha (módulo ainda não existe)**

Run: `npx mocha --require ts-node/register --timeout 15000 "src/test/unit/engineCredentials.test.ts"`
Expected: FAIL — `Cannot find module '../../engineCredentials'`.

- [ ] **Step 3: Implementar**

```typescript
// poui-vscode/src/engineCredentials.ts
import { EngineId } from './engineTypes';

export interface SecretStorage {
  get(key: string): Thenable<string | undefined>;
  store(key: string, value: string): Thenable<void>;
  delete(key: string): Thenable<void>;
}

export interface CredentialContext {
  secrets: SecretStorage;
}

/** Só Codex e Gemini têm credencial gerenciada pela extensão — Claude
 * depende só do login próprio do `claude` CLI, fora deste mecanismo. */
const CREDENTIAL_ENV_VAR: Partial<Record<EngineId, string>> = {
  codex: 'OPENAI_API_KEY',
  gemini: 'GEMINI_API_KEY',
};

function secretKey(engineId: EngineId): string {
  return `poui.credential.${engineId}`;
}

export async function getCredentialEnv(
  context: CredentialContext,
  engineId: EngineId,
): Promise<Record<string, string>> {
  const envVar = CREDENTIAL_ENV_VAR[engineId];
  if (!envVar) {
    return {};
  }
  const value = await context.secrets.get(secretKey(engineId));
  return value ? { [envVar]: value } : {};
}

export async function storeCredential(
  context: CredentialContext,
  engineId: EngineId,
  value: string,
): Promise<void> {
  await context.secrets.store(secretKey(engineId), value);
}

export async function deleteCredential(context: CredentialContext, engineId: EngineId): Promise<void> {
  await context.secrets.delete(secretKey(engineId));
}

export async function hasCredential(context: CredentialContext, engineId: EngineId): Promise<boolean> {
  const value = await context.secrets.get(secretKey(engineId));
  return value !== undefined;
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npx mocha --require ts-node/register --timeout 15000 "src/test/unit/engineCredentials.test.ts"`
Expected: `6 passing`.

- [ ] **Step 5: Commit**

```bash
git add poui-vscode/src/engineCredentials.ts poui-vscode/src/test/unit/engineCredentials.test.ts
git commit -m "feat(vscode-ext): add SecretStorage-backed credential store per AI engine"
```

---

## Task 4: `agentRuntime.ts` — parâmetro `credentialEnv`

**Files:**
- Modify: `poui-vscode/src/agentRuntime.ts:57-81` (`runAgentWithAdapter`), `:159-165` (`runAgent`)
- Test: `poui-vscode/src/test/unit/agentRuntime.test.ts` (estende)

**Interfaces:**
- Consumes: nenhuma nova (só adiciona parâmetro opcional às funções já existentes).
- Produces: `runAgentWithAdapter(adapter, options, sink, spawnFn?, credentialEnv?)`,
  `runAgent(options, sink, engineId, spawnFn?, credentialEnv?)` — consumidos pela Task 5.

- [ ] **Step 1: Escrever o teste**

Adicionar este caso como o último `it(...)` dentro do `describe('runAgent', () => { ... })` já existente em `poui-vscode/src/test/unit/agentRuntime.test.ts`, logo antes do `});` que fecha o describe (reaproveita `RecordingSink`/`makeFakeProcess`/`SpawnFn`/`EngineAdapter` já importados no topo do arquivo):

```typescript
  it('merges credentialEnv into the spawned process env, without overriding the adapter env', async () => {
    const sink = new RecordingSink();
    let capturedEnv: NodeJS.ProcessEnv | undefined;
    const adapter: EngineAdapter = {
      id: 'gemini',
      binaryName: 'gemini',
      capabilities: { restrictsTools: false, supportsMcp: false, supportsVision: false },
      buildCommand: () => ({ command: 'gemini', args: [], env: { GEMINI_SYSTEM_MD: '/tmp/sys.txt' } }),
      parseLine: (line: string) => (line === 'L1' ? [{ kind: 'result', success: true }] : []),
    };
    const spawnFn: SpawnFn = (command, args, options) => {
      capturedEnv = options.env;
      return makeFakeProcess({ lines: ['L1'] });
    };

    await runAgentWithAdapter(
      adapter,
      { cwd: '/tmp/workspace', systemPrompt: 'sys', userPrompt: 'u' },
      sink,
      spawnFn,
      { GEMINI_API_KEY: 'gk-123' },
    );

    assert.strictEqual(capturedEnv?.GEMINI_API_KEY, 'gk-123');
    assert.strictEqual(capturedEnv?.GEMINI_SYSTEM_MD, '/tmp/sys.txt');
  });
```

- [ ] **Step 2: Rodar e confirmar que falha (assinatura ainda não aceita o 5º argumento)**

Run: `npm run test:unit`
Expected: FAIL — TypeScript não compila (`Expected 4 arguments, but got 5`) ou o teste falha por `capturedEnv?.GEMINI_API_KEY` ser `undefined`.

- [ ] **Step 3: Implementar**

Em `poui-vscode/src/agentRuntime.ts`, alterar a assinatura e o merge de env em `runAgentWithAdapter` (linhas 57-79 hoje):

```typescript
export async function runAgentWithAdapter(
  adapter: EngineAdapter,
  options: RunAgentOptions,
  sink: OutputSink,
  spawnFn: SpawnFn = defaultSpawn,
  credentialEnv: Record<string, string> = {},
): Promise<GenerateResult> {
```

E a linha do spawn (hoje `const child = spawnFn(command, args, { cwd: options.cwd, env: { ...buildSubprocessEnv(), ...env } });`):

```typescript
    const { command, args, env } = adapter.buildCommand(options, systemPromptFile, mcpConfigFile);
    const child = spawnFn(command, args, {
      cwd: options.cwd,
      env: { ...buildSubprocessEnv(), ...credentialEnv, ...env },
    });
```

E `runAgent` (hoje linhas 159-165):

```typescript
export async function runAgent(
  options: RunAgentOptions,
  sink: OutputSink,
  engineId: EngineId,
  spawnFn: SpawnFn = defaultSpawn,
  credentialEnv: Record<string, string> = {},
): Promise<GenerateResult> {
  return runAgentWithAdapter(getEngineAdapter(engineId), options, sink, spawnFn, credentialEnv);
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npm run test:unit`
Expected: `318 passing` (311 baseline + 6 da Task 3 + 1 desta task).

- [ ] **Step 5: Commit**

```bash
git add poui-vscode/src/agentRuntime.ts poui-vscode/src/test/unit/agentRuntime.test.ts
git commit -m "feat(vscode-ext): thread an optional credentialEnv through runAgent/runAgentWithAdapter"
```

---

## Task 5: `runAgentForCommand.ts` — wrapper de credencial + `createAgentRunner`

**Files:**
- Create: `poui-vscode/src/runAgentForCommand.ts`
- Test: `poui-vscode/src/test/unit/runAgentForCommand.test.ts`

**Interfaces:**
- Consumes: `getCredentialEnv` (Task 3), `runAgent` (Task 4, já com `credentialEnv`), `CredentialContext` (Task 3).
- Produces:
  `runAgentForCommand(context: CredentialContext, engineId: EngineId, options: RunAgentOptions, sink: OutputSink, spawnFn?: SpawnFn, timeoutMs?: number): Promise<GenerateResult>`,
  `createAgentRunner(context: CredentialContext, spawnFn?: SpawnFn): (options: RunAgentOptions, sink: OutputSink, engineId: EngineId) => Promise<GenerateResult>` —
  consumidos pelas Tasks 6, 7 e 9.

- [ ] **Step 1: Escrever o teste**

```typescript
// poui-vscode/src/test/unit/runAgentForCommand.test.ts
import * as assert from 'node:assert';
import { EventEmitter } from 'node:events';
import { Readable } from 'node:stream';
import { runAgentForCommand, createAgentRunner } from '../../runAgentForCommand';
import { CredentialContext, SecretStorage, storeCredential } from '../../engineCredentials';
import { OutputSink, SpawnFn, SpawnedProcess } from '../../agentRuntime';

class RecordingSink implements OutputSink {
  readonly lines: string[] = [];
  appendLine(value: string): void {
    this.lines.push(value);
  }
}

class FakeSecretStorage implements SecretStorage {
  private readonly values = new Map<string, string>();
  async get(key: string): Promise<string | undefined> {
    return this.values.get(key);
  }
  async store(key: string, value: string): Promise<void> {
    this.values.set(key, value);
  }
  async delete(key: string): Promise<void> {
    this.values.delete(key);
  }
}

function makeContext(): CredentialContext {
  return { secrets: new FakeSecretStorage() };
}

/** Processo fake que nunca fecha nem emite dado — simula um CLI travado,
 * usado só pro teste de timeout. */
function makeHangingProcess(): SpawnedProcess {
  const emitter = new EventEmitter();
  return {
    stdout: new Readable({ read() {} }),
    stderr: new Readable({ read() {} }),
    on: (event: string, listener: (...args: unknown[]) => void) => emitter.on(event, listener),
  } as unknown as SpawnedProcess;
}

/** Processo fake que fecha imediatamente com uma linha de sucesso no
 * formato real do Claude Code CLI (`claudeAdapter.parseLine`), já que os
 * testes abaixo usam engineId: 'claude' via o registry real. */
function makeSucceedingProcess(): SpawnedProcess {
  const emitter = new EventEmitter();
  const stdout = Readable.from([`${JSON.stringify({ type: 'result', subtype: 'success', is_error: false })}\n`]);
  stdout.on('end', () => setImmediate(() => emitter.emit('close', 0)));
  return {
    stdout,
    stderr: new Readable({
      read() {
        this.push(null);
      },
    }),
    on: (event: string, listener: (...args: unknown[]) => void) => emitter.on(event, listener),
  } as unknown as SpawnedProcess;
}

describe('runAgentForCommand', () => {
  it('resolves normally without a timeout when timeoutMs is omitted', async () => {
    const spawnFn: SpawnFn = () => makeSucceedingProcess();
    const result = await runAgentForCommand(
      makeContext(),
      'claude',
      { cwd: '/tmp/workspace', systemPrompt: 'sys', userPrompt: 'u' },
      new RecordingSink(),
      spawnFn,
    );
    assert.strictEqual(result.succeeded, true);
  });

  it('resolves with a timeout error when the agent does not respond within timeoutMs', async () => {
    const spawnFn: SpawnFn = () => makeHangingProcess();
    const result = await runAgentForCommand(
      makeContext(),
      'claude',
      { cwd: '/tmp/workspace', systemPrompt: 'sys', userPrompt: 'u' },
      new RecordingSink(),
      spawnFn,
      20,
    );
    assert.strictEqual(result.succeeded, false);
    assert.strictEqual(result.errorMessage, 'tempo esgotado aguardando resposta do motor.');
  });

  it('injects the stored credential as an env var for the given engine', async () => {
    const context = makeContext();
    await storeCredential(context, 'gemini', 'gk-123');
    let capturedEnv: NodeJS.ProcessEnv | undefined;
    const spawnFn: SpawnFn = (command, args, options) => {
      capturedEnv = options.env;
      return makeSucceedingProcess();
    };
    await runAgentForCommand(
      context,
      'gemini',
      { cwd: '/tmp/workspace', systemPrompt: 'sys', userPrompt: 'u' },
      new RecordingSink(),
      spawnFn,
    );
    assert.strictEqual(capturedEnv?.GEMINI_API_KEY, 'gk-123');
  });
});

describe('createAgentRunner', () => {
  it('returns an AgentRunner-shaped function that resolves credentials for the engineId passed at call time', async () => {
    const context = makeContext();
    await storeCredential(context, 'codex', 'ok-456');
    let capturedEnv: NodeJS.ProcessEnv | undefined;
    const spawnFn: SpawnFn = (command, args, options) => {
      capturedEnv = options.env;
      return makeSucceedingProcess();
    };
    const agentRunner = createAgentRunner(context, spawnFn);

    const result = await agentRunner(
      { cwd: '/tmp/workspace', systemPrompt: 'sys', userPrompt: 'u' },
      new RecordingSink(),
      'codex',
    );

    assert.strictEqual(result.succeeded, true);
    assert.strictEqual(capturedEnv?.OPENAI_API_KEY, 'ok-456');
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npx mocha --require ts-node/register --timeout 15000 "src/test/unit/runAgentForCommand.test.ts"`
Expected: FAIL — `Cannot find module '../../runAgentForCommand'`.

- [ ] **Step 3: Implementar**

```typescript
// poui-vscode/src/runAgentForCommand.ts
import { CredentialContext, getCredentialEnv } from './engineCredentials';
import { runAgent, GenerateResult, OutputSink, RunAgentOptions, SpawnFn } from './agentRuntime';
import { EngineId } from './engineTypes';

const TIMEOUT_RESULT: GenerateResult = {
  filesWritten: [],
  succeeded: false,
  errorMessage: 'tempo esgotado aguardando resposta do motor.',
};

/** Ponto único de injeção de credencial (Abordagem B) — resolve a
 * credencial salva pro motor e delega pro `runAgent` já existente.
 * `timeoutMs` é opcional e SEM valor default: só a validação de
 * `poui.configureEngine` passa um valor — geração real e o loop de
 * correção de build (que já levam bem mais que 30s) não devem ter teto. */
export async function runAgentForCommand(
  context: CredentialContext,
  engineId: EngineId,
  options: RunAgentOptions,
  sink: OutputSink,
  spawnFn?: SpawnFn,
  timeoutMs?: number,
): Promise<GenerateResult> {
  const credentialEnv = await getCredentialEnv(context, engineId);
  const runPromise = runAgent(options, sink, engineId, spawnFn, credentialEnv);
  if (timeoutMs === undefined) {
    return runPromise;
  }
  return Promise.race([
    runPromise,
    new Promise<GenerateResult>((resolve) => {
      setTimeout(() => resolve(TIMEOUT_RESULT), timeoutMs);
    }),
  ]);
}

/** Fecha sobre `context`/`spawnFn` e devolve uma função no formato exato
 * do tipo `AgentRunner` de `buildFixLoop.ts` — usado pra injetar
 * credencial no loop de correção de build sem duplicar a resolução em
 * cada um dos três comandos que o chamam (ver Task 7). Nunca passa
 * `timeoutMs` — correção de build é geração real, sem teto de 30s. */
export function createAgentRunner(
  context: CredentialContext,
  spawnFn?: SpawnFn,
): (options: RunAgentOptions, sink: OutputSink, engineId: EngineId) => Promise<GenerateResult> {
  return (options, sink, engineId) => runAgentForCommand(context, engineId, options, sink, spawnFn);
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npm run test:unit`
Expected: `322 passing` (318 depois da Task 4 + 4 desta task: 3 em `describe('runAgentForCommand')` + 1 em `describe('createAgentRunner')`).

- [ ] **Step 5: Commit**

```bash
git add poui-vscode/src/runAgentForCommand.ts poui-vscode/src/test/unit/runAgentForCommand.test.ts
git commit -m "feat(vscode-ext): add runAgentForCommand credential wrapper and createAgentRunner"
```

---

## Task 6: Trocar `runAgent` por `runAgentForCommand` nos 7 comandos existentes

**Files:**
- Modify: `poui-vscode/src/generateComponent.ts:6,145-158`
- Modify: `poui-vscode/src/generateConnect.ts:5,248`
- Modify: `poui-vscode/src/generateDocs.ts:5,71-84`
- Modify: `poui-vscode/src/generateE2e.ts:4,180-195` (import na linha 4, confirmar número exato ao editar)
- Modify: `poui-vscode/src/generateReview.ts:4,95-108`
- Modify: `poui-vscode/src/generateScreenshot.ts:7,76-87,162-172` (dois call sites nesse arquivo)
- Modify: `poui-vscode/src/generateTest.ts:4,114-126`

**Interfaces:**
- Consumes: `runAgentForCommand` (Task 5).
- Produces: nenhuma interface nova — só troca o motor de execução por trás dos 7 comandos já existentes, comportamento observável idêntico quando nenhuma credencial está salva (`getCredentialEnv` devolve `{}`).

Nenhum destes 7 arquivos tem teste unitário próprio (todos importam
`vscode` diretamente — seguem a convenção do projeto de só testar essa
camada fina de orquestração via a suite de integração, não via
`mocha`+`ts-node`). A verificação desta task é `npm run compile` +
`npm run test:unit` (sem regressão) + a suite de integração existente
(Task 10 estende essa suite com o comando novo, mas os 13 comandos já
registrados continuam cobertos pelos casos já existentes em
`extension.test.ts`).

- [ ] **Step 1: `generateComponent.ts`** — trocar o import (linha 6) de

```typescript
import { runAgent } from './agentRuntime';
```

por

```typescript
import { runAgentForCommand } from './runAgentForCommand';
```

E trocar a chamada (linhas 145-158):

```typescript
        runAgent(
          {
            cwd: workspaceFolder.uri.fsPath,
            systemPrompt,
            userPrompt,
            addDir: sourceFilePath ? path.dirname(sourceFilePath) : undefined,
            model: vscode.workspace.getConfiguration('poui').get<string>('model'),
            effort: vscode.workspace
              .getConfiguration('poui')
              .get<'low' | 'medium' | 'high' | 'xhigh' | 'max'>('effort'),
          },
          outputChannel,
          engineId,
        ),
```

por

```typescript
        runAgentForCommand(
          context,
          engineId,
          {
            cwd: workspaceFolder.uri.fsPath,
            systemPrompt,
            userPrompt,
            addDir: sourceFilePath ? path.dirname(sourceFilePath) : undefined,
            model: vscode.workspace.getConfiguration('poui').get<string>('model'),
            effort: vscode.workspace
              .getConfiguration('poui')
              .get<'low' | 'medium' | 'high' | 'xhigh' | 'max'>('effort'),
          },
          outputChannel,
        ),
```

- [ ] **Step 2: `generateConnect.ts`** — trocar o import (linha 5) de `import { runAgent } from './agentRuntime';` por `import { runAgentForCommand } from './runAgentForCommand';`, e a chamada (linha 248) de

```typescript
      () => runAgent({ cwd: workspaceRoot, systemPrompt, userPrompt, model, effort }, outputChannel, engineId),
```

por

```typescript
      () => runAgentForCommand(context, engineId, { cwd: workspaceRoot, systemPrompt, userPrompt, model, effort }, outputChannel),
```

- [ ] **Step 3: `generateDocs.ts`** — trocar o import (linha 5) de `import { runAgent } from './agentRuntime';` por `import { runAgentForCommand } from './runAgentForCommand';`, e a chamada (linhas 71-84) de

```typescript
        runAgent(
          {
            cwd: workspaceFolder.uri.fsPath,
            systemPrompt,
            userPrompt: buildDocsUserPrompt(componentName),
            tools: 'Read',
            model: vscode.workspace.getConfiguration('poui').get<string>('model'),
            effort: vscode.workspace
              .getConfiguration('poui')
              .get<'low' | 'medium' | 'high' | 'xhigh' | 'max'>('effort'),
          },
          outputChannel,
          engineId,
        ),
```

por

```typescript
        runAgentForCommand(
          context,
          engineId,
          {
            cwd: workspaceFolder.uri.fsPath,
            systemPrompt,
            userPrompt: buildDocsUserPrompt(componentName),
            tools: 'Read',
            model: vscode.workspace.getConfiguration('poui').get<string>('model'),
            effort: vscode.workspace
              .getConfiguration('poui')
              .get<'low' | 'medium' | 'high' | 'xhigh' | 'max'>('effort'),
          },
          outputChannel,
        ),
```

- [ ] **Step 4: `generateE2e.ts`** — trocar o import de `runAgent` por `runAgentForCommand` (mesmo padrão), e a chamada (linhas 180-195) de

```typescript
        runAgent(
          {
            cwd: workspaceRoot,
            systemPrompt,
            userPrompt,
            tools: E2E_TOOLS,
            allowedTools: E2E_MCP_ALLOWED_TOOLS,
            mcpConfig: buildPlaywrightMcpConfig(),
            model: vscode.workspace.getConfiguration('poui').get<string>('model'),
            effort: vscode.workspace
              .getConfiguration('poui')
              .get<'low' | 'medium' | 'high' | 'xhigh' | 'max'>('effort'),
          },
          outputChannel,
          engineId,
        ),
```

por

```typescript
        runAgentForCommand(
          context,
          engineId,
          {
            cwd: workspaceRoot,
            systemPrompt,
            userPrompt,
            tools: E2E_TOOLS,
            allowedTools: E2E_MCP_ALLOWED_TOOLS,
            mcpConfig: buildPlaywrightMcpConfig(),
            model: vscode.workspace.getConfiguration('poui').get<string>('model'),
            effort: vscode.workspace
              .getConfiguration('poui')
              .get<'low' | 'medium' | 'high' | 'xhigh' | 'max'>('effort'),
          },
          outputChannel,
        ),
```

- [ ] **Step 5: `generateReview.ts`** — trocar o import de `runAgent` por `runAgentForCommand`, e a chamada (linhas 95-108) de

```typescript
        runAgent(
          {
            cwd: workspaceFolder.uri.fsPath,
            systemPrompt,
            userPrompt,
            tools: REVIEW_TOOLS,
            model: vscode.workspace.getConfiguration('poui').get<string>('model'),
            effort: vscode.workspace
              .getConfiguration('poui')
              .get<'low' | 'medium' | 'high' | 'xhigh' | 'max'>('effort'),
          },
          outputChannel,
          engineId,
        ),
```

por

```typescript
        runAgentForCommand(
          context,
          engineId,
          {
            cwd: workspaceFolder.uri.fsPath,
            systemPrompt,
            userPrompt,
            tools: REVIEW_TOOLS,
            model: vscode.workspace.getConfiguration('poui').get<string>('model'),
            effort: vscode.workspace
              .getConfiguration('poui')
              .get<'low' | 'medium' | 'high' | 'xhigh' | 'max'>('effort'),
          },
          outputChannel,
        ),
```

- [ ] **Step 6: `generateScreenshot.ts`** — trocar o import (linha 7) de `import { runAgent, OutputSink } from './agentRuntime';` por:

```typescript
import { OutputSink } from './agentRuntime';
import { runAgentForCommand } from './runAgentForCommand';
```

Primeiro call site (linhas 76-87, fase de análise):

```typescript
        runAgent(
          {
            cwd: workspaceFolder.uri.fsPath,
            systemPrompt: analysisSystemPrompt,
            userPrompt: buildScreenshotUserPrompt(imagePath),
            tools: 'Read,Glob',
            model,
            effort,
          },
          sink,
          engineId,
        ),
```

vira

```typescript
        runAgentForCommand(
          context,
          engineId,
          {
            cwd: workspaceFolder.uri.fsPath,
            systemPrompt: analysisSystemPrompt,
            userPrompt: buildScreenshotUserPrompt(imagePath),
            tools: 'Read,Glob',
            model,
            effort,
          },
          sink,
        ),
```

Segundo call site (linhas 162-172, fase de geração):

```typescript
        runAgent(
          {
            cwd: workspaceFolder.uri.fsPath,
            systemPrompt: genSystemPrompt,
            userPrompt: genUserPromptLines.join('\n'),
            model,
            effort,
          },
          sink,
          engineId,
        ),
```

vira

```typescript
        runAgentForCommand(
          context,
          engineId,
          {
            cwd: workspaceFolder.uri.fsPath,
            systemPrompt: genSystemPrompt,
            userPrompt: genUserPromptLines.join('\n'),
            model,
            effort,
          },
          sink,
        ),
```

- [ ] **Step 7: `generateTest.ts`** — trocar o import de `runAgent` por `runAgentForCommand`, e a chamada (linhas 114-126) de

```typescript
        runAgent(
          {
            cwd: workspaceFolder.uri.fsPath,
            systemPrompt,
            userPrompt,
            model: vscode.workspace.getConfiguration('poui').get<string>('model'),
            effort: vscode.workspace
              .getConfiguration('poui')
              .get<'low' | 'medium' | 'high' | 'xhigh' | 'max'>('effort'),
          },
          outputChannel,
          engineId,
        ),
```

por

```typescript
        runAgentForCommand(
          context,
          engineId,
          {
            cwd: workspaceFolder.uri.fsPath,
            systemPrompt,
            userPrompt,
            model: vscode.workspace.getConfiguration('poui').get<string>('model'),
            effort: vscode.workspace
              .getConfiguration('poui')
              .get<'low' | 'medium' | 'high' | 'xhigh' | 'max'>('effort'),
          },
          outputChannel,
        ),
```

- [ ] **Step 8: Compilar e rodar a suíte inteira**

Run: `npm run compile && npm run test:unit`
Expected: compilação sem erros, `322 passing` (nenhum teste novo nesta task, ver nota acima sobre por quê — mesmo total do fim da Task 5).

- [ ] **Step 9: Commit**

```bash
git add poui-vscode/src/generateComponent.ts poui-vscode/src/generateConnect.ts poui-vscode/src/generateDocs.ts poui-vscode/src/generateE2e.ts poui-vscode/src/generateReview.ts poui-vscode/src/generateScreenshot.ts poui-vscode/src/generateTest.ts
git commit -m "feat(vscode-ext): route the 7 existing AI-engine commands through runAgentForCommand"
```

---

## Task 7: Injetar credencial no loop de correção de build

**Files:**
- Modify: `poui-vscode/src/generateComponent.ts:182-195`
- Modify: `poui-vscode/src/generateConnect.ts:270-273`
- Modify: `poui-vscode/src/generateScreenshot.ts:194-205`

**Interfaces:**
- Consumes: `createAgentRunner` (Task 5).

Esta é exatamente a correção do gap achado na revisão da spec: sem ela,
a chamada inicial de geração usaria a credencial salva corretamente,
mas qualquer correção automática de build cairia de volta no `runAgent`
sem credencial. A cobertura de regressão já existe (Task 5,
`createAgentRunner` testado isoladamente) — nenhum teste novo aqui,
pelo mesmo motivo da Task 6 (estes três arquivos não têm teste unitário
próprio).

- [ ] **Step 1: `generateComponent.ts`** — no import já trocado na Task 6, adicionar `createAgentRunner` ao lado de `runAgentForCommand`:

```typescript
import { runAgentForCommand, createAgentRunner } from './runAgentForCommand';
```

E na chamada de `runBuildFixLoop` (linhas 182-195), adicionar o quarto argumento:

```typescript
        runBuildFixLoop(
          {
            cwd: workspaceFolder.uri.fsPath,
            filesWritten: result.filesWritten,
            systemPrompt,
            engineId,
            model: vscode.workspace.getConfiguration('poui').get<string>('model'),
            effort: vscode.workspace
              .getConfiguration('poui')
              .get<'low' | 'medium' | 'high' | 'xhigh' | 'max'>('effort'),
          },
          outputChannel,
          undefined,
          createAgentRunner(context),
        ),
```

(O terceiro argumento de `runBuildFixLoop` é `buildRunner` — passar `undefined` mantém o default `runBuild` já usado hoje, só o quarto argumento — `agentRunner` — é novo.)

- [ ] **Step 2: `generateConnect.ts`** — mesmo ajuste no import, e na chamada (linhas 270-273):

```typescript
        runBuildFixLoop(
          { cwd: workspaceRoot, filesWritten: result.filesWritten, systemPrompt, engineId, model, effort },
          outputChannel,
          undefined,
          createAgentRunner(context),
        ),
```

- [ ] **Step 3: `generateScreenshot.ts`** — mesmo ajuste no import, e na chamada (linhas 194-205):

```typescript
        runBuildFixLoop(
          {
            cwd: workspaceFolder.uri.fsPath,
            filesWritten: result.filesWritten,
            systemPrompt: genSystemPrompt,
            engineId,
            model,
            effort,
          },
          sink,
          undefined,
          createAgentRunner(context),
        ),
```

- [ ] **Step 4: Compilar e rodar a suíte inteira**

Run: `npm run compile && npm run test:unit`
Expected: compilação sem erros, `322 passing` (mesmo total da Task 6 — nenhum teste novo).

- [ ] **Step 5: Commit**

```bash
git add poui-vscode/src/generateComponent.ts poui-vscode/src/generateConnect.ts poui-vscode/src/generateScreenshot.ts
git commit -m "fix(vscode-ext): keep the saved AI-engine credential through build-fix retries"
```

---

## Task 8: `configureEngineLogic.ts` — lógica pura do fluxo de configuração

**Files:**
- Create: `poui-vscode/src/configureEngineLogic.ts`
- Test: `poui-vscode/src/test/unit/configureEngineLogic.test.ts`

**Interfaces:**
- Produces: `EngineChoice`, `buildEngineChoices(activeEngineId: EngineId): EngineChoice[]`,
  `CredentialAction`, `CredentialChoice`, `buildCredentialChoices(hasStoredCredential: boolean): CredentialChoice[]`,
  `buildValidationOptions(cwd: string): RunAgentOptions`, `getValidationTimeoutMs(): number`,
  `ValidationOutcome`, `interpretValidationResult(engineLabel: string, result: GenerateResult): ValidationOutcome` —
  consumidos pela Task 9.

- [ ] **Step 1: Escrever o teste**

```typescript
// poui-vscode/src/test/unit/configureEngineLogic.test.ts
import * as assert from 'node:assert';
import {
  buildEngineChoices,
  buildCredentialChoices,
  buildValidationOptions,
  getValidationTimeoutMs,
  interpretValidationResult,
} from '../../configureEngineLogic';

describe('buildEngineChoices', () => {
  it('lists claude, codex and gemini, marking the active engine', () => {
    const choices = buildEngineChoices('codex');
    assert.deepStrictEqual(
      choices.map((c) => [c.engineId, c.description]),
      [
        ['claude', ''],
        ['codex', '(motor ativo)'],
        ['gemini', ''],
      ],
    );
  });
});

describe('buildCredentialChoices', () => {
  it('offers oauth and apiKey without a remove option when nothing is stored', () => {
    const choices = buildCredentialChoices(false);
    assert.deepStrictEqual(choices.map((c) => c.action), ['oauth', 'apiKey']);
  });

  it('also offers remove when a credential is already stored', () => {
    const choices = buildCredentialChoices(true);
    assert.deepStrictEqual(choices.map((c) => c.action), ['oauth', 'apiKey', 'remove']);
  });
});

describe('buildValidationOptions', () => {
  it('builds a minimal RunAgentOptions with a short OK-only prompt', () => {
    const options = buildValidationOptions('/tmp/workspace');
    assert.strictEqual(options.cwd, '/tmp/workspace');
    assert.strictEqual(options.userPrompt, 'Responda apenas OK.');
    assert.strictEqual(options.tools, undefined);
    assert.strictEqual(options.addDir, undefined);
    assert.strictEqual(options.mcpConfig, undefined);
  });
});

describe('getValidationTimeoutMs', () => {
  it('returns 30000', () => {
    assert.strictEqual(getValidationTimeoutMs(), 30000);
  });
});

describe('interpretValidationResult', () => {
  it('returns a success outcome when succeeded is true', () => {
    const outcome = interpretValidationResult('Gemini', { filesWritten: [], succeeded: true });
    assert.strictEqual(outcome.kind, 'success');
  });

  it('returns an authError outcome when isAuthError is true', () => {
    const outcome = interpretValidationResult('Gemini', {
      filesWritten: [],
      succeeded: false,
      isAuthError: true,
      errorMessage: 'nope',
    });
    assert.strictEqual(outcome.kind, 'authError');
  });

  it('returns an otherError outcome with the raw error message otherwise', () => {
    const outcome = interpretValidationResult('Gemini', {
      filesWritten: [],
      succeeded: false,
      errorMessage: 'network down',
    });
    assert.strictEqual(outcome.kind, 'otherError');
    assert.ok(outcome.message.includes('network down'));
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npx mocha --require ts-node/register --timeout 15000 "src/test/unit/configureEngineLogic.test.ts"`
Expected: FAIL — `Cannot find module '../../configureEngineLogic'`.

- [ ] **Step 3: Implementar**

```typescript
// poui-vscode/src/configureEngineLogic.ts
import { EngineId, RunAgentOptions, GenerateResult } from './engineTypes';

export interface EngineChoice {
  label: string;
  description: string;
  engineId: EngineId;
}

const ENGINE_LABELS: Record<EngineId, string> = {
  claude: 'Claude',
  codex: 'Codex',
  gemini: 'Gemini',
};

export function buildEngineChoices(activeEngineId: EngineId): EngineChoice[] {
  return (['claude', 'codex', 'gemini'] as EngineId[]).map((engineId) => ({
    label: ENGINE_LABELS[engineId],
    description: engineId === activeEngineId ? '(motor ativo)' : '',
    engineId,
  }));
}

export type CredentialAction = 'oauth' | 'apiKey' | 'remove';

export interface CredentialChoice {
  label: string;
  action: CredentialAction;
}

export function buildCredentialChoices(hasStoredCredential: boolean): CredentialChoice[] {
  const choices: CredentialChoice[] = [
    { label: 'Login gratuito (abre navegador)', action: 'oauth' },
    { label: 'Tenho uma API key', action: 'apiKey' },
  ];
  if (hasStoredCredential) {
    choices.push({ label: 'Remover credencial salva', action: 'remove' });
  }
  return choices;
}

const VALIDATION_TIMEOUT_MS = 30000;

export function buildValidationOptions(cwd: string): RunAgentOptions {
  return {
    cwd,
    systemPrompt: 'Você está validando uma credencial de API. Responda apenas com a palavra OK, nada mais.',
    userPrompt: 'Responda apenas OK.',
  };
}

export function getValidationTimeoutMs(): number {
  return VALIDATION_TIMEOUT_MS;
}

export interface ValidationOutcome {
  kind: 'success' | 'authError' | 'otherError';
  message: string;
}

export function interpretValidationResult(engineLabel: string, result: GenerateResult): ValidationOutcome {
  if (result.succeeded) {
    return { kind: 'success', message: `PO-UI: conexão com ${engineLabel} validada com sucesso.` };
  }
  if (result.isAuthError) {
    return {
      kind: 'authError',
      message: `PO-UI: credencial inválida ou sem permissão para ${engineLabel}. Tente novamente.`,
    };
  }
  return {
    kind: 'otherError',
    message: `PO-UI: falha ao testar ${engineLabel} — ${result.errorMessage ?? 'erro desconhecido'}.`,
  };
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npm run test:unit`
Expected: `330 passing` (322 depois da Task 7 + 8 desta task: 1 em `buildEngineChoices` + 2 em `buildCredentialChoices` + 1 em `buildValidationOptions` + 1 em `getValidationTimeoutMs` + 3 em `interpretValidationResult`).

- [ ] **Step 5: Commit**

```bash
git add poui-vscode/src/configureEngineLogic.ts poui-vscode/src/test/unit/configureEngineLogic.test.ts
git commit -m "feat(vscode-ext): add pure QuickPick/validation logic for engine configuration"
```

---

## Task 9: `configureEngine.ts` — comando `poui.configureEngine`

**Files:**
- Create: `poui-vscode/src/configureEngine.ts`
- Modify: `poui-vscode/src/extension.ts`
- Modify: `poui-vscode/package.json`

**Interfaces:**
- Consumes: `checkEngineAvailable` (existente, `cliCheck.ts`), `runAgentForCommand` (Task 5),
  `hasCredential`/`storeCredential`/`deleteCredential` (Task 3), `buildEngineChoices`/
  `buildCredentialChoices`/`buildValidationOptions`/`getValidationTimeoutMs`/`interpretValidationResult`
  (Task 8).
- Produces: `registerConfigureEngineCommand(context, outputChannel): vscode.Disposable`,
  comando `poui.configureEngine` registrado.

Este arquivo importa `vscode` diretamente (é a camada de orquestração,
mesmo padrão dos outros 13 comandos) — sem teste unitário próprio; a
Task 10 cobre o registro via suite de integração.

- [ ] **Step 1: Implementar `configureEngine.ts`**

```typescript
// poui-vscode/src/configureEngine.ts
import * as vscode from 'vscode';
import { checkEngineAvailable } from './cliCheck';
import { runAgentForCommand } from './runAgentForCommand';
import { storeCredential, deleteCredential, hasCredential } from './engineCredentials';
import {
  buildEngineChoices,
  buildCredentialChoices,
  buildValidationOptions,
  getValidationTimeoutMs,
  interpretValidationResult,
  CredentialAction,
} from './configureEngineLogic';
import { EngineId } from './engineTypes';

const ENGINE_LABELS: Record<EngineId, string> = {
  claude: 'Claude',
  codex: 'Codex',
  gemini: 'Gemini',
};

/** Comando de terminal pra disparar o login OAuth de cada motor. Codex:
 * `codex login` (assunção já existente em `codexAdapter.ts`, não
 * validada de ponta a ponta nesta sessão por falta de conta OpenAI — ver
 * Task 2). Gemini: só `gemini` sem argumentos — confirmado via
 * `gemini --help` real em 2026-09-06 (Task 1): não existe subcomando
 * `login`/`auth` dedicado, a autenticação OAuth acontece na primeira
 * execução interativa do próprio binário. */
const ENGINE_LOGIN_COMMAND: Partial<Record<EngineId, string>> = {
  codex: 'codex login',
  gemini: 'gemini',
};

interface EngineQuickPickItem extends vscode.QuickPickItem {
  engineId: EngineId;
}

interface CredentialQuickPickItem extends vscode.QuickPickItem {
  action: CredentialAction;
}

async function setActiveEngineIfConfirmed(
  engineId: EngineId,
  engineLabel: string,
  outputChannel: vscode.OutputChannel,
): Promise<void> {
  const choice = await vscode.window.showInformationMessage(`Definir ${engineLabel} como motor ativo?`, 'Sim', 'Não');
  if (choice !== 'Sim') {
    return;
  }
  await vscode.workspace.getConfiguration('poui').update('aiEngine', engineId, vscode.ConfigurationTarget.Global);
  outputChannel.appendLine(`PO-UI: motor ativo definido como ${engineLabel}.`);
  void vscode.window.showInformationMessage(`PO-UI: motor ativo definido como ${engineLabel}.`);
}

async function validateCredential(
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel,
  engineId: EngineId,
  engineLabel: string,
  workspaceRoot: string,
): Promise<boolean> {
  const result = await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: `PO-UI: testando conexão com ${engineLabel}...` },
    () =>
      runAgentForCommand(
        context,
        engineId,
        buildValidationOptions(workspaceRoot),
        outputChannel,
        undefined,
        getValidationTimeoutMs(),
      ),
  );
  const outcome = interpretValidationResult(engineLabel, result);
  if (outcome.kind === 'success') {
    void vscode.window.showInformationMessage(outcome.message);
    return true;
  }
  void vscode.window.showErrorMessage(outcome.message);
  return false;
}

async function configureCredentialEngine(
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel,
  engineId: EngineId,
  engineLabel: string,
  workspaceRoot: string,
): Promise<void> {
  const alreadyHasCredential = await hasCredential(context, engineId);
  const credentialChoice = await vscode.window.showQuickPick<CredentialQuickPickItem>(
    buildCredentialChoices(alreadyHasCredential).map((c) => ({ label: c.label, action: c.action })),
    { placeHolder: `Como você quer autenticar o ${engineLabel}?` },
  );
  if (!credentialChoice) {
    return;
  }

  if (credentialChoice.action === 'remove') {
    await deleteCredential(context, engineId);
    void vscode.window.showInformationMessage(`PO-UI: credencial salva do ${engineLabel} removida.`);
    return;
  }

  if (credentialChoice.action === 'oauth') {
    const loginCommand = ENGINE_LOGIN_COMMAND[engineId];
    const terminal = vscode.window.createTerminal(`PO-UI: Login ${engineLabel}`);
    terminal.show();
    if (loginCommand) {
      terminal.sendText(loginCommand);
    }
    const confirmed = await vscode.window.showInformationMessage(
      `Complete o login do ${engineLabel} no terminal aberto e clique em "Concluí o login".`,
      { modal: true },
      'Concluí o login',
    );
    if (confirmed !== 'Concluí o login') {
      return;
    }
  } else {
    const apiKey = await vscode.window.showInputBox({
      prompt: `API key do ${engineLabel}`,
      password: true,
      validateInput: (v) => (v.trim() ? undefined : 'Informe uma API key.'),
    });
    if (!apiKey) {
      return;
    }
    await storeCredential(context, engineId, apiKey);
  }

  const valid = await validateCredential(context, outputChannel, engineId, engineLabel, workspaceRoot);
  if (!valid) {
    const retry = await vscode.window.showWarningMessage(
      `PO-UI: não foi possível validar a conexão com ${engineLabel}.`,
      'Tentar de novo',
      'Cancelar',
    );
    if (retry === 'Tentar de novo') {
      await configureCredentialEngine(context, outputChannel, engineId, engineLabel, workspaceRoot);
    }
    return;
  }

  await setActiveEngineIfConfirmed(engineId, engineLabel, outputChannel);
}

export function registerConfigureEngineCommand(
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel,
): vscode.Disposable {
  return vscode.commands.registerCommand('poui.configureEngine', async () => {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? process.cwd();
    const activeEngineId = vscode.workspace.getConfiguration('poui').get<EngineId>('aiEngine', 'claude');

    const engineChoice = await vscode.window.showQuickPick<EngineQuickPickItem>(
      buildEngineChoices(activeEngineId).map((c) => ({ label: c.label, description: c.description, engineId: c.engineId })),
      { placeHolder: 'Qual motor de IA você quer configurar?' },
    );
    if (!engineChoice) {
      return;
    }
    const { engineId } = engineChoice;
    const engineLabel = ENGINE_LABELS[engineId];

    if (engineId === 'claude') {
      const cliCheck = await vscode.window.withProgress(
        { location: vscode.ProgressLocation.Notification, title: 'PO-UI: verificando CLI do Claude...' },
        () => checkEngineAvailable('claude'),
      );
      if (cliCheck.available) {
        void vscode.window.showInformationMessage(`PO-UI: CLI do Claude encontrada (${cliCheck.version}).`);
      } else {
        void vscode.window.showErrorMessage(
          `PO-UI: CLI do Claude não encontrada ou não está no PATH.${cliCheck.errorMessage ? ` (${cliCheck.errorMessage})` : ''}`,
        );
      }
      await setActiveEngineIfConfirmed(engineId, engineLabel, outputChannel);
      return;
    }

    await configureCredentialEngine(context, outputChannel, engineId, engineLabel, workspaceRoot);
  });
}
```

- [ ] **Step 2: Registrar o comando em `extension.ts`**

Adicionar o import (junto aos outros `registerXCommand`):

```typescript
import { registerConfigureEngineCommand } from './configureEngine';
```

E a linha de registro (depois de `context.subscriptions.push(registerDocsCommand(context, outputChannel));`):

```typescript
  context.subscriptions.push(registerConfigureEngineCommand(context, outputChannel));
```

- [ ] **Step 3: Adicionar o comando em `package.json`**

Em `contributes.commands`, depois da entrada de `poui.docs`:

```json
      { "command": "poui.docs", "title": "PO-UI: Consultar Documentação de Componente" },
      { "command": "poui.configureEngine", "title": "PO-UI: Configurar Motor de IA" }
```

- [ ] **Step 4: Compilar**

Run: `npm run compile`
Expected: sem erros de TypeScript.

- [ ] **Step 5: Commit**

```bash
git add poui-vscode/src/configureEngine.ts poui-vscode/src/extension.ts poui-vscode/package.json
git commit -m "feat(vscode-ext): add PO-UI: Configurar Motor de IA command"
```

---

## Task 10: Suite de integração — registro do comando novo

**Files:**
- Modify: `poui-vscode/src/test/suite/extension.test.ts`

**Interfaces:**
- Consumes: comando `poui.configureEngine` (Task 9).

- [ ] **Step 1: Adicionar o caso de teste**

Adicionar este `it(...)` em `poui-vscode/src/test/suite/extension.test.ts`, no mesmo padrão dos outros 13 casos já existentes (ex.: o de `poui.docs`):

```typescript
  it('registers the poui.configureEngine command after activation', async () => {
    const ext = vscode.extensions.getExtension('andre-costa.poui-vscode');
    await ext?.activate();
    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes('poui.configureEngine'));
  });
```

- [ ] **Step 2: Rodar a suíte de integração, se possível**

Run: `npm run test`

Expected: todos os casos passam, incluindo o novo. **Limitação já
conhecida deste projeto** (registrada em sessão anterior): esta suíte
usa `@vscode/test-electron`, que exige zero instâncias do VS Code
abertas — se isso não for possível agora, pular esta verificação e
confiar na Task 11 (validação manual completa) pra confirmar o registro
de verdade.

- [ ] **Step 3: Commit**

```bash
git add poui-vscode/src/test/suite/extension.test.ts
git commit -m "test(vscode-ext): cover poui.configureEngine registration in the integration suite"
```

---

## Task 11: Validação manual de ponta a ponta

**Files:** nenhum — checklist de verificação real, sem a qual esta feature não deve ser considerada pronta (mesmo padrão já seguido em todas as fatias anteriores desta extensão: nenhuma foi declarada concluída só com testes unitários verdes).

- [ ] **Step 1: Empacotar e instalar**

Run: `cd poui-vscode && npx @vscode/vsce package` e instalar o `.vsix` gerado via "Extensions: Install from VSIX..." (evita a instabilidade já conhecida do F5/Extension Development Host nesta máquina).

- [ ] **Step 2: Validar o caminho Claude**

Rodar `PO-UI: Configurar Motor de IA` → escolher Claude → confirmar que aparece a versão da CLI (ou o erro de instalação, se não estiver logada) → responder "Sim" na pergunta final → confirmar que `poui.aiEngine` virou `"claude"` em User Settings.

- [ ] **Step 3: Validar o caminho Gemini (API key)** — motor já testado ponta a ponta nesta extensão antes, só falta este fluxo de configuração

Escolher Gemini → "Tenho uma API key" → colar uma key real (AI Studio, gratuita) → confirmar que a barra de progresso "Testando conexão com Gemini..." aparece → validação deve suceder (ou falhar com mensagem clara se a cota diária já estiver esgotada, limitação de conta já conhecida, não bug) → confirmar `poui.aiEngine` = `"gemini"`.

- [ ] **Step 4: Validar "Remover credencial salva"**

Rodar o comando de novo com Gemini já configurado → confirmar que a opção "Remover credencial salva" aparece no QuickPick → escolher, confirmar que some (chamar de novo confirma que a opção não aparece mais).

- [ ] **Step 5: Validar que o build-fix retém a credencial (o gap corrigido na Task 7)**

Com Gemini configurado via API key salva, rodar `PO-UI: Gerar Componente` num projeto de teste que force um erro de build (ex.: usar um tipo com um bug conhecido, ou revisar manualmente o prompt gerado) — confirmar que, se o loop de correção entrar em ação, ele não falha com erro de autenticação (o que aconteceria antes da Task 7).

- [ ] **Step 6: Validar Codex, se o usuário tiver conta OpenAI disponível**

Mesmo roteiro do Gemini, usando `codex login` (OAuth) ou API key da OpenAI. Se nenhuma conta estiver disponível, registrar explicitamente que este caminho continua não validado de ponta a ponta (mesma limitação já existente antes deste plano).

- [ ] **Step 7: Atualizar a memória do projeto**

Depois da validação manual, atualizar `project-vscode-multi-engine-design.md` (memória) com o resultado real — o que passou, o que falhou, e se `codexAdapter.ts`/`geminiAdapter.ts` ainda têm TODOs em aberto depois desta rodada.

---

## Self-Review

**Cobertura da spec**: as 5 áreas da spec (armazenamento de credencial,
alteração aditiva do `agentRuntime.ts`, wrapper de injeção, comando de
configuração com os 5 passos do fluxo, feedback visual via
`withProgress` em toda espera) têm task correspondente (3, 4, 5, 9, 9).
O gap do `buildFixLoop.ts` tem task própria (7). Os dois TODOs de risco
da spec têm task de verificação antes das tasks de código que dependem
deles (1 e 2, antes da 9).

**Placeholders**: nenhum "TBD"/"implementar depois" — os dois pontos
que a spec original deixava em aberto (mecanismo do Gemini, CLI do
Codex) foram resolvidos com investigação real (Task 1) ou têm uma
decisão explícita de fallback documentada, não um vazio (Task 2).

**Consistência de tipos**: `CredentialContext`/`SecretStorage` (Task 3)
usados identicamente em `runAgentForCommand.ts` (Task 5) e
`configureEngine.ts` (Task 9, via `vscode.ExtensionContext` que
satisfaz a interface estruturalmente). `AgentRunner` de
`buildFixLoop.ts` (tipo já existente, não alterado) bate exatamente com
o retorno de `createAgentRunner` (Task 5), usado nos 3 call sites da
Task 7. `EngineChoice`/`CredentialChoice`/`ValidationOutcome` (Task 8)
consumidos com os mesmos nomes de campo em `configureEngine.ts`
(Task 9).
