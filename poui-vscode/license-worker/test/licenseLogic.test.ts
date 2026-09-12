import * as assert from 'node:assert';
import {
  computeDaysLeft,
  computeDaysUsedPct,
  computeCreditsUsedPct,
  computeDaysUntil,
  clampCredits,
  shouldNotifyExpiry,
  computeRenewedExpiresAt,
  resolveStatus,
  shouldActivate,
  isDevMachine,
  TRIAL_DAYS,
  TRIAL_CREDIT_BUDGET,
  PLAN_DAYS,
  MachineRecord,
  LicenseRecord,
} from '../src/licenseLogic';

describe('computeDaysLeft', () => {
  it('returns the full trial length when firstSeen is now', () => {
    const now = '2026-09-06T12:00:00.000Z';
    assert.strictEqual(computeDaysLeft(now, now), TRIAL_DAYS);
  });

  it('returns fewer days as time passes', () => {
    assert.strictEqual(computeDaysLeft('2026-09-01T00:00:00.000Z', '2026-09-06T00:00:00.000Z'), TRIAL_DAYS - 5);
  });

  it('returns 0 once the trial window has fully elapsed', () => {
    assert.strictEqual(computeDaysLeft('2026-08-01T00:00:00.000Z', '2026-09-06T00:00:00.000Z'), 0);
  });

  it('never returns a negative number for a very old firstSeen', () => {
    assert.strictEqual(computeDaysLeft('2020-01-01T00:00:00.000Z', '2026-09-06T00:00:00.000Z'), 0);
  });
});

describe('computeDaysUsedPct', () => {
  it('is 0 when the trial has not started (firstUsedAt is null)', () => {
    assert.strictEqual(computeDaysUsedPct(null, '2026-09-06T00:00:00.000Z'), 0);
  });

  it('is 0 right when the trial starts', () => {
    const now = '2026-09-06T00:00:00.000Z';
    assert.strictEqual(computeDaysUsedPct(now, now), 0);
  });

  it('reflects the fraction of days elapsed, rounded', () => {
    // 5 of 14 days elapsed = 35.71...% -> rounds to 36
    assert.strictEqual(computeDaysUsedPct('2026-09-01T00:00:00.000Z', '2026-09-06T00:00:00.000Z'), 36);
  });

  it('clamps at 100 once the trial window has fully elapsed', () => {
    assert.strictEqual(computeDaysUsedPct('2026-01-01T00:00:00.000Z', '2026-09-06T00:00:00.000Z'), 100);
  });

  it('is 0 when firstUsedAt is undefined, same as null (a legacy record has no such key at all)', () => {
    assert.strictEqual(computeDaysUsedPct(undefined, '2026-09-06T00:00:00.000Z'), 0);
  });
});

describe('computeCreditsUsedPct', () => {
  it('is 0 with no credits used', () => {
    assert.strictEqual(computeCreditsUsedPct(0), 0);
  });

  it('reflects the fraction used, rounded', () => {
    // 20 of 40 = 50%
    assert.strictEqual(computeCreditsUsedPct(20, TRIAL_CREDIT_BUDGET), 50);
  });

  it('is exactly 100 at the budget', () => {
    assert.strictEqual(computeCreditsUsedPct(40, TRIAL_CREDIT_BUDGET), 100);
  });

  it('clamps at 100 past the budget', () => {
    assert.strictEqual(computeCreditsUsedPct(999, TRIAL_CREDIT_BUDGET), 100);
  });

  it('is 0 for a non-finite creditsUsed (NaN/undefined) instead of propagating NaN', () => {
    assert.strictEqual(computeCreditsUsedPct(NaN, TRIAL_CREDIT_BUDGET), 0);
    assert.strictEqual(computeCreditsUsedPct(undefined as unknown as number, TRIAL_CREDIT_BUDGET), 0);
  });

  it('is 0 for a non-positive budget instead of dividing by zero', () => {
    assert.strictEqual(computeCreditsUsedPct(10, 0), 0);
    assert.strictEqual(computeCreditsUsedPct(10, -5), 0);
  });
});

describe('computeDaysUntil', () => {
  it('returns the exact number of whole days to a future date', () => {
    assert.strictEqual(computeDaysUntil('2026-10-06T00:00:00.000Z', '2026-09-06T00:00:00.000Z'), 30);
  });

  it('returns 0 for a date that is now', () => {
    const now = '2026-09-06T00:00:00.000Z';
    assert.strictEqual(computeDaysUntil(now, now), 0);
  });

  it('never returns a negative number for a date in the past', () => {
    assert.strictEqual(computeDaysUntil('2026-01-01T00:00:00.000Z', '2026-09-06T00:00:00.000Z'), 0);
  });

  it('is not capped at 14 — unlike computeDaysLeft, this is general-purpose (used for up to 365-day annual plans)', () => {
    assert.strictEqual(computeDaysUntil('2027-09-06T00:00:00.000Z', '2026-09-06T00:00:00.000Z'), 365);
  });
});

