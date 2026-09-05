import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { EngineId } from './engineTypes';
import { getEngineAdapter } from './engineRegistry';

const execFileAsync = promisify(execFile);

export interface CliCheckResult {
  available: boolean;
  version?: string;
  errorMessage?: string;
}

export type RunVersionCheck = (command: string, args: string[]) => Promise<{ stdout: string }>;

async function defaultRunVersionCheck(command: string, args: string[]): Promise<{ stdout: string }> {
  // Achado confirmado via teste manual real + reprodução isolada: no
  // Windows, codex/gemini são instalados pelo npm como shims .cmd/.ps1 (não
  // .exe nativo) — execFile() sem shell:true falha com "spawn <cmd> ENOENT"
  // pra eles (mesma causa raiz do fix em agentRuntime.ts:defaultSpawn).
  // Escopado só pro Windows — macOS/Linux não precisam disso.
  const { stdout } = await execFileAsync(command, args, { shell: process.platform === 'win32' });
  return { stdout };
}

export async function checkEngineAvailable(
  engineId: EngineId,
  run: RunVersionCheck = defaultRunVersionCheck,
): Promise<CliCheckResult> {
  const adapter = getEngineAdapter(engineId);
  try {
    const { stdout } = await run(adapter.binaryName, ['--version']);
    return { available: true, version: stdout.trim() };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { available: false, errorMessage };
  }
}
