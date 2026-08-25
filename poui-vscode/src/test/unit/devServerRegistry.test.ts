import * as assert from 'node:assert';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import type { ChildProcess } from 'node:child_process';
import {
  readTrackedPort,
  writeTrackedPort,
  clearTrackedPort,
  ensureDevServer,
  findPidListeningOnPort,
  killPort,
  stopTrackedServer,
  ExecFn,
} from '../../devServerRegistry';

async function mkWorkspace(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'poui-devserver-registry-'));
}

function fakeChildProcess(): ChildProcess {
  return { stderr: null } as unknown as ChildProcess;
}

describe('readTrackedPort / writeTrackedPort / clearTrackedPort', () => {
  it('returns null when nothing was ever tracked for this workspace', async () => {
    const root = await mkWorkspace();
    assert.strictEqual(await readTrackedPort(root), null);
  });

  it('round-trips a written port back for the same workspace root', async () => {
    const root = await mkWorkspace();
    await writeTrackedPort(root, 4202);
    assert.strictEqual(await readTrackedPort(root), 4202);
  });

  it('keeps two different workspace roots independent (no key collision)', async () => {
    const rootA = await mkWorkspace();
    const rootB = await mkWorkspace();
    await writeTrackedPort(rootA, 4200);
    await writeTrackedPort(rootB, 4201);
    assert.strictEqual(await readTrackedPort(rootA), 4200);
    assert.strictEqual(await readTrackedPort(rootB), 4201);
  });

  it('clearTrackedPort removes the entry so a later read returns null', async () => {
    const root = await mkWorkspace();
    await writeTrackedPort(root, 4203);
    await clearTrackedPort(root);
    assert.strictEqual(await readTrackedPort(root), null);
  });

  it('clearTrackedPort on a workspace that was never tracked is a no-op, not an error', async () => {
    const root = await mkWorkspace();
    await assert.doesNotReject(clearTrackedPort(root));
  });
});

describe('ensureDevServer', () => {
  it('reuses the tracked port when it is already alive, without spawning anything', async () => {
    const root = await mkWorkspace();
    await writeTrackedPort(root, 4205);
    const lines: string[] = [];
    let spawnCalls = 0;

    const result = await ensureDevServer(root, { appendLine: (l) => lines.push(l) }, {
      probePort: async (port) => port === 4205,
      findFreePort: async () => {
        throw new Error('should not look for a free port when reusing');
      },
      spawnDevServer: () => {
        spawnCalls++;
        return fakeChildProcess();
      },
      waitForServerReady: async () => true,
      readTrackedPort,
      writeTrackedPort,
    });

    assert.deepStrictEqual(result, { ok: true, port: 4205, reused: true });
    assert.strictEqual(spawnCalls, 0);
    assert.ok(lines.some((l) => l.includes('Reaproveitando') && l.includes('4205')));
  });

  it('spawns a fresh server when nothing is tracked yet', async () => {
    const root = await mkWorkspace();
    const lines: string[] = [];
    let spawnedPort: number | null = null;

    const result = await ensureDevServer(root, { appendLine: (l) => lines.push(l) }, {
      probePort: async () => false,
      findFreePort: async () => 4200,
      spawnDevServer: (_cwd, port) => {
        spawnedPort = port;
        return fakeChildProcess();
      },
      waitForServerReady: async () => true,
      readTrackedPort,
      writeTrackedPort,
    });

    assert.deepStrictEqual(result, { ok: true, port: 4200, reused: false });
    assert.strictEqual(spawnedPort, 4200);
    assert.strictEqual(await readTrackedPort(root), 4200, 'the new port should be persisted for reuse next time');
  });

  it('spawns a fresh server when the tracked port is stale (no longer responding)', async () => {
    const root = await mkWorkspace();
    await writeTrackedPort(root, 4206);
    let spawnCalls = 0;

    const result = await ensureDevServer(root, { appendLine: () => {} }, {
      probePort: async () => false,
      findFreePort: async () => 4207,
      spawnDevServer: () => {
        spawnCalls++;
        return fakeChildProcess();
      },
      waitForServerReady: async () => true,
      readTrackedPort,
      writeTrackedPort,
    });

    assert.deepStrictEqual(result, { ok: true, port: 4207, reused: false });
    assert.strictEqual(spawnCalls, 1);
    assert.strictEqual(await readTrackedPort(root), 4207);
  });

  it('warns about the port only when it drifted away from 4200', async () => {
    const root = await mkWorkspace();
    const lines: string[] = [];

    await ensureDevServer(root, { appendLine: (l) => lines.push(l) }, {
      probePort: async () => false,
      findFreePort: async () => 4200,
      spawnDevServer: () => fakeChildProcess(),
      waitForServerReady: async () => true,
      readTrackedPort,
      writeTrackedPort,
    });

    assert.ok(!lines.some((l) => l.includes('em uso')));
  });

  it('returns an error result when every port 4200-4209 is occupied', async () => {
    const root = await mkWorkspace();

    const result = await ensureDevServer(root, { appendLine: () => {} }, {
      probePort: async () => false,
      findFreePort: async () => null,
      spawnDevServer: () => fakeChildProcess(),
      waitForServerReady: async () => true,
      readTrackedPort,
      writeTrackedPort,
    });

    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.match(result.errorMessage, /4200-4209/);
    }
  });

  it('returns an error result and does not persist the port when the server never becomes ready', async () => {
    const root = await mkWorkspace();

    const result = await ensureDevServer(root, { appendLine: () => {} }, {
      probePort: async () => false,
      findFreePort: async () => 4201,
      spawnDevServer: () => fakeChildProcess(),
      waitForServerReady: async () => false,
      readTrackedPort,
      writeTrackedPort,
    });

    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.match(result.errorMessage, /não respondeu em 120 segundos/);
    }
    assert.strictEqual(await readTrackedPort(root), null);
  });
});

