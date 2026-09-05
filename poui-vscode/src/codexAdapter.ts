import { EngineAdapter, NormalizedEvent, RunAgentOptions } from './engineTypes';

// TODO(codex): flags de --model/--effort/--tools/--mcp-config não confirmados
// publicamente (ver spec 2026-09-04-vscode-extension-multi-engine-design.md,
// seção "Riscos", itens 1-2). Validar com `codex exec --help` numa máquina
// real antes de considerar este adapter pronto para uso — só --json,
// --sandbox e --append-system-prompt-file/--add-dir estão confirmados.
function buildCommand(
  options: RunAgentOptions,
  systemPromptFile: string,
  _mcpConfigFile?: string,
): { command: string; args: string[] } {
  const args = ['exec', '--json', '--sandbox', 'workspace-write', '--append-system-prompt-file', systemPromptFile];
  if (options.addDir) {
    args.push('--add-dir', options.addDir);
  }
  args.push(options.userPrompt);
  return { command: 'codex', args };
}

function parseLine(line: string): NormalizedEvent[] {
  let message: Record<string, unknown>;
  try {
    message = JSON.parse(line);
  } catch {
    return [];
  }

  if (message.type === 'item.completed') {
    const item = (message as { item?: Record<string, unknown> }).item;
    if (item?.type === 'agent_message' && typeof item.text === 'string') {
      return [{ kind: 'text', text: item.text }];
    }
    if (item?.type === 'file_change' && typeof item.path === 'string') {
      // Normalização deliberada: o schema real de 'file_change' do codex não
      // carrega um campo 'name' e não distingue write de edit nesse nível —
      // traduzimos para 'Write', o vocabulário compartilhado que
      // agentRuntime.ts usa para popular filesWritten.
      return [{ kind: 'tool_use', name: 'Write', input: { file_path: item.path } }];
    }
    if (item?.type === 'command_execution' && typeof item.name === 'string' && typeof item.path === 'string') {
      return [{ kind: 'tool_use', name: item.name, input: { file_path: item.path } }];
    }
    return [];
  }

  if (message.type === 'turn.completed') {
    return [{ kind: 'result', success: true }];
  }

  if (message.type === 'turn.failed') {
    const error = (message as { error?: { message?: string } }).error;
    const errorMessage = error?.message ?? 'o agente terminou com erro.';
    const events: NormalizedEvent[] = [];
    if (/authentication|unauthorized|401|403|login/i.test(errorMessage)) {
      events.push({ kind: 'auth_error' });
    }
    events.push({ kind: 'result', success: false, errorMessage });
    return events;
  }

  return [];
}

export const codexAdapter: EngineAdapter = {
  id: 'codex',
  binaryName: 'codex',
  // TODO(codex): restrictsTools/supportsMcp confirmados como false porque
  // buildCommand acima não usa options.tools/allowedTools/mcpConfig hoje —
  // não há flag documentada publicamente pra isso ainda (ver spec, seção
  // "Riscos", itens 1-2). supportsVision fica true por falta de evidência
  // em contrário — nenhuma pesquisa encontrou um gap de visão documentado
  // pro Codex (diferente do Gemini); validar quando houver acesso real a
  // uma conta Codex.
  capabilities: { restrictsTools: false, supportsMcp: false, supportsVision: true },
  buildCommand,
  parseLine,
};
