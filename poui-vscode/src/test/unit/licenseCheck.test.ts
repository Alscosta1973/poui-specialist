// poui-vscode/src/test/unit/licenseCheck.test.ts
import * as assert from 'node:assert';
import {
  computeMachineHash,
  isPlaceholderMachineId,
  isAccessAllowed,
  isCacheFresh,
  shouldShowExpiryWarning,
  formatPaidBadge,
  formatStatusBarItem,
  effortToCredits,
  fetchConsumeCredits,
  fetchTrialStart,
  fetchLicenseStatus,
  activateLicenseKey,
} from '../../licenseCheck';

describe('computeMachineHash', () => {
  it('is deterministic for the same machineId', () => {
    assert.strictEqual(computeMachineHash('abc'), computeMachineHash('abc'));
  });

  it('produces different hashes for different machineIds', () => {
    assert.notStrictEqual(computeMachineHash('abc'), computeMachineHash('xyz'));
  });
});

describe('isPlaceholderMachineId', () => {
  it('recognizes the known VS Code placeholder value', () => {
    assert.strictEqual(isPlaceholderMachineId('someValue.machineId'), true);
  });

  it('returns false for a real-looking machineId', () => {
    assert.strictEqual(isPlaceholderMachineId('a1b2c3d4e5f6'), false);
  });
});

describe('isAccessAllowed', () => {
  it('allows trial', () => {
    assert.strictEqual(isAccessAllowed({ tier: 'trial', daysLeft: 5 }), true);
  });

  it('allows paid', () => {
    assert.strictEqual(isAccessAllowed({ tier: 'paid' }), true);
  });

  it('blocks expired', () => {
    assert.strictEqual(isAccessAllowed({ tier: 'expired' }), false);
  });

  it('blocks unknown', () => {
    assert.strictEqual(isAccessAllowed({ tier: 'unknown' }), false);
  });

  it('blocks when no status has been fetched yet', () => {
    assert.strictEqual(isAccessAllowed(undefined), false);
  });
});

describe('isCacheFresh', () => {
  it('is fresh right after fetching', () => {
    const now = Date.parse('2026-09-06T12:00:00.000Z');
    assert.strictEqual(isCacheFresh('2026-09-06T12:00:00.000Z', now, 3 * 24 * 60 * 60 * 1000), true);
  });

  it('is stale past the grace window', () => {
    const now = Date.parse('2026-09-10T12:00:01.000Z');
    assert.strictEqual(isCacheFresh('2026-09-06T12:00:00.000Z', now, 3 * 24 * 60 * 60 * 1000), false);
  });
});

describe('shouldShowExpiryWarning', () => {
  it('warns when usedPct is at or above the threshold', () => {
    assert.strictEqual(shouldShowExpiryWarning({ tier: 'trial', usedPct: 80 }, 80), true);
    assert.strictEqual(shouldShowExpiryWarning({ tier: 'trial', usedPct: 95 }, 80), true);
  });

  it('does not warn when usedPct is below the threshold', () => {
    assert.strictEqual(shouldShowExpiryWarning({ tier: 'trial', usedPct: 79 }, 80), false);
  });

  it('does not warn for a paid license, regardless of usedPct', () => {
    assert.strictEqual(shouldShowExpiryWarning({ tier: 'paid' }, 80), false);
  });

  it('does not warn when there is no status yet', () => {
    assert.strictEqual(shouldShowExpiryWarning(undefined, 80), false);
  });
});

describe('formatPaidBadge', () => {
  it('shows no badge for a paid license', () => {
    assert.strictEqual(formatPaidBadge({ tier: 'paid' }), '');
  });

  it('shows the used percentage for a trial', () => {
    assert.strictEqual(formatPaidBadge({ tier: 'trial', usedPct: 42 }), '🔒 trial — 42% usado');
  });

  it('falls back to a generic lock badge for a trial with no usedPct', () => {
    assert.strictEqual(formatPaidBadge({ tier: 'trial' }), '🔒 requer licença');
  });

  it('shows the generic lock badge for expired, unknown or missing status', () => {
    assert.strictEqual(formatPaidBadge({ tier: 'expired' }), '🔒 requer licença');
    assert.strictEqual(formatPaidBadge({ tier: 'unknown' }), '🔒 requer licença');
    assert.strictEqual(formatPaidBadge(undefined), '🔒 requer licença');
  });
});

