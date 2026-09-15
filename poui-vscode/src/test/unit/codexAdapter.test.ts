import * as assert from 'node:assert';
import { codexAdapter } from '../../codexAdapter';

function line(event: unknown): string {
  return JSON.stringify(event);
}

describe('codexAdapter.parseLine', () => {
  it('emits nothing for thread.started (session bookkeeping only)', () => {
    assert.deepStrictEqual(codexAdapter.parseLine(line({ type: 'thread.started', thread_id: 't1' })), []);
  });

  it('emits text for an item.completed agent_message', () => {
    const events = codexAdapter.parseLine(
      line({
        type: 'item.completed',
        item: { type: 'agent_message', text: 'Planejando arquivos...' },
      }),
    );
    assert.deepStrictEqual(events, [{ kind: 'text', text: 'Planejando arquivos...' }]);
  });

  it('emits tool_use with name normalized to Write for a file_change item — real shape nests path under changes[]', () => {
    const events = codexAdapter.parseLine(
      line({
        type: 'item.completed',
        item: {
          type: 'file_change',
          changes: [{ path: 'src/app/a/a.component.ts', kind: 'add' }],
          status: 'completed',
        },
      }),
    );
    assert.deepStrictEqual(events, [
      { kind: 'tool_use', name: 'Write', input: { file_path: 'src/app/a/a.component.ts' } },
    ]);
  });

  it('emits one tool_use per change when a file_change item touches multiple files', () => {
    const events = codexAdapter.parseLine(
      line({
        type: 'item.completed',
        item: {
          type: 'file_change',
          changes: [
            { path: 'src/app/a/a.component.ts', kind: 'add' },
            { path: 'src/app/a/a.component.html', kind: 'add' },
          ],
          status: 'completed',
        },
      }),
    );
    assert.deepStrictEqual(events, [
      { kind: 'tool_use', name: 'Write', input: { file_path: 'src/app/a/a.component.ts' } },
      { kind: 'tool_use', name: 'Write', input: { file_path: 'src/app/a/a.component.html' } },
    ]);
  });

  it('emits nothing for a file_change item with no changes array (defensive, never crashes)', () => {
    const events = codexAdapter.parseLine(
      line({ type: 'item.completed', item: { type: 'file_change', path: 'old-shape-ignored.ts' } }),
    );
    assert.deepStrictEqual(events, []);
  });

  it('surfaces an item.completed error as text, prefixed for visibility', () => {
    const events = codexAdapter.parseLine(
      line({
        type: 'item.completed',
        item: { id: 'item_0', type: 'error', message: 'Model metadata for `x` not found.' },
      }),
    );
    assert.deepStrictEqual(events, [{ kind: 'text', text: '⚠ Model metadata for `x` not found.' }]);
  });

  it('surfaces a top-level error event as text', () => {
    const events = codexAdapter.parseLine(line({ type: 'error', message: 'something went sideways' }));
    assert.deepStrictEqual(events, [{ kind: 'text', text: '⚠ something went sideways' }]);
  });

  it('emits tool_use for a command_execution item (unchanged: still requires name and path)', () => {
    const events = codexAdapter.parseLine(
      line({
        type: 'item.completed',
        item: { type: 'command_execution', name: 'Shell', path: 'ng build' },
      }),
    );
    assert.deepStrictEqual(events, [
      { kind: 'tool_use', name: 'Shell', input: { file_path: 'ng build' } },
    ]);
  });

  it('emits nothing for a command_execution item missing name (unchanged behavior)', () => {
    const events = codexAdapter.parseLine(
      line({
        type: 'item.completed',
        item: { type: 'command_execution', path: 'ng build' },
      }),
    );
    assert.deepStrictEqual(events, []);
  });

  it('emits a successful result on turn.completed', () => {
    const events = codexAdapter.parseLine(line({ type: 'turn.completed', usage: {} }));
    assert.deepStrictEqual(events, [{ kind: 'result', success: true }]);
  });

  it('emits a failed result with the error message on turn.failed', () => {
    const events = codexAdapter.parseLine(
      line({ type: 'turn.failed', error: { message: 'sandbox denied write outside workspace' } }),
    );
    assert.deepStrictEqual(events, [
      { kind: 'result', success: false, errorMessage: 'sandbox denied write outside workspace' },
    ]);
  });

  it('emits auth_error when the failure message mentions authentication', () => {
    const events = codexAdapter.parseLine(
      line({ type: 'turn.failed', error: { message: 'authentication required: run codex login' } }),
    );
    assert.deepStrictEqual(events, [
      { kind: 'auth_error' },
      { kind: 'result', success: false, errorMessage: 'authentication required: run codex login' },
    ]);
  });

  it('returns an empty array for unparseable JSON', () => {
    assert.deepStrictEqual(codexAdapter.parseLine('not json'), []);
  });

  it('exposes the codex id and binary name', () => {
    assert.strictEqual(codexAdapter.id, 'codex');
    assert.strictEqual(codexAdapter.binaryName, 'codex');
  });

  it('exposes capabilities: no tool restriction, no MCP, vision unconfirmed but assumed supported', () => {
    assert.deepStrictEqual(codexAdapter.capabilities, {
      restrictsTools: false,
      supportsMcp: false,
      supportsVision: true,
    });
  });
});

describe('codexAdapter.buildCommand', () => {
  it('builds exec --json with the confirmed-working sandbox/approval flags and no system-prompt flag (it does not exist)', () => {
    const { command, args, stdinFile } = codexAdapter.buildCommand(
      { cwd: '/tmp/workspace', systemPrompt: 'sys', userPrompt: 'gera um componente' },
      '/tmp/system-prompt.txt',
    );
    assert.strictEqual(command, 'codex');
    assert.deepStrictEqual(args, [
      'exec',
      '--json',
      '--sandbox',
      'danger-full-access',
      '--skip-git-repo-check',
      'gera um componente',
    ]);
    assert.ok(!args.includes('--append-system-prompt-file'), 'this flag does not exist on codex exec — confirmed real error');
  });

  it('routes the system prompt file through stdinFile instead of a CLI flag', () => {
    const { stdinFile } = codexAdapter.buildCommand(
      { cwd: '/tmp/workspace', systemPrompt: 'sys', userPrompt: 'u' },
      '/tmp/system-prompt.txt',
    );
    assert.strictEqual(stdinFile, '/tmp/system-prompt.txt');
  });

  it('adds --add-dir when provided', () => {
    const { args } = codexAdapter.buildCommand(
      { cwd: '/tmp/workspace', systemPrompt: 'sys', userPrompt: 'u', addDir: '/tmp/advpl' },
      '/tmp/system-prompt.txt',
    );
    assert.ok(args.includes('--add-dir'));
    assert.ok(args.includes('/tmp/advpl'));
  });
});
