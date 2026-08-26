import * as assert from 'node:assert';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { findMockInterceptors } from '../../connectDiagnostics';

describe('findMockInterceptors', () => {
  it('finds an HttpInterceptorFn that mocks requests for the given component', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'poui-connect-diag-'));
    const dir = path.join(root, 'src', 'app', 'core', 'interceptors');
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(
      path.join(dir, 'mock-titulos.interceptor.ts'),
      `import { HttpInterceptorFn } from '@angular/common/http';\nimport { of } from 'rxjs';\n\nexport const mockTitulosInterceptor: HttpInterceptorFn = (req, next) => {\n  if (req.url.includes('titulos')) {\n    return of({ ok: true } as any);\n  }\n  return next(req);\n};\n`,
      'utf8',
    );

    const found = await findMockInterceptors(root, 'titulos');

    assert.strictEqual(found.length, 1);
    assert.ok(found[0].endsWith('mock-titulos.interceptor.ts'));
  });

  it('ignores interceptors that do not reference this component', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'poui-connect-diag-'));
    const dir = path.join(root, 'src', 'app', 'core', 'interceptors');
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(
      path.join(dir, 'mock-outro.interceptor.ts'),
      `import { HttpInterceptorFn } from '@angular/common/http';\nexport const mockOutroInterceptor: HttpInterceptorFn = (req, next) => {\n  if (req.url.includes('outro-recurso')) { return next(req); }\n  return next(req);\n};\n`,
      'utf8',
    );

    const found = await findMockInterceptors(root, 'titulos');

    assert.deepStrictEqual(found, []);
  });

  it('ignores .ts files that are not interceptors even if they mention the component name', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'poui-connect-diag-'));
    const dir = path.join(root, 'src', 'app', 'financeiro', 'titulos-list');
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(
      path.join(dir, 'titulos-list.component.ts'),
      `export class TitulosListComponent {}\n`,
      'utf8',
    );

    const found = await findMockInterceptors(root, 'titulos');

    assert.deepStrictEqual(found, []);
  });

  it('returns an empty array when src/app does not exist', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'poui-connect-diag-'));
    const found = await findMockInterceptors(root, 'titulos');
    assert.deepStrictEqual(found, []);
  });
});
