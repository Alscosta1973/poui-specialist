import * as assert from 'node:assert';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  evaluateComponentQuality,
  auditRoutesLazyLoading,
  formatQualityReport,
  findGeneratedComponents,
  runQualityAudit,
} from '../../quality';

const MARKER = '@generated  poui-specialist';

const FULLY_COMPLIANT = `
// ${MARKER}
@Component({ changeDetection: ChangeDetectionStrategy.OnPush })
export class XComponent {
  load(): void {
    this.service.list().pipe(finalize(() => {}), takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {},
      error: () => { this.notification.error('x'); },
    });
  }
}
`;

const CRITICAL = `
// ${MARKER}
export class XComponent {}
`;

const NEEDS_ATTENTION = `
// ${MARKER}
@Component({ changeDetection: ChangeDetectionStrategy.OnPush })
export class XComponent {
  load(): void {
    this.service.list().subscribe(() => {});
  }
}
`;

describe('evaluateComponentQuality', () => {
  it('classifies a fully compliant component as aprovado, 4/4 criteria', () => {
    const result = evaluateComponentQuality('src/app/x/x.component.ts', FULLY_COMPLIANT);
    assert.strictEqual(result.classification, 'aprovado');
    assert.ok(result.criteria.every((c) => c.passed));
  });

  it('classifies a component missing OnPush as critico regardless of the other criteria', () => {
    const result = evaluateComponentQuality('src/app/x/x.component.ts', CRITICAL);
    assert.strictEqual(result.classification, 'critico');
    assert.strictEqual(result.criteria.find((c) => c.key === 'onpush')!.passed, false);
  });

  it('classifies a component with OnPush but missing other criteria as atencao', () => {
    const result = evaluateComponentQuality('src/app/x/x.component.ts', NEEDS_ATTENTION);
    assert.strictEqual(result.classification, 'atencao');
    assert.strictEqual(result.criteria.find((c) => c.key === 'onpush')!.passed, true);
    assert.strictEqual(result.criteria.find((c) => c.key === 'loading')!.passed, false);
  });
});

describe('auditRoutesLazyLoading', () => {
  it('flags loadComponent as lazy and component as not lazy', () => {
    const routes = `
export const routes: Routes = [
  { path: 'financeiro', loadComponent: () => import('./financeiro/financeiro-list.component').then(m => m.FinanceiroListComponent) },
  { path: 'compras', component: ComprasListComponent },
];
`;
    const audits = auditRoutesLazyLoading(routes);
    assert.strictEqual(audits.length, 2);
    assert.deepStrictEqual(
      audits.map((a) => [a.routePath, a.lazy]),
      [
        ['financeiro', true],
        ['compras', false],
      ],
    );
  });

  it('returns an empty list for an empty routes file', () => {
    assert.deepStrictEqual(auditRoutesLazyLoading(''), []);
  });
});

describe('formatQualityReport', () => {
  it('groups components by classification and includes the routes section', () => {
    const results = [
      evaluateComponentQuality('src/app/ok/ok.component.ts', FULLY_COMPLIANT),
      evaluateComponentQuality('src/app/bad/bad.component.ts', CRITICAL),
    ];
    const routes = auditRoutesLazyLoading(`{ path: 'x', loadComponent: () => {} }`);
    const report = formatQualityReport(results, routes);

    assert.ok(report.includes('Aprovados (1)'));
    assert.ok(report.includes('Críticos (1)'));
    assert.ok(report.includes('src/app/ok/ok.component.ts'));
    assert.ok(report.includes('src/app/bad/bad.component.ts'));
    assert.ok(report.includes('Rotas auditadas'));
    assert.ok(report.includes('loadComponent'));
  });

  it('omits the routes section when there are no routes', () => {
    const results = [evaluateComponentQuality('src/app/ok/ok.component.ts', FULLY_COMPLIANT)];
    const report = formatQualityReport(results, []);
    assert.ok(!report.includes('Rotas auditadas'));
  });
});

describe('findGeneratedComponents', () => {
  it('only finds .component.ts files carrying the exact @generated marker', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'poui-quality-'));
    const appDir = path.join(root, 'src', 'app');
    await fs.mkdir(appDir, { recursive: true });
    await fs.writeFile(path.join(appDir, 'generated.component.ts'), FULLY_COMPLIANT, 'utf8');
    await fs.writeFile(path.join(appDir, 'legacy.component.ts'), '// no marker here\nexport class LegacyComponent {}', 'utf8');
    await fs.writeFile(path.join(appDir, 'generated.component.spec.ts'), `// ${MARKER}`, 'utf8');

    const found = await findGeneratedComponents(root);

    assert.strictEqual(found.length, 1);
    assert.ok(found[0].endsWith('generated.component.ts'));
  });
});

describe('runQualityAudit', () => {
  it('audits every generated component and the routes file together', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'poui-quality-'));
    const appDir = path.join(root, 'src', 'app');
    await fs.mkdir(appDir, { recursive: true });
    await fs.writeFile(path.join(appDir, 'x.component.ts'), CRITICAL, 'utf8');
    await fs.writeFile(
      path.join(appDir, 'app.routes.ts'),
      `export const routes = [{ path: 'x', component: XComponent }];`,
      'utf8',
    );

    const { results, routes } = await runQualityAudit(root);

    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].classification, 'critico');
    assert.strictEqual(routes.length, 1);
    assert.strictEqual(routes[0].lazy, false);
  });

  it('returns an empty routes list when app.routes.ts does not exist', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'poui-quality-'));
    await fs.mkdir(path.join(root, 'src', 'app'), { recursive: true });

    const { routes } = await runQualityAudit(root);
    assert.deepStrictEqual(routes, []);
  });
});
