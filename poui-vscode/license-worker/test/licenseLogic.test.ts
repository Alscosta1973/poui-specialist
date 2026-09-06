import * as assert from 'node:assert';
import { computeDaysLeft, resolveStatus, shouldActivate, TRIAL_DAYS, MachineRecord, LicenseRecord } from '../src/licenseLogic';

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

describe('resolveStatus', () => {
  const NOW = '2026-09-06T00:00:00.000Z';
  const HASH = 'abc123';

  it('returns unknown when the machine has never registered', () => {
    assert.deepStrictEqual(resolveStatus(undefined, undefined, HASH, NOW), { tier: 'unknown' });
  });

  it('returns trial with days left when the machine has no bound license', () => {
    const machine: MachineRecord = { firstSeen: '2026-09-01T00:00:00.000Z', lastSeen: NOW, licenseKey: null };
    assert.deepStrictEqual(resolveStatus(machine, undefined, HASH, NOW), { tier: 'trial', daysLeft: TRIAL_DAYS - 5 });
  });

  it('returns expired once the trial window has elapsed with no license', () => {
    const machine: MachineRecord = { firstSeen: '2026-01-01T00:00:00.000Z', lastSeen: NOW, licenseKey: null };
    assert.deepStrictEqual(resolveStatus(machine, undefined, HASH, NOW), { tier: 'expired' });
  });

  it('returns paid when the license is active and bound to this exact machine', () => {
    const machine: MachineRecord = { firstSeen: '2026-01-01T00:00:00.000Z', lastSeen: NOW, licenseKey: 'POUI-KEY' };
    const license: LicenseRecord = { email: 'dev@example.com', status: 'active', createdAt: NOW, boundMachineHash: HASH };
    assert.deepStrictEqual(resolveStatus(machine, license, HASH, NOW), { tier: 'paid', licenseKey: 'POUI-KEY' });
  });

  it('falls back to trial/expired math when the license is bound to a different machine (device was replaced)', () => {
    const machine: MachineRecord = { firstSeen: '2026-09-01T00:00:00.000Z', lastSeen: NOW, licenseKey: 'POUI-KEY' };
    const license: LicenseRecord = { email: 'dev@example.com', status: 'active', createdAt: NOW, boundMachineHash: 'some-other-hash' };
    assert.deepStrictEqual(resolveStatus(machine, license, HASH, NOW), { tier: 'trial', daysLeft: TRIAL_DAYS - 5 });
  });

  it('falls back to trial/expired math when the license was revoked', () => {
    const machine: MachineRecord = { firstSeen: '2026-09-01T00:00:00.000Z', lastSeen: NOW, licenseKey: 'POUI-KEY' };
    const license: LicenseRecord = { email: 'dev@example.com', status: 'revoked', createdAt: NOW, boundMachineHash: HASH };
    assert.deepStrictEqual(resolveStatus(machine, license, HASH, NOW), { tier: 'trial', daysLeft: TRIAL_DAYS - 5 });
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
