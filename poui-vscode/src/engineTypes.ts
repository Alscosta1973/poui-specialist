export type EngineId = 'claude' | 'codex' | 'gemini';

export type NormalizedEvent =
  | { kind: 'text'; text: string }
  | { kind: 'tool_use'; name: string; input: unknown }
  | { kind: 'auth_error' }
  | { kind: 'result'; success: true }
  | { kind: 'result'; success: false; errorMessage: string };

export interface RunAgentOptions {
  cwd: string;
  systemPrompt: string;
  userPrompt: string;
  model?: string;
  effort?: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
  tools?: string;
  mcpConfig?: string;
  allowedTools?: string;
  addDir?: string;
}

export interface OutputSink {
  appendLine(value: string): void;
}

export interface GenerateResult {
  filesWritten: string[];
  succeeded: boolean;
  errorMessage?: string;
  isAuthError?: boolean;
}

export interface SpawnedProcess {
  stdout: NodeJS.ReadableStream;
  stderr: NodeJS.ReadableStream;
  on(event: 'error', listener: (err: Error) => void): unknown;
  on(event: 'close', listener: (code: number | null) => void): unknown;
}

export type SpawnFn = (
  command: string,
  args: string[],
  options: { cwd: string; env: NodeJS.ProcessEnv },
) => SpawnedProcess;

export interface EngineCapabilities {
  /** Se true, o motor respeita `RunAgentOptions.tools`/`allowedTools` para
   * restringir quais ferramentas o agente pode usar — usado por comandos
   * como `poui.review` que dependem de rodar sem Write/Edit. */
  restrictsTools: boolean;
  /** Se true, o motor suporta `RunAgentOptions.mcpConfig` — usado hoje só
   * por `poui.generate.e2e` para dar acesso ao MCP do Playwright. */
  supportsMcp: boolean;
  /** Se true, o motor pode processar uma imagem enviada no prompt — usado
   * por `poui.generate.screenshot`. */
  supportsVision: boolean;
}

export interface EngineAdapter {
  id: EngineId;
  /** Nome do binário — usado tanto para checagem de disponibilidade
   * (`<binaryName> --version`) quanto como `command` de spawn. */
  binaryName: string;
  /** O que este motor garante ou não garante hoje — usado pelos comandos
   * que dependem de uma garantia específica (restrição de ferramentas,
   * MCP, visão) pra avisar o usuário em vez de assumir silenciosamente
   * que a garantia vale pra qualquer motor selecionado. */
  capabilities: EngineCapabilities;
  buildCommand(
    options: RunAgentOptions,
    systemPromptFile: string,
    mcpConfigFile?: string,
  ): { command: string; args: string[] };
  /** Função pura — uma linha de stdout vira 0+ eventos normalizados. Nunca
   * lança: JSON inválido ou tipo de mensagem desconhecido devolve []. */
  parseLine(line: string): NormalizedEvent[];
}
