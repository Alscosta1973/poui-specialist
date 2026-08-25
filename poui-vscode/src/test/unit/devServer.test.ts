import * as assert from 'node:assert';
import * as net from 'node:net';
import { findFreePort, waitForServerReady, checkPortFree, CheckPortFreeFn, ProbePortFn } from '../../devServer';

/** Sobe um listener real só em IPv6 loopback (`::1`) numa porta livre, roda
 * `fn(port)` contra ela, e garante que o listener é sempre fechado depois —
 * mesmo se `fn` lançar. */
async function withIpv6OnlyListener(fn: (port: number) => Promise<void>): Promise<void> {
  const server = net.createServer();
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '::1', () => resolve());
  });
  const address = server.address();
  if (address === null || typeof address === 'string') {
    server.close();
    throw new Error('expected an AddressInfo from an ephemeral port bind');
  }
  try {
    await fn(address.port);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

describe('findFreePort', () => {
  it('returns the first free port in the range', async () => {
    const checkFree: CheckPortFreeFn = async (port) => port === 4202;
    const port = await findFreePort({ start: 4200, end: 4209 }, checkFree);
    assert.strictEqual(port, 4202);
  });

  it('returns the range start when it is already free (no warning-worthy skip)', async () => {
    const checkFree: CheckPortFreeFn = async (port) => port === 4200;
    const port = await findFreePort({ start: 4200, end: 4209 }, checkFree);
    assert.strictEqual(port, 4200);
  });

  it('returns null when every port in the range is occupied', async () => {
    const checkFree: CheckPortFreeFn = async () => false;
    const port = await findFreePort({ start: 4200, end: 4209 }, checkFree);
    assert.strictEqual(port, null);
  });
});

describe('checkPortFree (real sockets)', () => {
  it('reports a port occupied on IPv6-only (::1) as NOT free (real-world stale ng serve process)', async () => {
    await withIpv6OnlyListener(async (port) => {
      const free = await checkPortFree(port);
      assert.strictEqual(free, false);
    });
  });

  it('reports a genuinely unused ephemeral port as free', async () => {
    // Bind once to grab a free ephemeral port, then release it immediately —
    // there's a real (tiny) chance something else grabs it before our
    // checkPortFree call, but that race exists for any port-availability
    // check and is not what this test is about.
    const probe = net.createServer();
    const port = await new Promise<number>((resolve, reject) => {
      probe.once('error', reject);
      probe.listen(0, () => {
        const address = probe.address();
        if (address === null || typeof address === 'string') {
          reject(new Error('expected an AddressInfo from an ephemeral port bind'));
          return;
        }
        resolve(address.port);
      });
    });
    await new Promise<void>((resolve) => probe.close(() => resolve()));

    const free = await checkPortFree(port);
    assert.strictEqual(free, true);
  });
});

describe('waitForServerReady', () => {
  it('resolves true as soon as the probe reports the port is up', async () => {
    let calls = 0;
    const probe: ProbePortFn = async () => {
      calls++;
      return calls >= 3;
    };
    const sleeps: number[] = [];
    const sleep = async (ms: number) => {
      sleeps.push(ms);
    };

    const ready = await waitForServerReady(4200, { timeoutMs: 60000, intervalMs: 1000 }, probe, sleep);

    assert.strictEqual(ready, true);
    assert.strictEqual(calls, 3);
    assert.deepStrictEqual(sleeps, [1000, 1000]);
  });

  it('resolves false once the deadline passes without the probe ever succeeding', async () => {
    let now = 0;
    const probe: ProbePortFn = async () => false;
    const sleep = async (ms: number) => {
      now += ms;
    };
    const clock = () => now;

    const ready = await waitForServerReady(4200, { timeoutMs: 5000, intervalMs: 2000 }, probe, sleep, clock);

    assert.strictEqual(ready, false);
  });
});