describe('formatStatusBarItem', () => {
  it('hides the item entirely for a paid license', () => {
    assert.strictEqual(formatStatusBarItem({ tier: 'paid' }), undefined);
  });

  it('is a normal-severity trial reminder below the warning threshold', () => {
    const presentation = formatStatusBarItem({ tier: 'trial', usedPct: 40 });
    assert.strictEqual(presentation?.severity, 'normal');
    assert.match(presentation!.text, /40% usado/);
  });

  it('escalates to warning severity at 80% used or more', () => {
    assert.strictEqual(formatStatusBarItem({ tier: 'trial', usedPct: 80 })?.severity, 'warning');
    assert.strictEqual(formatStatusBarItem({ tier: 'trial', usedPct: 99 })?.severity, 'warning');
    assert.strictEqual(formatStatusBarItem({ tier: 'trial', usedPct: 79 })?.severity, 'normal');
  });

  it('is an error-severity lock prompt for expired, unknown or missing status', () => {
    for (const status of [{ tier: 'expired' as const }, { tier: 'unknown' as const }, undefined]) {
      const presentation = formatStatusBarItem(status);
      assert.strictEqual(presentation?.severity, 'error');
      assert.match(presentation!.text, /licença/);
    }
  });
});

describe('fetchTrialStart', () => {
  it('posts the machineHash and returns the parsed status', async () => {
    let capturedUrl: string | undefined;
    let capturedBody: string | undefined;
    const fetchFn = (async (url: string, init?: { body?: string }) => {
      capturedUrl = url;
      capturedBody = init?.body;
      return { ok: true, status: 200, json: async () => ({ tier: 'trial', daysLeft: 14 }) };
    }) as unknown as typeof fetch;

    const result = await fetchTrialStart('https://example.workers.dev', 'hash123', fetchFn);

    assert.strictEqual(capturedUrl, 'https://example.workers.dev/trial/start');
    assert.deepStrictEqual(JSON.parse(capturedBody ?? '{}'), { machineHash: 'hash123' });
    assert.deepStrictEqual(result, { tier: 'trial', daysLeft: 14 });
  });
});

describe('fetchLicenseStatus', () => {
  it('gets the status with the machineHash as a query param', async () => {
    let capturedUrl: string | undefined;
    const fetchFn = (async (url: string) => {
      capturedUrl = url;
      return { ok: true, status: 200, json: async () => ({ tier: 'paid' }) };
    }) as unknown as typeof fetch;

    const result = await fetchLicenseStatus('https://example.workers.dev', 'hash123', fetchFn);

    assert.strictEqual(capturedUrl, 'https://example.workers.dev/license/status?machineHash=hash123');
    assert.deepStrictEqual(result, { tier: 'paid' });
  });
});

describe('activateLicenseKey', () => {
  it('posts the machineHash and licenseKey and returns the parsed result', async () => {
    let capturedBody: string | undefined;
    const fetchFn = (async (_url: string, init?: { body?: string }) => {
      capturedBody = init?.body;
      return { ok: true, status: 200, json: async () => ({ ok: true, tier: 'paid' }) };
    }) as unknown as typeof fetch;

    const result = await activateLicenseKey('https://example.workers.dev', 'hash123', 'POUI-KEY', fetchFn);

    assert.deepStrictEqual(JSON.parse(capturedBody ?? '{}'), { machineHash: 'hash123', licenseKey: 'POUI-KEY' });
    assert.deepStrictEqual(result, { ok: true, tier: 'paid' });
  });

  it('surfaces a failed activation', async () => {
    const fetchFn = (async () => ({
      ok: false,
      status: 400,
      json: async () => ({ ok: false, reason: 'invalid_key' }),
    })) as unknown as typeof fetch;

    const result = await activateLicenseKey('https://example.workers.dev', 'hash123', 'BAD-KEY', fetchFn);

    assert.deepStrictEqual(result, { ok: false, reason: 'invalid_key' });
  });
});

describe('effortToCredits', () => {
  it('weighs low and medium effort as 1 credit', () => {
    assert.strictEqual(effortToCredits('low'), 1);
    assert.strictEqual(effortToCredits('medium'), 1);
  });

  it('weighs high effort as 2 credits', () => {
    assert.strictEqual(effortToCredits('high'), 2);
  });

  it('weighs xhigh and max effort as 3 credits', () => {
    assert.strictEqual(effortToCredits('xhigh'), 3);
    assert.strictEqual(effortToCredits('max'), 3);
  });

  it('falls back to 1 credit for an unrecognized value', () => {
    assert.strictEqual(effortToCredits('unknown-value'), 1);
  });
});

describe('fetchConsumeCredits', () => {
  it('posts the machineHash and credits and returns the parsed status', async () => {
    let capturedUrl: string | undefined;
    let capturedBody: string | undefined;
    const fetchFn = (async (url: string, init?: { body?: string }) => {
      capturedUrl = url;
      capturedBody = init?.body;
      return { ok: true, status: 200, json: async () => ({ tier: 'trial', daysLeft: 14, usedPct: 5 }) };
    }) as unknown as typeof fetch;

    const result = await fetchConsumeCredits('https://example.workers.dev', 'hash123', 2, fetchFn);

    assert.strictEqual(capturedUrl, 'https://example.workers.dev/trial/consume');
    assert.deepStrictEqual(JSON.parse(capturedBody ?? '{}'), { machineHash: 'hash123', credits: 2 });
    assert.deepStrictEqual(result, { tier: 'trial', daysLeft: 14, usedPct: 5 });
  });
});
