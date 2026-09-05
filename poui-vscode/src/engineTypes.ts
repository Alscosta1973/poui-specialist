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

export interface EngineAdapter {
  id: EngineId;
  /** Nome do binário — usado tanto para checagem de disponibilidade
   * (`<binaryName> --version`) quanto como `command` de spawn. */
  binaryName: string;
  buildCommand(
    options: RunAgentOptions,
    systemPromptFile: string,
    mcpConfigFile?: string,
  ): { command: string; args: string[] };
  /** Função pura — uma linha de stdout vira 0+ eventos normalizados. Nunca
   * lança: JSON inválido ou tipo de mensagem desconhecido devolve []. */
  parseLine(line: string): NormalizedEvent[];
}
