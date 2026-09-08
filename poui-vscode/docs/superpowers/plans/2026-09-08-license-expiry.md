# Expiração, Bloqueio, E-mail de Vencimento e Emissão de Licença — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add subscription expiry to paid licenses (`expiresAt`), block automatically when expired (reusing the fallback path already built for revoked licenses), notify the author by e-mail on first detection of an expired subscription, and add a CLI script to issue/renew keys instead of hand-editing KV JSON.

**Architecture:** `license-worker/src/licenseLogic.ts` gains the pure date/eligibility math (expiry check, notify-once eligibility, renewal date math); `worker.ts` wires that into the two HTTP handlers that already read a `LicenseRecord` and adds a best-effort call to the Resend API; a new local-only CLI script (`license-worker/scripts/issue-license.mjs`) replaces manual `wrangler kv key put` JSON editing; the extension (`poui-vscode/src/`) extends the existing trial-expiry-warning UI pattern to also cover a paid license nearing its own expiry.

**Tech Stack:** TypeScript, Cloudflare Workers + KV, `mocha`/`ts-node` (Worker unit tests), plain Node ESM (`scripts/issue-license.mjs`, no build step), Resend HTTP API (transactional e-mail), `wrangler` CLI.

**Spec:** `poui-vscode/docs/superpowers/specs/2026-09-08-vscode-license-expiry-design.md`

## Global Constraints

- Plan durations, fixed days: `mensal` = 30, `trimestral` = 90, `anual` = 365.
- A license only stays `tier: 'paid'` while `status === 'active'` AND `boundMachineHash` matches AND `now < expiresAt` — all three, same as today's first two plus the new third.
- Renewal before expiry **extends** `expiresAt` (adds plan days to the *current* `expiresAt`, no paid day lost). Renewal after expiry (lapsed) bases the new `expiresAt` on **now**, not the stale past date.
- The expiry e-mail to the author fires **at most once per expiry** — gated by `notifiedExpiredAt`, mirroring the existing `firstUsedAt` idempotent-flag pattern already in this codebase.
- The e-mail call is best-effort and never blocks or affects the license's blocked/allowed status — blocking already happened via `resolveStatus` before the e-mail is even attempted.
- Renewal only ever touches `expiresAt` and `notifiedExpiredAt` on a `LicenseRecord` — never `status` or `boundMachineHash` (a revoked license renewing does NOT silently become active again; that stays a separate, deliberate action).
- Server (`resolveStatus`) always returns the raw `daysUntilExpiry` for a paid tier — the client decides the warning threshold, same split already used for trial `usedPct`.
- No new build step for `scripts/issue-license.mjs` — plain Node ESM, run directly with `node`, no bundler/TS compile.

---

### Task 1: Worker — expiry, notify-eligibility and renewal math in `licenseLogic.ts`

**Files:**
- Modify: `poui-vscode/license-worker/src/licenseLogic.ts`
- Test: `poui-vscode/license-worker/test/licenseLogic.test.ts`

**Interfaces:**
- Produces: `LicenseRecord` (gains `expiresAt: string`, `notifiedExpiredAt: string | null`), `PLAN_DAYS: Record<'mensal'|'trimestral'|'anual', number>`, `PlanId`, `StatusResult` (gains `daysUntilExpiry?: number`), `computeDaysUntil(targetIso: string, nowIso: string): number`, `shouldNotifyExpiry(license: LicenseRecord | undefined, nowIso: string): boolean`, `computeRenewedExpiresAt(currentExpiresAt: string, planDays: number, nowIso: string): string`, updated `resolveStatus(...)`.

- [ ] **Step 1: Write the failing tests**

Replace the full contents of `poui-vscode/license-worker/test/licenseLogic.test.ts` with:

```typescript
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
});

describe('shouldActivate', () => {
  it('rejects when the license key does not exist', () => {
    assert.deepStrictEqual(shouldActivate(undefined), { ok: false, reason: 'invalid_key' });
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
    assert.deepStrictEqual(shouldActivate(license), { ok: false, reason: 'invalid_key' });
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
    assert.deepStrictEqual(shouldActivate(license), { ok: true });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run (from `poui-vscode/license-worker/`): `npm test`
Expected: compile errors — `computeDaysUntil`, `shouldNotifyExpiry`, `computeRenewedExpiresAt`, `PLAN_DAYS` not exported from `../src/licenseLogic`, and `LicenseRecord` literals missing `expiresAt`/`notifiedExpiredAt` fail to type-check.

- [ ] **Step 3: Implement `licenseLogic.ts`**

Replace the full contents of `poui-vscode/license-worker/src/licenseLogic.ts` with:

```typescript
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
 * trial: set once, never rewritten until the next renewal zeroes it). */
