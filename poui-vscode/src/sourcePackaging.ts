import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import type { OutputSink } from './packaging';

const execAsync = promisify(exec);

/** Pastas que nunca vão no zip de fontes do cliente: dependências e saídas de
 * build (o cliente gera com `npm ci` + build), configuração de editor e o
 * pacote já empacotado (vai à parte, em Resource/). */
const EXCLUDED_DIRS = new Set([
  'node_modules',
  'dist',
  '.angular',
  'Resource',
  'coverage',
  '.vscode',
  '.idea',
  '.git',
  'test-results',
  'playwright-report',
  'out-tsc',
  'tmp',
]);

/** Arquivos fora do zip: o proxy local (aponta para o servidor de quem
 * desenvolveu e pode levar credencial), variáveis de ambiente e artefatos. */
const EXCLUDED_FILE_PATTERNS = [/^proxy\.conf\.(json|js|cjs|mjs)$/i, /^\.env(\..*)?$/i, /\.(zip|app|log|secret)$/i];

/** O caminho relativo (com / ou \) entra no zip de fontes do cliente? */
export function shouldIncludeSource(relPath: string): boolean {
  const parts = relPath.split(/[\\/]+/).filter(Boolean);
  if (parts.length === 0) {
    return false;
  }
  if (parts.slice(0, -1).some((dir) => EXCLUDED_DIRS.has(dir))) {
    return false;
  }
  const name = parts[parts.length - 1];
  return !EXCLUDED_FILE_PATTERNS.some((re) => re.test(name));
}

const EXAMPLE_TARGET = 'http://<servidor-rest>:<porta>';

/** `proxy.conf.example.json` a partir do proxy local: mesmos contextos, alvo
 * genérico e sem cabeçalhos/autenticação. Proxy ausente ou em JS → exemplo
 * padrão com `/rest`. */
export function buildProxyExample(localProxyText: string | undefined): string {
  let contexts: string[] = ['/rest'];
  if (localProxyText) {
    try {
      const parsed = JSON.parse(localProxyText) as Record<string, unknown>;
      const keys = Object.keys(parsed);
      if (keys.length > 0) {
        contexts = keys;
      }
    } catch {
      // proxy.conf.js ou JSON inválido: usa o exemplo padrão
    }
  }
  const example: Record<string, unknown> = {};
  for (const ctx of contexts) {
    example[ctx] = { target: EXAMPLE_TARGET, secure: false, changeOrigin: true };
  }
  return JSON.stringify(example, null, 2) + '\n';
}

