import * as assert from 'node:assert';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { isAngularWorkspace } from '../../angularWorkspaceCheck';

describe('isAngularWorkspace', () => {
  it('returns true when angular.json exists at the workspace root', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'poui-angular-check-'));
    await fs.writeFile(path.join(root, 'angular.json'), '{}', 'utf8');
    assert.strictEqual(await isAngularWorkspace(root), true);
  });

  it('returns false when the folder has no angular.json (e.g. a monorepo root that only contains the real project as a subfolder)', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'poui-angular-check-'));
    assert.strictEqual(await isAngularWorkspace(root), false);
  });

  it('returns false when the workspace path does not exist at all', async () => {
    const missing = path.join(os.tmpdir(), 'poui-angular-check-does-not-exist-xyz');
    assert.strictEqual(await isAngularWorkspace(missing), false);
  });
});
