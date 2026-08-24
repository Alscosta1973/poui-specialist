import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

export interface BuildResult {
  success: boolean;
  output: string;
}

export type RunBuildFn = (cwd: string) => Promise<BuildResult>;

/** Roda `ng build` via shell (necessário no Windows: o CLI local é `ng.cmd`,
 * um script batch que `child_process.spawn` sem shell não executa). Não há
 * texto do usuário nesse comando — só argumentos fixos — então `shell: true`
 * aqui não é um risco de injeção. */
async function defaultRunBuild(cwd: string): Promise<BuildResult> {
  try {
    const { stdout, stderr } = await execAsync('ng build --configuration development', {
      cwd,
      timeout: 120000,
      maxBuffer: 10 * 1024 * 1024,
    });
    return { success: true, output: `${stdout}${stderr}` };
  } catch (error) {
    const err = error as { stdout?: string; stderr?: string; message: string };
    const output = `${err.stdout ?? ''}${err.stderr ?? ''}` || err.message;
    return { success: false, output };
  }
}

export async function runBuild(cwd: string, run: RunBuildFn = defaultRunBuild): Promise<BuildResult> {
  return run(cwd);
}

export interface BuildError {
  message: string;
  file?: string;
  line?: number;
  column?: number;
}

function stripAnsi(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/\x1b\[[0-9;]*m/g, '');
}

/** Formato real do Angular 21 (builder baseado em esbuild), confirmado com
 * uma quebra de build de verdade — não o formato legado `ERROR in <arquivo>`
 * que versões antigas do webpack usavam:
 *
 * ```
 * X [ERROR] TS2322: Type 'string' is not assignable to type 'number'. [plugin angular-compiler]
 *
 *     src/app/a.component.ts:10:10:
 *       10 │     const x: number = 'not-a-number';
 * ```
 *
 * Nem todo erro tem um `arquivo:linha:coluna` associado (ex: erro de
 * orçamento de bundle) — só é atribuído quando a linha não-vazia
 * imediatamente seguinte tiver esse formato, para não associar
 * incorretamente a localização de um erro mais distante no output. */
export function parseBuildErrors(rawOutput: string): BuildError[] {
  const output = stripAnsi(rawOutput);
  const lines = output.split(/\r?\n/);
  const errors: BuildError[] = [];
  const errorLinePattern = /\[ERROR\]\s+(.+)$/;
  const locationPattern = /^\s*(\S.*?):(\d+):(\d+):\s*$/;

  for (let i = 0; i < lines.length; i++) {
    const errorMatch = errorLinePattern.exec(lines[i]);
    if (!errorMatch) {
      continue;
    }
    const message = errorMatch[1].trim();

    let j = i + 1;
    while (j < lines.length && lines[j].trim() === '') {
      j++;
    }
    const locationMatch = j < lines.length ? locationPattern.exec(lines[j]) : null;

    if (locationMatch) {
      errors.push({
        message,
        file: locationMatch[1],
        line: Number(locationMatch[2]),
        column: Number(locationMatch[3]),
      });
    } else {
      errors.push({ message });
    }
  }

  return errors;
}
