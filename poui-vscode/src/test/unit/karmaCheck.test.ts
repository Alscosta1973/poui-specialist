import * as assert from 'node:assert';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { isKarmaConfigured } from '../../karmaCheck';

async function mkWorkspace(angularJson: unknown): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'poui-karma-check-'));
  await fs.writeFile(path.join(root, 'angular.json'), JSON.stringify(angularJson), 'utf8');
  return root;
}

describe('isKarmaConfigured', () => {
  it('returns true when a project has a "test" architect target using a karma builder', async () => {
    const root = await mkWorkspace({
      projects: {
        app: { architect: { test: { builder: '@angular/build:karma', options: {} } } },
      },
    });
    assert.strictEqual(await isKarmaConfigured(root), true);
  });

  it('also recognizes the legacy @angular-devkit/build-angular:karma builder', async () => {
    const root = await mkWorkspace({
      projects: {
        app: { architect: { test: { builder: '@angular-devkit/build-angular:karma', options: {} } } },
      },
    });
    assert.strictEqual(await isKarmaConfigured(root), true);
  });

  it('returns false when there is no "test" target at all (real-world modulo-compras gap)', async () => {
    const root = await mkWorkspace({
      projects: {
        app: { architect: { build: { builder: '@angular/build:application' } } },
      },
    });
    assert.strictEqual(await isKarmaConfigured(root), false);
  });

  it('returns false when the "test" target exists but uses a non-karma builder (e.g. vitest/unit-test)', async () => {
    const root = await mkWorkspace({
      projects: {
        app: { architect: { test: { builder: '@angular/build:unit-test', options: {} } } },
      },
    });
    assert.strictEqual(await isKarmaConfigured(root), false);
  });

  it('returns false when angular.json does not exist', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'poui-karma-check-missing-'));
    assert.strictEqual(await isKarmaConfigured(root), false);
  });

  it('returns true if any project (not just the first) has karma configured', async () => {
    const root = await mkWorkspace({
      projects: {
        lib: { architect: { build: { builder: '@angular/build:ng-packagr' } } },
        app: { architect: { test: { builder: '@angular/build:karma', options: {} } } },
      },
    });
    assert.strictEqual(await isKarmaConfigured(root), true);
  });
});