const WARNING_RULES: Array<{ re: RegExp; motivo: string }> = [
  { re: /(poui|advpl)-specialist|@generated\b/i, motivo: 'cita a ferramenta de geração' },
  { re: /Basic\s+[A-Za-z0-9+/]{6,}={0,2}/, motivo: 'credencial Basic escrita no fonte' },
  { re: /\b(password|senha|psw)\b['"]?\s*[:=]\s*['"][^'"]+['"]/i, motivo: 'senha escrita no fonte' },
];

/** Avisos (não bloqueiam) de um arquivo de fonte: referência à ferramenta de
 * geração ou credencial escrita no código. Formato: `<arquivo>:<linha> – <motivo>`. */
export function findSourceWarnings(relPath: string, content: string): string[] {
  const warnings: string[] = [];
  const file = relPath.split(/[\\/]+/).join('/');
  // lock de dependências: nomes de pacotes (ex.: "@inquirer/password") geram falso positivo
  if (/(^|\/)(package-lock\.json|npm-shrinkwrap\.json|yarn\.lock|pnpm-lock\.yaml)$/i.test(file)) {
    return warnings;
  }
  content.split(/\r?\n/).forEach((line, i) => {
    for (const rule of WARNING_RULES) {
      if (rule.re.test(line)) {
        warnings.push(`${file}:${i + 1} – ${rule.motivo}`);
      }
    }
  });
  return warnings;
}

export interface LeiaMeInfo {
  projectName: string;
  nodeVersion: string;
  angularVersion: string;
  poUiVersion: string;
}

/** LEIA-ME do zip de fontes: como instalar, rodar, testar, compilar, empacotar
 * e publicar o app no Protheus — sem citar ferramenta de geração. */
export function buildLeiaMe(info: LeiaMeInfo): string {
  const p = info.projectName;
  return `# ${p} – fontes da aplicação PO-UI

Aplicação Angular + PO-UI publicada no Protheus como \`${p}.app\` e aberta pela rotina que chama \`FwCallApp("${p}")\`.

Versões usadas na entrega: Node.js ${info.nodeVersion}, Angular ${info.angularVersion}, PO-UI ${info.poUiVersion}.
O \`package-lock.json\` fixa as versões exatas das dependências: instale sempre com \`npm ci\`.

## 1. Preparar o ambiente

1. Instalar o Node.js (mesma versão principal acima) e o 7-Zip.
2. Na pasta do projeto: \`npm ci\`

## 2. Rodar localmente

1. Copiar \`proxy.conf.example.json\` para \`proxy.conf.json\` e trocar \`${EXAMPLE_TARGET}\` pelo endereço do serviço REST
   do ambiente de desenvolvimento (o \`proxy.conf.json\` é local e não deve ser versionado).
2. \`npm start\` e abrir o endereço indicado no terminal.

## 3. Testes

\`npm test\` (testes unitários dos componentes e serviços).

## 4. Compilar

\`ng build --configuration production\` → saída em \`dist/${p}/\` (com \`index.html\` na raiz da pasta).

## 5. Empacotar o .app

O \`.app\` é um zip com a pasta \`${p}/\` na raiz. Gerar com o 7-Zip (o zip do PowerShell/Windows costuma falhar na
extração pelo Protheus):

\`\`\`
cd dist
"C:\\Program Files\\7-Zip\\7z.exe" a -tzip ..\\${p}.zip ${p}
cd ..
mkdir Resource
move /Y ${p}.zip Resource/${p}.app
\`\`\`

Conferir que \`Resource/${p}.app\` tem a pasta \`${p}/\` na raiz.

## 6. Publicar no Protheus

1. Compilar \`Resource/${p}.app\` no RPO pelo TDS (recurso), junto com a rotina que chama \`FwCallApp("${p}")\`.
2. Abrir a rotina pelo menu do Protheus e conferir a tela.
`;
}

export function sourcesZipName(projectName: string): string {
  return `${projectName}-fontes.zip`;
}

/** Lista os arquivos do projeto que vão para o cliente. `gitList` devolve os
 * arquivos versionados + não ignorados (ou `undefined` fora do git); sem git,
 * percorre a pasta. Sempre filtrado por `shouldIncludeSource`. */
export async function collectSourceFiles(
  workspaceRoot: string,
  gitList: (root: string) => Promise<string[] | undefined> = gitListFiles,
): Promise<string[]> {
  const listed = await gitList(workspaceRoot);
  const files = listed ?? (await walk(workspaceRoot, ''));
  const unique = new Set<string>();
  for (const rel of files) {
    const norm = rel.split(/[\\/]+/).join('/');
    if (shouldIncludeSource(norm) && (await isFile(path.join(workspaceRoot, norm)))) {
      unique.add(norm);
    }
  }
  return [...unique];
}

async function gitListFiles(root: string): Promise<string[] | undefined> {
  try {
    const { stdout } = await execAsync('git ls-files --cached --others --exclude-standard', {
      cwd: root,
      timeout: 30000,
      maxBuffer: 20 * 1024 * 1024,
    });
    const files = stdout.split(/\r?\n/).filter(Boolean);
    return files.length > 0 ? files : undefined;
  } catch {
    return undefined;
  }
}

async function walk(root: string, rel: string): Promise<string[]> {
  const out: string[] = [];
  const entries = await fs.readdir(path.join(root, rel), { withFileTypes: true });
  for (const e of entries) {
    const childRel = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) {
      if (!EXCLUDED_DIRS.has(e.name)) {
        out.push(...(await walk(root, childRel)));
      }
    } else if (e.isFile()) {
      out.push(childRel);
    }
  }
  return out;
}

async function isFile(p: string): Promise<boolean> {
  return fs
    .stat(p)
    .then((s) => s.isFile())
    .catch(() => false);
}

const TEXT_EXT = /\.(ts|js|mjs|cjs|json|html|scss|css|md|txt|yml|yaml)$/i;

export interface StageResult {
  fileCount: number;
  warnings: string[];
}

/** Copia os fontes para `<stageDir>/<projeto>/`, grava o `proxy.conf.example.json`
 * e o `LEIA-ME.md` e devolve os avisos (ferramenta citada, credencial). */
export async function stageSources(
  workspaceRoot: string,
  stageDir: string,
  projectName: string,
  files: string[],
  nodeVersion: string,
): Promise<StageResult> {
  const base = path.join(stageDir, projectName);
  const warnings: string[] = [];
  for (const rel of files) {
    const dest = path.join(base, rel);
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.copyFile(path.join(workspaceRoot, rel), dest);
    if (TEXT_EXT.test(rel)) {
      warnings.push(...findSourceWarnings(rel, await fs.readFile(dest, 'utf8')));
    }
  }
  const localProxy = await fs.readFile(path.join(workspaceRoot, 'proxy.conf.json'), 'utf8').catch(() => undefined);
  await fs.writeFile(path.join(base, 'proxy.conf.example.json'), buildProxyExample(localProxy), 'utf8');

  const pkg = JSON.parse(await fs.readFile(path.join(workspaceRoot, 'package.json'), 'utf8').catch(() => '{}'));
  const deps = { ...(pkg.devDependencies ?? {}), ...(pkg.dependencies ?? {}) };
  await fs.writeFile(
    path.join(base, 'LEIA-ME.md'),
    buildLeiaMe({
      projectName,
      nodeVersion,
      angularVersion: deps['@angular/core'] ?? '-',
      poUiVersion: deps['@po-ui/ng-components'] ?? '-',
    }),
    'utf8',
  );
  return { fileCount: files.length + 2, warnings };
}

export interface SourcePackageResult {
  success: boolean;
  zipPath?: string;
  fileCount?: number;
  warnings: string[];
  errorMessage?: string;
}

/** Gera `Resource/<projeto>-fontes.zip` com a pasta `<projeto>/` na raiz:
 * fontes do projeto Angular (sem node_modules/dist/proxy local), `proxy.conf.example.json`
 * e `LEIA-ME.md`. Usa 7-Zip quando houver; senão Compress-Archive (para fontes não
 * há o problema de extração do UNZIPAPP). */
export async function packageSources(
  workspaceRoot: string,
  projectName: string,
  sevenZipPath: string | undefined,
  sink: OutputSink,
): Promise<SourcePackageResult> {
  const stageDir = await fs.mkdtemp(path.join(os.tmpdir(), 'poui-fontes-'));
  try {
    const files = await collectSourceFiles(workspaceRoot);
    if (!files.includes('package.json')) {
      return { success: false, warnings: [], errorMessage: 'package.json não encontrado entre os fontes.' };
    }
    const nodeVersion = await execAsync('node -v', { timeout: 15000 })
      .then((r) => r.stdout.trim())
      .catch(() => process.version);
    const staged = await stageSources(workspaceRoot, stageDir, projectName, files, nodeVersion);
    sink.appendLine(`Fontes separados: ${staged.fileCount} arquivos (sem node_modules, dist e proxy local)`);

    const resourceDir = path.join(workspaceRoot, 'Resource');
    await fs.mkdir(resourceDir, { recursive: true });
    const zipPath = path.join(resourceDir, sourcesZipName(projectName));
    await fs.rm(zipPath, { force: true });
    if (sevenZipPath) {
      await execAsync(`"${sevenZipPath}" a -tzip "${zipPath}" "${projectName}"`, {
        cwd: stageDir,
        timeout: 120000,
        maxBuffer: 10 * 1024 * 1024,
      });
    } else {
      const ps = `Compress-Archive -Path '${path.join(stageDir, projectName)}' -DestinationPath '${zipPath}' -Force`;
      await execAsync(`powershell -NoProfile -Command "${ps}"`, { timeout: 120000, maxBuffer: 10 * 1024 * 1024 });
    }
    sink.appendLine(`Zip dos fontes: Resource/${sourcesZipName(projectName)}`);
    for (const w of staged.warnings) {
      sink.appendLine(`⚠ ${w}`);
    }
    return { success: true, zipPath, fileCount: staged.fileCount, warnings: staged.warnings };
  } catch (error) {
    const err = error as { stdout?: string; stderr?: string; message: string };
    return { success: false, warnings: [], errorMessage: `${err.stdout ?? ''}${err.stderr ?? ''}`.trim() || err.message };
  } finally {
    await fs.rm(stageDir, { recursive: true, force: true });
  }
}
