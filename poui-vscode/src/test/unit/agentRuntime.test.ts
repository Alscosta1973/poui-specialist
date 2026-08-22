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

describe('runGeneratePageList', () => {
  it('streams text and tool_use messages to the sink and collects written files', async () => {
    const sink = new RecordingSink();
    const messages = [
      { type: 'text', text: 'Planejando arquivos...' },
      {
        type: 'tool_use',
        name: 'Write',
        input: { file_path: 'src/app/financeiro/pedidos-list/pedidos-list.component.ts', content: '...' },
      },
      { type: 'tool_result', content: 'ok' },
    ];

    const result = await runGeneratePageList(
      {
        cwd: '/tmp/workspace',
        apiKey: 'sk-ant-fake',
        systemPrompt: 'system',
        userPrompt: 'user',
      },
      sink,
      (() => fakeQuery(messages)) as unknown as Parameters<typeof runGeneratePageList>[2],
    );

    assert.strictEqual(result.succeeded, true);
    assert.deepStrictEqual(result.filesWritten, [
      'src/app/financeiro/pedidos-list/pedidos-list.component.ts',
    ]);
    assert.ok(sink.lines.some((line) => line.includes('Planejando arquivos')));
    assert.ok(sink.lines.some((line) => line.includes('Write')));
  });

  it('returns succeeded: false and records the error when loading the SDK fails', async () => {
    const sink = new RecordingSink();
    const loadQuery = async () => {
      throw new Error('rede indisponível');
    };

    const result = await runGeneratePageList(
      { cwd: '/tmp/workspace', apiKey: 'sk-ant-fake', systemPrompt: 'system', userPrompt: 'user' },
      sink,
      loadQuery as unknown as Parameters<typeof runGeneratePageList>[2],
    );

    assert.strictEqual(result.succeeded, false);
    assert.strictEqual(result.errorMessage, 'rede indisponível');
    assert.ok(sink.lines.some((line) => line.includes('falha ao executar o agente')));
  });
});