describe('clampCredits', () => {
  it('leaves valid weights (1-3) unchanged', () => {
    assert.strictEqual(clampCredits(1), 1);
    assert.strictEqual(clampCredits(2), 2);
    assert.strictEqual(clampCredits(3), 3);
  });

  it('clamps anything above 3 down to 3', () => {
    assert.strictEqual(clampCredits(1000), 3);
  });

  it('clamps anything below 1 (including negative or 0) up to 1', () => {
    assert.strictEqual(clampCredits(0), 1);
    assert.strictEqual(clampCredits(-50), 1);
  });

  it('rounds a non-integer to the nearest valid weight', () => {
    assert.strictEqual(clampCredits(2.4), 2);
    assert.strictEqual(clampCredits(2.6), 3);
  });

  it('returns the minimum weight (1) for NaN-producing input instead of propagating NaN', () => {
    assert.strictEqual(clampCredits(NaN), 1);
    assert.strictEqual(clampCredits(undefined as unknown as number), 1);
    assert.strictEqual(clampCredits('abc' as unknown as number), 1);
  });

  it('clamps Infinity/-Infinity same as any other out-of-range value', () => {
    assert.strictEqual(clampCredits(Infinity), 3);
    assert.strictEqual(clampCredits(-Infinity), 1);
  });
});

describe('shouldNotifyExpiry', () => {
  const NOW = '2026-09-06T00:00:00.000Z';

  it('is false when there is no license', () => {
    assert.strictEqual(shouldNotifyExpiry(undefined, NOW), false);
  });

  it('is false when the license has not expired yet', () => {
    const license: LicenseRecord = {
      email: 'dev@example.com',
      status: 'active',
      createdAt: '2026-01-01T00:00:00.000Z',
      boundMachineHash: 'hash',
      expiresAt: '2026-12-01T00:00:00.000Z',
      notifiedExpiredAt: null,
    };
    assert.strictEqual(shouldNotifyExpiry(license, NOW), false);
  });

  it('is true the first time an active license is seen expired', () => {
    const license: LicenseRecord = {
      email: 'dev@example.com',
      status: 'active',
      createdAt: '2026-01-01T00:00:00.000Z',
      boundMachineHash: 'hash',
      expiresAt: '2026-08-01T00:00:00.000Z',
      notifiedExpiredAt: null,
    };
    assert.strictEqual(shouldNotifyExpiry(license, NOW), true);
  });

  it('is false once already notified for this expiry', () => {
    const license: LicenseRecord = {
      email: 'dev@example.com',
      status: 'active',
      createdAt: '2026-01-01T00:00:00.000Z',
      boundMachineHash: 'hash',
      expiresAt: '2026-08-01T00:00:00.000Z',
      notifiedExpiredAt: '2026-08-02T00:00:00.000Z',
    };
    assert.strictEqual(shouldNotifyExpiry(license, NOW), false);
  });

  it('is false for a revoked license, even if past its expiresAt', () => {
    const license: LicenseRecord = {
      email: 'dev@example.com',
      status: 'revoked',
      createdAt: '2026-01-01T00:00:00.000Z',
      boundMachineHash: 'hash',
      expiresAt: '2026-08-01T00:00:00.000Z',
      notifiedExpiredAt: null,
    };
    assert.strictEqual(shouldNotifyExpiry(license, NOW), false);
  });

  it('is false for an expired beta license, even though the same record would notify as paid', () => {
    const license: LicenseRecord = {
      email: 'tester@example.com',
      status: 'active',
      createdAt: '2026-01-01T00:00:00.000Z',
      boundMachineHash: 'hash',
      expiresAt: '2026-08-01T00:00:00.000Z',
      notifiedExpiredAt: null,
      source: 'beta',
    };
    assert.strictEqual(shouldNotifyExpiry(license, NOW), false);
  });

  it('is true for an expired license explicitly marked as paid', () => {
    const license: LicenseRecord = {
      email: 'dev@example.com',
      status: 'active',
      createdAt: '2026-01-01T00:00:00.000Z',
      boundMachineHash: 'hash',
      expiresAt: '2026-08-01T00:00:00.000Z',
      notifiedExpiredAt: null,
      source: 'paid',
    };
    assert.strictEqual(shouldNotifyExpiry(license, NOW), true);
  });
});

