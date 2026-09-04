import { EngineAdapter, NormalizedEvent, RunAgentOptions } from './engineTypes';

const ALLOWED_TOOLS = 'Read,Write,Edit,Glob,Grep';

function buildCommand(
  options: RunAgentOptions,
  systemPromptFile: string,
  mcpConfigFile?: string,
): { command: string; args: string[] } {
  const args = [
    '-p',
    options.userPrompt,
    '--append-system-prompt-file',
    systemPromptFile,
    '--output-format',
    'stream-json',
    '--verbose',
    '--tools',
    options.tools ?? ALLOWED_TOOLS,
    '--permission-mode',
    'acceptEdits',
    '--setting-sources',
    '',
  ];
  if (options.addDir) {
    args.push('--add-dir', options.addDir);
  }
  if (options.model) {
    args.push('--model', options.model);
  }
  if (options.effort) {
    args.push('--effort', options.effort);
  }
  if (mcpConfigFile) {
    args.push('--mcp-config', mcpConfigFile, '--strict-mcp-config');
  }
  if (options.allowedTools) {
    args.push('--allowedTools', options.allowedTools);
  }
  return { command: 'claude', args };
}

function describeResultFailure(message: { subtype: string; result?: string; errors?: string[] }): string {
  if (Array.isArray(message.errors)) {
    return message.errors.length > 0 ? message.errors.join('; ') : message.subtype;
  }
  return message.result || 'o agente terminou com erro.';
}

function parseLine(line: string): NormalizedEvent[] {
  let message: Record<string, unknown>;
  try {
    message = JSON.parse(line);
  } catch {
    return [];
  }

  if (message.type === 'assistant') {
    const assistantMessage = message as {
      error?: string;
      message: { content: Array<{ type: string; text?: string; name?: string; input?: unknown }> };
    };
    const events: NormalizedEvent[] = [];
    if (assistantMessage.error === 'authentication_failed' || assistantMessage.error === 'oauth_org_not_allowed') {
      events.push({ kind: 'auth_error' });
    }
    for (const block of assistantMessage.message.content) {
      if (block.type === 'text' && typeof block.text === 'string') {
        events.push({ kind: 'text', text: block.text });
      } else if (block.type === 'tool_use' && typeof block.name === 'string') {
        events.push({ kind: 'tool_use', name: block.name, input: block.input });
      }
    }
    return events;
  }

  if (message.type === 'result') {
    const resultMessage = message as {
      subtype: string;
      is_error: boolean;
      result?: string;
      errors?: string[];
      api_error_status?: number | null;
    };
    const events: NormalizedEvent[] = [];
    if (resultMessage.api_error_status === 401 || resultMessage.api_error_status === 403) {
      events.push({ kind: 'auth_error' });
    }
    if (resultMessage.is_error) {
      events.push({ kind: 'result', success: false, errorMessage: describeResultFailure(resultMessage) });
    } else {
      events.push({ kind: 'result', success: true });
    }
    return events;
  }

  return [];
}

export const claudeAdapter: EngineAdapter = {
  id: 'claude',
  binaryName: 'claude',
  buildCommand,
  parseLine,
};
