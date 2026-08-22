export interface OutputSink {
  appendLine(value: string): void;
}

export interface GenerateResult {
  filesWritten: string[];
  succeeded: boolean;
  errorMessage?: string;
}

export interface RunGenerateOptions {
  cwd: string;
  apiKey: string;
  systemPrompt: string;
  userPrompt: string;
  model?: string;
  effort?: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
}

type QueryFn = typeof import('@anthropic-ai/claude-agent-sdk').query;

async function defaultLoadQuery(): Promise<QueryFn> {
  const sdk = await import('@anthropic-ai/claude-agent-sdk');
  return sdk.query;
}

export async function runGeneratePageList(
  options: RunGenerateOptions,
  sink: OutputSink,
  loadQuery: () => Promise<QueryFn> = defaultLoadQuery,
): Promise<GenerateResult> {
  const filesWritten: string[] = [];

  try {
    const query = await loadQuery();
    const stream = query({
      prompt: options.userPrompt,
      options: {
        cwd: options.cwd,
        systemPrompt: options.systemPrompt,
        model: options.model ?? 'claude-opus-5',
        env: { ...process.env, ANTHROPIC_API_KEY: options.apiKey },
        permissionMode: 'bypassPermissions',
        allowDangerouslySkipPermissions: true,
      },
    });

    for await (const message of stream as AsyncIterable<Record<string, unknown>>) {
      if (message.type === 'text' && typeof message.text === 'string') {
        sink.appendLine(message.text);
      } else if (message.type === 'tool_use') {
        sink.appendLine(`→ ${message.name as string} ${JSON.stringify(message.input)}`);
        const input = message.input as Record<string, unknown> | undefined;
        const toolName = message.name as string;
        if ((toolName === 'Write' || toolName === 'Edit') && typeof input?.file_path === 'string') {
          filesWritten.push(input.file_path);
        }
      } else if (message.type === 'tool_result') {
        sink.appendLine('✓ resultado da ferramenta recebido');
      }
    }

    return { filesWritten, succeeded: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    sink.appendLine(`✗ falha ao executar o agente: ${errorMessage}`);
    return { filesWritten, succeeded: false, errorMessage };
  }
}