export function shouldNotifyExpiry(license: LicenseRecord | undefined, nowIso: string): boolean {
  return (
    license !== undefined &&
    license.status === 'active' &&
    nowIso >= license.expiresAt &&
    license.notifiedExpiredAt === null
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
    nowIso < license.expiresAt
  ) {
    return {
      tier: 'paid',
      licenseKey: machine.licenseKey,
      daysUntilExpiry: computeDaysUntil(license.expiresAt, nowIso),
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

export function shouldActivate(license: LicenseRecord | undefined): { ok: boolean; reason?: string } {
  if (!license || license.status !== 'active') {
    return { ok: false, reason: 'invalid_key' };
  }
  return { ok: true };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run (from `poui-vscode/license-worker/`): `npm test`
Expected: all tests pass (existing + new).

- [ ] **Step 5: Type-check**

Run (from `poui-vscode/license-worker/`): `npm run typecheck`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add poui-vscode/license-worker/src/licenseLogic.ts poui-vscode/license-worker/test/licenseLogic.test.ts
git commit -m "feat(license-worker): add expiry, notify-eligibility and renewal math

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01K77S8diJJpHAV1RdsNJS6r"
```

---

### Task 2: Worker — wire expiry blocking and the Resend notification into `worker.ts`

**Files:**
- Modify: `poui-vscode/license-worker/src/worker.ts`

**Interfaces:**
- Consumes: `shouldNotifyExpiry`, `resolveStatus`, `shouldActivate`, `clampCredits`, `MachineRecord`, `LicenseRecord` from `./licenseLogic` (Task 1) — `resolveStatus` already enforces the expiry block internally, this task doesn't re-implement blocking, only wires the notification.
- Produces: `Env` gains `RESEND_API_KEY: string`. No new HTTP routes — `/license/status` and `/trial/consume` gain a best-effort side effect.

- [ ] **Step 1: Replace the full contents of `worker.ts`**

```typescript
import { resolveStatus, shouldActivate, clampCredits, shouldNotifyExpiry, MachineRecord, LicenseRecord } from './licenseLogic';

export interface Env {
  LICENSES: KVNamespace;
  RESEND_API_KEY: string;
}

async function readJson<T>(kv: KVNamespace, key: string): Promise<T | undefined> {
  const raw = await kv.get(key);
  return raw ? (JSON.parse(raw) as T) : undefined;
}

async function writeJson(kv: KVNamespace, key: string, value: unknown): Promise<void> {
  await kv.put(key, JSON.stringify(value));
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function emptyMachineRecord(now: string): MachineRecord {
  return { firstSeen: now, lastSeen: now, licenseKey: null, firstUsedAt: null, creditsUsed: 0 };
}

async function sendExpiryEmail(apiKey: string, license: LicenseRecord): Promise<void> {
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'PO-UI Specialist <onboarding@resend.dev>',
      to: 'andre.andrelscosta@gmail.com',
      subject: `PO-UI: licença de ${license.email} expirou`,
      text: `A licença de ${license.email} (venceu em ${license.expiresAt}) expirou e o acesso pago foi bloqueado automaticamente.`,
    }),
  });
}

/** Best-effort — o bloqueio da licença já aconteceu via resolveStatus,
 * independente disso. Uma falha aqui (Resend fora do ar, chave inválida)
 * não impede nada além do aviso em si; `notifiedExpiredAt` é marcado
 * mesmo assim, pra não tentar reenviar a cada request se o Resend
 * estiver fora do ar. */
async function notifyIfExpired(env: Env, license: LicenseRecord, licenseKey: string, nowIso: string): Promise<void> {
  if (!shouldNotifyExpiry(license, nowIso)) {
    return;
  }
  try {
    await sendExpiryEmail(env.RESEND_API_KEY, license);
  } catch {
    // best-effort — ver comentário acima da função.
  }
  license.notifiedExpiredAt = nowIso;
  await writeJson(env.LICENSES, `license:${licenseKey}`, license);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const now = new Date().toISOString();

    if (url.pathname === '/trial/start' && request.method === 'POST') {
      const { machineHash } = (await request.json()) as { machineHash: string };
      const key = `machine:${machineHash}`;
      let machine = await readJson<MachineRecord>(env.LICENSES, key);
      if (!machine) {
        machine = emptyMachineRecord(now);
      } else {
        machine.lastSeen = now;
      }
      await writeJson(env.LICENSES, key, machine);
      const license = machine.licenseKey
        ? await readJson<LicenseRecord>(env.LICENSES, `license:${machine.licenseKey}`)
        : undefined;
      return jsonResponse(resolveStatus(machine, license, machineHash, now));
    }

    if (url.pathname === '/trial/consume' && request.method === 'POST') {
      const { machineHash, credits } = (await request.json()) as { machineHash: string; credits: number };
      const key = `machine:${machineHash}`;
      const machine = await readJson<MachineRecord>(env.LICENSES, key);
      if (!machine) {
        return jsonResponse({ tier: 'unknown' });
      }
      const license = machine.licenseKey
        ? await readJson<LicenseRecord>(env.LICENSES, `license:${machine.licenseKey}`)
        : undefined;
      if (license && machine.licenseKey) {
        await notifyIfExpired(env, license, machine.licenseKey, now);
      }
      const currentStatus = resolveStatus(machine, license, machineHash, now);
      if (currentStatus.tier === 'paid') {
        // Licença paga nunca consome nada — devolve o status pago sem gravar.
        return jsonResponse(currentStatus);
      }
      if (!machine.firstUsedAt) {
        machine.firstUsedAt = now;
      }
      // Um registro escrito antes desta feature não tem `creditsUsed` no
      // JSON salvo (undefined, não 0) — sem esse guard, `undefined += n`
      // vira NaN e corrompe o campo permanentemente a partir da 1ª chamada.
      const creditsUsedSoFar = Number.isFinite(machine.creditsUsed) ? machine.creditsUsed : 0;
      machine.creditsUsed = creditsUsedSoFar + clampCredits(credits);
      machine.lastSeen = now;
      await writeJson(env.LICENSES, key, machine);
      return jsonResponse(resolveStatus(machine, license, machineHash, now));
    }

    if (url.pathname === '/license/status' && request.method === 'GET') {
      const machineHash = url.searchParams.get('machineHash') ?? '';
      const machine = await readJson<MachineRecord>(env.LICENSES, `machine:${machineHash}`);
      const license = machine?.licenseKey
        ? await readJson<LicenseRecord>(env.LICENSES, `license:${machine.licenseKey}`)
        : undefined;
      if (license && machine?.licenseKey) {
        await notifyIfExpired(env, license, machine.licenseKey, now);
      }
      return jsonResponse(resolveStatus(machine, license, machineHash, now));
    }

    if (url.pathname === '/license/activate' && request.method === 'POST') {
      const { machineHash, licenseKey } = (await request.json()) as { machineHash: string; licenseKey: string };
      const license = await readJson<LicenseRecord>(env.LICENSES, `license:${licenseKey}`);
      const check = shouldActivate(license);
      if (!check.ok || !license) {
        return jsonResponse({ ok: false, reason: check.reason }, 400);
      }
      license.boundMachineHash = machineHash;
      await writeJson(env.LICENSES, `license:${licenseKey}`, license);
      const machine = (await readJson<MachineRecord>(env.LICENSES, `machine:${machineHash}`)) ?? emptyMachineRecord(now);
      machine.licenseKey = licenseKey;
      await writeJson(env.LICENSES, `machine:${machineHash}`, machine);
      return jsonResponse({ ok: true, tier: 'paid' });
    }

    return jsonResponse({ error: 'not_found' }, 404);
  },
};
```

- [ ] **Step 2: Type-check**

Run (from `poui-vscode/license-worker/`): `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Create a local secret file for manual testing**

