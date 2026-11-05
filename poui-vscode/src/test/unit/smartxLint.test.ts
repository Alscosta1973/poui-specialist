import * as assert from 'node:assert';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { applySmartxFixesToDisk, findProtheusSources, formatSmartxReport, runSmartxLint } from '../../smartxLint';

async function mkTmp(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'poui-smartx-'));
}

// "Descrição" em cp1252: ç = 0xE7, ã = 0xE3 — precisa sobreviver byte a byte ao fix
const CP1252_SRC = Buffer.concat([
  Buffer.from('#include "protheus.ch"\r\n// Descri', 'latin1'),
  Buffer.from([0xe7, 0xe3]),
  Buffer.from('o\r\nUser Function ZA0BRW()\r\n  If hasSmartX()\r\n    setSmartX(1, .T.)\r\n  EndIf\r\n  mBrowse(6, 1, 22, 75, "ZA0")\r\nReturn\r\n', 'latin1'),
]);

describe('findProtheusSources', () => {
  it('finds .prw/.prx/.tlpp (any case) and skips node_modules, .git and dist', async () => {
    const root = await mkTmp();
    await fs.mkdir(path.join(root, 'src', 'cad'), { recursive: true });
    await fs.mkdir(path.join(root, 'node_modules', 'x'), { recursive: true });
    await fs.mkdir(path.join(root, '.git'), { recursive: true });
    await fs.writeFile(path.join(root, 'src', 'cad', 'A.PRW'), '', 'latin1');
    await fs.writeFile(path.join(root, 'src', 'cad', 'b.tlpp'), '', 'latin1');
    await fs.writeFile(path.join(root, 'src', 'c.prx'), '', 'latin1');
    await fs.writeFile(path.join(root, 'src', 'd.ts'), '', 'latin1');
    await fs.writeFile(path.join(root, 'node_modules', 'x', 'e.prw'), '', 'latin1');
    await fs.writeFile(path.join(root, '.git', 'f.tlpp'), '', 'latin1');

    const files = await findProtheusSources(root);

    assert.deepStrictEqual(files, ['src/c.prx', 'src/cad/A.PRW', 'src/cad/b.tlpp']);
  });
});

describe('runSmartxLint / formatSmartxReport', () => {
  it('reports findings per file with the rule id and a total line', async () => {
    const root = await mkTmp();
    await fs.writeFile(path.join(root, 'ZA0BRW.prw'), CP1252_SRC);

    const result = await runSmartxLint(root);
    const report = formatSmartxReport('protheus', result);

    assert.strictEqual(result.files.length, 1);
    assert.deepStrictEqual(result.findings.map((f) => f.id), ['SX06']);
    assert.ok(report.includes('Fontes analisados: 1'));
    assert.ok(report.includes('ZA0BRW.prw:4   [SX06]'));
    assert.ok(report.includes('Total: 0 erro(s), 1 aviso(s), 0 info(s)'));
  });

  it('says so when nothing is found', async () => {
    const root = await mkTmp();
    const report = formatSmartxReport('vazio', await runSmartxLint(root));
    assert.ok(report.includes('Nenhum problema encontrado.'));
  });
});

describe('applySmartxFixesToDisk', () => {
  it('applies SX06 preserving cp1252 bytes and CRLF, and lists what stays manual', async () => {
    const root = await mkTmp();
    const file = path.join(root, 'ZA0BRW.prw');
    await fs.writeFile(file, CP1252_SRC);
    const sx05 = 'User Function Y()\n  oB:setSmartX(1)\nReturn\n';
    await fs.writeFile(path.join(root, 'y.prw'), '#include "fwmbrowse.ch"\n' + sx05, 'latin1');

    const outcome = await applySmartxFixesToDisk(root, await runSmartxLint(root));

    const after = await fs.readFile(file);
    assert.ok(after.includes(Buffer.from([0xe7, 0xe3])), 'acentos cp1252 preservados');
    assert.ok(after.toString('latin1').startsWith('#include "protheus.ch"\r\n#include "fwmbrowse.ch"\r\n'));
    assert.deepStrictEqual(outcome.fixedSummaryLines, ['✓ ZA0BRW.prw — [SX06] corrigido']);
    assert.strictEqual(outcome.manualReviewLines.length, 1);
    assert.ok(outcome.manualReviewLines[0].includes('y.prw:3 [SX05]'));
    assert.deepStrictEqual((await runSmartxLint(root)).findings.map((f) => f.id), ['SX05']);
  });
});
