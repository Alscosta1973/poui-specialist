import * as assert from 'node:assert';
import { checkEnvironment, isVersionAtLeast, parseMinNodeVersion, parseSemver } from '../../environmentCheck';

describe('parseSemver', () => {
  it('extracts major.minor.patch from a "vX.Y.Z" style string', () => {
    assert.deepStrictEqual(parseSemver('v20.11.0\n'), [20, 11, 0]);
  });

  it('extracts the version even embedded in a longer string', () => {
    assert.deepStrictEqual(parseSemver('git version 2.44.0.windows.1'), [2, 44, 0]);
  });

  it('returns undefined when there is no version-shaped substring', () => {
    assert.strictEqual(parseSemver('command not found'), undefined);
  });
});

describe('isVersionAtLeast', () => {
  it('true when equal', () => {
    assert.strictEqual(isVersionAtLeast([18, 19, 0], [18, 19, 0]), true);
  });
  it('true when strictly greater on the first differing component', () => {
    assert.strictEqual(isVersionAtLeast([20, 0, 0], [18, 19, 0]), true);
    assert.strictEqual(isVersionAtLeast([18, 20, 0], [18, 19, 0]), true);
    assert.strictEqual(isVersionAtLeast([18, 19, 5], [18, 19, 0]), true);
  });
  it('false when strictly lower on the first differing component', () => {
    assert.strictEqual(isVersionAtLeast([16, 20, 0], [18, 19, 0]), false);
    assert.strictEqual(isVersionAtLeast([18, 18, 9], [18, 19, 0]), false);
  });
});

describe('parseMinNodeVersion', () => {
  it('parses the ">=x.y.z" format used in package.json engines.node', () => {
    assert.deepStrictEqual(parseMinNodeVersion('>=18.19.0'), [18, 19, 0]);
  });
  it('falls back to 18.19.0 when the string is unparseable', () => {
    assert.deepStrictEqual(parseMinNodeVersion('whatever'), [18, 19, 0]);
  });
});

describe('checkEnvironment', () => {
  const MIN_NODE: [number, number, number] = [18, 19, 0];

  function fakeRun(available: Set<string>, versions: Record<string, string> = {}) {
    return async (command: string, _args: string[]): Promise<{ stdout: string }> => {
      if (!available.has(command)) {
        throw new Error(`${command}: command not found`);
      }
      return { stdout: versions[command] ?? 'v99.0.0' };
    };
  }

  it('marks everything ok when all binaries are found and Node meets the minimum', async () => {
    const run = fakeRun(new Set(['node', 'ng', 'claude', 'git']), { node: 'v20.11.0' });
    const items = await checkEnvironment(MIN_NODE, { run, findSevenZipPath: () => 'C:\\Program Files\\7-Zip\\7z.exe' });
    assert.ok(items.every((i) => i.ok), JSON.stringify(items));
  });

  it('flags Node as not ok when the installed version is below the minimum, even though the binary exists', async () => {
    const run = fakeRun(new Set(['node', 'ng', 'claude', 'git']), { node: 'v16.20.0' });
    const items = await checkEnvironment(MIN_NODE, { run, findSevenZipPath: () => undefined });
    const node = items.find((i) => i.id === 'node')!;
    assert.strictEqual(node.ok, false);
    assert.strictEqual(node.required, true);
    assert.match(node.detail ?? '', /mínimo exigido v18\.19\.0/);
  });

  it('flags a missing Angular CLI as required and not ok, with an npm install fix available', async () => {
    const run = fakeRun(new Set(['node', 'claude', 'git']), { node: 'v20.11.0' });
    const items = await checkEnvironment(MIN_NODE, { run, findSevenZipPath: () => undefined });
    const ng = items.find((i) => i.id === 'ng')!;
    assert.strictEqual(ng.ok, false);
    assert.strictEqual(ng.required, true);
    assert.strictEqual(ng.npmInstallCommand, 'npm install -g @angular/cli');
  });

  it('flags missing Claude CLI, Git and 7-Zip as optional (not required)', async () => {
    const run = fakeRun(new Set(['node', 'ng']), { node: 'v20.11.0' });
    const items = await checkEnvironment(MIN_NODE, { run, findSevenZipPath: () => undefined });
    for (const id of ['claude', 'git', '7zip'] as const) {
      const item = items.find((i) => i.id === id)!;
      assert.strictEqual(item.ok, false, `expected ${id} to be flagged not-ok`);
      assert.strictEqual(item.required, false, `expected ${id} to be optional`);
      assert.ok(item.installUrl, `expected ${id} to carry an installUrl`);
    }
  });

  it('reports the exact 5 items every time, in a stable set of ids', async () => {
    const run = fakeRun(new Set());
    const items = await checkEnvironment(MIN_NODE, { run, findSevenZipPath: () => undefined });
    assert.deepStrictEqual(
      items.map((i) => i.id).sort(),
      ['7zip', 'claude', 'git', 'ng', 'node'].sort(),
    );
  });
});
