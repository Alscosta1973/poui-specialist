import type { SDKResultMessage } from '@anthropic-ai/claude-agent-sdk';

export interface OutputSink {
  appendLine(value: string): void;
}

export interface GenerateResult {
  filesWritten: string[];
  succeeded: boolean;
  errorMessage?: string;
  isAuthError?: boolean;
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

/** Ferramentas nativas liberadas para o agente — sem `Bash`/`WebFetch`/`WebSearch`,
 * de modo que `cwd` seja de fato a fronteira de segurança da geração. */
const ALLOWED_TOOLS = ['Read', 'Write', 'Edit', 'Glob', 'Grep'];

async function defaultLoadQuery(): Promise<QueryFn> {
  const sdk = await import('@anthropic-ai/claude-agent-sdk');
  return sdk.query;
}

/** Monta o env do subprocesso do SDK sem as variáveis que poderiam redirecionar
 * a API key para outro host ou reintroduzir o caminho de auth do Claude Code. */
function buildSubprocessEnv(apiKey: string): Record<string, string | undefined> {
  const env: Record<string, string | undefined> = { ...process.env };
  delete env.ANTHROPIC_BASE_URL;
  delete env.ANTHROPIC_AUTH_TOKEN;
  delete env.CLAUDE_CODE_OAUTH_TOKEN;
  env.ANTHROPIC_API_KEY = apiKey;
  return env;
}

/** Extrai uma mensagem legível de um `result` que terminou em erro. */
function describeResultFailure(message: SDKResultMessage): string {
  if (message.subtype === 'success') {
    return message.result || 'o agente terminou com erro.';
  }
  return message.errors.length > 0 ? message.errors.join('; ') : message.subtype;
}

export async function runGeneratePageList(
  options: RunGenerateOptions,
  sink: OutputSink,
  loadQuery: () => Promise<QueryFn> = defaultLoadQuery,
): Promise<GenerateResult> {
  const filesWritten: string[] = [];
  let isAuthError = false;

  try {
    const query = await loadQuery();
    const stream = query({
      prompt: options.userPrompt,
      options: {
        cwd: options.cwd,
        systemPrompt: options.systemPrompt,
        model: options.model ?? 'claude-opus-5',
        effort: options.effort,
        env: buildSubprocessEnv(options.apiKey),
        tools: ALLOWED_TOOLS,
        settingSources: [],
        permissionMode: 'bypassPermissions',
        allowDangerouslySkipPermissions: true,
      },
    });

    for await (const message of stream) {
      if (message.type === 'assistant') {
        if (message.error === 'authentication_failed' || message.error === 'oauth_org_not_allowed') {
          isAuthError = true;
        }
        for (const block of message.message.content) {
          if (block.type === 'text') {
            sink.appendLine(block.text);
          } else if (block.type === 'tool_use') {
            sink.appendLine(`→ ${block.name} ${JSON.stringify(block.input)}`);
            const input = block.input as { file_path?: unknown } | null | undefined;
            if (
              (block.name === 'Write' || block.name === 'Edit') &&
              typeof input?.file_path === 'string'
            ) {
              filesWritten.push(input.file_path);
            }
          }
        }
      } else if (message.type === 'result') {
        if (
          message.subtype === 'success' &&
          (message.api_error_status === 401 || message.api_error_status === 403)
        ) {
          isAuthError = true;
        }
        if (message.is_error) {
          const errorMessage = describeResultFailure(message);
          sink.appendLine(`✗ falha ao executar o agente: ${errorMessage}`);
          return { filesWritten, succeeded: false, errorMessage, isAuthError };
        }
      }
    }

    if (isAuthError) {
      const errorMessage = 'falha de autenticação da API key da Anthropic.';
      sink.appendLine(`✗ falha ao executar o agente: ${errorMessage}`);
      return { filesWritten, succeeded: false, errorMessage, isAuthError: true };
    }

    return { filesWritten, succeeded: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    sink.appendLine(`✗ falha ao executar o agente: ${errorMessage}`);
    return { filesWritten, succeeded: false, errorMessage, isAuthError };
  }
}
