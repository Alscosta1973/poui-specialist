# Extensão VS Code poui-specialist — troca de motor para o Claude Code CLI headless — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar o motor de geração da extensão `poui-vscode` do Claude Agent SDK (API key própria, cobrada à parte) para o CLI headless do Claude Code (`claude -p`), reaproveitando a sessão OAuth do claude.ai já logada — sem API key, sem custo extra, mas dependente do binário `claude` instalado.

**Architecture:** `agentRuntime.ts` passa a spawnar `claude` como subprocesso (`child_process.spawn`) em vez de chamar `query()` do Agent SDK, lendo `stdout` linha a linha (JSON delimitado por newline, mesmo formato de mensagem já testado na Fase 0). `apiKey.ts` e o comando `poui.setApiKey` são removidos; um novo módulo `cliCheck.ts` substitui o guard de "API key ausente" por um guard de "CLI `claude` não encontrado".

**Tech Stack:** TypeScript, Node.js `child_process`/`fs`/`os`/`readline`/`crypto`/`events`/`stream` (built-ins, nenhuma dependência nova), Mocha para testes unitários.

**Spec:** `docs/superpowers/specs/2026-08-23-vscode-extension-cli-backend-design.md` — leia junto com este plano.

## Global Constraints

- **Nunca usar a flag `--bare`** ao spawnar `claude` — ela desliga a leitura da sessão OAuth (exige `ANTHROPIC_API_KEY`), que é exatamente o que esta troca evita.
- Flags confirmadas por testes reais contra o CLI instalado (v2.1.238), não por suposição:
  - `--setting-sources ""` (string vazia) isola de fato todas as fontes de configuração `.claude/` — testado com uma chamada real (`claude --setting-sources "" -p "..." --output-format json`), sem erro.
  - `--output-format stream-json --verbose` (**sem** `--include-partial-messages`) emite uma mensagem `{"type":"assistant","message":{"content":[...]}}` por bloco de conteúdo completo — o mesmo formato que `agentRuntime.ts` já parseia. **Não usar `--include-partial-messages`**: isso muda a granularidade para eventos de streaming token-a-token (`stream_event`/`content_block_delta`), formato diferente e não testado aqui.
  - `--tools "Read,Write,Edit,Glob,Grep"` restringe de verdade o conjunto de ferramentas (confirmado no campo `tools` da mensagem `system/init` de uma chamada real).
  - `--permission-mode acceptEdits` é um valor válido (confirmado via `claude --help`).
  - **O código de saída do processo NÃO é um sinal confiável de sucesso/falha da tarefa** — confirmado empiricamente: uma chamada com `--model` inválido retorna `is_error: true` na mensagem `result` (com detalhes do erro, `api_error_status: 404`) mas o processo ainda sai com código `0`. A única fonte de verdade para sucesso/falha é o campo `is_error` da mensagem `type: "result"`, exatamente como já era ao usar `is_error` do `SDKResultMessage`. O código de saída só serve como sinal de fallback para "o processo encerrou sem nunca emitir uma mensagem `result`" (crash, kill, etc.).
- O `env` do subprocesso deve remover `ANTHROPIC_API_KEY`, `ANTHROPIC_AUTH_TOKEN` e `ANTHROPIC_BASE_URL` do ambiente herdado antes de spawnar — se alguma dessas variáveis estiver setada no processo do VS Code (ex: de um projeto anterior), ela teria prioridade sobre a sessão OAuth na resolução de credenciais do CLI, o que reintroduziria silenciosamente cobrança separada — exatamente o problema que esta troca resolve.
- Testes unitários (Mocha, `ts-node`, sem Electron) nunca chamam o binário `claude` de verdade — `agentRuntime.ts` recebe um `spawnFn` injetável (mesmo padrão de DI que `loadQuery` usava antes) e `cliCheck.ts` recebe uma função de verificação injetável.
- `@vscode/test-electron` continua reservado para o único teste de integração já existente (registro dos comandos) — este plano só precisa atualizá-lo para não referenciar mais `poui.setApiKey`.
- Interfaces públicas que **não mudam** (Task 6 da Fase 0 original, `generatePageList.ts`, continua chamando do mesmo jeito): `OutputSink.appendLine(value: string): void`, `GenerateResult { filesWritten: string[]; succeeded: boolean; errorMessage?: string; isAuthError?: boolean }`. **O que muda**: `RunGenerateOptions` perde o campo `apiKey: string` (não existe mais).

---

## Task 1: Verificação de disponibilidade do CLI (`cliCheck.ts`)

**Files:**
- Create: `poui-vscode/src/cliCheck.ts`
- Test: `poui-vscode/src/test/unit/cliCheck.test.ts`

