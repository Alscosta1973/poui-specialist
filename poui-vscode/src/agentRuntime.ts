import { spawn } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import * as readline from 'node:readline';
import { randomUUID } from 'node:crypto';
import { EngineAdapter, EngineId, GenerateResult, OutputSink, RunAgentOptions, SpawnedProcess, SpawnFn } from './engineTypes';
import { getEngineAdapter } from './engineRegistry';

export type { GenerateResult, OutputSink, RunAgentOptions, SpawnedProcess, SpawnFn } from './engineTypes';

function defaultSpawn(
  command: string,
  args: string[],
  options: { cwd: string; env: NodeJS.ProcessEnv },
): SpawnedProcess {
  return spawn(command, args, {
    cwd: options.cwd,
    env: options.env,
    stdio: ['ignore', 'pipe', 'pipe'],
    // Achado confirmado via teste manual real + reprodução isolada: no
    // Windows, codex/gemini são instalados pelo npm como shims .cmd/.ps1
    // (não .exe nativo) — spawn() sem shell:true falha com "spawn <cmd>
    // ENOENT" pra eles (claude não é afetado porque seu instalador gera um
    // .exe nativo). shell:true só no Windows resolve, sem mudar nada em
    // macOS/Linux (onde os binários já são executáveis diretos). O Node
    // escapa cada elemento de `args` automaticamente quando passado como
    // array com shell:true, então isso não abre injeção de shell a partir
    // de userPrompt/systemPrompt.
    shell: process.platform === 'win32',
  }) as unknown as SpawnedProcess;
}

function buildSubprocessEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  delete env.ANTHROPIC_API_KEY;
  delete env.ANTHROPIC_AUTH_TOKEN;
  delete env.ANTHROPIC_BASE_URL;
  return env;
}

/** Núcleo da orquestração — recebe o adapter já resolvido, pra permitir
 * testar com um fake sem depender do registry real. `runAgent` (abaixo) é a
 * função pública que os comandos chamam; ela só resolve o adapter e delega. */
export async function runAgentWithAdapter(
  adapter: EngineAdapter,
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

    const { command, args, env } = adapter.buildCommand(options, systemPromptFile, mcpConfigFile);
    const child = spawnFn(command, args, { cwd: options.cwd, env: { ...buildSubprocessEnv(), ...env } });

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
        let events: ReturnType<typeof adapter.parseLine>;
        try {
          events = adapter.parseLine(line);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          sink.appendLine(`⚠ linha de saída do agente ignorada (parse falhou): ${message}`);
          return;
        }
        for (const event of events) {
          if (event.kind === 'text') {
            sink.appendLine(event.text);
          } else if (event.kind === 'tool_use') {
            sink.appendLine(`→ ${event.name} ${JSON.stringify(event.input)}`);
            const input = event.input as { file_path?: unknown } | null | undefined;
            if ((event.name === 'Write' || event.name === 'Edit') && typeof input?.file_path === 'string') {
              filesWritten.push(input.file_path);
            }
          } else if (event.kind === 'auth_error') {
            isAuthError = true;
          } else if (event.kind === 'result') {
            if (event.success) {
              finish({ filesWritten, succeeded: true });
            } else {
              isAuthError = isAuthError || /authentication|unauthorized|401|403/i.test(event.errorMessage);
              sink.appendLine(`✗ falha ao executar o agente: ${event.errorMessage}`);
              finish({ filesWritten, succeeded: false, errorMessage: event.errorMessage, isAuthError });
            }
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
          return;
        }
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

export async function runAgent(
  options: RunAgentOptions,
  sink: OutputSink,
  engineId: EngineId,
  spawnFn: SpawnFn = defaultSpawn,
): Promise<GenerateResult> {
  return runAgentWithAdapter(getEngineAdapter(engineId), options, sink, spawnFn);
}
