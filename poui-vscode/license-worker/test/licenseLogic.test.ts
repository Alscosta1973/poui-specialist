import * as assert from 'node:assert';
import {
  computeDaysLeft,
  computeDaysUsedPct,
  computeCreditsUsedPct,
  clampCredits,
  resolveStatus,
  shouldActivate,
  TRIAL_DAYS,
  TRIAL_CREDIT_BUDGET,
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
      firstUsedAt: NOW, // trial just started today
      creditsUsed: TRIAL_CREDIT_BUDGET,
    };
    assert.deepStrictEqual(resolveStatus(machine, undefined, HASH, NOW), { tier: 'expired' });
  });

  it('usedPct is the max of the days and credits percentages, not their sum', () => {
    const machine: MachineRecord = {
      firstSeen: '2026-09-01T00:00:00.000Z',
      lastSeen: NOW,
      licenseKey: null,
      firstUsedAt: '2026-09-01T00:00:00.000Z', // 36% of days used
      creditsUsed: 28, // 70% of credits used
    };
    assert.deepStrictEqual(resolveStatus(machine, undefined, HASH, NOW), { tier: 'trial', daysLeft: TRIAL_DAYS - 5, usedPct: 70 });
  });

  it('returns paid when the license is active and bound to this exact machine (credits irrelevant)', () => {
    const machine: MachineRecord = {
      firstSeen: '2026-01-01T00:00:00.000Z',
      lastSeen: NOW,
      licenseKey: 'POUI-KEY',
      firstUsedAt: '2026-01-01T00:00:00.000Z',
      creditsUsed: TRIAL_CREDIT_BUDGET, // even "exhausted" credits don't matter once paid
    };
    const license: LicenseRecord = { email: 'dev@example.com', status: 'active', createdAt: NOW, boundMachineHash: HASH };
    assert.deepStrictEqual(resolveStatus(machine, license, HASH, NOW), { tier: 'paid', licenseKey: 'POUI-KEY' });
  });

  it('falls back to trial/expired math when the license is bound to a different machine (device was replaced)', () => {
    const machine: MachineRecord = {
      firstSeen: '2026-09-01T00:00:00.000Z',
      lastSeen: NOW,
      licenseKey: 'POUI-KEY',
      firstUsedAt: '2026-09-01T00:00:00.000Z',
      creditsUsed: 0,
    };
    const license: LicenseRecord = { email: 'dev@example.com', status: 'active', createdAt: NOW, boundMachineHash: 'some-other-hash' };
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
    const license: LicenseRecord = { email: 'dev@example.com', status: 'revoked', createdAt: NOW, boundMachineHash: HASH };
    assert.deepStrictEqual(resolveStatus(machine, license, HASH, NOW), { tier: 'trial', daysLeft: TRIAL_DAYS - 5, usedPct: 36 });
  });
});

describe('shouldActivate', () => {
  it('rejects when the license key does not exist', () => {
    assert.deepStrictEqual(shouldActivate(undefined), { ok: false, reason: 'invalid_key' });
  });

  it('rejects a revoked license', () => {
    const license: LicenseRecord = { email: 'dev@example.com', status: 'revoked', createdAt: '2026-01-01T00:00:00.000Z', boundMachineHash: null };
    assert.deepStrictEqual(shouldActivate(license), { ok: false, reason: 'invalid_key' });
  });

  it('accepts an active license', () => {
    const license: LicenseRecord = { email: 'dev@example.com', status: 'active', createdAt: '2026-01-01T00:00:00.000Z', boundMachineHash: null };
    assert.deepStrictEqual(shouldActivate(license), { ok: true });
  });
});
