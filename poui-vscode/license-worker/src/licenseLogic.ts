export const TRIAL_DAYS = 14;
export const TRIAL_CREDIT_BUDGET = 40;

export const PLAN_DAYS = { mensal: 30, trimestral: 90, anual: 365 } as const;
export type PlanId = keyof typeof PLAN_DAYS;

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
  expiresAt: string;
  notifiedExpiredAt: string | null;
}

export type LicenseTier = 'trial' | 'paid' | 'expired' | 'unknown';

export interface StatusResult {
  tier: LicenseTier;
  daysLeft?: number;
  usedPct?: number;
  licenseKey?: string;
  daysUntilExpiry?: number;
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

/** Whole days from `nowIso` to a future `targetIso`, never negative.
 * General-purpose — unlike `computeDaysLeft`, this has no built-in cap
 * (the trial's cap is always 14 days; a paid license's `expiresAt` can be
 * up to 365 days out for an annual plan, so reusing computeDaysLeft here
 * would silently truncate at 14). */
export function computeDaysUntil(targetIso: string, nowIso: string): number {
  const target = new Date(targetIso).getTime();
  const now = new Date(nowIso).getTime();
  const elapsedDays = Math.floor((target - now) / (1000 * 60 * 60 * 24));
  return Math.max(0, elapsedDays);
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

/** true only the first time an active license is seen past its
 * expiresAt — never true again for the same expiry, even called
 * repeatedly (same idempotent-flag spirit as `firstUsedAt` for the
 * trial: set once, never rewritten until the next renewal zeroes it).
 *
 * Uses `!license.notifiedExpiredAt` rather than `=== null`: a legacy
 * LicenseRecord (same kind grandfathered in by resolveStatus's
 * `!license.expiresAt` check) has `notifiedExpiredAt` genuinely
 * `undefined`, not `null`, in its stored JSON. If such a record later
 * gets `expiresAt` backfilled without also explicitly setting
 * `notifiedExpiredAt` to `null`, a strict `=== null` check would stay
 * `false` forever (undefined never becomes null on its own) — silently
 * and permanently disabling the expiry email for that license. */
export function shouldNotifyExpiry(license: LicenseRecord | undefined, nowIso: string): boolean {
  return (
    license !== undefined &&
    license.status === 'active' &&
    nowIso >= license.expiresAt &&
    !license.notifiedExpiredAt
  );
}

/** New expiresAt after a renewal. If the current expiresAt is still in
 * the future, the plan's days are added on top of it (no paid day is
 * lost by renewing early). If it already lapsed, there is no "time
 * left" to add to — the new period counts from now instead. */
export function computeRenewedExpiresAt(currentExpiresAt: string, planDays: number, nowIso: string): string {
  const base = currentExpiresAt > nowIso ? currentExpiresAt : nowIso;
  const baseMs = new Date(base).getTime();
  return new Date(baseMs + planDays * 24 * 60 * 60 * 1000).toISOString();
}

/** Dev/test machines (comma-separated `machineHash` list, kept server-side
 * as a Worker secret — never in source control, never reachable from a
 * client) always resolve to unlimited paid access, bypassing trial/credits/
 * license entirely. Whitespace around each hash is trimmed so the secret
 * can be formatted with spaces after commas without breaking the match. */
export function isDevMachine(machineHash: string, devHashesCsv: string | undefined): boolean {
  if (!devHashesCsv) {
    return false;
  }
  return devHashesCsv
    .split(',')
    .map((hash) => hash.trim())
    .filter(Boolean)
    .includes(machineHash);
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
  if (
    machine.licenseKey &&
    license &&
    license.status === 'active' &&
    license.boundMachineHash === machineHash &&
    // Um LicenseRecord gravado antes desta feature não tem `expiresAt` no
    // JSON salvo (undefined, não uma string) — sem o `!license.expiresAt`,
    // `nowIso < undefined` é sempre `false` em JS, o que bloquearia
    // imediatamente qualquer cliente pagante já existente assim que este
    // deploy saísse. Ausente = licença permanente (grandfather-in), do
    // mesmo jeito que ela já funcionava antes desta feature existir —
    // só passa a ter prazo de verdade depois de uma renovação de verdade
    // (issue-license.mjs --renew), que sempre grava um expiresAt real.
    (!license.expiresAt || nowIso < license.expiresAt)
  ) {
    return {
      tier: 'paid',
      licenseKey: machine.licenseKey,
      ...(license.expiresAt ? { daysUntilExpiry: computeDaysUntil(license.expiresAt, nowIso) } : {}),
    };
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

/** `license.expiresAt &&` is deliberate: a license with no `expiresAt` at
 * all (the grandfathered-in legacy case from resolveStatus's emergency
 * fix) must NOT be rejected here — it keeps working exactly as it did
 * before this whole feature existed. Only a license with a real, past
 * `expiresAt` is rejected, with the distinct 'expired_key' reason so the
 * extension can tell "bad key" apart from "key expired". */
export function shouldActivate(license: LicenseRecord | undefined, nowIso: string): { ok: boolean; reason?: string } {
  if (!license || license.status !== 'active') {
    return { ok: false, reason: 'invalid_key' };
  }
  if (license.expiresAt && nowIso >= license.expiresAt) {
    return { ok: false, reason: 'expired_key' };
  }
  return { ok: true };
}
