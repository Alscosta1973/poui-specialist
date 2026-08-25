import * as assert from 'node:assert';
import { findFreePort, waitForServerReady, CheckPortFreeFn, ProbePortFn } from '../../devServer';

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