describe('PLAN_DAYS', () => {
  it('gives beta keys a 30-day window, same as a monthly plan', () => {
    assert.strictEqual(PLAN_DAYS.beta, 30);
  });
});

describe('computeRenewedExpiresAt', () => {
  it('adds plan days on top of the current expiresAt when renewing before it lapses', () => {
    // 5 days still left (expires 2026-09-11), renew mensal (30d) -> 35 days from NOW
    const result = computeRenewedExpiresAt('2026-09-11T00:00:00.000Z', PLAN_DAYS.mensal, '2026-09-06T00:00:00.000Z');
    assert.strictEqual(result, '2026-10-11T00:00:00.000Z');
  });

  it('bases the new expiresAt on now (not the stale past date) when renewing after it already lapsed', () => {
    // expired 2026-08-01, renew mensal (30d) from NOW (2026-09-06) -> 2026-10-06, not 2026-08-31
    const result = computeRenewedExpiresAt('2026-08-01T00:00:00.000Z', PLAN_DAYS.mensal, '2026-09-06T00:00:00.000Z');
    assert.strictEqual(result, '2026-10-06T00:00:00.000Z');
  });

  it('supports all three plan lengths', () => {
    const now = '2026-01-01T00:00:00.000Z';
    assert.strictEqual(computeRenewedExpiresAt(now, PLAN_DAYS.trimestral, now), '2026-04-01T00:00:00.000Z');
    assert.strictEqual(computeRenewedExpiresAt(now, PLAN_DAYS.anual, now), '2027-01-01T00:00:00.000Z');
  });
});

