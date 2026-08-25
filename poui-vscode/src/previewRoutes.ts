import * as path from 'node:path';

export interface RouteRegistration {
  routeSegment: string;
  importPath: string;
  componentClass: string;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function routeExists(routesContent: string, routeSegment: string): boolean {
  const re = new RegExp(`path\\s*:\\s*['"]${escapeRegExp(routeSegment)}['"]`);
  return re.test(routesContent);
}

/** Acha o índice do `{` que abre a rota `**` (catch-all), se existir. Ela
 * precisa continuar sendo a última entrada do array — se ficar antes de
 * outra rota, intercepta qualquer navegação pra rota que viria depois dela.
 * Busca o `{` mais próximo antes do `path: '**'` — assume que não há outro
 * `{` entre o fechamento da rota anterior e a abertura desta (verdadeiro pra
 * qualquer formatação onde cada rota é seu próprio object literal). */
function findWildcardRouteStart(content: string): number | null {
  const match = /path\s*:\s*['"]\*\*['"]/.exec(content);
  if (!match) {
    return null;
  }
  for (let i = match.index; i >= 0; i--) {
    if (content[i] === '{') {
      return i;
    }
  }
  return null;
}

/** Recua `index` até o início da linha que o contém — evita que o recuo
 * original da linha alvo seja "roubado" pelo texto inserido antes dela. */
function lineStart(content: string, index: number): number {
  const newlineBefore = content.lastIndexOf('\n', index - 1);
  return newlineBefore === -1 ? 0 : newlineBefore + 1;
}

/** Insere a rota lazy-loaded logo antes da rota `**` (catch-all), se
 * existir, ou antes do `];` final do array quando não houver — mesmo ponto
 * de inserção do `poui-preview` original nesse segundo caso. Não mexe em
 * nada além disso: nenhuma outra rota é reordenada ou reformatada. */
export function insertRoute(routesContent: string, registration: RouteRegistration): string {
  if (routeExists(routesContent, registration.routeSegment)) {
    return routesContent;
  }

  const entry = [
    '  {',
    `    path: '${registration.routeSegment}',`,
    '    loadComponent: () =>',
    `      import('${registration.importPath}')`,
    `        .then(m => m.${registration.componentClass}),`,
    '  },',
  ].join('\n');

  let content = routesContent;
  const wildcardBraceIndex = findWildcardRouteStart(content);
  let insertAt: number;
  if (wildcardBraceIndex !== null) {
    insertAt = lineStart(content, wildcardBraceIndex);
  } else {
    const lastArrayCloseIndex = content.lastIndexOf('];');
    if (lastArrayCloseIndex === -1) {
      throw new Error('Não foi possível localizar o array de rotas (`];`) em app.routes.ts.');
    }
    insertAt = lineStart(content, lastArrayCloseIndex);
  }

  // O item existente imediatamente anterior ao ponto de inserção pode não
  // ter vírgula final (estilo comum, ex: Prettier sem trailingComma) — sem
  // ela, colar o novo objeto logo depois gera dois object literals
  // adjacentes, sintaxe inválida (achado testando de verdade contra um
  // app.routes.ts real). Adiciona a vírgula só quando necessário.
  let i = insertAt - 1;
  while (i >= 0 && /\s/.test(content[i])) {
    i--;
  }
  if (i >= 0 && content[i] !== ',' && content[i] !== '[') {
    content = `${content.slice(0, i + 1)},${content.slice(i + 1)}`;
    insertAt += 1;
  }

  return `${content.slice(0, insertAt)}${entry}\n${content.slice(insertAt)}`;
}

/** Deriva a rota a partir do caminho do componente sob `src/app` — a pasta
 * que contém o `.component.ts` vira `routeSegment` (ex:
 * `financeiro/titulos-list`), igual à convenção que os geradores já usam. */
export function deriveRouteRegistration(
  workspaceRoot: string,
  componentFilePath: string,
  tsContent: string,
): RouteRegistration {
  const srcAppDir = path.join(workspaceRoot, 'src', 'app');
  const relativeToSrcApp = path.relative(srcAppDir, componentFilePath).split(path.sep).join('/');
  const routeSegment = path.posix.dirname(relativeToSrcApp);
  const baseName = path.posix.basename(relativeToSrcApp).replace(/\.ts$/, '');
  const importPath = `./${routeSegment}/${baseName}`;

  const classMatch = /export class (\w+)/.exec(tsContent);
  if (!classMatch) {
    throw new Error('Não foi possível encontrar uma classe exportada no componente selecionado.');
  }

  return { routeSegment, importPath, componentClass: classMatch[1] };
}
