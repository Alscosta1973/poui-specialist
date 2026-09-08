export const TRIAL_DAYS = 14;
export const TRIAL_CREDIT_BUDGET = 40;

export interface MachineRecord {
  firstSeen: string;
  lastSeen: string;
  licenseKey: string | null;
  firstUsedAt: string | null;
  creditsUsed: number;
}

export interface LicenseRecord {
  email: string;
  status: 'active' | 'revoked';
  createdAt: string;
  boundMachineHash: string | null;
}

export type LicenseTier = 'trial' | 'paid' | 'expired' | 'unknown';

export interface StatusResult {
  tier: LicenseTier;
  daysLeft?: number;
  usedPct?: number;
  licenseKey?: string;
}

export function computeDaysLeft(firstUsedAtIso: string, nowIso: string, trialDays: number = TRIAL_DAYS): number {
  const firstUsedAt = new Date(firstUsedAtIso).getTime();
  const now = new Date(nowIso).getTime();
  const elapsedDays = Math.floor((now - firstUsedAt) / (1000 * 60 * 60 * 24));
  return Math.max(0, trialDays - elapsedDays);
}

/** % of the 14-day window elapsed since firstUsedAt. 0 while the trial
 * hasn't started yet — days only start counting on the first paid-command
 * use, not on install. `undefined` (not just `null`) must be treated the
 * same as "not started": a MachineRecord written by pre-this-feature code
 * has no `firstUsedAt` key in its stored JSON at all, so it reads back as
 * `undefined`, not `null` — missing this would leave that record's day
 * clock permanently stuck at 0%, and since usedPct is a max() over both
 * axes, a NaN here would poison the credit axis too and the trial could
 * never expire. */
export function computeDaysUsedPct(firstUsedAt: string | null | undefined, nowIso: string, trialDays: number = TRIAL_DAYS): number {
  if (!firstUsedAt) {
    return 0;
  }
  const daysLeft = computeDaysLeft(firstUsedAt, nowIso, trialDays);
  const pct = ((trialDays - daysLeft) / trialDays) * 100;
  return Math.min(100, Math.max(0, Math.round(pct)));
}

/** % of the credit budget consumed. Guards against non-finite `creditsUsed`
 * (e.g. a legacy record where the field is `undefined`, or was corrupted by
 * a NaN making it through `clampCredits` before that was hardened) and
 * against a non-positive `budget` — both return 0 rather than propagating
 * NaN, which would otherwise poison usedPct's max() and disable expiry. */
export function computeCreditsUsedPct(creditsUsed: number, budget: number = TRIAL_CREDIT_BUDGET): number {
  if (!Number.isFinite(creditsUsed) || !(budget > 0)) {
    return 0;
  }
  const pct = (creditsUsed / budget) * 100;
  return Math.min(100, Math.max(0, Math.round(pct)));
}

/** Server-side defense in depth — never trust the credit weight a client
 * sends verbatim. Valid weights are 1-3 (see poui.effort mapping in the
 * extension's licenseCheck.ts); anything else is clamped into that range.
 * Also guards against NaN-producing input (missing/non-numeric `credits`
 * in the request body) — without this, `machine.creditsUsed += NaN`
 * corrupts the stored value to NaN (serialized as `null`), silently
 * neutralizing credit tracking for that machine forever. */
export function clampCredits(credits: number): number {
  const rounded = Math.round(credits);
  if (Number.isNaN(rounded)) {
    return 1;
  }
  return Math.min(3, Math.max(1, rounded));
}

export function resolveStatus(
  machine: MachineRecord | undefined,
  license: LicenseRecord | undefined,
  machineHash: string,
  nowIso: string,
): StatusResult {
  if (!machine) {
    return { tier: 'unknown' };
  }
  if (machine.licenseKey && license && license.status === 'active' && license.boundMachineHash === machineHash) {
    return { tier: 'paid', licenseKey: machine.licenseKey };
  }
  const daysUsedPct = computeDaysUsedPct(machine.firstUsedAt, nowIso);
  const creditsUsedPct = computeCreditsUsedPct(machine.creditsUsed);
  const usedPct = Math.max(daysUsedPct, creditsUsedPct);
  if (usedPct >= 100) {
    return { tier: 'expired' };
  }
  const daysLeft = machine.firstUsedAt ? computeDaysLeft(machine.firstUsedAt, nowIso) : TRIAL_DAYS;
  return { tier: 'trial', daysLeft, usedPct };
}

export function shouldActivate(license: LicenseRecord | undefined): { ok: boolean; reason?: string } {
  if (!license || license.status !== 'active') {
    return { ok: false, reason: 'invalid_key' };
  }
  return { ok: true };
}
