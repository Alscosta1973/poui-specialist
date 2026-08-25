import { spawn } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import * as readline from 'node:readline';
import { randomUUID } from 'node:crypto';

export interface OutputSink {
  appendLine(value: string): void;
}

export interface GenerateResult {
  filesWritten: string[];
  succeeded: boolean;
  errorMessage?: string;
  isAuthError?: boolean;
}

export interface RunAgentOptions {
  cwd: string;
  systemPrompt: string;
  userPrompt: string;
  model?: string;
  effort?: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
  /** Lista de tools liberadas, separadas por vírgula — sobrescreve
   * `ALLOWED_TOOLS`. Usado por fluxos somente-leitura (ex: `review`) que
   * não devem poder escrever/editar arquivos. */
  tools?: string;
  /** Conteúdo JSON de config de servidores MCP (ex: Playwright) — escrito
   * num arquivo temporário e passado via `--mcp-config`/`--strict-mcp-config`.
   * Usado por fluxos que precisam de ferramentas MCP (ex: `e2e`). */
  mcpConfig?: string;
  /** Lista de tools auto-aprovadas via `--allowedTools` — distinta de
   * `tools`/`--tools`: `--tools` só restringe o conjunto disponível, não
   * aprova ferramentas MCP automaticamente (confirmado por teste real —
   * sem isso, toda chamada MCP fica bloqueada por permissão mesmo com
   * `--permission-mode acceptEdits`). Necessário sempre que `mcpConfig`
   * também for passado. */
  allowedTools?: string;
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

/** Ferramentas nativas liberadas para o agente — sem `Bash`/`WebFetch`/`WebSearch`,
 * de modo que `cwd` seja de fato a fronteira de segurança da geração. */
const ALLOWED_TOOLS = 'Read,Write,Edit,Glob,Grep';

function defaultSpawn(
  command: string,
  args: string[],
  options: { cwd: string; env: NodeJS.ProcessEnv },
): SpawnedProcess {
  // `stdio: ['ignore', ...]` faz o filho ver stdin já fechado. Sem isso o
  // Node abre um pipe de stdin que ninguém escreve nem fecha, e o CLI espera
  // ~3s por dados antes de desistir — atrasando toda execução e emitindo
  // "Warning: no stdin data received in 3s" no stderr.
  return spawn(command, args, {
    cwd: options.cwd,
    env: options.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  }) as unknown as SpawnedProcess;
}

/** Remove do env herdado as variáveis que dariam prioridade a uma API key
 * paga sobre a sessão OAuth do claude.ai já logada — se `ANTHROPIC_API_KEY`
 * estiver setada por qualquer motivo no processo do VS Code, ela venceria a
 * sessão OAuth na resolução de credenciais do CLI. */
function buildSubprocessEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  delete env.ANTHROPIC_API_KEY;
  delete env.ANTHROPIC_AUTH_TOKEN;
  delete env.ANTHROPIC_BASE_URL;
  return env;
}

function buildArgs(options: RunAgentOptions, systemPromptFile: string, mcpConfigFile?: string): string[] {
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
  return args;
}

/** Extrai uma mensagem legível de um `result` que terminou em erro. */
function describeResultFailure(message: { subtype: string; result?: string; errors?: string[] }): string {
  if (message.subtype === 'success') {
    return message.result || 'o agente terminou com erro.';
  }
  return message.errors && message.errors.length > 0 ? message.errors.join('; ') : message.subtype;
}

export async function runClaudeAgent(
  options: RunAgentOptions,
  sink: OutputSink,
  spawnFn: SpawnFn = defaultSpawn,
): Promise<GenerateResult> {
  const filesWritten: string[] = [];
  let isAuthError = false;
  const systemPromptFile = path.join(os.tmpdir(), `poui-system-prompt-${randomUUID()}.txt`);
  const mcpConfigFile = options.mcpConfig
    ? path.join(os.tmpdir(), `poui-mcp-config-${randomUUID()}.json`)
    : undefined;

  try {
    await fs.writeFile(systemPromptFile, options.systemPrompt, 'utf8');
    if (mcpConfigFile && options.mcpConfig) {
      await fs.writeFile(mcpConfigFile, options.mcpConfig, 'utf8');
    }

    const args = buildArgs(options, systemPromptFile, mcpConfigFile);
    const child = spawnFn('claude', args, { cwd: options.cwd, env: buildSubprocessEnv() });

    let stderrOutput = '';
    child.stderr.on('data', (chunk: Buffer | string) => {
      stderrOutput += chunk.toString();
    });

    const rl = readline.createInterface({ input: child.stdout });

    return await new Promise<GenerateResult>((resolve) => {
      let finished = false;
      const finish = (value: GenerateResult) => {
        if (!finished) {
          finished = true;
          resolve(value);
        }
      };

      rl.on('line', (line) => {
        if (!line.trim()) {
          return;
        }
        let message: Record<string, unknown>;
        try {
          message = JSON.parse(line);
        } catch {
          return;
        }

        if (message.type === 'assistant') {
          const assistantMessage = message as {
            error?: string;
            message: { content: Array<{ type: string; text?: string; name?: string; input?: unknown }> };
          };
          if (
            assistantMessage.error === 'authentication_failed' ||
            assistantMessage.error === 'oauth_org_not_allowed'
          ) {
            isAuthError = true;
          }
          for (const block of assistantMessage.message.content) {
            if (block.type === 'text' && typeof block.text === 'string') {
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
          const resultMessage = message as {
            subtype: string;
            is_error: boolean;
            result?: string;
            errors?: string[];
            api_error_status?: number | null;
          };
          if (resultMessage.api_error_status === 401 || resultMessage.api_error_status === 403) {
            isAuthError = true;
          }
          if (resultMessage.is_error) {
            const errorMessage = describeResultFailure(resultMessage);
            isAuthError = isAuthError || /authentication|unauthorized|401|403/i.test(errorMessage);
            sink.appendLine(`✗ falha ao executar o agente: ${errorMessage}`);
            finish({ filesWritten, succeeded: false, errorMessage, isAuthError });
          } else {
            finish({ filesWritten, succeeded: true });
          }
        }
      });

      child.on('error', (error) => {
        if (finished) {
          return;
        }
        sink.appendLine(`✗ falha ao executar o agente: ${error.message}`);
        finish({ filesWritten, succeeded: false, errorMessage: error.message, isAuthError });
      });

      child.on('close', () => {
        if (finished) {
          // A execução já foi resolvida por uma mensagem `result` — nada a
          // reportar aqui, nem sequer uma linha no output.
          return;
        }
        // Fallback: o processo encerrou sem nunca emitir uma mensagem
        // `result` (crash, kill, etc.) — o código de saída em si não é
        // sinal confiável de sucesso/falha da tarefa (confirmado
        // empiricamente: uma falha reportada via `result.is_error` ainda
        // sai com código 0), então só chegamos aqui como fallback.
        const errorMessage = stderrOutput.trim() || 'o processo encerrou sem retornar um resultado.';
        sink.appendLine(`✗ falha ao executar o agente: ${errorMessage}`);
        finish({ filesWritten, succeeded: false, errorMessage, isAuthError });
      });
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    sink.appendLine(`✗ falha ao executar o agente: ${errorMessage}`);
    return { filesWritten, succeeded: false, errorMessage, isAuthError };
  } finally {
    await fs.rm(systemPromptFile, { force: true });
    if (mcpConfigFile) {
      await fs.rm(mcpConfigFile, { force: true });
    }
  }
}