Create `poui-vscode/license-worker/.dev.vars` (this file is already covered by the existing `.gitignore` in `license-worker/` — verify with `cat .gitignore` that it excludes `.dev.vars` or `*.vars`; if not already excluded, add a `.dev.vars` line to `poui-vscode/license-worker/.gitignore` before proceeding, since this file will hold a placeholder secret and must never be committed):

```
RESEND_API_KEY=dummy-key-for-local-testing-only
```

This lets `wrangler dev` run without crashing on a missing binding. The dummy key means `sendExpiryEmail` will fail (a 401 from Resend), which is fine — `notifyIfExpired`'s `try/catch` swallows that, and the manual test below verifies the *blocking* and *notifiedExpiredAt persistence* behavior, not real e-mail delivery (that's verified later, in Task 5, against the real deployed Worker with a real key).

- [ ] **Step 4: Manual verification with `wrangler dev` + `curl`**

In one terminal, from `poui-vscode/license-worker/`, run: `npm run dev`
Wait for it to print the local URL (typically `http://localhost:8787`).

In another terminal, run this sequence (replace `8787` if wrangler picked a different port). Local `wrangler dev` uses a local-only KV simulation (not the real remote KV), so seed test data with `wrangler kv key put --local`:

```bash
# 1. Seed a machine bound to an already-expired paid license. firstUsedAt is
#    null (not a fixed past date) so the trial-fallback result is
#    deterministic (a fresh trial) no matter what real wall-clock date this
#    is actually run on.
node -e "console.log(JSON.stringify({firstSeen:'2026-01-01T00:00:00.000Z',lastSeen:'2026-01-01T00:00:00.000Z',licenseKey:'POUI-TEST-EXPIRED',firstUsedAt:null,creditsUsed:0}))" > /tmp/machine.json
npx wrangler kv key put "machine:test-expired-license" --path /tmp/machine.json --binding=LICENSES --local

node -e "const now=new Date(); const past=new Date(now.getTime()-24*60*60*1000).toISOString(); console.log(JSON.stringify({email:'cliente@teste.com',status:'active',createdAt:'2026-01-01T00:00:00.000Z',boundMachineHash:'test-expired-license',expiresAt:past,notifiedExpiredAt:null}))" > /tmp/license.json
npx wrangler kv key put "license:POUI-TEST-EXPIRED" --path /tmp/license.json --binding=LICENSES --local

# 2. First status check: should be blocked (falls back to a fresh trial), and notifiedExpiredAt should get set
curl -s "http://localhost:8787/license/status?machineHash=test-expired-license"
# Expected exactly: {"tier":"trial","daysLeft":14,"usedPct":0} — the key check is tier is NOT "paid"

# 3. Confirm notifiedExpiredAt was persisted (so a 2nd check doesn't retry the e-mail)
npx wrangler kv key get "license:POUI-TEST-EXPIRED" --binding=LICENSES --local
# Expected: the JSON now has "notifiedExpiredAt" set to a real timestamp, not null

# 4. A still-valid paid license (not expired) should stay paid, with daysUntilExpiry
node -e "console.log(JSON.stringify({firstSeen:'2026-01-01T00:00:00.000Z',lastSeen:'2026-01-01T00:00:00.000Z',licenseKey:'POUI-TEST-VALID',firstUsedAt:null,creditsUsed:0}))" > /tmp/machine2.json
npx wrangler kv key put "machine:test-valid-license" --path /tmp/machine2.json --binding=LICENSES --local

node -e "const now=new Date(); const future=new Date(now.getTime()+30*24*60*60*1000).toISOString(); console.log(JSON.stringify({email:'cliente2@teste.com',status:'active',createdAt:'2026-01-01T00:00:00.000Z',boundMachineHash:'test-valid-license',expiresAt:future,notifiedExpiredAt:null}))" > /tmp/license2.json
npx wrangler kv key put "license:POUI-TEST-VALID" --path /tmp/license2.json --binding=LICENSES --local

curl -s "http://localhost:8787/license/status?machineHash=test-valid-license"
# Expected: {"tier":"paid","licenseKey":"POUI-TEST-VALID","daysUntilExpiry":30} (approximately — 29 or 30 depending on exact timing, both acceptable)

npx wrangler kv key get "license:POUI-TEST-VALID" --binding=LICENSES --local
# Expected: "notifiedExpiredAt" is still null — a valid license never gets notified
```