describe('resolveStatus', () => {
  const NOW = '2026-09-06T00:00:00.000Z';
  const HASH = 'abc123';

  it('returns unknown when the machine has never registered', () => {
    assert.deepStrictEqual(resolveStatus(undefined, undefined, HASH, NOW), { tier: 'unknown' });
  });

  it('returns trial with daysLeft=TRIAL_DAYS and usedPct=0 when the trial has not started yet', () => {
    const machine: MachineRecord = {
      firstSeen: '2026-01-01T00:00:00.000Z',
      lastSeen: NOW,
      licenseKey: null,
      firstUsedAt: null,
      creditsUsed: 0,
    };
    assert.deepStrictEqual(resolveStatus(machine, undefined, HASH, NOW), { tier: 'trial', daysLeft: TRIAL_DAYS, usedPct: 0 });
  });

  it('returns trial with days-based usedPct once the trial has started, with no credits used', () => {
    const machine: MachineRecord = {
      firstSeen: '2026-09-01T00:00:00.000Z',
      lastSeen: NOW,
      licenseKey: null,
      firstUsedAt: '2026-09-01T00:00:00.000Z',
      creditsUsed: 0,
    };
    assert.deepStrictEqual(resolveStatus(machine, undefined, HASH, NOW), { tier: 'trial', daysLeft: TRIAL_DAYS - 5, usedPct: 36 });
  });

  it('returns expired once the day window has fully elapsed with no license', () => {
    const machine: MachineRecord = {
      firstSeen: '2026-01-01T00:00:00.000Z',
      lastSeen: NOW,
      licenseKey: null,
      firstUsedAt: '2026-01-01T00:00:00.000Z',
      creditsUsed: 0,
    };
    assert.deepStrictEqual(resolveStatus(machine, undefined, HASH, NOW), { tier: 'expired' });
  });

  it('returns expired once credits are exhausted, even with days still left', () => {
    const machine: MachineRecord = {
      firstSeen: NOW,
      lastSeen: NOW,
      licenseKey: null,
      firstUsedAt: NOW,
      creditsUsed: TRIAL_CREDIT_BUDGET,
    };
    assert.deepStrictEqual(resolveStatus(machine, undefined, HASH, NOW), { tier: 'expired' });
  });

  it('usedPct is the max of the days and credits percentages, not their sum', () => {
    const machine: MachineRecord = {
      firstSeen: '2026-09-01T00:00:00.000Z',
      lastSeen: NOW,
      licenseKey: null,
      firstUsedAt: '2026-09-01T00:00:00.000Z',
      creditsUsed: 28,
    };
    assert.deepStrictEqual(resolveStatus(machine, undefined, HASH, NOW), { tier: 'trial', daysLeft: TRIAL_DAYS - 5, usedPct: 70 });
  });

  it('returns paid with daysUntilExpiry when the license is active, bound to this machine, and not yet expired', () => {
    const machine: MachineRecord = {
      firstSeen: '2026-01-01T00:00:00.000Z',
      lastSeen: NOW,
      licenseKey: 'POUI-KEY',
      firstUsedAt: '2026-01-01T00:00:00.000Z',
      creditsUsed: TRIAL_CREDIT_BUDGET, // even "exhausted" credits don't matter once paid
    };
    const license: LicenseRecord = {
      email: 'dev@example.com',
      status: 'active',
      createdAt: NOW,
      boundMachineHash: HASH,
      expiresAt: '2026-10-06T00:00:00.000Z', // 30 days out
      notifiedExpiredAt: null,
    };
    assert.deepStrictEqual(resolveStatus(machine, license, HASH, NOW), { tier: 'paid', licenseKey: 'POUI-KEY', daysUntilExpiry: 30 });
  });

  it('falls back to trial/expired math when a paid license has expired (blocking)', () => {
    const machine: MachineRecord = {
      firstSeen: '2026-01-01T00:00:00.000Z',
      lastSeen: NOW,
      licenseKey: 'POUI-KEY',
      firstUsedAt: '2026-09-01T00:00:00.000Z',
      creditsUsed: 0,
    };
    const license: LicenseRecord = {
      email: 'dev@example.com',
      status: 'active',
      createdAt: '2026-01-01T00:00:00.000Z',
      boundMachineHash: HASH,
      expiresAt: '2026-09-05T00:00:00.000Z', // expired yesterday
      notifiedExpiredAt: null,
    };
    assert.deepStrictEqual(resolveStatus(machine, license, HASH, NOW), { tier: 'trial', daysLeft: TRIAL_DAYS - 5, usedPct: 36 });
  });

  it('falls back to trial/expired math when the license is bound to a different machine (device was replaced)', () => {
    const machine: MachineRecord = {
      firstSeen: '2026-09-01T00:00:00.000Z',
      lastSeen: NOW,
      licenseKey: 'POUI-KEY',
      firstUsedAt: '2026-09-01T00:00:00.000Z',
      creditsUsed: 0,
    };
    const license: LicenseRecord = {
      email: 'dev@example.com',
      status: 'active',
      createdAt: NOW,
      boundMachineHash: 'some-other-hash',
      expiresAt: '2026-12-01T00:00:00.000Z',
      notifiedExpiredAt: null,
    };
    assert.deepStrictEqual(resolveStatus(machine, license, HASH, NOW), { tier: 'trial', daysLeft: TRIAL_DAYS - 5, usedPct: 36 });
  });

  it('falls back to trial/expired math when the license was revoked', () => {
    const machine: MachineRecord = {
      firstSeen: '2026-09-01T00:00:00.000Z',
      lastSeen: NOW,
      licenseKey: 'POUI-KEY',
      firstUsedAt: '2026-09-01T00:00:00.000Z',
      creditsUsed: 0,
    };
    const license: LicenseRecord = {
      email: 'dev@example.com',
      status: 'revoked',
      createdAt: NOW,
      boundMachineHash: HASH,
      expiresAt: '2026-12-01T00:00:00.000Z',
      notifiedExpiredAt: null,
    };
    assert.deepStrictEqual(resolveStatus(machine, license, HASH, NOW), { tier: 'trial', daysLeft: TRIAL_DAYS - 5, usedPct: 36 });
  });

  it('resolves a legacy (pre-this-feature) MachineRecord — missing firstUsedAt/creditsUsed keys entirely, not just null — to a fresh full trial instead of an un-expirable one', () => {
    const legacyMachine = JSON.parse(
      '{"firstSeen":"2026-01-01T00:00:00.000Z","lastSeen":"2026-01-01T00:00:00.000Z","licenseKey":null}',
    ) as MachineRecord;
    assert.strictEqual(legacyMachine.firstUsedAt, undefined);
    assert.strictEqual(legacyMachine.creditsUsed, undefined);

    const result = resolveStatus(legacyMachine, undefined, HASH, NOW);
    assert.deepStrictEqual(result, { tier: 'trial', daysLeft: TRIAL_DAYS, usedPct: 0 });
  });

  it('grandfathers in a legacy (pre-this-feature) LicenseRecord — missing expiresAt/notifiedExpiredAt keys entirely — as a permanent paid license instead of instantly blocking a real existing customer', () => {
    // A LicenseRecord written by the old (pre-this-branch) /license/activate
    // handler has no expiresAt/notifiedExpiredAt keys in its stored JSON at
    // all. `nowIso < undefined` is always false in JS (undefined coerces to
    // NaN for the comparison), so without the fix, resolveStatus's paid
    // condition would fail for every such record — instantly downgrading
    // every already-paying customer to trial/expired the moment this
    // feature deployed. This exact scenario broke the real production
    // POUI-TEST-0001 license within minutes of the real deploy — this test
    // is the regression guard for that live incident, not a hypothetical.
    const legacyLicense = JSON.parse(
      `{"email":"dev@example.com","status":"active","createdAt":"2026-01-01T00:00:00.000Z","boundMachineHash":"${HASH}"}`,
    ) as LicenseRecord;
    assert.strictEqual(legacyLicense.expiresAt, undefined);
    assert.strictEqual(legacyLicense.notifiedExpiredAt, undefined);

    const machine: MachineRecord = {
      firstSeen: '2026-01-01T00:00:00.000Z',
      lastSeen: NOW,
      licenseKey: 'POUI-KEY',
      firstUsedAt: '2026-01-01T00:00:00.000Z',
      creditsUsed: 0,
    };

    const result = resolveStatus(machine, legacyLicense, HASH, NOW);
    assert.deepStrictEqual(result, { tier: 'paid', licenseKey: 'POUI-KEY' });
  });
});

