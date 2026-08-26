import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { findFiles } from './fsWalk';

/** Marca dois espaços exatos, igual ao plugin original — não normalizar. */
const GENERATED_MARKER = '@generated  poui-specialist';

export interface GeneratedGroup {
  /** Caminho absoluto do diretório — cada diretório é uma geração. */
  dir: string;
  /** Caminhos absolutos de todo arquivo em `dir` que carrega o marcador. */
  files: string[];
}

/** Varre `<rootDir>/src/app` procurando qualquer arquivo com o marcador
 * `@generated  poui-specialist` e agrupa por diretório — cada diretório vira
 * um "grupo" que o `poui.undo` pode remover de uma vez. Arquivos sem o
 * marcador no mesmo diretório (specs escritos à mão, etc.) são ignorados. */
export async function findGeneratedGroups(rootDir: string): Promise<GeneratedGroup[]> {
  const appDir = path.join(rootDir, 'src', 'app');
  const allFiles = await findFiles(appDir, () => true).catch(() => [] as string[]);

  const byDir = new Map<string, string[]>();
  for (const filePath of allFiles) {
    const content = await fs.readFile(filePath, 'utf8').catch(() => '');
    if (!content.includes(GENERATED_MARKER)) {
      continue;
    }
    const dir = path.dirname(filePath);
    const existing = byDir.get(dir) ?? [];
    existing.push(filePath);
    byDir.set(dir, existing);
  }

  return [...byDir.entries()]
    .map(([dir, files]) => ({ dir, files: files.sort() }))
    .sort((a, b) => a.dir.localeCompare(b.dir));
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function lineStart(content: string, index: number): number {
  const newlineBefore = content.lastIndexOf('\n', index - 1);
  return newlineBefore === -1 ? 0 : newlineBefore + 1;
}

export interface RemoveRouteResult {
  content: string;
  removed: boolean;
}

/** Remove o bloco de rota (object literal completo, incluindo vírgula final e
 * a linha em que começa) cujo `path` seja exatamente `routePath`. Se não
 * encontrar, devolve o conteúdo original com `removed: false` — quem chama
 * decide se isso é um erro ou só um aviso ("rota já removida manualmente"). */
export function removeRouteBlock(routesContent: string, routePath: string): RemoveRouteResult {
  const pathRe = new RegExp(`path\\s*:\\s*['"]${escapeRegExp(routePath)}['"]`);
  const pathMatch = pathRe.exec(routesContent);
  if (!pathMatch) {
    return { content: routesContent, removed: false };
  }

  let braceStart = -1;
  for (let i = pathMatch.index; i >= 0; i--) {
    if (routesContent[i] === '{') {
      braceStart = i;
      break;
    }
  }
  if (braceStart === -1) {
    return { content: routesContent, removed: false };
  }

  let depth = 0;
  let braceEnd = -1;
  for (let i = braceStart; i < routesContent.length; i++) {
    if (routesContent[i] === '{') {
      depth++;
    } else if (routesContent[i] === '}') {
      depth--;
      if (depth === 0) {
        braceEnd = i;
        break;
      }
    }
  }
  if (braceEnd === -1) {
    return { content: routesContent, removed: false };
  }

  const removalStart = lineStart(routesContent, braceStart);
  let removalEnd = braceEnd + 1;
  // engole a vírgula final do item, se existir
  while (removalEnd < routesContent.length && /[ \t]/.test(routesContent[removalEnd])) {
    removalEnd++;
  }
  if (routesContent[removalEnd] === ',') {
    removalEnd++;
  }
  // engole até (e incluindo) o fim da linha, pra não deixar linha em branco
  const newlineAfter = routesContent.indexOf('\n', removalEnd);
  removalEnd = newlineAfter === -1 ? routesContent.length : newlineAfter + 1;

  const content = routesContent.slice(0, removalStart) + routesContent.slice(removalEnd);
  return { content, removed: true };
}