**Interfaces:**
- Produces: `CliCheckResult { available: boolean; version?: string; errorMessage?: string }`, `RunVersionCheck = (command: string, args: string[]) => Promise<{ stdout: string }>`, `checkClaudeCliAvailable(run?: RunVersionCheck): Promise<CliCheckResult>` — Task 3 (`generatePageList.ts`) chama essa função no lugar do antigo `getApiKey`.

- [ ] **Step 1: Write the failing tests**

Create `poui-vscode/src/test/unit/cliCheck.test.ts`:

```typescript
import * as assert from 'node:assert';
import { checkClaudeCliAvailable, RunVersionCheck } from '../../cliCheck';

describe('checkClaudeCliAvailable', () => {
  it('reports available with the trimmed version when the command succeeds', async () => {
    const run: RunVersionCheck = async () => ({ stdout: '2.1.238 (Claude Code)\n' });
    const result = await checkClaudeCliAvailable(run);
    assert.deepStrictEqual(result, { available: true, version: '2.1.238 (Claude Code)' });
  });

  it('reports unavailable with the error message when the command is not found', async () => {
    const run: RunVersionCheck = async () => {
      throw new Error("spawn claude ENOENT");
    };
    const result = await checkClaudeCliAvailable(run);
    assert.strictEqual(result.available, false);
    assert.strictEqual(result.errorMessage, 'spawn claude ENOENT');
  });

  it('invokes the real command name and version flag by default', async () => {
    let capturedCommand: string | undefined;
    let capturedArgs: string[] | undefined;
    const run: RunVersionCheck = async (command, args) => {
      capturedCommand = command;
      capturedArgs = args;
      return { stdout: '2.1.238' };
    };
    await checkClaudeCliAvailable(run);
    assert.strictEqual(capturedCommand, 'claude');
    assert.deepStrictEqual(capturedArgs, ['--version']);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd poui-vscode && npm run test:unit`
Expected: FAIL — `Cannot find module '../../cliCheck'`.

- [ ] **Step 3: Implement `cliCheck.ts`**

Create `poui-vscode/src/cliCheck.ts`:

```typescript
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export interface CliCheckResult {
  available: boolean;
  version?: string;
  errorMessage?: string;
}

export type RunVersionCheck = (command: string, args: string[]) => Promise<{ stdout: string }>;

async function defaultRunVersionCheck(command: string, args: string[]): Promise<{ stdout: string }> {
  const { stdout } = await execFileAsync(command, args);
  return { stdout };
}

export async function checkClaudeCliAvailable(
  run: RunVersionCheck = defaultRunVersionCheck,
): Promise<CliCheckResult> {
  try {
    const { stdout } = await run('claude', ['--version']);
    return { available: true, version: stdout.trim() };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { available: false, errorMessage };
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd poui-vscode && npm run test:unit`
Expected: PASS — all 3 `checkClaudeCliAvailable` tests green, plus every test from earlier work still green.

- [ ] **Step 5: Commit**

```bash
git add poui-vscode/src/cliCheck.ts poui-vscode/src/test/unit/cliCheck.test.ts
git commit -m "feat(vscode-ext): add Claude Code CLI availability check"
```

---

## Task 2: Reescrever `agentRuntime.ts` para spawnar o CLI

**Files:**
- Modify: `poui-vscode/src/agentRuntime.ts` (reescrita completa)
- Modify: `poui-vscode/src/test/unit/agentRuntime.test.ts` (reescrita completa)

**Interfaces:**
- Produces (substituindo a versão SDK-based): `OutputSink` (sem mudança), `GenerateResult` (sem mudança), `RunGenerateOptions { cwd: string; systemPrompt: string; userPrompt: string; model?: string; effort?: 'low' | 'medium' | 'high' | 'xhigh' | 'max' }` (**perde o campo `apiKey`**), `SpawnedProcess { stdout: NodeJS.ReadableStream; stderr: NodeJS.ReadableStream; on(event: 'error', listener: (err: Error) => void): unknown; on(event: 'close', listener: (code: number | null) => void): unknown }`, `SpawnFn = (command: string, args: string[], options: { cwd: string; env: NodeJS.ProcessEnv }) => SpawnedProcess`, `runGeneratePageList(options: RunGenerateOptions, sink: OutputSink, spawnFn?: SpawnFn): Promise<GenerateResult>` — Task 3 (`generatePageList.ts`) chama essa função sem passar `apiKey` e sem passar `spawnFn` (usa o default real).

- [ ] **Step 1: Reescrever o arquivo de teste com o novo contrato (spawn-based)**

Substituir todo o conteúdo de `poui-vscode/src/test/unit/agentRuntime.test.ts`:

```typescript
import * as assert from 'node:assert';
import { EventEmitter } from 'node:events';
import { Readable } from 'node:stream';
import { runGeneratePageList, OutputSink, SpawnFn, SpawnedProcess } from '../../agentRuntime';

class RecordingSink implements OutputSink {
  readonly lines: string[] = [];
  appendLine(value: string): void {
    this.lines.push(value);
  }
}

/**
 * Fake `child_process`-like objeto. `lines` são serializadas como JSON e
 * emitidas via `stdout`, uma por linha — o mesmo formato que
 * `claude --output-format stream-json --verbose` produz de verdade. Depois
 * que `stdout` termina, emite `close(exitCode)` (padrão 0) num
 * `setImmediate`, a menos que `spawnError` seja passado — nesse caso emite
 * só `error` (simulando `ENOENT`, binário não encontrado).
 */
function makeFakeProcess(options: {
  messages?: unknown[];
  exitCode?: number | null;
  spawnError?: Error;
}): SpawnedProcess {
  const emitter = new EventEmitter();
  const lines = (options.messages ?? []).map((message) => `${JSON.stringify(message)}\n`);
  const stdout = Readable.from(lines);
  const stderr = new Readable({ read() { this.push(null); } });

  if (options.spawnError) {
    setImmediate(() => emitter.emit('error', options.spawnError));
  } else {
    stdout.on('end', () => {
      setImmediate(() => emitter.emit('close', options.exitCode ?? 0));
    });
  }

  return {
    stdout,
    stderr,
    on: (event: string, listener: (...args: unknown[]) => void) => emitter.on(event, listener),
  } as unknown as SpawnedProcess;
}

function assistantMessage(content: unknown[], error?: string) {
  return { type: 'assistant', error, message: { role: 'assistant', content } };
}

describe('runGeneratePageList', () => {
  it('streams assistant content blocks to the sink and collects written files', async () => {
    const sink = new RecordingSink();
    const spawnFn: SpawnFn = () =>
      makeFakeProcess({
        messages: [
          assistantMessage([
            { type: 'text', text: 'Planejando arquivos...' },
            {
              type: 'tool_use',
              name: 'Write',
              input: { file_path: 'src/app/financeiro/pedidos-list/pedidos-list.component.ts' },
            },
          ]),
          assistantMessage([
            { type: 'tool_use', name: 'Edit', input: { file_path: 'src/app/app.routes.ts' } },
            { type: 'tool_use', name: 'Read', input: { file_path: 'package.json' } },
          ]),
          { type: 'result', subtype: 'success', is_error: false, result: 'done' },
        ],
      });

    const result = await runGeneratePageList(
      { cwd: '/tmp/workspace', systemPrompt: 'system', userPrompt: 'user' },
      sink,
      spawnFn,
    );

    assert.strictEqual(result.succeeded, true);
    assert.ok(!result.isAuthError);
    assert.deepStrictEqual(result.filesWritten, [
      'src/app/financeiro/pedidos-list/pedidos-list.component.ts',
      'src/app/app.routes.ts',
    ]);
    assert.ok(sink.lines.some((line) => line.includes('Planejando arquivos')));
    assert.ok(sink.lines.some((line) => line.includes('Write')));
    assert.ok(sink.lines.some((line) => line.includes('Read')));
  });

  it('returns succeeded: false when the result message reports an error, even with exit code 0', async () => {
    const sink = new RecordingSink();
    const spawnFn: SpawnFn = () =>
      makeFakeProcess({
        exitCode: 0,
        messages: [
          assistantMessage([{ type: 'text', text: 'tentando...' }]),
          { type: 'result', subtype: 'error_during_execution', is_error: true, errors: ['tool execution failed', 'aborted'] },
        ],
      });

    const result = await runGeneratePageList(
      { cwd: '/tmp/workspace', systemPrompt: 'system', userPrompt: 'user' },
      sink,
      spawnFn,
    );

    assert.strictEqual(result.succeeded, false);
    assert.strictEqual(result.errorMessage, 'tool execution failed; aborted');
    assert.ok(sink.lines.some((line) => line.includes('falha ao executar o agente')));
  });

  it('falls back to the result subtype when the error list is empty', async () => {
    const sink = new RecordingSink();
    const spawnFn: SpawnFn = () =>
      makeFakeProcess({ messages: [{ type: 'result', subtype: 'error_max_turns', is_error: true, errors: [] }] });

    const result = await runGeneratePageList(
      { cwd: '/tmp/workspace', systemPrompt: 'system', userPrompt: 'user' },
      sink,
      spawnFn,
    );

    assert.strictEqual(result.succeeded, false);
    assert.strictEqual(result.errorMessage, 'error_max_turns');
  });

  it('flags isAuthError when an assistant message reports authentication_failed', async () => {
    const sink = new RecordingSink();
    const spawnFn: SpawnFn = () =>
      makeFakeProcess({
        messages: [
          assistantMessage([{ type: 'text', text: 'sem acesso' }], 'authentication_failed'),
          { type: 'result', subtype: 'error_during_execution', is_error: true, errors: ['authentication failed'] },
        ],
      });

    const result = await runGeneratePageList(
      { cwd: '/tmp/workspace', systemPrompt: 'system', userPrompt: 'user' },
      sink,
      spawnFn,
    );

    assert.strictEqual(result.succeeded, false);
    assert.strictEqual(result.isAuthError, true);
  });

  it('flags isAuthError when the result carries api_error_status 401', async () => {
    const sink = new RecordingSink();
    const spawnFn: SpawnFn = () =>
      makeFakeProcess({
        messages: [
          { type: 'result', subtype: 'success', is_error: true, api_error_status: 401, result: 'invalid x-api-key' },
        ],
      });

    const result = await runGeneratePageList(
      { cwd: '/tmp/workspace', systemPrompt: 'system', userPrompt: 'user' },
      sink,
      spawnFn,
    );

    assert.strictEqual(result.succeeded, false);
    assert.strictEqual(result.isAuthError, true);
    assert.strictEqual(result.errorMessage, 'invalid x-api-key');
  });

  it('treats a clean exit with no result message as a failure (fallback signal)', async () => {
    const sink = new RecordingSink();
    const spawnFn: SpawnFn = () => makeFakeProcess({ messages: [assistantMessage([{ type: 'text', text: 'oi' }])], exitCode: 0 });

    const result = await runGeneratePageList(
      { cwd: '/tmp/workspace', systemPrompt: 'system', userPrompt: 'user' },
      sink,
      spawnFn,
    );

    assert.strictEqual(result.succeeded, false);
    assert.ok(result.errorMessage);
  });

  it('returns succeeded: false and records the error when the process fails to spawn', async () => {
    const sink = new RecordingSink();
    const spawnFn: SpawnFn = () => makeFakeProcess({ spawnError: new Error('spawn claude ENOENT') });

    const result = await runGeneratePageList(
      { cwd: '/tmp/workspace', systemPrompt: 'system', userPrompt: 'user' },
      sink,
      spawnFn,
    );

    assert.strictEqual(result.succeeded, false);
    assert.strictEqual(result.errorMessage, 'spawn claude ENOENT');
    assert.ok(sink.lines.some((line) => line.includes('falha ao executar o agente')));
  });

  it('builds the expected CLI arguments, scrubbing API-key env vars from the child env', async () => {
    const sink = new RecordingSink();
    let capturedArgs: string[] | undefined;
    let capturedEnv: NodeJS.ProcessEnv | undefined;
    process.env.ANTHROPIC_API_KEY = 'sk-ant-should-be-removed';
    process.env.ANTHROPIC_AUTH_TOKEN = 'oauth-should-be-removed';
    process.env.ANTHROPIC_BASE_URL = 'https://evil.example';

    const spawnFn: SpawnFn = (_command, args, options) => {
      capturedArgs = args;
      capturedEnv = options.env;
      return makeFakeProcess({ messages: [{ type: 'result', subtype: 'success', is_error: false, result: 'done' }] });
    };

    try {
      await runGeneratePageList(
        { cwd: '/tmp/workspace', systemPrompt: 'system', userPrompt: 'gere um componente', model: 'claude-opus-5', effort: 'max' },
        sink,
        spawnFn,
      );
    } finally {
      delete process.env.ANTHROPIC_API_KEY;
      delete process.env.ANTHROPIC_AUTH_TOKEN;
      delete process.env.ANTHROPIC_BASE_URL;
    }

    assert.ok(capturedArgs);
    assert.ok(capturedArgs?.includes('-p'));
    assert.ok(capturedArgs?.includes('gere um componente'));
    assert.ok(capturedArgs?.includes('--output-format'));
    assert.ok(capturedArgs?.includes('stream-json'));
    assert.ok(!capturedArgs?.includes('--include-partial-messages'));
    assert.ok(!capturedArgs?.includes('--bare'));
    assert.ok(capturedArgs?.includes('--tools'));
    assert.ok(capturedArgs?.includes('Read,Write,Edit,Glob,Grep'));
    assert.ok(capturedArgs?.includes('--permission-mode'));
    assert.ok(capturedArgs?.includes('acceptEdits'));
    assert.ok(capturedArgs?.includes('--setting-sources'));
    assert.ok(capturedArgs?.includes('--model'));
    assert.ok(capturedArgs?.includes('claude-opus-5'));
    assert.ok(capturedArgs?.includes('--effort'));
    assert.ok(capturedArgs?.includes('max'));
    assert.ok(capturedArgs?.includes('--append-system-prompt-file'));

    assert.ok(capturedEnv);
    assert.ok(!('ANTHROPIC_API_KEY' in (capturedEnv ?? {})));
    assert.ok(!('ANTHROPIC_AUTH_TOKEN' in (capturedEnv ?? {})));
    assert.ok(!('ANTHROPIC_BASE_URL' in (capturedEnv ?? {})));
  });

  it('writes the system prompt to a temp file and removes it afterward', async () => {
    const sink = new RecordingSink();
    let promptFilePath: string | undefined;
    const spawnFn: SpawnFn = (_command, args) => {
      const flagIndex = args.indexOf('--append-system-prompt-file');
      promptFilePath = args[flagIndex + 1];
      return makeFakeProcess({ messages: [{ type: 'result', subtype: 'success', is_error: false, result: 'done' }] });
    };

    await runGeneratePageList(
      { cwd: '/tmp/workspace', systemPrompt: 'conteúdo do prompt de sistema', userPrompt: 'user' },
      sink,
      spawnFn,
    );

    assert.ok(promptFilePath);
    const fs = await import('node:fs/promises');
    await assert.rejects(() => fs.access(promptFilePath as string));
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd poui-vscode && npm run test:unit`
Expected: FAIL — compile error, `agentRuntime.ts` ainda exporta `RunGenerateOptions` com `apiKey` obrigatório e não exporta `SpawnFn`/`SpawnedProcess`.

