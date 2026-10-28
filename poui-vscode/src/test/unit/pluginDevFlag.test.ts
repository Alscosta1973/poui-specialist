// poui-vscode/src/test/unit/pluginDevFlag.test.ts
//
// Arquivo ~/.claude/poui-specialist-dev.json — ponte entre o "Desbloquear
// Modo Dev" da extensão e a skill poui-license-check do plugin.
import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { pluginDevFlagPath, writePluginDevFlag } from '../../pluginDevFlag';

describe('pluginDevFlag', () => {
  let home: string;

  beforeEach(() => {
    home = fs.mkdtempSync(path.join(os.tmpdir(), 'poui-devflag-'));
  });

  afterEach(() => {
    fs.rmSync(home, { recursive: true, force: true });
  });

  it('points to <home>/.claude/poui-specialist-dev.json', () => {
    assert.strictEqual(pluginDevFlagPath(home), path.join(home, '.claude', 'poui-specialist-dev.json'));
  });

  it('creates ~/.claude when missing and writes plugin, hash and timestamp', () => {
    const now = new Date('2026-10-28T10:00:00.000Z');
    const written = writePluginDevFlag('a'.repeat(64), home, now);

    assert.strictEqual(written, pluginDevFlagPath(home));
    assert.deepStrictEqual(JSON.parse(fs.readFileSync(written, 'utf8')), {
      plugin: 'poui-specialist',
      machineHash: 'a'.repeat(64),
      unlockedAt: '2026-10-28T10:00:00.000Z',
    });
  });

  it('overwrites a previous flag (re-unlock is idempotent)', () => {
    writePluginDevFlag('a'.repeat(64), home);
    writePluginDevFlag('b'.repeat(64), home);

    const flag = JSON.parse(fs.readFileSync(pluginDevFlagPath(home), 'utf8')) as { machineHash: string };
    assert.strictEqual(flag.machineHash, 'b'.repeat(64));
  });
});