Confirm each response matches (allowing for the small day-count variance noted). Stop the `wrangler dev` process (Ctrl+C) when done. `--local` KV data lives only in `.wrangler/state/` (already gitignored, per the existing `license-worker/.gitignore`) — no cleanup of remote data needed since none of this touched the real deployed Worker.

- [ ] **Step 5: Commit**

```bash
git add poui-vscode/license-worker/src/worker.ts poui-vscode/license-worker/.gitignore poui-vscode/license-worker/.dev.vars
git commit -m "feat(license-worker): block expired paid licenses and notify the author once via e-mail

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01K77S8diJJpHAV1RdsNJS6r"
```

If `.dev.vars` was already covered by an existing `.gitignore` pattern before this task (verify with `git status` — it should NOT appear as untracked/staged), omit it from the `git add` above; only add `.gitignore` if you actually had to change it.

---

### Task 3: Worker — `scripts/issue-license.mjs` CLI for issuing and renewing keys

**Files:**
- Create: `poui-vscode/license-worker/scripts/issue-license.mjs`
- Modify: `poui-vscode/license-worker/package.json` (add a `license` script entry)

**Interfaces:**
- Consumes: nothing from Task 1/2's TypeScript exports (this is a plain Node script, no TS import — see note below on why `computeRenewedExpiresAt`'s tiny date-math is intentionally duplicated here rather than imported).
- Produces: a runnable CLI (`node scripts/issue-license.mjs --new ...` / `--renew ...`), and `npm run license -- <same args>` as a convenience wrapper.

- [ ] **Step 1: Create `scripts/issue-license.mjs`**

```javascript
#!/usr/bin/env node
// license-worker/scripts/issue-license.mjs
//
// Emite ou renova uma chave de licença paga sem editar JSON à mão no KV.
//
// Uso:
//   node scripts/issue-license.mjs --new --email cliente@empresa.com --plan mensal
//   node scripts/issue-license.mjs --renew POUI-XXXX-XXXX-XXXX --plan anual
//
// computeRenewedExpiresAt abaixo é uma cópia deliberada da função de mesmo
// nome em src/licenseLogic.ts — este script roda direto com `node`, sem
// passo de build, então importar do TypeScript exigiria um loader (ts-node
// ESM) só pra uma função de 3 linhas. Se a regra de renovação mudar,
// atualize os dois lugares (o teste de licenseLogic.test.ts pega qualquer
// regressão no comportamento "de verdade", usado pelo Worker; este é só um
// script local, supervisionado por humano a cada execução).

import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const PLAN_DAYS = { mensal: 30, trimestral: 90, anual: 365 };

function parseArgs(argv) {
  const args = { mode: null, email: null, plan: null, key: null };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--new') {
      args.mode = 'new';
    } else if (arg === '--renew') {
      args.mode = 'renew';
      args.key = argv[++i];
    } else if (arg === '--email') {
      args.email = argv[++i];
    } else if (arg === '--plan') {
      args.plan = argv[++i];
    }
  }
  return args;
}

function generateKey() {
  const block = () => randomBytes(3).toString('hex').toUpperCase().slice(0, 4);
  return `POUI-${block()}-${block()}-${block()}`;
}

function computeRenewedExpiresAt(currentExpiresAt, planDays, nowIso) {
  const base = currentExpiresAt > nowIso ? currentExpiresAt : nowIso;
  const baseMs = new Date(base).getTime();
  return new Date(baseMs + planDays * 24 * 60 * 60 * 1000).toISOString();
}

function kvPut(key, value) {
  const tempPath = join(tmpdir(), `poui-license-${Date.now()}.json`);
  writeFileSync(tempPath, JSON.stringify(value), 'utf8');
  try {
    execFileSync(
      'npx',
      ['wrangler', 'kv', 'key', 'put', key, '--path', tempPath, '--binding=LICENSES', '--remote'],
      { stdio: 'inherit', shell: true },
    );
  } finally {
    unlinkSync(tempPath);
  }
}

function kvGet(key) {
  const raw = execFileSync(
    'npx',
    ['wrangler', 'kv', 'key', 'get', key, '--binding=LICENSES', '--remote'],
    { encoding: 'utf8', shell: true },
  );
  return JSON.parse(raw);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const now = new Date().toISOString();

  if (!args.plan || !(args.plan in PLAN_DAYS)) {
    console.error(`--plan é obrigatório e precisa ser um de: ${Object.keys(PLAN_DAYS).join(', ')}`);
    process.exit(1);
  }
  const planDays = PLAN_DAYS[args.plan];

  if (args.mode === 'new') {
    if (!args.email) {
      console.error('--email é obrigatório com --new');
      process.exit(1);
    }
    const key = generateKey();
    const expiresAt = new Date(new Date(now).getTime() + planDays * 24 * 60 * 60 * 1000).toISOString();
    const record = {
      email: args.email,
      status: 'active',
      createdAt: now,
      boundMachineHash: null,
      expiresAt,
      notifiedExpiredAt: null,
    };
    kvPut(`license:${key}`, record);
    console.log(`Chave criada: ${key}`);
    console.log(`Expira em: ${expiresAt}`);
    return;
  }

  if (args.mode === 'renew') {
    if (!args.key) {
      console.error('--renew precisa da chave como argumento seguinte (ex: --renew POUI-XXXX-XXXX-XXXX)');
      process.exit(1);
    }
    const record = kvGet(`license:${args.key}`);
    const newExpiresAt = computeRenewedExpiresAt(record.expiresAt, planDays, now);
    record.expiresAt = newExpiresAt;
    record.notifiedExpiredAt = null;
    kvPut(`license:${args.key}`, record);
    console.log(`Chave renovada: ${args.key}`);
    console.log(`Novo vencimento: ${newExpiresAt}`);
    return;
  }

  console.error('Uso:');
  console.error('  node scripts/issue-license.mjs --new --email <email> --plan <mensal|trimestral|anual>');
  console.error('  node scripts/issue-license.mjs --renew <chave> --plan <mensal|trimestral|anual>');
  process.exit(1);
}

main();
```

