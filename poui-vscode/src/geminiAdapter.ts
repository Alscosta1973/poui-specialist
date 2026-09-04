import { EngineAdapter, NormalizedEvent, RunAgentOptions } from './engineTypes';

// TODO(gemini): --system-prompt-file/--add-dir equivalentes não confirmados
// publicamente (ver spec, seção "Riscos", item 2). Doc oficial confirma
// GEMINI_API_KEY/GOOGLE_API_KEY como exigência de auth headless (item 3) —
// diferente de Claude/Codex, não reaproveita sessão pessoal. Validar com
// `gemini --help` numa máquina real antes de considerar pronto.
function buildCommand(
  options: RunAgentOptions,
  systemPromptFile: string,
  _mcpConfigFile?: string,
): { command: string; args: string[] } {
  const args = [
    '-p',
    options.userPrompt,
    '--output-format',
    'stream-json',
    '--approval-mode',
    'yolo',
    '--system-prompt-file',
    systemPromptFile,
  ];
  return { command: 'gemini', args };
}

function parseLine(line: string): NormalizedEvent[] {
  let message: Record<string, unknown>;
  try {
    message = JSON.parse(line);
  } catch {
    return [];
  }

  if (message.type === 'message') {
    const msg = message as { role?: string; content?: string };
    if (msg.role === 'assistant' && typeof msg.content === 'string') {
      return [{ kind: 'text', text: msg.content }];
    }
    return [];
  }

  if (message.type === 'tool_use') {
    const call = message as { name?: string; args?: { file_path?: string } };
    if (typeof call.name === 'string' && typeof call.args?.file_path === 'string') {
      return [{ kind: 'tool_use', name: call.name, input: { file_path: call.args.file_path } }];
    }
    return [];
  }

  if (message.type === 'error') {
    const err = message as { message?: string };
    const errorMessage = err.message ?? '';
    // Achado confirmado nesta sessão (doc oficial gemini-cli): modo headless
    // exige GEMINI_API_KEY/GOOGLE_API_KEY — trata a mensagem correspondente
    // como falha de autenticação, não como erro genérico de execução.
    if (/authentication|unauthorized|401|403|api key|api_key/i.test(errorMessage)) {
      return [{ kind: 'auth_error' }];
    }
    return [];
  }

  if (message.type === 'result') {
    const result = message as { status: string; error?: { message?: string } };
    if (result.status === 'success') {
      return [{ kind: 'result', success: true }];
    }
    return [
      { kind: 'result', success: false, errorMessage: result.error?.message ?? 'o agente terminou com erro.' },
    ];
  }

  return [];
}

export const geminiAdapter: EngineAdapter = {
  id: 'gemini',
  binaryName: 'gemini',
  buildCommand,
  parseLine,
};
