import * as assert from 'node:assert';
import { routeExists, insertRoute, deriveRouteRegistration } from '../../previewRoutes';

const BASE_ROUTES = `import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'financeiro', pathMatch: 'full' },
];
`;

describe('routeExists', () => {
  it('returns true when a route with that path already exists', () => {
    const routes = `export const routes = [\n  { path: 'financeiro/titulos-list', component: X },\n];`;
    assert.strictEqual(routeExists(routes, 'financeiro/titulos-list'), true);
  });

  it('returns false when there is no matching route', () => {
    assert.strictEqual(routeExists(BASE_ROUTES, 'financeiro/titulos-list'), false);
  });
});

describe('insertRoute', () => {
  it('inserts a lazy-loaded route entry before the final ]; when missing', () => {
    const updated = insertRoute(BASE_ROUTES, {
      routeSegment: 'financeiro/titulos-list',
      importPath: './financeiro/titulos-list/titulos-list.component',
      componentClass: 'TitulosListComponent',
    });

    assert.ok(updated.includes(`path: 'financeiro/titulos-list'`));
    assert.ok(updated.includes(`import('./financeiro/titulos-list/titulos-list.component')`));
    assert.ok(updated.includes('.then(m => m.TitulosListComponent)'));
    assert.strictEqual(routeExists(updated, 'financeiro/titulos-list'), true);
    // Existing route must be preserved.
    assert.ok(updated.includes(`path: ''`));
  });

  it('is a no-op when the route already exists', () => {
    const withRoute = insertRoute(BASE_ROUTES, {
      routeSegment: 'financeiro/titulos-list',
      importPath: './financeiro/titulos-list/titulos-list.component',
      componentClass: 'TitulosListComponent',
    });
    const again = insertRoute(withRoute, {
      routeSegment: 'financeiro/titulos-list',
      importPath: './financeiro/titulos-list/titulos-list.component',
      componentClass: 'TitulosListComponent',
    });
    assert.strictEqual(again, withRoute);
  });

  it('throws a clear error when the file has no routes array to insert into', () => {
    assert.throws(() =>
      insertRoute('export const routes = something();', {
        routeSegment: 'x/y',
        importPath: './x/y/y.component',
        componentClass: 'YComponent',
      }),
    );
  });
});

describe('deriveRouteRegistration', () => {
  it('derives routeSegment/importPath/componentClass from a component file under src/app', () => {
    const ts = `import { Component } from '@angular/core';\n\n@Component({})\nexport class TitulosListComponent {}\n`;
    const reg = deriveRouteRegistration(
      '/workspace',
      '/workspace/src/app/financeiro/titulos-list/titulos-list.component.ts',
      ts,
    );

    assert.strictEqual(reg.routeSegment, 'financeiro/titulos-list');
    assert.strictEqual(reg.importPath, './financeiro/titulos-list/titulos-list.component');
    assert.strictEqual(reg.componentClass, 'TitulosListComponent');
  });

  it('throws when the file has no exported class', () => {
    assert.throws(() =>
      deriveRouteRegistration('/workspace', '/workspace/src/app/x/x.component.ts', '// nothing here'),
    );
  });
});
