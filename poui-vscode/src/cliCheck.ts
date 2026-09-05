import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { EngineId } from './engineTypes';
import { getEngineAdapter } from './engineRegistry';
import { buildWindowsCommandLine } from './windowsShell';

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
  // codex/gemini no Windows, e por que shell:true sozinho com
  // command+args separados corrompe argumento com espaço via o `%*` do
  // shim .cmd). Escopado só pro Windows.
  const isWindows = process.platform === 'win32';
  const { stdout } = isWindows
    ? await execFileAsync(buildWindowsCommandLine(command, args), [], { shell: true })
    : await execFileAsync(command, args);
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