- [ ] **Step 3: Reescrever `agentRuntime.ts`**

Substituir todo o conteúdo de `poui-vscode/src/agentRuntime.ts`:

```typescript
import { spawn } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import * as readline from 'node:readline';
import { randomUUID } from 'node:crypto';

export interface OutputSink {
  appendLine(value: string): void;
}

export interface GenerateResult {
  filesWritten: string[];
  succeeded: boolean;
  errorMessage?: string;
  isAuthError?: boolean;
}

export interface RunGenerateOptions {
  cwd: string;
  systemPrompt: string;
  userPrompt: string;
  model?: string;
  effort?: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
}

export interface SpawnedProcess {
  stdout: NodeJS.ReadableStream;
  stderr: NodeJS.ReadableStream;
  on(event: 'error', listener: (err: Error) => void): unknown;
  on(event: 'close', listener: (code: number | null) => void): unknown;
}

export type SpawnFn = (
  command: string,
  args: string[],
  options: { cwd: string; env: NodeJS.ProcessEnv },
) => SpawnedProcess;

/** Ferramentas nativas liberadas para o agente — sem `Bash`/`WebFetch`/`WebSearch`,
 * de modo que `cwd` seja de fato a fronteira de segurança da geração. */
const ALLOWED_TOOLS = 'Read,Write,Edit,Glob,Grep';

function defaultSpawn(
  command: string,
  args: string[],
  options: { cwd: string; env: NodeJS.ProcessEnv },
): SpawnedProcess {
  return spawn(command, args, { cwd: options.cwd, env: options.env }) as unknown as SpawnedProcess;
}

/** Remove do env herdado as variáveis que dariam prioridade a uma API key
 * paga sobre a sessão OAuth do claude.ai já logada — se `ANTHROPIC_API_KEY`
 * estiver setada por qualquer motivo no processo do VS Code, ela venceria a
 * sessão OAuth na resolução de credenciais do CLI. */
function buildSubprocessEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  delete env.ANTHROPIC_API_KEY;
  delete env.ANTHROPIC_AUTH_TOKEN;
  delete env.ANTHROPIC_BASE_URL;
  return env;
}

function buildArgs(options: RunGenerateOptions, systemPromptFile: string): string[] {
  const args = [
    '-p',
    options.userPrompt,
    '--append-system-prompt-file',
    systemPromptFile,
    '--output-format',
    'stream-json',
    '--verbose',
    '--tools',
    ALLOWED_TOOLS,
    '--permission-mode',
    'acceptEdits',
    '--setting-sources',
    '',
  ];
  if (options.model) {
    args.push('--model', options.model);
  }
  if (options.effort) {
    args.push('--effort', options.effort);
  }
  return args;
}

/** Extrai uma mensagem legível de um `result` que terminou em erro. */
function describeResultFailure(message: { subtype: string; result?: string; errors?: string[] }): string {
  if (message.subtype === 'success') {
    return message.result || 'o agente terminou com erro.';
  }
  return message.errors && message.errors.length > 0 ? message.errors.join('; ') : message.subtype;
}

export async function runGeneratePageList(
  options: RunGenerateOptions,
  sink: OutputSink,
  spawnFn: SpawnFn = defaultSpawn,
): Promise<GenerateResult> {
  const filesWritten: string[] = [];
  let isAuthError = false;
  const systemPromptFile = path.join(os.tmpdir(), `poui-system-prompt-${randomUUID()}.txt`);

  try {
    await fs.writeFile(systemPromptFile, options.systemPrompt, 'utf8');

    const args = buildArgs(options, systemPromptFile);
    const child = spawnFn('claude', args, { cwd: options.cwd, env: buildSubprocessEnv() });

    let stderrOutput = '';
    child.stderr.on('data', (chunk: Buffer | string) => {
      stderrOutput += chunk.toString();
    });

    const rl = readline.createInterface({ input: child.stdout });

    return await new Promise<GenerateResult>((resolve) => {
      let finished = false;
      const finish = (value: GenerateResult) => {
        if (!finished) {
          finished = true;
          resolve(value);
        }
      };

      rl.on('line', (line) => {
        if (!line.trim()) {
          return;
        }
        let message: Record<string, unknown>;
        try {
          message = JSON.parse(line);
        } catch {
          return;
        }

        if (message.type === 'assistant') {
          const assistantMessage = message as {
            error?: string;
            message: { content: Array<{ type: string; text?: string; name?: string; input?: unknown }> };
          };
          if (
            assistantMessage.error === 'authentication_failed' ||
            assistantMessage.error === 'oauth_org_not_allowed'
          ) {
            isAuthError = true;
          }
          for (const block of assistantMessage.message.content) {
            if (block.type === 'text' && typeof block.text === 'string') {
              sink.appendLine(block.text);
            } else if (block.type === 'tool_use') {
              sink.appendLine(`→ ${block.name} ${JSON.stringify(block.input)}`);
              const input = block.input as { file_path?: unknown } | null | undefined;
              if (
                (block.name === 'Write' || block.name === 'Edit') &&
                typeof input?.file_path === 'string'
              ) {
                filesWritten.push(input.file_path);
              }
            }
          }
        } else if (message.type === 'result') {
          const resultMessage = message as {
            subtype: string;
            is_error: boolean;
            result?: string;
            errors?: string[];
            api_error_status?: number | null;
          };
          if (
            resultMessage.subtype === 'success' &&
            (resultMessage.api_error_status === 401 || resultMessage.api_error_status === 403)
          ) {
            isAuthError = true;
          }
          if (resultMessage.is_error) {
            const errorMessage = describeResultFailure(resultMessage);
            sink.appendLine(`✗ falha ao executar o agente: ${errorMessage}`);
            finish({ filesWritten, succeeded: false, errorMessage, isAuthError });
          } else {
            finish({ filesWritten, succeeded: true });
          }
        }
      });

      child.on('error', (error) => {
        sink.appendLine(`✗ falha ao executar o agente: ${error.message}`);
        finish({ filesWritten, succeeded: false, errorMessage: error.message, isAuthError });
      });

      child.on('close', () => {
        // Fallback: o processo encerrou sem nunca emitir uma mensagem
        // `result` (crash, kill, etc.) — o código de saída em si não é
        // sinal confiável de sucesso/falha da tarefa (confirmado
        // empiricamente: uma falha reportada via `result.is_error` ainda
        // sai com código 0), então só chegamos aqui como fallback.
        const errorMessage = stderrOutput.trim() || 'o processo encerrou sem retornar um resultado.';
        sink.appendLine(`✗ falha ao executar o agente: ${errorMessage}`);
        finish({ filesWritten, succeeded: false, errorMessage, isAuthError });
      });
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    sink.appendLine(`✗ falha ao executar o agente: ${errorMessage}`);
    return { filesWritten, succeeded: false, errorMessage, isAuthError };
  } finally {
    await fs.rm(systemPromptFile, { force: true });
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd poui-vscode && npm run test:unit`
Expected: PASS — todos os 9 testes de `runGeneratePageList` verdes, mais `cliCheck`/`naming`/`promptBuilder`/`smoke` continuando verdes.

