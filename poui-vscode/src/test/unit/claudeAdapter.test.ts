import * as assert from 'node:assert';
import { claudeAdapter } from '../../claudeAdapter';

function line(message: unknown): string {
  return JSON.stringify(message);
}

function assistantMessage(content: unknown[], error?: string) {
  return { type: 'assistant', error, message: { role: 'assistant', content } };
}

describe('claudeAdapter.parseLine', () => {
  it('emits text and tool_use events from an assistant message', () => {
    const events = claudeAdapter.parseLine(
      line(
        assistantMessage([
          { type: 'text', text: 'Planejando arquivos...' },
          { type: 'tool_use', name: 'Write', input: { file_path: 'src/app/a/a.component.ts' } },
        ]),
      ),
    );
    assert.deepStrictEqual(events, [
      { kind: 'text', text: 'Planejando arquivos...' },
      { kind: 'tool_use', name: 'Write', input: { file_path: 'src/app/a/a.component.ts' } },
    ]);
  });

  it('emits a successful result event', () => {
    const events = claudeAdapter.parseLine(
      line({ type: 'result', subtype: 'success', is_error: false, result: 'done' }),
    );
    assert.deepStrictEqual(events, [{ kind: 'result', success: true }]);
  });

  it('emits a failed result event joining the error list', () => {
    const events = claudeAdapter.parseLine(
      line({ type: 'result', subtype: 'error', is_error: true, errors: ['tool execution failed', 'aborted'] }),
    );
    assert.deepStrictEqual(events, [
      { kind: 'result', success: false, errorMessage: 'tool execution failed; aborted' },
    ]);
  });

  it('falls back to the result subtype when the error list is empty', () => {
    const events = claudeAdapter.parseLine(
      line({ type: 'result', subtype: 'error_max_turns', is_error: true, errors: [] }),
    );
    assert.deepStrictEqual(events, [{ kind: 'result', success: false, errorMessage: 'error_max_turns' }]);
  });

  it('falls back to a generic message when both result and errors are absent', () => {
    const events = claudeAdapter.parseLine(line({ type: 'result', subtype: 'error', is_error: true }));
    assert.deepStrictEqual(events, [
      { kind: 'result', success: false, errorMessage: 'error' },
    ]);
  });

  it('emits auth_error when an assistant message reports authentication_failed', () => {
    const events = claudeAdapter.parseLine(line(assistantMessage([], 'authentication_failed')));
    assert.deepStrictEqual(events, [{ kind: 'auth_error' }]);
  });

  it('emits auth_error when an assistant message reports oauth_org_not_allowed', () => {
    const events = claudeAdapter.parseLine(line(assistantMessage([], 'oauth_org_not_allowed')));
    assert.deepStrictEqual(events, [{ kind: 'auth_error' }]);
  });

  it('emits auth_error before the result event when api_error_status is 401', () => {
    const events = claudeAdapter.parseLine(
      line({
        type: 'result',
        subtype: 'success',
        is_error: true,
        result: 'invalid x-api-key',
        api_error_status: 401,
      }),
    );
    assert.deepStrictEqual(events, [
      { kind: 'auth_error' },
      { kind: 'result', success: false, errorMessage: 'invalid x-api-key' },
    ]);
  });

  it('emits auth_error before the result event when api_error_status is 403', () => {
    const events = claudeAdapter.parseLine(
      line({ type: 'result', subtype: 'error', is_error: true, errors: ['forbidden'], api_error_status: 403 }),
    );
    assert.deepStrictEqual(events[0], { kind: 'auth_error' });
  });

  it('returns an empty array for unparseable JSON', () => {
    assert.deepStrictEqual(claudeAdapter.parseLine('not json'), []);
  });

  it('returns an empty array for message types other than assistant/result', () => {
    assert.deepStrictEqual(claudeAdapter.parseLine(line({ type: 'system', subtype: 'init' })), []);
  });

  it('exposes the claude id and binary name', () => {
    assert.strictEqual(claudeAdapter.id, 'claude');
    assert.strictEqual(claudeAdapter.binaryName, 'claude');
  });

  it('exposes capabilities: full support (tools restriction, MCP, vision)', () => {
    assert.deepStrictEqual(claudeAdapter.capabilities, {
      restrictsTools: true,
      supportsMcp: true,
      supportsVision: true,
    });
  });
});

describe('claudeAdapter.buildCommand', () => {
  it('builds the same args the CLI has always received', () => {
    const { command, args } = claudeAdapter.buildCommand(
      { cwd: '/tmp/workspace', systemPrompt: 'sys', userPrompt: 'gera um componente' },
      '/tmp/system-prompt.txt',
    );
    assert.strictEqual(command, 'claude');
    assert.deepStrictEqual(args, [
      '-p',
      'gera um componente',
      '--append-system-prompt-file',
      '/tmp/system-prompt.txt',
      '--output-format',
      'stream-json',
      '--verbose',
      '--tools',
      'Read,Write,Edit,Glob,Grep',
      '--permission-mode',
      'acceptEdits',
      '--setting-sources',
      '',
    ]);
  });

  it('adds --add-dir, --model, --effort, --mcp-config and --allowedTools when provided', () => {
    const { args } = claudeAdapter.buildCommand(
      {
        cwd: '/tmp/workspace',
        systemPrompt: 'sys',
        userPrompt: 'u',
        tools: 'Read,Glob,Grep',
        addDir: '/tmp/advpl',
        model: 'claude-opus-5',
        effort: 'high',
        allowedTools: 'mcp__playwright__browser_navigate',
      },
      '/tmp/system-prompt.txt',
      '/tmp/mcp-config.json',
    );
    assert.deepStrictEqual(args, [
      '-p',
      'u',
      '--append-system-prompt-file',
      '/tmp/system-prompt.txt',
      '--output-format',
      'stream-json',
      '--verbose',
      '--tools',
      'Read,Glob,Grep',
      '--permission-mode',
      'acceptEdits',
      '--setting-sources',
      '',
      '--add-dir',
      '/tmp/advpl',
      '--model',
      'claude-opus-5',
      '--effort',
      'high',
      '--mcp-config',
      '/tmp/mcp-config.json',
      '--strict-mcp-config',
      '--allowedTools',
      'mcp__playwright__browser_navigate',
    ]);
  });
});
