import * as assert from 'node:assert';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { isPlaywrightConfigured } from '../../playwrightCheck';

describe('isPlaywrightConfigured', () => {
  it('returns true when playwright.config.ts exists at the workspace root', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'poui-pw-check-'));
    await fs.writeFile(path.join(root, 'playwright.config.ts'), '// config', 'utf8');
    assert.strictEqual(await isPlaywrightConfigured(root), true);
  });

  it('returns true when playwright.config.js exists at the workspace root', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'poui-pw-check-'));
    await fs.writeFile(path.join(root, 'playwright.config.js'), '// config', 'utf8');
    assert.strictEqual(await isPlaywrightConfigured(root), true);
  });

  it('returns false when no playwright config exists (real-world modulo-compras gap)', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'poui-pw-check-missing-'));
    assert.strictEqual(await isPlaywrightConfigured(root), false);
  });
});