- [ ] **Step 2: Add the `license` script entry to `package.json`**

In `poui-vscode/license-worker/package.json`, add to the `"scripts"` object:

```json
"license": "node scripts/issue-license.mjs"
```

(So it can be run either directly with `node scripts/issue-license.mjs --new ...` or via `npm run license -- --new ...`.)

- [ ] **Step 3: Manual verification against the real deployed Worker**

This writes to the **real production KV** (there is no `--local` KV separate from what the deployed Worker reads for `/license/*` — `--remote` is required here, matching how the script itself calls `wrangler kv key put/get`). Use an obviously-fake test e-mail and delete the test record when done, same discipline already used earlier this session for the trial-cap live verification.

```bash
node scripts/issue-license.mjs --new --email teste-issue-script@example.com --plan mensal
# Expected: prints "Chave criada: POUI-XXXX-XXXX-XXXX" and an expiresAt ~30 days out. Note the printed key.

npx wrangler kv key get "license:<the key just printed>" --binding=LICENSES --remote
# Expected: the full JSON record, status "active", expiresAt ~30 days out, notifiedExpiredAt null

node scripts/issue-license.mjs --renew <the key just printed> --plan trimestral
# Expected: prints "Chave renovada" and a new expiresAt ~30+90=120 days out from the original creation
# (since the mensal period hadn't lapsed yet, the trimestral renewal adds on top of it, not from today)

npx wrangler kv key get "license:<the key just printed>" --binding=LICENSES --remote
# Expected: expiresAt matches the renewed value; notifiedExpiredAt is null (was already null, renewal keeps it null)

# Clean up — this was a throwaway test key, not a real customer
npx wrangler kv key delete "license:<the key just printed>" --binding=LICENSES --remote
```

Confirm every step's actual output matches what's expected above before moving on.

- [ ] **Step 4: Commit**

```bash
git add poui-vscode/license-worker/scripts/issue-license.mjs poui-vscode/license-worker/package.json
git commit -m "feat(license-worker): add issue-license.mjs CLI for creating and renewing keys

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01K77S8diJJpHAV1RdsNJS6r"
```

---

### Task 4: Extension — `daysUntilExpiry`, renewal-warning helpers and status bar in `licenseCheck.ts`

**Files:**
- Modify: `poui-vscode/src/licenseCheck.ts`
- Test: `poui-vscode/src/test/unit/licenseCheck.test.ts`

**Interfaces:**
- Produces: `LicenseStatus` (gains `daysUntilExpiry?: number`), `PAID_RENEWAL_WARNING_THRESHOLD_DAYS: number`, `shouldShowRenewalWarning(status: LicenseStatus | undefined, thresholdDays: number): boolean`, updated `formatStatusBarItem` (new paid-nearing-expiry branch).
- Consumes: nothing new — same file already has everything else it needs.

- [ ] **Step 1: Write the failing tests**

In `poui-vscode/src/test/unit/licenseCheck.test.ts`, add `shouldShowRenewalWarning` and `PAID_RENEWAL_WARNING_THRESHOLD_DAYS` to the existing import block (keep every other imported name unchanged):

```typescript
import {
  computeMachineHash,
  isPlaceholderMachineId,
  isAccessAllowed,
  isCacheFresh,
  shouldShowExpiryWarning,
  shouldShowRenewalWarning,
  formatPaidBadge,
  formatStatusBarItem,
  effortToCredits,
  PAID_RENEWAL_WARNING_THRESHOLD_DAYS,
  fetchTrialStart,
  fetchLicenseStatus,
  fetchConsumeCredits,
  activateLicenseKey,
} from '../../licenseCheck';
```

Add these new `describe` blocks (place them right after the existing `shouldShowExpiryWarning` block; leave every existing block, including `formatStatusBarItem`'s current tests, untouched — you're adding to that block, not replacing it, see Step 1b below):

