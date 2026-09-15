import { EngineAdapter, NormalizedEvent, RunAgentOptions } from './engineTypes';

// Achados confirmados via teste manual real em 2026-09-15 (conta OpenAI/
// ChatGPT de verdade, `codex exec` real no Windows — não só `--help`):
//
// 1. `--append-system-prompt-file` NÃO EXISTE — `codex exec` rejeita com
//    "unexpected argument" (o código antigo assumia que existia e nunca
//    tinha sido testado; TODO CLI genuinamente quebrado até este fix). O
//    mecanismo real: o texto gravado no **stdin** do processo é anexado
//    como um bloco `<stdin>` ao turno (confirmado: um prompt instruindo
//    "responda em MAIÚSCULAS" via stdin mudou a resposta de verdade).
//    Ver `SpawnedProcess.stdin`/`EngineAdapter.buildCommand.stdinFile` em
//    `engineTypes.ts` — `agentRuntime.ts` grava `systemPromptFile` ali.
// 2. `--skip-git-repo-check` é obrigatório fora de um repo git — mesmo
//    motivo do `--skip-trust` do Gemini: a extensão só roda dentro da
//    pasta que o próprio usuário já abriu no VS Code, então pular essa
//    checagem é seguro.
// 3. `--sandbox workspace-write` sozinho **não é suficiente** em modo
//    headless — toda escrita é rejeitada com "blocked by read-only
//    sandbox; rejected by user approval settings" (nem `-c
//    approval_policy=never` resolve; `-a`/`--ask-for-approval` nem existe
//    em `codex exec`, só no modo interativo). O que funciona de verdade:
//    `--sandbox danger-full-access` (testado, cria arquivo real) — mais
//    permissivo que o nome do Claude/Gemini sugeriria, mas é o único jeito
//    confirmado de escrever sem travar esperando aprovação humana que
//    nunca vem.
function buildCommand(
  options: RunAgentOptions,
  systemPromptFile: string,
  _mcpConfigFile?: string,
): { command: string; args: string[]; stdinFile: string } {
  const args = ['exec', '--json', '--sandbox', 'danger-full-access', '--skip-git-repo-check'];
  if (options.addDir) {
    args.push('--add-dir', options.addDir);
  }
  args.push(options.userPrompt);
  return { command: 'codex', args, stdinFile: systemPromptFile };
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
    if (item?.type === 'file_change' && Array.isArray(item.changes)) {
      // Achado real (2026-09-15): o path NÃO fica direto em `item.path` —
      // fica em `item.changes[].path` (um array, pode ter mais de um
      // arquivo por item). Corrigido depois de testar de verdade: o código
      // anterior checava `item.path` e nunca batia com nada, então
      // `filesWritten` nunca era populado pra Codex. Normalização
      // deliberada pro vocabulário compartilhado (`Write`), igual antes —
      // `kind` (add/modify/delete) não distingue write de edit nesse nível.
      return (item.changes as unknown[])
        .filter((c): c is { path: string } => typeof (c as { path?: unknown })?.path === 'string')
        .map((c) => ({ kind: 'tool_use' as const, name: 'Write', input: { file_path: c.path } }));
    }
    if (item?.type === 'command_execution' && typeof item.name === 'string' && typeof item.path === 'string') {
      return [{ kind: 'tool_use', name: item.name, input: { file_path: item.path } }];
    }
    if (item?.type === 'error' && typeof item.message === 'string') {
      return [{ kind: 'text', text: `⚠ ${item.message}` }];
    }
    return [];
  }

  if (message.type === 'error' && typeof message.message === 'string') {
    return [{ kind: 'text', text: `⚠ ${message.message}` }];
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
  // restrictsTools/supportsMcp: confirmados false via `codex exec --help`
  // real (2026-09-15) — não existe `--tools`/`--allowedTools`/`--mcp-config`
  // nem equivalente; `poui.review` (que depende de restringir a
  // Read/Glob/Grep) não tem como ser garantido com Codex hoje.
  // supportsVision: `-i, --image <FILE>...` existe de verdade em `codex
  // --help` (confirmado), mas o comportamento em si (ex: reconhecer um
  // wireframe pro poui.generate.screenshot) nunca foi testado de ponta a
  // ponta.
  capabilities: { restrictsTools: false, supportsMcp: false, supportsVision: true },
  buildCommand,
  parseLine,
};