- [ ] **Step 5: Commit**

```bash
git add poui-vscode/src/agentRuntime.ts poui-vscode/src/test/unit/agentRuntime.test.ts
git commit -m "feat(vscode-ext): spawn the Claude Code CLI instead of the Agent SDK"
```

---

## Task 3: Remover `apiKey.ts`, atualizar `generatePageList.ts`, `extension.ts` e `package.json`

**Files:**
- Delete: `poui-vscode/src/apiKey.ts`
- Delete: `poui-vscode/src/test/unit/apiKey.test.ts`
- Modify: `poui-vscode/src/extension.ts`
- Modify: `poui-vscode/src/generatePageList.ts`
- Modify: `poui-vscode/package.json`

**Interfaces:**
- Consumes: `checkClaudeCliAvailable` (Task 1), a nova assinatura de `runGeneratePageList`/`RunGenerateOptions` sem `apiKey` (Task 2).
- Produces: nenhuma interface nova — este task só remove/realinha chamadas existentes.

- [ ] **Step 1: Remover `apiKey.ts` e seu teste**

```bash
git rm poui-vscode/src/apiKey.ts poui-vscode/src/test/unit/apiKey.test.ts
```

- [ ] **Step 2: Atualizar `generatePageList.ts`**

Em `poui-vscode/src/generatePageList.ts`, trocar o import de `apiKey`:

