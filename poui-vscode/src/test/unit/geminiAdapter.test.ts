import * as assert from 'node:assert';
import { geminiAdapter } from '../../geminiAdapter';

function line(event: unknown): string {
  return JSON.stringify(event);
}

describe('geminiAdapter.parseLine', () => {
  it('emits nothing for init (session bookkeeping only)', () => {
    assert.deepStrictEqual(geminiAdapter.parseLine(line({ type: 'init', sessionId: 's1' })), []);
  });

  it('emits text for an assistant message chunk', () => {
    const events = geminiAdapter.parseLine(
      line({ type: 'message', role: 'assistant', content: 'Planejando arquivos...' }),
    );
    assert.deepStrictEqual(events, [{ kind: 'text', text: 'Planejando arquivos...' }]);
  });

  it('ignores user message chunks', () => {
    assert.deepStrictEqual(
      geminiAdapter.parseLine(line({ type: 'message', role: 'user', content: 'gera um componente' })),
      [],
    );
  });

  it('emits tool_use with the name normalized to Write for a file-writing tool call', () => {
    const events = geminiAdapter.parseLine(
      line({ type: 'tool_use', name: 'write_file', args: { file_path: 'src/app/a/a.component.ts' } }),
    );
    assert.deepStrictEqual(events, [
      { kind: 'tool_use', name: 'Write', input: { file_path: 'src/app/a/a.component.ts' } },
    ]);
  });

  it('emits auth_error for a dedicated error event mentioning authentication', () => {
    const events = geminiAdapter.parseLine(
      line({ type: 'error', message: 'Please set GEMINI_API_KEY to run in non-interactive mode' }),
    );
    assert.deepStrictEqual(events, [{ kind: 'auth_error' }]);
  });

  it('does not emit auth_error for an unrelated error event', () => {
    const events = geminiAdapter.parseLine(line({ type: 'error', message: 'tool call failed: invalid path' }));
    assert.deepStrictEqual(events, []);
  });

  it('emits a successful result', () => {
    const events = geminiAdapter.parseLine(line({ type: 'result', status: 'success', stats: {} }));
    assert.deepStrictEqual(events, [{ kind: 'result', success: true }]);
  });

  it('emits a failed result with the error message', () => {
    const events = geminiAdapter.parseLine(
      line({ type: 'result', status: 'error', error: { message: 'tool call failed: invalid path' } }),
    );
    assert.deepStrictEqual(events, [
      { kind: 'result', success: false, errorMessage: 'tool call failed: invalid path' },
    ]);
  });

  it('returns an empty array for unparseable JSON', () => {
    assert.deepStrictEqual(geminiAdapter.parseLine('not json'), []);
  });

  it('exposes the gemini id and binary name', () => {
    assert.strictEqual(geminiAdapter.id, 'gemini');
    assert.strictEqual(geminiAdapter.binaryName, 'gemini');
  });

  it('exposes capabilities: no tool restriction, no MCP, no vision (documented gap)', () => {
    assert.deepStrictEqual(geminiAdapter.capabilities, {
      restrictsTools: false,
      supportsMcp: false,
      supportsVision: false,
    });
  });
});

describe('geminiAdapter.buildCommand', () => {
  it('builds -p with stream-json output and the confirmed auto-approve/skip-trust flags, passing the system prompt via GEMINI_SYSTEM_MD env var', () => {
    const { command, args, env } = geminiAdapter.buildCommand(
      { cwd: '/tmp/workspace', systemPrompt: 'sys', userPrompt: 'gera um componente' },
      '/tmp/system-prompt.txt',
    );
    assert.strictEqual(command, 'gemini');
    assert.deepStrictEqual(args, [
      '-p',
      'gera um componente',
      '--output-format',
      'stream-json',
      '--approval-mode',
      'yolo',
      '--skip-trust',
    ]);
    assert.deepStrictEqual(env, { GEMINI_SYSTEM_MD: '/tmp/system-prompt.txt' });
  });
});