describe('shouldActivate', () => {
  const NOW = '2026-09-06T00:00:00.000Z';

  it('rejects when the license key does not exist', () => {
    assert.deepStrictEqual(shouldActivate(undefined, NOW), { ok: false, reason: 'invalid_key' });
  });

  it('rejects a revoked license', () => {
    const license: LicenseRecord = {
      email: 'dev@example.com',
      status: 'revoked',
      createdAt: '2026-01-01T00:00:00.000Z',
      boundMachineHash: null,
      expiresAt: '2026-12-01T00:00:00.000Z',
      notifiedExpiredAt: null,
    };
    assert.deepStrictEqual(shouldActivate(license, NOW), { ok: false, reason: 'invalid_key' });
  });

  it('accepts an active license', () => {
    const license: LicenseRecord = {
      email: 'dev@example.com',
      status: 'active',
      createdAt: '2026-01-01T00:00:00.000Z',
      boundMachineHash: null,
      expiresAt: '2026-12-01T00:00:00.000Z',
      notifiedExpiredAt: null,
    };
    assert.deepStrictEqual(shouldActivate(license, NOW), { ok: true });
  });

  it('rejects an active license whose expiresAt has already passed, with a distinct reason', () => {
    const license: LicenseRecord = {
      email: 'dev@example.com',
      status: 'active',
      createdAt: '2026-01-01T00:00:00.000Z',
      boundMachineHash: null,
      expiresAt: '2026-08-01T00:00:00.000Z', // expired over a month before NOW
      notifiedExpiredAt: null,
    };
    assert.deepStrictEqual(shouldActivate(license, NOW), { ok: false, reason: 'expired_key' });
  });

  it('accepts a legacy (pre-this-feature) active license with no expiresAt at all — grandfather-in holds at activation too, not just at resolveStatus', () => {
    // Same shape as the production POUI-TEST-0001 incident record: no
    // expiresAt/notifiedExpiredAt keys in the stored JSON at all. A TS
    // object literal can't express a genuinely missing key, so this is
    // built via JSON.parse like the equivalent resolveStatus regression
    // guard above.
    const legacyLicense = JSON.parse(
      '{"email":"dev@example.com","status":"active","createdAt":"2026-01-01T00:00:00.000Z","boundMachineHash":null}',
    ) as LicenseRecord;
    assert.strictEqual(legacyLicense.expiresAt, undefined);
    assert.strictEqual(legacyLicense.notifiedExpiredAt, undefined);

    assert.deepStrictEqual(shouldActivate(legacyLicense, NOW), { ok: true });
  });
});

describe('isDevMachine', () => {
  it('returns false when the allowlist is empty', () => {
    assert.strictEqual(isDevMachine('any-hash', []), false);
  });

  it('returns true when the hash matches the only entry', () => {
    assert.strictEqual(isDevMachine('abc123', ['abc123']), true);
  });

  it('returns true when the hash matches one of several entries', () => {
    assert.strictEqual(isDevMachine('def456', ['abc123', 'def456', 'ghi789']), true);
  });

  it('returns false when the hash matches none of the entries', () => {
    assert.strictEqual(isDevMachine('zzz999', ['abc123', 'def456']), false);
  });

  it('does not partial-match a hash that is only a substring of an entry', () => {
    assert.strictEqual(isDevMachine('abc12', ['abc123']), false);
  });
});
