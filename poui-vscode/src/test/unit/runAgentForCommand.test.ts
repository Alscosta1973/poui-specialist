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

/** Processo fake que fecha imediatamente com uma linha de sucesso no
 * formato real do Codex CLI (`codexAdapter.parseLine`'s 'turn.completed'
 * event) — usado só pelo teste de createAgentRunner, que exercita o
 * engineId 'codex'. */
function makeSucceedingCodexProcess(): SpawnedProcess {
  const emitter = new EventEmitter();
  const stdout = Readable.from([`${JSON.stringify({ type: 'turn.completed' })}\n`]);
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
      return makeSucceedingCodexProcess();
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
