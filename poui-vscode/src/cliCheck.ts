import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { EngineId } from './engineTypes';
import { getEngineAdapter } from './engineRegistry';
import { buildPowerShellInvocation } from './windowsShell';

const execFileAsync = promisify(execFile);

export interface CliCheckResult {
  available: boolean;
  version?: string;
  errorMessage?: string;
}

export type RunVersionCheck = (command: string, args: string[]) => Promise<{ stdout: string }>;

async function defaultRunVersionCheck(command: string, args: string[]): Promise<{ stdout: string }> {
  // Mesma causa raiz e mesma correção do fix em agentRuntime.ts:
  // defaultSpawn — ver o comentário lá pro achado completo (ENOENT em
  // codex/gemini no Windows por serem shims .cmd/.ps1, e por que uma
  // primeira tentativa via cmd.exe quebrava com conteúdo multi-linha).
  // Escopado só pro Windows.
  if (process.platform === 'win32') {
    const { stdout } = await execFileAsync('powershell.exe', [
      '-NoProfile',
      '-NonInteractive',
      '-Command',
      buildPowerShellInvocation(command, args),
    ]);
    return { stdout };
  }
  const { stdout } = await execFileAsync(command, args);
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
