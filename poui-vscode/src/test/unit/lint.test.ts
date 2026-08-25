import * as assert from 'node:assert';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { findComponentPairs, runLint, formatLintReport, applyLintFixesToDisk } from '../../lint';

async function mkTmpProject(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'poui-lint-'));
}

const DIRTY_TS = `@Component({\n  selector: 'app-x',\n})\nexport class XComponent {\n  @Input() value!: string;\n}\n`;
const DIRTY_HTML = `<po-table p-selected-rows="rows" p-max-length="10"></po-table>\n<div *ngIf="cond">x</div>`;

describe('findComponentPairs', () => {
  it('finds .component.ts files under a directory, pairing them with sibling .html when present', async () => {
    const root = await mkTmpProject();
    const compDir = path.join(root, 'src', 'app', 'financeiro', 'titulos-list');
    await fs.mkdir(compDir, { recursive: true });
    await fs.writeFile(path.join(compDir, 'titulos-list.component.ts'), DIRTY_TS, 'utf8');
    await fs.writeFile(path.join(compDir, 'titulos-list.component.html'), DIRTY_HTML, 'utf8');
    // Non-component files must be ignored.
    await fs.writeFile(path.join(compDir, 'titulos-list.component.spec.ts'), '// spec', 'utf8');
    await fs.writeFile(path.join(compDir, 'titulos.service.ts'), '// service', 'utf8');

    const pairs = await findComponentPairs(root);

    assert.strictEqual(pairs.length, 1);
    assert.ok(pairs[0].tsPath.endsWith('titulos-list.component.ts'));
    assert.ok(pairs[0].htmlPath?.endsWith('titulos-list.component.html'));
  });

  it('leaves htmlPath undefined for components with an inline template', async () => {
    const root = await mkTmpProject();
    const compDir = path.join(root, 'src', 'app', 'inline');
    await fs.mkdir(compDir, { recursive: true });
    await fs.writeFile(path.join(compDir, 'inline.component.ts'), DIRTY_TS, 'utf8');

    const pairs = await findComponentPairs(root);

    assert.strictEqual(pairs.length, 1);
    assert.strictEqual(pairs[0].htmlPath, undefined);
  });

  it('returns an empty list when no component files exist', async () => {
    const root = await mkTmpProject();
    await fs.mkdir(path.join(root, 'src', 'app'), { recursive: true });
    const pairs = await findComponentPairs(root);
    assert.deepStrictEqual(pairs, []);
  });
});

describe('runLint', () => {
  it('collects findings across every discovered component pair', async () => {
    const root = await mkTmpProject();
    const compDir = path.join(root, 'src', 'app', 'financeiro', 'titulos-list');
    await fs.mkdir(compDir, { recursive: true });
    await fs.writeFile(path.join(compDir, 'titulos-list.component.ts'), DIRTY_TS, 'utf8');
    await fs.writeFile(path.join(compDir, 'titulos-list.component.html'), DIRTY_HTML, 'utf8');

    const result = await runLint(root);

    assert.strictEqual(result.pairs.length, 1);
    const ids = result.findings.map((f) => f.id);
    assert.ok(ids.includes('L01'));
    assert.ok(ids.includes('L04'));
    assert.ok(ids.includes('H01'));
    assert.ok(ids.includes('H04'));
    assert.ok(ids.includes('H06'));
  });
});

describe('formatLintReport', () => {
  it('groups findings by severity and reports a clean total when there are none', () => {
    const report = formatLintReport('src/app/financeiro', { pairs: [{ tsPath: 'a.ts' }], findings: [] });
    assert.ok(report.includes('Nenhum problema encontrado'));
  });

  it('lists ERROR/WARNING/INFO findings in separate sections with counts', () => {
    const result = {
      pairs: [{ tsPath: 'a.component.ts', htmlPath: 'a.component.html' }],
      findings: [
        { id: 'L01', severity: 'ERROR' as const, file: 'a.component.ts', line: 3, message: 'OnPush ausente', fixable: true },
        { id: 'H01', severity: 'INFO' as const, file: 'a.component.html', line: 5, message: '*ngIf em vez de @if', fixable: false },
      ],
    };
    const report = formatLintReport('src/app', result);
    assert.ok(report.includes('ERRORS (1)'));
    assert.ok(report.includes('INFO (1)'));
    assert.ok(report.includes('a.component.ts:3'));
    assert.ok(report.includes('[L01]'));
    assert.ok(report.includes('Total: 1 erro'));
  });
});

describe('applyLintFixesToDisk', () => {
  it('writes the fixed files back and reports what was fixed vs left for manual review', async () => {
    const root = await mkTmpProject();
    const compDir = path.join(root, 'src', 'app', 'x');
    await fs.mkdir(compDir, { recursive: true });
    await fs.writeFile(path.join(compDir, 'x.component.ts'), DIRTY_TS, 'utf8');
    await fs.writeFile(path.join(compDir, 'x.component.html'), DIRTY_HTML, 'utf8');

    const result = await runLint(root);
    const outcome = await applyLintFixesToDisk(root, result);

    assert.ok(outcome.fixedSummaryLines.some((l) => l.includes('L01')));
    assert.ok(outcome.manualReviewLines.some((l) => l.includes('L04')));

    const updatedHtml = await fs.readFile(path.join(compDir, 'x.component.html'), 'utf8');
    assert.ok(!updatedHtml.includes('p-selected-rows'));
    assert.ok(updatedHtml.includes('p-maxlength'));

    const updatedTs = await fs.readFile(path.join(compDir, 'x.component.ts'), 'utf8');
    assert.ok(updatedTs.includes('ChangeDetectionStrategy.OnPush'));
  });
});
