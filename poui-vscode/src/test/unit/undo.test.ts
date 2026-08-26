import * as assert from 'node:assert';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { findGeneratedGroups, removeRouteBlock } from '../../undo';

const MARKER = '@generated  poui-specialist';

describe('findGeneratedGroups', () => {
  it('groups generated files by their containing directory', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'poui-undo-'));
    const dirA = path.join(root, 'src', 'app', 'financeiro', 'pedidos-list');
    const dirB = path.join(root, 'src', 'app', 'compras', 'pedido-compra');
    await fs.mkdir(dirA, { recursive: true });
    await fs.mkdir(dirB, { recursive: true });
    await fs.writeFile(path.join(dirA, 'pedidos-list.component.ts'), `/** ${MARKER} */\nexport class X {}`, 'utf8');
    await fs.writeFile(path.join(dirA, 'pedidos-list.component.html'), `<!-- ${MARKER} -->`, 'utf8');
    await fs.writeFile(path.join(dirB, 'pedido-compra.component.ts'), `/** ${MARKER} */\nexport class Y {}`, 'utf8');

    const groups = await findGeneratedGroups(root);

    assert.strictEqual(groups.length, 2);
    const a = groups.find((g) => g.dir === dirA)!;
    assert.strictEqual(a.files.length, 2);
    const b = groups.find((g) => g.dir === dirB)!;
    assert.strictEqual(b.files.length, 1);
  });

  it('only includes files carrying the exact marker — ignores unrelated files in the same directory', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'poui-undo-'));
    const dir = path.join(root, 'src', 'app', 'shared', 'legado');
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, 'legado.component.ts'), `/** ${MARKER} */\nexport class Z {}`, 'utf8');
    await fs.writeFile(path.join(dir, 'legado.component.spec.ts'), '// hand-written test, no marker', 'utf8');

    const groups = await findGeneratedGroups(root);

    assert.strictEqual(groups.length, 1);
    assert.strictEqual(groups[0].files.length, 1);
    assert.ok(groups[0].files[0].endsWith('legado.component.ts'));
  });

  it('returns an empty array when there is nothing generated', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'poui-undo-'));
    await fs.mkdir(path.join(root, 'src', 'app'), { recursive: true });

    const groups = await findGeneratedGroups(root);

    assert.deepStrictEqual(groups, []);
  });
});

describe('removeRouteBlock', () => {
  it('removes the route object matching the given path, including its trailing comma', () => {
    const routes = [
      'export const routes: Routes = [',
      "  { path: '', redirectTo: 'inicio', pathMatch: 'full' },",
      '  {',
      "    path: 'financeiro/pedidos-list',",
      '    loadComponent: () =>',
      "      import('./financeiro/pedidos-list/pedidos-list.component')",
      '        .then(m => m.PedidosListComponent),',
      '  },',
      "  { path: '**', redirectTo: 'inicio' },",
      '];',
    ].join('\n');

    const result = removeRouteBlock(routes, 'financeiro/pedidos-list');

    assert.strictEqual(result.removed, true);
    assert.ok(!result.content.includes('pedidos-list'));
    assert.ok(result.content.includes("path: ''"));
    assert.ok(result.content.includes("path: '**'"));
  });

  it('reports removed: false and leaves the content untouched when the route is not found', () => {
    const routes = "export const routes: Routes = [{ path: 'x', component: X }];";

    const result = removeRouteBlock(routes, 'nao/existe');

    assert.strictEqual(result.removed, false);
    assert.strictEqual(result.content, routes);
  });
});
