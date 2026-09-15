import { existsSync } from 'node:fs';
import { RunVersionCheck, checkEngineAvailable, runVersionCheck } from './cliCheck';
import { findSevenZip } from './packaging';
import { EngineId } from './engineTypes';
import { ENGINE_LABELS } from './configureEngineLogic';

/** Só o motor `claude` tem um link de instalação verificado neste código —
 * `codex`/`gemini` são suporte experimental (ver README) e não têm URL
 * oficial documentada aqui, então não inventamos uma. */
const AI_ENGINE_INSTALL_URLS: Partial<Record<EngineId, string>> = {
  claude: 'https://code.claude.com',
};

export type SemVer = [number, number, number];

export function parseSemver(raw: string): SemVer | undefined {
  const match = /(\d+)\.(\d+)\.(\d+)/.exec(raw);
  if (!match) {
    return undefined;
  }
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

export function isVersionAtLeast(version: SemVer, minimum: SemVer): boolean {
  for (let i = 0; i < 3; i++) {
    if (version[i] !== minimum[i]) {
      return version[i] > minimum[i];
    }
  }
  return true;
}

/** `engines.node` do `package.json` é sempre `">=x.y.z"` — só o número
 * interessa aqui, o operador é implícito (mínimo, sempre). */
export function parseMinNodeVersion(enginesNode: string): SemVer {
  return parseSemver(enginesNode) ?? [18, 19, 0];
}

export interface EnvCheckItem {
  id: 'node' | 'ng' | 'aiEngine' | 'git' | '7zip';
  label: string;
  required: boolean;
  ok: boolean;
  detail?: string;
  /** Comando `npm install -g ...` — baixo risco o bastante pra oferecer um
   * botão que roda direto (mesmo padrão de `karmaSetup.ts`/`playwrightSetup.ts`:
   * só com clique explícito, nunca sozinho). */
  npmInstallCommand?: string;
  /** Instalador de sistema — só dá pra abrir o link de download, nunca rodar
   * sozinho (fora do escopo seguro de auto-instalação). */
  installUrl?: string;
  /** Só presente em `id: 'aiEngine'` — qual motor (`claude`/`codex`/`gemini`)
   * foi checado, pra `environmentCheckPrompt.ts` poder oferecer o botão
   * "Configurar Motor de IA" além do link de instalação. */
  engineId?: EngineId;
}

export interface EnvironmentCheckDeps {
  run: RunVersionCheck;
  findSevenZipPath: () => string | undefined;
}

const defaultDeps: EnvironmentCheckDeps = {
  run: runVersionCheck,
  findSevenZipPath: () => findSevenZip(process.env.PATH ?? '', existsSync),
};

async function checkVersioned(
  id: 'node' | 'ng' | 'git',
  label: string,
  command: string,
  required: boolean,
  run: RunVersionCheck,
  extra: Partial<EnvCheckItem> = {},
): Promise<EnvCheckItem> {
  try {
    const { stdout } = await run(command, ['--version']);
    return { id, label, required, ok: true, detail: stdout.trim() };
  } catch {
    return { id, label, required, ok: false, ...extra };
  }
}

/** Roda todas as checagens de ambiente em paralelo (cada uma é só um
 * `--version` com timeout curto, ver `cliCheck.ts`) — usado tanto no
 * primeiro run da extensão quanto no comando manual `PO-UI: Verificar
 * Ambiente`. Node/Angular CLI são obrigatórios (o Scaffold nem começa sem
 * eles); o motor de IA/Git/7-Zip são opcionais — cada um só é necessário pra
 * um subconjunto de comandos (ver README, seção Requisitos).
 *
 * `aiEngine` checa o motor **configurado** (`poui.aiEngine`, default
 * `claude`) — não fixo em Claude, já que o dev pode ter escolhido
 * `codex`/`gemini` em `PO-UI: Configurar Motor de IA`. */
export async function checkEnvironment(
  minNodeVersion: SemVer,
  aiEngine: EngineId,
  deps: Partial<EnvironmentCheckDeps> = {},
): Promise<EnvCheckItem[]> {
  const d: EnvironmentCheckDeps = { ...defaultDeps, ...deps };

  const [nodeResult, ngResult, aiEngineResult, gitResult] = await Promise.all([
    checkVersioned('node', 'Node.js', 'node', true, d.run, { installUrl: 'https://nodejs.org/' }),
    checkVersioned('ng', 'Angular CLI', 'ng', true, d.run, { npmInstallCommand: 'npm install -g @angular/cli' }),
    checkEngineAvailable(aiEngine, d.run).then(
      (r): EnvCheckItem => ({
        id: 'aiEngine',
        label: `${ENGINE_LABELS[aiEngine]} CLI`,
        required: false,
        ok: r.available,
        detail: r.version,
        installUrl: AI_ENGINE_INSTALL_URLS[aiEngine],
        engineId: aiEngine,
      }),
    ),
    checkVersioned('git', 'Git', 'git', false, d.run, { installUrl: 'https://git-scm.com/' }),
  ]);

  if (nodeResult.ok) {
    const version = parseSemver(nodeResult.detail ?? '');
    if (!version || !isVersionAtLeast(version, minNodeVersion)) {
      nodeResult.ok = false;
      nodeResult.detail = `encontrado ${nodeResult.detail}, mínimo exigido v${minNodeVersion.join('.')}`;
      nodeResult.installUrl = 'https://nodejs.org/';
    }
  }

  const sevenZipPath = d.findSevenZipPath();
  const sevenZipResult: EnvCheckItem = {
    id: '7zip',
    label: '7-Zip',
    required: false,
    ok: Boolean(sevenZipPath),
    detail: sevenZipPath,
    installUrl: 'https://7-zip.org/',
  };

  return [nodeResult, ngResult, aiEngineResult, gitResult, sevenZipResult];
}