```typescript
import { getApiKey } from './apiKey';
```

por:

```typescript
import { checkClaudeCliAvailable } from './cliCheck';
```

Trocar o guard de API key (linhas 26-36 do arquivo atual):

```typescript
    const apiKey = await getApiKey(context.secrets);
    if (!apiKey) {
      const choice = await vscode.window.showErrorMessage(
        'PO-UI: configure a API key da Anthropic antes de gerar código.',
        'Configurar API Key',
      );
      if (choice === 'Configurar API Key') {
        await vscode.commands.executeCommand('poui.setApiKey');
      }
      return;
    }
```

por:

```typescript
    const cliCheck = await checkClaudeCliAvailable();
    if (!cliCheck.available) {
      void vscode.window.showErrorMessage(
        `PO-UI: CLI do Claude Code não encontrado ou não está no PATH — instale (https://code.claude.com) e faça login com \`claude\` antes de gerar código.${cliCheck.errorMessage ? ` (${cliCheck.errorMessage})` : ''}`,
      );
      return;
    }
```

Trocar a chamada de `runGeneratePageList` (linhas 96-108 do arquivo atual), removendo `apiKey`:

```typescript
    const result = await runGeneratePageList(
      {
        cwd: workspaceFolder.uri.fsPath,
        apiKey,
        systemPrompt,
        userPrompt,
        model: vscode.workspace.getConfiguration('poui').get<string>('model'),
        effort: vscode.workspace
          .getConfiguration('poui')
          .get<'low' | 'medium' | 'high' | 'xhigh' | 'max'>('effort'),
      },
      outputChannel,
    );