describe('findPidListeningOnPort', () => {
  const fakeNetstatOutput = [
    '',
    '  Proto  Local Address          Foreign Address        State           PID',
    '  TCP    0.0.0.0:4200           0.0.0.0:0              LISTENING       25812',
    '  TCP    127.0.0.1:4201         0.0.0.0:0              LISTENING       31088',
    '  TCP    0.0.0.0:5000           0.0.0.0:0              LISTENING       9999',
    // linha real de conexão em TIME_WAIT cujo *remoto* é a porta 4200 — não
    // pode ser confundida com um LISTENING local nessa porta.
    '  TCP    [::1]:51632            [::1]:4200             TIME_WAIT       0',
    '',
  ].join('\r\n');

  it('extracts the PID for the line matching the given port', async () => {
    const exec: ExecFn = async () => ({ stdout: fakeNetstatOutput, stderr: '' });
    assert.strictEqual(await findPidListeningOnPort(4200, exec), 25812);
    assert.strictEqual(await findPidListeningOnPort(4201, exec), 31088);
  });

  it('returns null when no line matches the port', async () => {
    const exec: ExecFn = async () => ({ stdout: fakeNetstatOutput, stderr: '' });
    assert.strictEqual(await findPidListeningOnPort(4209, exec), null);
  });

  it('returns null when netstat itself fails (no permission, not on PATH, etc.)', async () => {
    const exec: ExecFn = async () => {
      throw new Error('netstat not found');
    };
    assert.strictEqual(await findPidListeningOnPort(4200, exec), null);
  });

  it('does not call the "-p TCP" filter — real-world Windows bug: it silently drops IPv6 listeners', async () => {
    let usedCommand = '';
    const exec: ExecFn = async (cmd) => {
      usedCommand = cmd;
      return { stdout: fakeNetstatOutput, stderr: '' };
    };
    await findPidListeningOnPort(4200, exec);
    assert.strictEqual(usedCommand, 'netstat -ano');
  });

  it('resolves the PID for an IPv6-only listener ([::1]:PORT) — this is the actual bind `ng serve` used on Windows in a real QA run', async () => {
    const ipv6Only = [
      '  Proto  Local Address          Foreign Address        State           PID',
      '  TCP    [::1]:4200             [::]:0                 LISTENING       34840',
    ].join('\r\n');
    const exec: ExecFn = async () => ({ stdout: ipv6Only, stderr: '' });
    assert.strictEqual(await findPidListeningOnPort(4200, exec), 34840);
  });

  it('ignores a line where the port only appears as the foreign/remote address, not the local one', async () => {
    const remoteOnly = [
      '  Proto  Local Address          Foreign Address        State           PID',
      '  TCP    [::1]:51632            [::1]:4200             TIME_WAIT       0',
    ].join('\r\n');
    const exec: ExecFn = async () => ({ stdout: remoteOnly, stderr: '' });
    assert.strictEqual(await findPidListeningOnPort(4200, exec), null);
  });
});

describe('killPort', () => {
  it('kills the PID it resolves for the port via taskkill', async () => {
    const commands: string[] = [];
    const exec: ExecFn = async (cmd) => {
      commands.push(cmd);
      if (cmd.startsWith('netstat')) {
        return {
          stdout: '  TCP    0.0.0.0:4200    0.0.0.0:0    LISTENING    25812',
          stderr: '',
        };
      }
      return { stdout: '', stderr: '' };
    };

    await killPort(4200, exec);

    assert.ok(commands.some((c) => c.startsWith('netstat')));
    assert.ok(commands.some((c) => /taskkill/i.test(c) && c.includes('25812')));
  });

  it('is a no-op (does not call taskkill) when nothing is listening on the port', async () => {
    const commands: string[] = [];
    const exec: ExecFn = async (cmd) => {
      commands.push(cmd);
      return { stdout: '', stderr: '' };
    };

    await killPort(4200, exec);

    assert.ok(!commands.some((c) => /taskkill/i.test(c)));
  });

  it('swallows a taskkill failure instead of throwing (process may have died already)', async () => {
    const exec: ExecFn = async (cmd) => {
      if (cmd.startsWith('netstat')) {
        return { stdout: '  TCP 0.0.0.0:4200 0.0.0.0:0 LISTENING 25812', stderr: '' };
      }
      throw new Error('process not found');
    };

    await assert.doesNotReject(killPort(4200, exec));
  });
});

describe('stopTrackedServer', () => {
  it('kills the tracked port and clears the state when a port is tracked', async () => {
    const root = await mkWorkspace();
    await writeTrackedPort(root, 4200);
    const commands: string[] = [];
    const exec: ExecFn = async (cmd) => {
      commands.push(cmd);
      if (cmd.startsWith('netstat')) {
        return { stdout: '  TCP 0.0.0.0:4200 0.0.0.0:0 LISTENING 25812', stderr: '' };
      }
      return { stdout: '', stderr: '' };
    };

    await stopTrackedServer(root, exec);

    assert.ok(commands.some((c) => /taskkill/i.test(c)));
    assert.strictEqual(await readTrackedPort(root), null);
  });

  it('does nothing when no port is tracked for the workspace', async () => {
    const root = await mkWorkspace();
    const commands: string[] = [];
    const exec: ExecFn = async (cmd) => {
      commands.push(cmd);
      return { stdout: '', stderr: '' };
    };

    await stopTrackedServer(root, exec);

    assert.strictEqual(commands.length, 0);
  });
});
