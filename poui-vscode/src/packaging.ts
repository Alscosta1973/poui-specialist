import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

const execAsync = promisify(exec);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AngularJson = any;

/** O primeiro projeto declarado em `angular.json` — mesma convenção do
 * plugin original (não pergunta qual usar; se houver mais de um, o
 * primeiro ganha). */
export function readProjectName(angularJson: AngularJson): string {
  const names = Object.keys(angularJson?.projects ?? {});
  if (names.length === 0) {
    throw new Error('angular.json não declara nenhum projeto.');
  }
  return names[0];
}

/** O builder `@angular/build:application` (padrão desde Angular 17+) gera a
 * saída em `dist/<projeto>/browser/` por padrão — o Protheus espera
 * `index.html` na raiz da pasta publicada. Sem `browser: ""` explícito no
 * `outputPath`, o deploy falha com "Falha ao Ajustar os arquivos Index". */
export function needsOutputPathFix(outputPath: unknown): boolean {
  if (typeof outputPath === 'string') {
    return true;
  }
  if (outputPath && typeof outputPath === 'object' && 'browser' in outputPath) {
    return (outputPath as { browser: unknown }).browser !== '';
  }
  return true;
}

/** Devolve uma cópia de `angularJson` com o `outputPath` do projeto corrigido
 * para `{ base: "dist/<projeto>", browser: "" }` — o resto do arquivo (outras
 * opções de build, outros projetos) fica intacto. */
export function fixOutputPath(angularJson: AngularJson, projectName: string): AngularJson {
  const fixed = JSON.parse(JSON.stringify(angularJson)) as AngularJson;
  fixed.projects[projectName].architect.build.options.outputPath = {
    base: `dist/${projectName}`,
    browser: '',
  };
  return fixed;
}

const PACKAGE_GITIGNORE_PATTERNS = ['dist/', '*.zip', 'Resource/'];

/** Mesma convenção de `buildGitignoreAdditions` (playwrightSetup.ts) — só os
 * padrões que ainda não aparecem no `.gitignore` existente. */
export function buildPackageGitignoreAdditions(existingGitignoreContent: string): string {
  const missing = PACKAGE_GITIGNORE_PATTERNS.filter((pattern) => !existingGitignoreContent.includes(pattern));
  if (missing.length === 0) {
    return '';
  }
  return `\n# Empacotamento (PO-UI: Empacotar Projeto)\n${missing.join('\n')}\n`;
}

const DEFAULT_SEVEN_ZIP_LOCATIONS = ['C:\\Program Files\\7-Zip\\7z.exe', 'C:\\Program Files (x86)\\7-Zip\\7z.exe'];

/** Procura `7z.exe` nos diretórios do PATH e, se não achar, nos locais padrão
 * de instalação — o 7-Zip é comumente instalado sem entrar no PATH.
 * `existsFn` é injetado para permitir teste sem tocar o disco de verdade. */
export function findSevenZip(pathEnv: string, existsFn: (candidatePath: string) => boolean): string | undefined {
  const dirs = pathEnv.split(path.delimiter).filter(Boolean);
  for (const dir of dirs) {
    const candidate = path.join(dir, '7z.exe');
    if (existsFn(candidate)) {
      return candidate;
    }
  }
  for (const candidate of DEFAULT_SEVEN_ZIP_LOCATIONS) {
    if (existsFn(candidate)) {
      return candidate;
    }
  }
  return undefined;
}

/** Confirma que a pasta do projeto é a raiz do zip, a partir da saída de
 * `7z l <zip>` — um zip achatado (sem essa pasta) faz o Protheus falhar com
 * "Falha ao renomear" (UNZIPAPP, FError: 161). */
export function verifyZipHasProjectRoot(sevenZipListing: string, projectName: string): boolean {
  const namePrefix = `${projectName}/`;
  return sevenZipListing
    .split('\n')
    .some((line) => line.trim().endsWith(projectName) || line.includes(namePrefix));
}

export interface PackageResult {
  success: boolean;
  steps: string[];
  appPath?: string;
  errorMessage?: string;
  usedRiskyFallback?: boolean;
}

export interface OutputSink {
  appendLine(value: string): void;
}

export interface PackageOptions {
  /** Caminho de `7z.exe`, ou `undefined` se não encontrado. */
  sevenZipPath?: string;
  /** Quando `sevenZipPath` é `undefined`, se ainda assim deve prosseguir com
   * `Compress-Archive`/equivalente Node (arriscado — zip pode falhar ao
   * extrair no Protheus). Decidido fora desta função, via confirmação real
   * do usuário — este módulo não depende do vscode. */
  proceedWithoutSevenZip?: boolean;
}

async function zipWithSevenZip(sevenZipPath: string, distDir: string, projectName: string, zipFullPath: string): Promise<void> {
  await execAsync(`"${sevenZipPath}" a -tzip "${zipFullPath}" "${projectName}"`, {
    cwd: distDir,
    timeout: 120000,
    maxBuffer: 10 * 1024 * 1024,
  });
}

async function listSevenZip(sevenZipPath: string, zipFullPath: string): Promise<string> {
  const { stdout } = await execAsync(`"${sevenZipPath}" l "${zipFullPath}"`, {
    timeout: 30000,
    maxBuffer: 10 * 1024 * 1024,
  });
  return stdout;
}