```

por:

```typescript
    const result = await runGeneratePageList(
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
    );
```

Trocar o branch de `isAuthError` (linhas 110-121 do arquivo atual):

```typescript
    if (!result.succeeded) {
      const message = `PO-UI: falha ao gerar componente — ${result.errorMessage ?? 'erro desconhecido'}.`;
      if (result.isAuthError) {
        const choice = await vscode.window.showErrorMessage(message, 'Configurar API Key');
        if (choice === 'Configurar API Key') {
          await vscode.commands.executeCommand('poui.setApiKey');
        }
        return;
      }
      void vscode.window.showErrorMessage(message);
      return;
    }
```

por:

```typescript
    if (!result.succeeded) {
      const message = `PO-UI: falha ao gerar componente — ${result.errorMessage ?? 'erro desconhecido'}.`;
      if (result.isAuthError) {
        void vscode.window.showErrorMessage(
          `${message} Rode \`claude\` em um terminal para fazer login novamente.`,
        );
        return;
      }
      void vscode.window.showErrorMessage(message);
      return;
    }
```

- [ ] **Step 3: Atualizar `extension.ts`**

Substituir todo o conteúdo de `poui-vscode/src/extension.ts`:

```typescript
import * as vscode from 'vscode';
import { registerGeneratePageListCommand } from './generatePageList';

export function activate(context: vscode.ExtensionContext): void {
  const outputChannel = vscode.window.createOutputChannel('PO-UI');
  context.subscriptions.push(outputChannel);

  context.subscriptions.push(registerGeneratePageListCommand(context, outputChannel));
}

export function deactivate(): void {}
```

- [ ] **Step 4: Atualizar `package.json`**

Em `poui-vscode/package.json`, remover a entrada do comando `poui.setApiKey` de `contributes.commands`:

```json
    "commands": [
      { "command": "poui.generate.pageList", "title": "PO-UI: Gerar Page List" },
      { "command": "poui.setApiKey", "title": "PO-UI: Configurar API Key" }
    ],
```

vira:

```json
    "commands": [
      { "command": "poui.generate.pageList", "title": "PO-UI: Gerar Page List" }
    ],
```

Remover a dependência `@anthropic-ai/claude-agent-sdk` (não é mais importada em lugar nenhum):

```json
  "dependencies": {
    "@anthropic-ai/claude-agent-sdk": "^0.3.239"
  },
