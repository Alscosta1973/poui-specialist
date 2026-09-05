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
