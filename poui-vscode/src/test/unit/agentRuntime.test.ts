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
    capabilities: { restrictsTools: true, supportsMcp: true, supportsVision: true },
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

  // Os 4 testes abaixo restauram cobertura de orquestração que existia no
  // agentRuntime.test.ts pré-refactor (runClaudeAgent) e não foi carregada
  // pra este suite genérico — ver Finding 3 do final review do plano
  // 2026-09-04-vscode-multi-engine-plan.

  it('scrubs ANTHROPIC_* env vars from the env passed to spawnFn (buildSubprocessEnv)', async () => {
    const sink = new RecordingSink();
    const adapter = makeFakeAdapter({ L1: [{ kind: 'result', success: true }] });
    let capturedEnv: NodeJS.ProcessEnv | undefined;
    const spawnFn: SpawnFn = (_command, _args, options) => {
      capturedEnv = options.env;
      return makeFakeProcess({ lines: ['L1'] });
    };

    process.env.ANTHROPIC_API_KEY = 'sk-ant-should-be-removed';
    process.env.ANTHROPIC_AUTH_TOKEN = 'oauth-should-be-removed';
    process.env.ANTHROPIC_BASE_URL = 'https://evil.example';

    try {
      await runAgentWithAdapter(adapter, { cwd: '/tmp/workspace', systemPrompt: 'sys', userPrompt: 'u' }, sink, spawnFn);
    } finally {
      delete process.env.ANTHROPIC_API_KEY;
      delete process.env.ANTHROPIC_AUTH_TOKEN;
      delete process.env.ANTHROPIC_BASE_URL;
    }

    assert.ok(capturedEnv);
    assert.ok(!('ANTHROPIC_API_KEY' in (capturedEnv ?? {})));
    assert.ok(!('ANTHROPIC_AUTH_TOKEN' in (capturedEnv ?? {})));
    assert.ok(!('ANTHROPIC_BASE_URL' in (capturedEnv ?? {})));
  });

  it('writes systemPrompt/mcpConfig temp files before spawn and removes them after — success path', async () => {
    const sink = new RecordingSink();
    const fsSync = await import('node:fs');
    const fs = await import('node:fs/promises');
    let capturedSystemPromptFile: string | undefined;
    let capturedMcpConfigFile: string | undefined;
    let systemPromptContentsDuringRun: string | undefined;
    let mcpConfigContentsDuringRun: string | undefined;

    const adapter: EngineAdapter = {
      id: 'claude',
      binaryName: 'fake-cli',
      capabilities: { restrictsTools: true, supportsMcp: true, supportsVision: true },
      buildCommand: (_options, systemPromptFile, mcpConfigFile) => {
        capturedSystemPromptFile = systemPromptFile;
        capturedMcpConfigFile = mcpConfigFile;
        // Lê de forma síncrona aqui dentro de buildCommand — que roda antes
        // do spawn — pra confirmar que o arquivo já existe com o conteúdo
        // certo nesse ponto do fluxo (antes do processo ser criado).
        systemPromptContentsDuringRun = fsSync.readFileSync(systemPromptFile, 'utf8');
        if (mcpConfigFile) {
          mcpConfigContentsDuringRun = fsSync.readFileSync(mcpConfigFile, 'utf8');
        }
        return { command: 'fake-cli', args: [] };
      },
      parseLine: (line: string) => (line === 'L1' ? [{ kind: 'result', success: true }] : []),
    };
    const spawnFn: SpawnFn = () => makeFakeProcess({ lines: ['L1'] });

    await runAgentWithAdapter(
      adapter,
      { cwd: '/tmp/workspace', systemPrompt: 'conteúdo do prompt de sistema', userPrompt: 'u', mcpConfig: '{"a":1}' },
      sink,
      spawnFn,
    );

    assert.ok(capturedSystemPromptFile);
    assert.strictEqual(systemPromptContentsDuringRun, 'conteúdo do prompt de sistema');
    assert.ok(capturedMcpConfigFile);
    assert.strictEqual(mcpConfigContentsDuringRun, '{"a":1}');

    await assert.rejects(() => fs.access(capturedSystemPromptFile as string));
    await assert.rejects(() => fs.access(capturedMcpConfigFile as string));
  });

  it('removes the systemPrompt temp file after a failed run too', async () => {
    const sink = new RecordingSink();
    const fs = await import('node:fs/promises');
    let capturedSystemPromptFile: string | undefined;

    const adapter: EngineAdapter = {
      id: 'claude',
      binaryName: 'fake-cli',
      capabilities: { restrictsTools: true, supportsMcp: true, supportsVision: true },
      buildCommand: (_options, systemPromptFile) => {
        capturedSystemPromptFile = systemPromptFile;
        return { command: 'fake-cli', args: [] };
      },
      parseLine: (line: string) =>
        line === 'L1' ? [{ kind: 'result', success: false, errorMessage: 'boom' }] : [],
    };
    const spawnFn: SpawnFn = () => makeFakeProcess({ lines: ['L1'] });

    const result = await runAgentWithAdapter(
      adapter,
      { cwd: '/tmp/workspace', systemPrompt: 'sys', userPrompt: 'u' },
      sink,
      spawnFn,
    );

    assert.strictEqual(result.succeeded, false);
    assert.ok(capturedSystemPromptFile);
    await assert.rejects(() => fs.access(capturedSystemPromptFile as string));
  });

  it('resolves succeeded:false with a fallback message when the process closes with no result event', async () => {
    const sink = new RecordingSink();
    const adapter = makeFakeAdapter({ L1: [{ kind: 'text', text: 'oi' }] });
    const spawnFn: SpawnFn = () => makeFakeProcess({ lines: ['L1'], exitCode: 0 });

    const result = await runAgentWithAdapter(
      adapter,
      { cwd: '/tmp/workspace', systemPrompt: 'sys', userPrompt: 'u' },
      sink,
      spawnFn,
    );

    assert.strictEqual(result.succeeded, false);
    assert.strictEqual(result.errorMessage, 'o processo encerrou sem retornar um resultado.');
  });

  it('keeps a successful result even if the process later closes with a nonzero exit code', async () => {
    const sink = new RecordingSink();
    const adapter = makeFakeAdapter({ L1: [{ kind: 'result', success: true }] });
    const spawnFn: SpawnFn = () => makeFakeProcess({ lines: ['L1'], exitCode: 1 });

    const result = await runAgentWithAdapter(
      adapter,
      { cwd: '/tmp/workspace', systemPrompt: 'sys', userPrompt: 'u' },
      sink,
      spawnFn,
    );

    assert.strictEqual(result.succeeded, true);
    assert.ok(!sink.lines.some((l) => l.includes('falha ao executar o agente')));
  });
});