```

vira (bloco `dependencies` vazio removido inteiramente, já que não sobra nenhuma dependência de runtime):

```json
```

(ou seja, apagar a chave `"dependencies"` inteira do `package.json` — todas as dependências restantes são `devDependencies`, e o build usa só módulos nativos do Node em runtime).

- [ ] **Step 5: Rodar `npm install` para atualizar o lockfile após remover a dependência**

Run: `cd poui-vscode && npm install`
Expected: sai limpo, `package-lock.json` reflete a remoção de `@anthropic-ai/claude-agent-sdk` e suas subdependências (`zod`, `@modelcontextprotocol/sdk`, etc.).

- [ ] **Step 6: Rodar a suíte completa para confirmar que nada quebrou**

Run: `cd poui-vscode && npm run test:unit`
Expected: PASS — `cliCheck`, `agentRuntime`, `naming`, `promptBuilder`, `smoke` todos verdes. Nenhum teste deve referenciar `apiKey` (o arquivo foi removido no Step 1).

Run: `cd poui-vscode && npm run compile`
Expected: `tsc` limpo, sem erro de tipo (confirma que nenhuma referência a `apiKey`/`getApiKey`/`setApiKey` sobrou em `generatePageList.ts`/`extension.ts`).

- [ ] **Step 7: Commit**

```bash
git add -A poui-vscode/
git commit -m "feat(vscode-ext): drop the API key flow in favor of a CLI availability check"
```

---

## Task 4: Atualizar o README

**Files:**
- Modify: `poui-vscode/README.md`

**Interfaces:**
- Consumes: nada — só texto de documentação, refletindo o comportamento das Tasks 1-3.

- [ ] **Step 1: Atualizar a seção "Rodando em desenvolvimento"**

Em `poui-vscode/README.md`, trocar o bloco atual:

```markdown
1. `cd poui-vscode && npm install`
2. Pressione **F5** no VS Code (roda a task `npm: compile` e abre um
   "Extension Development Host")
3. No host de desenvolvimento, rode `PO-UI: Configurar API Key` na paleta
   (`Ctrl+Shift+P`) e informe sua `ANTHROPIC_API_KEY`
4. Abra uma pasta de projeto Angular (ex: `examples/modulo-compras` deste
   repo) como workspace do host de desenvolvimento
5. Rode `PO-UI: Gerar Page List` na paleta, informe o nome da entidade e o
   módulo de destino
```

por:

```markdown
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
```

- [ ] **Step 2: Atualizar os 2 primeiros cenários do checklist de QA manual**

Em `poui-vscode/README.md`, na seção "## QA manual", trocar o cenário 2 atual:

```markdown
2. **Sem API key configurada** — com um workspace aberto, mas antes de rodar
   `PO-UI: Configurar API Key`, rode `PO-UI: Gerar Page List` → esperado: o erro
   com o botão "Configurar API Key"; clicar nele abre a caixa de entrada da key.
```

por:

```markdown
2. **CLI não instalado/não logado** — renomeie temporariamente o binário
   `claude` do PATH (ou rode num ambiente sem ele) e rode `PO-UI: Gerar
   Page List` → esperado: erro orientando instalar/logar o Claude Code CLI,
   sem travar a extensão.
```

- [ ] **Step 3: Commit**

```bash
git add poui-vscode/README.md
git commit -m "docs(vscode-ext): update README for the CLI-backed setup flow"
```

---

## Task 5: Verificação final + checklist de QA manual

**Files:**
- Nenhum arquivo novo — task de verificação/regressão.

**Interfaces:**
- Consumes: tudo das Tasks 1-4.

- [ ] **Step 1: Rodar a suíte completa (unitária + integração)**

Run: `cd poui-vscode && npm run compile && npm run test:unit && npm test`
Expected: `tsc` limpo; testes unitários (`cliCheck`, `agentRuntime`, `naming`, `promptBuilder`, `smoke`) todos verdes; os 2 testes de integração via `@vscode/test-electron` (presença da extensão + comandos registrados) verdes — só resta o comando `poui.generate.pageList` registrado (não deve mais existir `poui.setApiKey`).

- [ ] **Step 2: Conferir que nenhuma referência à API key sobrou no código**

Run: `cd poui-vscode && grep -rn "apiKey\|ANTHROPIC_API_KEY\|setApiKey\|@anthropic-ai/claude-agent-sdk" src/ package.json`
Expected: nenhuma ocorrência (o `grep` não deve encontrar nada — se encontrar, é uma referência esquecida das Tasks 2-3 que precisa ser limpa antes de prosseguir).

- [ ] **Step 3: Registrar o checklist de QA manual pendente para o humano executar**

Esta etapa não é automatizável (exige o binário `claude` já logado e uma sessão real do VS Code) — reporte no relatório da task que os 6 cenários do `README.md` (seção "QA manual") estão prontos, mas não foram executados, e que o cenário 2 mudou de "sem API key" para "CLI não instalado/não logado" (ver Task 4).

- [ ] **Step 4: Commit (se houver qualquer ajuste feito durante a verificação)**

```bash
git add -A poui-vscode/
git commit -m "chore(vscode-ext): final regression pass for the CLI-backed engine"
```

(Se nenhum arquivo mudou neste task, pule o commit — não crie um commit vazio.)
