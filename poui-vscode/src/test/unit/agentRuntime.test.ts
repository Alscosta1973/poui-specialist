import * as assert from 'node:assert';
import { EventEmitter } from 'node:events';
import { Readable } from 'node:stream';
import { runAgent, runAgentWithAdapter, OutputSink, SpawnFn, SpawnedProcess } from '../../agentRuntime';
import { EngineAdapter, NormalizedEvent } from '../../engineTypes';

class RecordingSink implements OutputSink {
  readonly lines: string[] = [];
  appendLine(value: string): void {
    this.lines.push(value);
  }
}

/** Fake `child_process`-like objeto — cada `lines[i]` já é o texto bruto de
 * uma linha de stdout (o fake adapter abaixo devolve os eventos certos pra
 * cada uma via um mapa, sem precisar reimplementar JSON de verdade). */
function makeFakeProcess(options: { lines?: string[]; exitCode?: number | null; spawnError?: Error }): SpawnedProcess {
  const emitter = new EventEmitter();
  const stdout = Readable.from((options.lines ?? []).map((l) => `${l}\n`));
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

/** Adapter fake — mapeia cada linha bruta (ex: "L1") para uma lista de
 * NormalizedEvent pré-definida, sem parsear JSON de verdade. Testa só a
 * orquestração do runAgent (sink, filesWritten, isAuthError, finish),
 * não a lógica de um adapter real (já coberta em claudeAdapter.test.ts). */
function makeFakeAdapter(eventsByLine: Record<string, NormalizedEvent[]>): EngineAdapter {
  return {
    id: 'claude',
    binaryName: 'fake-cli',
    buildCommand: () => ({ command: 'fake-cli', args: [] }),
    parseLine: (line: string) => eventsByLine[line] ?? [],
  };
}

describe('runAgent', () => {
  it('streams text to the sink and collects files from Write/Edit tool_use events', async () => {
    const sink = new RecordingSink();
    const adapter = makeFakeAdapter({
      L1: [
        { kind: 'text', text: 'Planejando arquivos...' },
        { kind: 'tool_use', name: 'Write', input: { file_path: 'src/app/a/a.component.ts' } },
      ],
      L2: [
        { kind: 'tool_use', name: 'Edit', input: { file_path: 'src/app/app.routes.ts' } },
        { kind: 'tool_use', name: 'Read', input: { file_path: 'package.json' } },
      ],
      L3: [{ kind: 'result', success: true }],
    });
    const spawnFn: SpawnFn = () => makeFakeProcess({ lines: ['L1', 'L2', 'L3'] });

    const result = await runAgentWithAdapter(adapter, { cwd: '/tmp/workspace', systemPrompt: 'sys', userPrompt: 'u' }, sink, spawnFn);

    assert.strictEqual(result.succeeded, true);
    assert.ok(!result.isAuthError);
    assert.deepStrictEqual(result.filesWritten, ['src/app/a/a.component.ts', 'src/app/app.routes.ts']);
    assert.ok(sink.lines.some((l) => l.includes('Planejando arquivos')));
    assert.ok(sink.lines.some((l) => l.includes('→ Write')));
  });

  it('reports failure with the error message from a failed result event', async () => {
    const sink = new RecordingSink();
    const adapter = makeFakeAdapter({
      L1: [{ kind: 'result', success: false, errorMessage: 'tool execution failed; aborted' }],
    });
    const spawnFn: SpawnFn = () => makeFakeProcess({ lines: ['L1'] });

    const result = await runAgentWithAdapter(adapter, { cwd: '/tmp/workspace', systemPrompt: 'sys', userPrompt: 'u' }, sink, spawnFn);

    assert.strictEqual(result.succeeded, false);
    assert.strictEqual(result.errorMessage, 'tool execution failed; aborted');
    assert.ok(sink.lines.some((l) => l.includes('falha ao executar o agente')));
  });

  it('flags isAuthError when an auth_error event precedes the failed result', async () => {
    const sink = new RecordingSink();
    const adapter = makeFakeAdapter({
      L1: [{ kind: 'auth_error' }, { kind: 'result', success: false, errorMessage: 'invalid x-api-key' }],
    });
    const spawnFn: SpawnFn = () => makeFakeProcess({ lines: ['L1'] });

    const result = await runAgentWithAdapter(adapter, { cwd: '/tmp/workspace', systemPrompt: 'sys', userPrompt: 'u' }, sink, spawnFn);

    assert.strictEqual(result.succeeded, false);
    assert.strictEqual(result.isAuthError, true);
  });

  it('flags isAuthError when an auth_error event arrives on an earlier line than the result', async () => {
    const sink = new RecordingSink();
    const adapter = makeFakeAdapter({
      L1: [{ kind: 'auth_error' }],
      L2: [{ kind: 'result', success: false, errorMessage: 'blocked' }],
    });
    const spawnFn: SpawnFn = () => makeFakeProcess({ lines: ['L1', 'L2'] });

    const result = await runAgentWithAdapter(adapter, { cwd: '/tmp/workspace', systemPrompt: 'sys', userPrompt: 'u' }, sink, spawnFn);

    assert.strictEqual(result.isAuthError, true);
  });

  it('falls back to a text-based auth pattern in the error message when no auth_error event fired', async () => {
    const sink = new RecordingSink();
    const adapter = makeFakeAdapter({
      L1: [{ kind: 'result', success: false, errorMessage: 'request failed: 401 unauthorized' }],
    });
    const spawnFn: SpawnFn = () => makeFakeProcess({ lines: ['L1'] });

    const result = await runAgentWithAdapter(adapter, { cwd: '/tmp/workspace', systemPrompt: 'sys', userPrompt: 'u' }, sink, spawnFn);

    assert.strictEqual(result.isAuthError, true);
  });

  it('reports failure when the spawned process errors before emitting any line', async () => {
    const sink = new RecordingSink();
    const adapter = makeFakeAdapter({});
    const spawnFn: SpawnFn = () => makeFakeProcess({ spawnError: new Error('spawn fake-cli ENOENT') });

    const result = await runAgentWithAdapter(adapter, { cwd: '/tmp/workspace', systemPrompt: 'sys', userPrompt: 'u' }, sink, spawnFn);

    assert.strictEqual(result.succeeded, false);
    assert.strictEqual(result.errorMessage, 'spawn fake-cli ENOENT');
  });

  it('picks the adapter matching the engineId via the real registry', async () => {
    const sink = new RecordingSink();
    // claude é o default do registry — confirma que runAgent(..., 'claude', ...)
    // realmente delega pro claudeAdapter real (não a um fake), sem precisar
    // duplicar os testes de parsing já cobertos em claudeAdapter.test.ts.
    const spawnFn: SpawnFn = () =>
      makeFakeProcess({ lines: [JSON.stringify({ type: 'result', subtype: 'success', is_error: false })] });

    const result = await runAgent({ cwd: '/tmp/workspace', systemPrompt: 'sys', userPrompt: 'u' }, sink, 'claude', spawnFn);

    assert.strictEqual(result.succeeded, true);
  });
});