```typescript
describe('shouldShowRenewalWarning', () => {
  it('warns when daysUntilExpiry is at or below the threshold', () => {
    assert.strictEqual(shouldShowRenewalWarning({ tier: 'paid', daysUntilExpiry: 7 }, 7), true);
    assert.strictEqual(shouldShowRenewalWarning({ tier: 'paid', daysUntilExpiry: 1 }, 7), true);
  });

  it('does not warn when daysUntilExpiry is above the threshold', () => {
    assert.strictEqual(shouldShowRenewalWarning({ tier: 'paid', daysUntilExpiry: 8 }, 7), false);
  });

  it('does not warn for a trial, regardless of any field', () => {
    assert.strictEqual(shouldShowRenewalWarning({ tier: 'trial', usedPct: 99 }, 7), false);
  });

  it('does not warn when there is no status or no daysUntilExpiry yet', () => {
    assert.strictEqual(shouldShowRenewalWarning(undefined, 7), false);
    assert.strictEqual(shouldShowRenewalWarning({ tier: 'paid' }, 7), false);
  });
});
```

Step 1b — extend the EXISTING `formatStatusBarItem` describe block (do not create a second one) by adding these two `it`s inside it, after its last existing `it`:

```typescript
  it('shows a warning-severity renewal nudge for a paid license nearing expiry', () => {
    const presentation = formatStatusBarItem({ tier: 'paid', daysUntilExpiry: 5 });
    assert.strictEqual(presentation?.severity, 'warning');
    assert.match(presentation!.text, /5d/);
  });

  it('stays hidden for a paid license that is not near expiry', () => {
    assert.strictEqual(formatStatusBarItem({ tier: 'paid', daysUntilExpiry: 30 }), undefined);
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run (from `poui-vscode/`): `npm run test:unit`
Expected: FAIL — `shouldShowRenewalWarning`/`PAID_RENEWAL_WARNING_THRESHOLD_DAYS` not exported, and the two new `formatStatusBarItem` assertions fail against the current implementation (which returns `undefined` unconditionally for `tier: 'paid'`).

- [ ] **Step 3: Implement the changes in `licenseCheck.ts`**

Add `daysUntilExpiry` to the interface:

```typescript
export interface LicenseStatus {
  tier: LicenseTier;
  daysLeft?: number;
  usedPct?: number;
  licenseKey?: string;
  daysUntilExpiry?: number;
}
```

Add the threshold constant right after `StatusBarPresentation`'s interface declaration (keep `StatusBarSeverity`/`StatusBarPresentation` exactly where they are):

```typescript
export const PAID_RENEWAL_WARNING_THRESHOLD_DAYS = 7;
```

Add, right after `shouldShowExpiryWarning` (keep that function's body unchanged — this is a new sibling, not a replacement):

```typescript
export function shouldShowRenewalWarning(status: LicenseStatus | undefined, thresholdDays: number): boolean {
  return status?.tier === 'paid' && typeof status.daysUntilExpiry === 'number' && status.daysUntilExpiry <= thresholdDays;
}
```

Replace `formatStatusBarItem`'s paid branch (currently `if (status?.tier === 'paid') { return undefined; }`) with:

```typescript
export function formatStatusBarItem(status: LicenseStatus | undefined): StatusBarPresentation | undefined {
  if (status?.tier === 'paid') {
    if (typeof status.daysUntilExpiry === 'number' && status.daysUntilExpiry <= PAID_RENEWAL_WARNING_THRESHOLD_DAYS) {
      return {
        text: `$(clock) PO-UI: licença vence em ${status.daysUntilExpiry}d`,
        tooltip: `PO-UI Specialist — sua licença paga vence em ${status.daysUntilExpiry} dia(s). Clique para renovar.`,
        severity: 'warning',
      };
    }
    return undefined;
  }
  if (status?.tier === 'trial' && typeof status.usedPct === 'number') {
    const severity: StatusBarSeverity = status.usedPct >= 80 ? 'warning' : 'normal';
    return {
      text: `$(clock) PO-UI: trial ${status.usedPct}% usado`,
      tooltip: `PO-UI Specialist — trial: ${status.usedPct}% usado. Clique para ativar ou comprar uma licença.`,
      severity,
    };
  }
  return {
    text: '$(lock) PO-UI: licença',
    tooltip: 'PO-UI Specialist: licença necessária. Clique para ativar ou comprar.',
    severity: 'error',
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run (from `poui-vscode/`): `npm run test:unit`
Expected: all tests pass.

- [ ] **Step 5: Compile**

Run (from `poui-vscode/`): `npm run compile`
Expected: no type errors, `out/extension.js` rebuilt.

- [ ] **Step 6: Commit**

```bash
git add poui-vscode/src/licenseCheck.ts poui-vscode/src/test/unit/licenseCheck.test.ts
git commit -m "feat(vscode-ext): add renewal-warning helpers and paid-expiry status bar nudge

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01K77S8diJJpHAV1RdsNJS6r"
```

---

### Task 5: Extension — wire the renewal warning into `requireLicense.ts`

**Files:**
- Modify: `poui-vscode/src/requireLicense.ts`

**Interfaces:**
- Consumes: `shouldShowRenewalWarning`, `PAID_RENEWAL_WARNING_THRESHOLD_DAYS` (Task 4, `./licenseCheck`).
- Produces: `requireLicense(...)` behavior unchanged from the caller's point of view — this task only adds a paid-tier branch parallel to the existing trial-tier expiry-warning branch.

- [ ] **Step 1: Replace the full contents of `requireLicense.ts`**

```typescript
import * as vscode from 'vscode';
import {
  WORKER_BASE_URL,
  computeMachineHash,
  isPlaceholderMachineId,
  isAccessAllowed,
  isCacheFresh,
  shouldShowExpiryWarning,
  shouldShowRenewalWarning,
  PAID_RENEWAL_WARNING_THRESHOLD_DAYS,
  effortToCredits,
  fetchTrialStart,
  fetchLicenseStatus,
  fetchConsumeCredits,
  LicenseStatus,
} from './licenseCheck';
import { updateLicenseStatusBar } from './licenseStatusBar';
import { buildPurchaseMailto } from './purchaseLink';

const GRACE_PERIOD_MS = 3 * 24 * 60 * 60 * 1000;
const CACHE_KEY = 'poui.licenseStatusCache';
const EXPIRY_WARNING_THRESHOLD_PCT = 80;

let hasShownExpiryWarning = false;

interface CachedStatus {
  status: LicenseStatus;
  fetchedAt: string;
}

let sessionStatus: LicenseStatus | undefined;
let initPromise: Promise<void> | undefined;

export function getCachedLicenseStatus(): LicenseStatus | undefined {
  return sessionStatus;
}

export function setSessionStatus(status: LicenseStatus): void {
  sessionStatus = status;
  updateLicenseStatusBar(sessionStatus);
}

export async function persistConfirmedStatus(context: vscode.ExtensionContext, status: LicenseStatus): Promise<void> {
  setSessionStatus(status);
  await context.globalState.update(CACHE_KEY, { status, fetchedAt: new Date().toISOString() } satisfies CachedStatus);
}

export function initializeLicenseStatus(context: vscode.ExtensionContext): Promise<void> {
  initPromise = (async () => {
    const machineId = vscode.env.machineId;
    if (isPlaceholderMachineId(machineId)) {
      console.warn('PO-UI: machineId não confiável neste ambiente — checagem de licença pode não ser precisa.');
    }
    const machineHash = computeMachineHash(machineId);
    const cached = context.globalState.get<CachedStatus>(CACHE_KEY);

    try {
      const status = cached ? await fetchLicenseStatus(WORKER_BASE_URL, machineHash) : await fetchTrialStart(WORKER_BASE_URL, machineHash);
      sessionStatus = status;
      await context.globalState.update(CACHE_KEY, { status, fetchedAt: new Date().toISOString() } satisfies CachedStatus);
    } catch {
      if (cached && isCacheFresh(cached.fetchedAt, Date.now(), GRACE_PERIOD_MS)) {
        sessionStatus = cached.status;
      } else {
        sessionStatus = { tier: 'unknown' };
      }
    }
    updateLicenseStatusBar(sessionStatus);
  })();
  return initPromise;
}

async function offerPurchaseOrActivate(
  message: string,
  showMessage: typeof vscode.window.showErrorMessage,
  activateLabel: string = 'Ativar Licença',
): Promise<void> {
  const choice = await showMessage(message, activateLabel, 'Comprar Licença');
  if (choice === activateLabel) {
    void vscode.commands.executeCommand('poui.activateLicense');
  } else if (choice === 'Comprar Licença') {
    void vscode.env.openExternal(vscode.Uri.parse(buildPurchaseMailto()));
  }
}

/** Dispara em paralelo, sem travar a liberação do comando que acabou de
 * rodar. Só reporta pra `tier: 'trial'` — licença paga nunca consome
 * crédito (confirmado no design). Uma falha de rede aqui não bloqueia o
 * comando atual: na pior das hipóteses, essa execução específica não é
 * contabilizada no servidor dessa vez. */
function reportCreditUsage(context: vscode.ExtensionContext): void {
  if (sessionStatus?.tier !== 'trial') {
    return;
  }
  const effort = vscode.workspace
    .getConfiguration('poui')
    .get<'low' | 'medium' | 'high' | 'xhigh' | 'max'>('effort', 'high');
  const credits = effortToCredits(effort);
  const machineHash = computeMachineHash(vscode.env.machineId);
  void fetchConsumeCredits(WORKER_BASE_URL, machineHash, credits)
    .then((status) => persistConfirmedStatus(context, status))
    .catch(() => {
      // Rede indisponível — a checagem seguinte tenta de novo, não bloqueia nada agora.
    });
}

export async function requireLicense(context: vscode.ExtensionContext, outputChannel: vscode.OutputChannel): Promise<boolean> {
  if (initPromise) {
    await initPromise;
  }
  if (isAccessAllowed(sessionStatus)) {
    reportCreditUsage(context);
    if (!hasShownExpiryWarning && sessionStatus?.tier === 'trial' && shouldShowExpiryWarning(sessionStatus, EXPIRY_WARNING_THRESHOLD_PCT)) {
      hasShownExpiryWarning = true;
      void offerPurchaseOrActivate(
        `PO-UI: seu trial está em ${sessionStatus.usedPct}% de uso. Ative uma licença paga para continuar usando sem interrupção.`,
        vscode.window.showInformationMessage,
      );
    } else if (!hasShownExpiryWarning && sessionStatus?.tier === 'paid' && shouldShowRenewalWarning(sessionStatus, PAID_RENEWAL_WARNING_THRESHOLD_DAYS)) {
      hasShownExpiryWarning = true;
      void offerPurchaseOrActivate(
        `PO-UI: sua licença paga vence em ${sessionStatus.daysUntilExpiry} dia(s). Renove para continuar usando sem interrupção.`,
        vscode.window.showInformationMessage,
        'Renovar Licença',
      );
    }
    return true;
  }
  outputChannel.appendLine('PO-UI: licença expirada ou não confirmada — ative uma licença para continuar.');
  void offerPurchaseOrActivate(
    'PO-UI: seu trial expirou ou não foi possível confirmar sua licença.',
    vscode.window.showErrorMessage,
  );
  return false;
}
```

- [ ] **Step 2: Compile**

Run (from `poui-vscode/`): `npm run compile`
Expected: no type errors.

- [ ] **Step 3: Run the full unit suite (regression check — this file has no direct unit tests by existing project convention)**

Run (from `poui-vscode/`): `npm run test:unit`
Expected: all tests still pass (same count as after Task 4).

- [ ] **Step 4: Commit**

```bash
git add poui-vscode/src/requireLicense.ts
git commit -m "feat(vscode-ext): show a renewal nudge when a paid license is close to expiring

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01K77S8diJJpHAV1RdsNJS6r"
```

---

### Task 6: Deploy, real Resend key, and live verification

**Files:** none (deployment + manual verification only).

**Interfaces:** none — this task consumes the finished Tasks 1-5 as a whole.

> **STOP before Step 2.** This task needs the user to either already have a Resend account or create one — signing up for a third-party service on the user's behalf is not something to do without them. It also runs `wrangler deploy` against the **production** Worker (`WORKER_BASE_URL` is hardcoded, there's no staging URL) and `wrangler secret put` against production, and `issue-license.mjs` writes to the real production KV — all of this needs the user's live go-ahead, not a checkbox ticked on autopilot.

- [ ] **Step 1: Run the full test suite one more time**

Run (from `poui-vscode/license-worker/`): `npm test && npm run typecheck`
Run (from `poui-vscode/`): `npm run test:unit && npm run test`
Expected: all green.

- [ ] **Step 2: Ask the user for a Resend API key**

Ask: does the user already have a Resend account? If not, direct them to sign up at resend.com (free tier) and generate an API key from their dashboard — no domain verification needed, since this sends only to the author's own address from Resend's shared test domain (see spec's "Riscos conhecidos"). Once they provide the key, do NOT print it back verbatim in any tool output or commit it anywhere — it only ever goes into the next step's `wrangler secret put` prompt.

- [ ] **Step 3: Set the real secret and deploy**

Run (from `poui-vscode/license-worker/`): `npx wrangler secret put RESEND_API_KEY`
This prompts interactively for the value — paste the real key from Step 2 when prompted (the shell tool used to run this must support an interactive prompt; if it doesn't, tell the user to run this one command themselves in their own terminal and confirm when done, since the key must never be typed into a place that echoes/logs it).

Then: `npm run deploy`
Expected: `wrangler` prints the deployed Worker URL — confirm it matches `WORKER_BASE_URL` in `poui-vscode/src/licenseCheck.ts` (`https://poui-license.alscosta.workers.dev`).

- [ ] **Step 4: Live verification of blocking + real e-mail delivery**

Using `issue-license.mjs` (Task 3) against the real deployed Worker:

```bash
node scripts/issue-license.mjs --new --email teste-live-verify@example.com --plan mensal
# Note the printed key.
```

Manually force it into an already-expired state to test the blocking + e-mail path for real (there's no `--backdate` flag — directly edit the KV record's `expiresAt` to the past, same technique as Task 2's local test, but now against `--remote`):

```bash
npx wrangler kv key get "license:<the key>" --binding=LICENSES --remote
# copy the JSON, edit expiresAt to a past date and notifiedExpiredAt back to null, save to a temp file, then:
npx wrangler kv key put "license:<the key>" --path <temp-file> --binding=LICENSES --remote
```

Then trigger a status check against that machine hash (needs an activation first, or directly seed a `machine:*` record bound to it the same way Task 2's manual test did, against `--remote` this time):

```bash
curl -s "https://poui-license.alscosta.workers.dev/license/status?machineHash=<a test machine hash bound to that key>"
# Expected: NOT tier "paid" (falls back to trial math) — confirms blocking works in production
```

Check the author's actual inbox (andre.andrelscosta@gmail.com, possibly in spam given Resend's shared test domain) for the expiry e-mail — confirm it arrived with the right customer e-mail and expiry date in the body.

Clean up the test key and machine record afterward:

```bash
npx wrangler kv key delete "license:<the key>" --binding=LICENSES --remote
npx wrangler kv key delete "machine:<the test machine hash used>" --binding=LICENSES --remote
```

- [ ] **Step 5: Report results**

Report back what arrived in the inbox (or didn't, with whatever error surfaced) before considering this task done. If the e-mail didn't arrive, the blocking behavior (Step 4's curl check) is still the load-bearing part — a missing e-mail is a Resend/deliverability issue to troubleshoot separately, not a reason to consider the whole feature broken (the design explicitly treats the e-mail as best-effort, non-blocking).

- [ ] **Step 6: Update memory**

Once the user confirms Step 5 looks right, add a memory entry (or extend the existing `project-vscode-monetization-ux.md`/create a new one) with: final commit hashes, the deployed Worker version, and confirmation that expiry blocking + author notification + the issuance script are live in production.
