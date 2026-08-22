import * as assert from 'node:assert';
import { runGeneratePageList, OutputSink } from '../../agentRuntime';

class RecordingSink implements OutputSink {
  readonly lines: string[] = [];
  appendLine(value: string): void {
    this.lines.push(value);
  }
}

async function fakeQuery(messages: unknown[]) {
  async function* generator() {
    for (const message of messages) {
      yield message;
    }
  }
  return (_params: unknown) => generator();
}

type LoadQueryArg = Parameters<typeof runGeneratePageList>[2];

/**
 * Fixtures shaped like the real `SDKMessage` union: the discriminant lives on
 * the top-level `message.type`, and text/tool_use are *content blocks* nested
 * in `message.message.content` (Anthropic Messages API shape).
 */
function assistantMessage(content: unknown[], error?: string) {
  return {
    type: 'assistant',
    parent_tool_use_id: null,
    error,
    message: { role: 'assistant', content },
  };
}

describe('runGeneratePageList', () => {
  it('streams assistant content blocks to the sink and collects written files', async () => {
    const sink = new RecordingSink();
    const messages = [
      assistantMessage([
        { type: 'text', text: 'Planejando arquivos...' },
        {
          type: 'tool_use',
          name: 'Write',
          input: {
            file_path: 'src/app/financeiro/pedidos-list/pedidos-list.component.ts',
            content: '...',
          },
        },
      ]),
      assistantMessage([
        {
          type: 'tool_use',
          name: 'Edit',
          input: { file_path: 'src/app/app.routes.ts', old_string: 'a', new_string: 'b' },
        },
        { type: 'tool_use', name: 'Read', input: { file_path: 'package.json' } },
      ]),
      { type: 'result', subtype: 'success', is_error: false, result: 'done' },
    ];

    const result = await runGeneratePageList(
      {
        cwd: '/tmp/workspace',
        apiKey: 'sk-ant-fake',
        systemPrompt: 'system',
        userPrompt: 'user',
      },
      sink,
      (() => fakeQuery(messages)) as unknown as LoadQueryArg,
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

  it('ignores user messages carrying nested tool_result blocks', async () => {
    const sink = new RecordingSink();
    const messages = [
      assistantMessage([
        { type: 'tool_use', name: 'Write', input: { file_path: 'a.ts', content: 'x' } },
      ]),
      {
        type: 'user',
        message: {
          role: 'user',
          content: [{ type: 'tool_result', tool_use_id: 'toolu_1', content: 'ok' }],
        },
      },
      { type: 'result', subtype: 'success', is_error: false, result: 'done' },
    ];

    const result = await runGeneratePageList(
      { cwd: '/tmp/workspace', apiKey: 'sk-ant-fake', systemPrompt: 'system', userPrompt: 'user' },
      sink,
      (() => fakeQuery(messages)) as unknown as LoadQueryArg,
    );

    assert.strictEqual(result.succeeded, true);
    assert.deepStrictEqual(result.filesWritten, ['a.ts']);
    assert.ok(!sink.lines.some((line) => line.includes('tool_result')));
  });

  it('returns succeeded: false when the result message reports an error', async () => {
    const sink = new RecordingSink();
    const messages = [
      assistantMessage([{ type: 'text', text: 'tentando...' }]),
      {
        type: 'result',
        subtype: 'error_during_execution',
        is_error: true,
        errors: ['tool execution failed', 'aborted'],
      },
    ];

    const result = await runGeneratePageList(
      { cwd: '/tmp/workspace', apiKey: 'sk-ant-fake', systemPrompt: 'system', userPrompt: 'user' },
      sink,
      (() => fakeQuery(messages)) as unknown as LoadQueryArg,
    );

    assert.strictEqual(result.succeeded, false);
    assert.strictEqual(result.errorMessage, 'tool execution failed; aborted');
    assert.ok(!result.isAuthError);
    assert.ok(sink.lines.some((line) => line.includes('falha ao executar o agente')));
  });

  it('falls back to the result subtype when the error list is empty', async () => {
    const sink = new RecordingSink();
    const messages = [{ type: 'result', subtype: 'error_max_turns', is_error: true, errors: [] }];

    const result = await runGeneratePageList(
      { cwd: '/tmp/workspace', apiKey: 'sk-ant-fake', systemPrompt: 'system', userPrompt: 'user' },
      sink,
      (() => fakeQuery(messages)) as unknown as LoadQueryArg,
    );

    assert.strictEqual(result.succeeded, false);
    assert.strictEqual(result.errorMessage, 'error_max_turns');
  });

  it('flags isAuthError when an assistant message reports authentication_failed', async () => {
    const sink = new RecordingSink();
    const messages = [
      assistantMessage([{ type: 'text', text: 'sem acesso' }], 'authentication_failed'),
      {
        type: 'result',
        subtype: 'error_during_execution',
        is_error: true,
        errors: ['authentication failed'],
      },
    ];

    const result = await runGeneratePageList(
      {
        cwd: '/tmp/workspace',
        apiKey: 'sk-ant-invalid',
        systemPrompt: 'system',
        userPrompt: 'user',
      },
      sink,
      (() => fakeQuery(messages)) as unknown as LoadQueryArg,
    );

    assert.strictEqual(result.succeeded, false);
    assert.strictEqual(result.isAuthError, true);
  });

  it('flags isAuthError when the result carries api_error_status 401', async () => {
    const sink = new RecordingSink();
    const messages = [
      {
        type: 'result',
        subtype: 'success',
        is_error: true,
        api_error_status: 401,
        result: 'invalid x-api-key',
      },
    ];

    const result = await runGeneratePageList(
      {
        cwd: '/tmp/workspace',
        apiKey: 'sk-ant-invalid',
        systemPrompt: 'system',
        userPrompt: 'user',
      },
      sink,
      (() => fakeQuery(messages)) as unknown as LoadQueryArg,
    );

    assert.strictEqual(result.succeeded, false);
    assert.strictEqual(result.isAuthError, true);
    assert.strictEqual(result.errorMessage, 'invalid x-api-key');
  });

  it('returns succeeded: false and records the error when loading the SDK fails', async () => {
    const sink = new RecordingSink();
    const loadQuery = async () => {
      throw new Error('rede indisponível');
    };

    const result = await runGeneratePageList(
      { cwd: '/tmp/workspace', apiKey: 'sk-ant-fake', systemPrompt: 'system', userPrompt: 'user' },
      sink,
      loadQuery as unknown as LoadQueryArg,
    );

    assert.strictEqual(result.succeeded, false);
    assert.strictEqual(result.errorMessage, 'rede indisponível');
    assert.ok(sink.lines.some((line) => line.includes('falha ao executar o agente')));
  });

  it('forwards the API key and scrubs redirect/oauth env vars from the SDK env', async () => {
    const sink = new RecordingSink();
    process.env.ANTHROPIC_BASE_URL = 'https://evil.example';
    process.env.ANTHROPIC_AUTH_TOKEN = 'oauth-token';
    process.env.CLAUDE_CODE_OAUTH_TOKEN = 'cc-token';
    let captured: Record<string, unknown> | undefined;

    const loadQuery = async () => (params: { options: Record<string, unknown> }) => {
      captured = params.options;
      async function* generator() {
        yield { type: 'result', subtype: 'success', is_error: false, result: 'done' };
      }
      return generator();
    };

    try {
      await runGeneratePageList(
        {
          cwd: '/tmp/workspace',
          apiKey: 'sk-ant-real',
          systemPrompt: 'system',
          userPrompt: 'user',
        },
        sink,
        loadQuery as unknown as LoadQueryArg,
      );
    } finally {
      delete process.env.ANTHROPIC_BASE_URL;
      delete process.env.ANTHROPIC_AUTH_TOKEN;
      delete process.env.CLAUDE_CODE_OAUTH_TOKEN;
    }

    const env = captured?.env as Record<string, string | undefined>;
    assert.strictEqual(env.ANTHROPIC_API_KEY, 'sk-ant-real');
    assert.ok(!('ANTHROPIC_BASE_URL' in env));
    assert.ok(!('ANTHROPIC_AUTH_TOKEN' in env));
    assert.ok(!('CLAUDE_CODE_OAUTH_TOKEN' in env));
  });

  it('isolates filesystem settings, restricts the toolset and forwards effort', async () => {
    const sink = new RecordingSink();
    let captured: Record<string, unknown> | undefined;

    const loadQuery = async () => (params: { options: Record<string, unknown> }) => {
      captured = params.options;
      async function* generator() {
        yield { type: 'result', subtype: 'success', is_error: false, result: 'done' };
      }
      return generator();
    };

    await runGeneratePageList(
      {
        cwd: '/tmp/workspace',
        apiKey: 'sk-ant-fake',
        systemPrompt: 'system',
        userPrompt: 'user',
        effort: 'max',
      },
      sink,
      loadQuery as unknown as LoadQueryArg,
    );

    assert.deepStrictEqual(captured?.settingSources, []);
    assert.deepStrictEqual(captured?.tools, ['Read', 'Write', 'Edit', 'Glob', 'Grep']);
    assert.strictEqual(captured?.effort, 'max');
    assert.strictEqual(captured?.permissionMode, 'bypassPermissions');
    assert.strictEqual(captured?.allowDangerouslySkipPermissions, true);
  });
});