/** Compacta `dist/<projeto>` (mesmo formato do fallback Node do `archiver`
 * não instalado neste projeto) preservando `<projeto>/` como raiz — usado só
 * quando `7z.exe` não foi encontrado e o usuário decidiu prosseguir mesmo
 * assim. Node não tem um criador de zip nativo; usa PowerShell's
 * `Compress-Archive`, mesmo fallback do plugin original (com o mesmo aviso
 * de risco conhecido). */
async function zipWithPowerShellFallback(distProjectDir: string, zipFullPath: string): Promise<void> {
  const psCommand = `Compress-Archive -Path "${distProjectDir}" -DestinationPath "${zipFullPath}" -Force`;
  await execAsync(`powershell -NoProfile -Command "${psCommand.replace(/"/g, '\\"')}"`, {
    timeout: 60000,
    maxBuffer: 10 * 1024 * 1024,
  });
}

export async function packageProject(
  workspaceRoot: string,
  options: PackageOptions,
  sink: OutputSink,
): Promise<PackageResult> {
  const steps: string[] = [];
  try {
    const angularJsonPath = path.join(workspaceRoot, 'angular.json');
    const angularJsonRaw = await fs.readFile(angularJsonPath, 'utf8').catch(() => undefined);
    if (angularJsonRaw === undefined) {
      return { success: false, steps, errorMessage: 'angular.json não encontrado — este comando deve rodar na raiz de um projeto Angular.' };
    }
    const angularJson = JSON.parse(angularJsonRaw);
    const projectName = readProjectName(angularJson);
    const buildOptions = angularJson.projects[projectName]?.architect?.build?.options ?? {};

    if (needsOutputPathFix(buildOptions.outputPath)) {
      const fixed = fixOutputPath(angularJson, projectName);
      await fs.writeFile(angularJsonPath, JSON.stringify(fixed, null, 2) + '\n', 'utf8');
      steps.push(`angular.json: outputPath corrigido para { base: "dist/${projectName}", browser: "" }`);
      sink.appendLine(steps[steps.length - 1]);
    }

    sink.appendLine('Rodando ng build --configuration production...');
    await execAsync('ng build --configuration production', {
      cwd: workspaceRoot,
      timeout: 300000,
      maxBuffer: 20 * 1024 * 1024,
    });
    steps.push('Build de produção concluído');
    sink.appendLine(steps[steps.length - 1]);

    const distProjectDir = path.join(workspaceRoot, 'dist', projectName);
    const indexHtmlExists = await fs
      .access(path.join(distProjectDir, 'index.html'))
      .then(() => true)
      .catch(() => false);
    if (!indexHtmlExists) {
      return { success: false, steps, errorMessage: `dist/${projectName}/index.html não encontrado após o build.` };
    }

    const zipFullPath = path.join(workspaceRoot, `${projectName}.zip`);
    await fs.rm(zipFullPath, { force: true });

    let usedRiskyFallback = false;
    if (options.sevenZipPath) {
      await zipWithSevenZip(options.sevenZipPath, path.join(workspaceRoot, 'dist'), projectName, zipFullPath);
      steps.push(`Empacotado com 7-Zip: ${projectName}.zip`);
      sink.appendLine(steps[steps.length - 1]);

      const listing = await listSevenZip(options.sevenZipPath, zipFullPath);
      if (!verifyZipHasProjectRoot(listing, projectName)) {
        return {
          success: false,
          steps,
          errorMessage: `ESTRUTURA INCORRETA — ${projectName}.zip não tem "${projectName}/" como raiz do zip. Este .app provavelmente falhará no Protheus (UNZIPAPP FError: 161).`,
        };
      }
      steps.push(`Estrutura verificada: "${projectName}/" confirmado como raiz`);
      sink.appendLine(steps[steps.length - 1]);
    } else if (options.proceedWithoutSevenZip) {
      usedRiskyFallback = true;
      await zipWithPowerShellFallback(distProjectDir, zipFullPath);
      steps.push(`⚠ Empacotado com Compress-Archive (7-Zip não encontrado) — risco conhecido de falha no Protheus`);
      sink.appendLine(steps[steps.length - 1]);
    } else {
      return { success: false, steps, errorMessage: '7-Zip não encontrado — empacotamento cancelado.' };
    }

    const resourceDir = path.join(workspaceRoot, 'Resource');
    await fs.mkdir(resourceDir, { recursive: true });
    const appPath = path.join(resourceDir, `${projectName}.app`);
    await fs.copyFile(zipFullPath, appPath);
    await fs.rm(zipFullPath, { force: true });
    steps.push(`Pacote copiado para Resource/${projectName}.app`);
    sink.appendLine(steps[steps.length - 1]);

    const gitignorePath = path.join(workspaceRoot, '.gitignore');
    const gitignoreContent = await fs.readFile(gitignorePath, 'utf8').catch(() => null);
    if (gitignoreContent !== null) {
      const additions = buildPackageGitignoreAdditions(gitignoreContent);
      if (additions) {
        await fs.writeFile(gitignorePath, gitignoreContent + additions, 'utf8');
        steps.push('.gitignore atualizado com os artefatos de build/empacotamento');
        sink.appendLine(steps[steps.length - 1]);
      }
    }

    return { success: true, steps, appPath, usedRiskyFallback };
  } catch (error) {
    const err = error as { stdout?: string; stderr?: string; message: string };
    const errorMessage = `${err.stdout ?? ''}${err.stderr ?? ''}`.trim() || err.message;
    return { success: false, steps, errorMessage };
  }
}
