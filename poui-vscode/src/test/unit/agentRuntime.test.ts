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
