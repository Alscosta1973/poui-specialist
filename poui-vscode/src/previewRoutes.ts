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

/** Insere a rota lazy-loaded antes do `];` final do array — mesmo ponto de
 * inserção do `poui-preview` original. Não mexe em nada além disso: nenhuma
 * outra rota é reordenada ou reformatada. */
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

  const lastArrayCloseIndex = routesContent.lastIndexOf('];');
  if (lastArrayCloseIndex === -1) {
    throw new Error('Não foi possível localizar o array de rotas (`];`) em app.routes.ts.');
  }

  return `${routesContent.slice(0, lastArrayCloseIndex)}${entry}\n${routesContent.slice(lastArrayCloseIndex)}`;
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
