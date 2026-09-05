import { EngineAdapter, NormalizedEvent, RunAgentOptions } from './engineTypes';

// TODO(gemini): --add-dir equivalente ainda não confirmado/testado (talvez
// --include-directories, visto em `gemini --help`, mas nenhum comando desta
// extensão exercitou esse caminho ainda). Doc oficial confirma
// GEMINI_API_KEY/GOOGLE_API_KEY como exigência de auth headless — diferente
// de Claude/Codex, não reaproveita sessão pessoal. `--skip-trust` e o
// mecanismo de prompt de sistema (`GEMINI_SYSTEM_MD`, ver buildCommand
// abaixo) já validados via teste manual real nesta sessão.
function buildCommand(
  options: RunAgentOptions,
  systemPromptFile: string,
  _mcpConfigFile?: string,
): { command: string; args: string[]; env?: Record<string, string> } {
  const args = [
    '-p',
    options.userPrompt,
    '--output-format',
    'stream-json',
    '--approval-mode',
    'yolo',
    // Achado confirmado via teste manual real (não estava documentado nem
    // previsto na pesquisa original): o Gemini CLI recusa rodar em modo
    // headless numa pasta que o usuário nunca "confiou" interativamente,
    // travando com "Gemini CLI is not running in a trusted directory".
    // A extensão só roda dentro de workspaceFolder.uri.fsPath — a pasta
    // que o próprio usuário já abriu no VS Code — então confiar
    // automaticamente é seguro; sem isso, todo comando com o motor gemini
    // falharia para qualquer usuário na primeira execução.
    '--skip-trust',
  ];
  // Achado confirmado via teste manual real: `--system-prompt-file` NÃO
  // existe no Gemini CLI (rejeitado com "Unknown arguments" — o
  // buildCommand anterior quebrava TODO comando com este motor). O
  // mecanismo real é a env var `GEMINI_SYSTEM_MD`: quando aponta pra um
  // arquivo, o Gemini CLI SUBSTITUI seu prompt de sistema padrão pelo
  // conteúdo do arquivo — diferente do Claude, que só ANEXA
  // (`--append-system-prompt-file`). Aceitável aqui porque os prompts de
  // sistema desta extensão já são instruções completas por si só, não um
  // complemento ao comportamento padrão do motor.
  return { command: 'gemini', args, env: { GEMINI_SYSTEM_MD: systemPromptFile } };
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
      // Normalização deliberada: gemini reporta o nome bruto da ferramenta
      // (ex.: 'write_file'); traduzimos para o vocabulário compartilhado
      // 'Write'/'Edit' que agentRuntime.ts usa para popular filesWritten.
      // Gemini não distingue write/edit nesse nível — 'Write' é o mapeamento
      // correto para todas as chamadas de escrita de arquivo.
      return [{ kind: 'tool_use', name: 'Write', input: { file_path: call.args.file_path } }];
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
  // TODO(gemini): restrictsTools/supportsMcp confirmados como false porque
  // buildCommand acima não usa options.tools/allowedTools/mcpConfig hoje —
  // não há flag documentada publicamente pra isso ainda (ver spec, seção
  // "Riscos", item 2). supportsVision é false porque o gap de visão do
  // Gemini CLI está confirmado e documentado no spec (seção "Riscos").
  capabilities: { restrictsTools: false, supportsMcp: false, supportsVision: false },
  buildCommand,
  parseLine,
};
