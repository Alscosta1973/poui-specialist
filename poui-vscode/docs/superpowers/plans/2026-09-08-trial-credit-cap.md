# Trial por Dias + Créditos Ponderados — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a second trial boundary (40 effort-weighted credits) alongside the existing 14-day window — whichever is exhausted first ends the trial — and move the day-clock to start on first paid-command use instead of install.

**Architecture:** The Cloudflare Worker (`license-worker/`) gains two new `MachineRecord` fields (`firstUsedAt`, `creditsUsed`) and a new `/trial/consume` endpoint; `resolveStatus` computes a single `usedPct` (the max of days-used% and credits-used%) that both the Worker and the extension treat as the one number to display. The extension (`poui-vscode/`) reports credit usage fire-and-forget from the same choke point that already gates paid commands (`requireLicense.ts`), weighted by the existing `poui.effort` setting.

**Tech Stack:** TypeScript, Cloudflare Workers + KV, `mocha`/`ts-node` (Worker unit tests), `mocha`+`ts-node` and `@vscode/test-electron` (extension unit + integration tests), `wrangler` CLI.

**Spec:** `poui-vscode/docs/superpowers/specs/2026-09-08-vscode-trial-credit-cap-design.md`

## Global Constraints

- `TRIAL_DAYS = 14` (already exists, unchanged).
- `TRIAL_CREDIT_BUDGET = 40` (new, exact value from the spec).
- Credit weight by `poui.effort`: `low`/`medium` → 1, `high` → 2, `xhigh`/`max` → 3.
- Credits and the day-clock only apply to `tier: 'trial'`. `tier: 'paid'` never consumes, never computes `usedPct`.
- The day-clock starts on the **first paid-command execution** (`firstUsedAt`), not on install/activation (`firstSeen` stays as a separate, purely informational field).
- All percentages are integers (`Math.round`), clamped to `[0, 100]`.
- Never expose raw `daysLeft`/`creditsUsed` numbers in any user-facing text — always the single combined `usedPct`.
- No changes to `/license/activate`, the paid/device-binding model, or the 6 free commands.

---

### Task 1: Worker — day+credit math in `licenseLogic.ts`

**Files:**
- Modify: `poui-vscode/license-worker/src/licenseLogic.ts`
- Test: `poui-vscode/license-worker/test/licenseLogic.test.ts`

**Interfaces:**
- Produces: `TRIAL_CREDIT_BUDGET: number`, `MachineRecord` (gains `firstUsedAt: string | null`, `creditsUsed: number`), `StatusResult` (gains `usedPct?: number`), `computeDaysUsedPct(firstUsedAt: string | null, nowIso: string, trialDays?: number): number`, `computeCreditsUsedPct(creditsUsed: number, budget?: number): number`, `clampCredits(credits: number): number`, updated `resolveStatus(...)`.

- [ ] **Step 1: Write the failing tests for the new pure functions**

Replace the full contents of `poui-vscode/license-worker/test/licenseLogic.test.ts` with:

```typescript
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run (from `poui-vscode/license-worker/`): `npm test`
Expected: compile error (`TRIAL_CREDIT_BUDGET`, `computeDaysUsedPct`, `computeCreditsUsedPct`, `clampCredits` not exported from `../src/licenseLogic`) and/or type errors on the `MachineRecord`/`StatusResult` literals missing the new fields.

- [ ] **Step 3: Implement `licenseLogic.ts`**

Replace the full contents of `poui-vscode/license-worker/src/licenseLogic.ts` with:

```typescript
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

export function computeDaysLeft(firstSeenIso: string, nowIso: string, trialDays: number = TRIAL_DAYS): number {
  const firstSeen = new Date(firstSeenIso).getTime();
  const now = new Date(nowIso).getTime();
  const elapsedDays = Math.floor((now - firstSeen) / (1000 * 60 * 60 * 24));
  return Math.max(0, trialDays - elapsedDays);
}

/** % of the 14-day window elapsed since firstUsedAt. 0 while the trial
 * hasn't started yet (firstUsedAt is null) — days only start counting on
 * the first paid-command use, not on install. */
export function computeDaysUsedPct(firstUsedAt: string | null, nowIso: string, trialDays: number = TRIAL_DAYS): number {
  if (firstUsedAt === null) {
    return 0;
  }
  const daysLeft = computeDaysLeft(firstUsedAt, nowIso, trialDays);
  const pct = ((trialDays - daysLeft) / trialDays) * 100;
  return Math.min(100, Math.max(0, Math.round(pct)));
}

/** % of the credit budget consumed. */
export function computeCreditsUsedPct(creditsUsed: number, budget: number = TRIAL_CREDIT_BUDGET): number {
  const pct = (creditsUsed / budget) * 100;
  return Math.min(100, Math.max(0, Math.round(pct)));
}

/** Server-side defense in depth — never trust the credit weight a client
 * sends verbatim. Valid weights are 1-3 (see poui.effort mapping in the
 * extension's licenseCheck.ts); anything else is clamped into that range. */
export function clampCredits(credits: number): number {
  const rounded = Math.round(credits);
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
git commit -m "feat(license-worker): add day+credit trial cap math to licenseLogic

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01K77S8diJJpHAV1RdsNJS6r"
```

---

### Task 2: Worker — wire `firstUsedAt`/`creditsUsed` into record creation + new `/trial/consume` route

**Files:**
- Modify: `poui-vscode/license-worker/src/worker.ts`

**Interfaces:**
- Consumes: `MachineRecord`, `StatusResult`, `resolveStatus`, `shouldActivate`, `clampCredits` from `./licenseLogic` (Task 1).
- Produces: `POST /trial/consume` — body `{ machineHash: string; credits: number }`, response is a `StatusResult` (same shape as `/trial/start` and `/license/status`).

- [ ] **Step 1: Replace the full contents of `worker.ts`**

```typescript
import { resolveStatus, shouldActivate, clampCredits, MachineRecord, LicenseRecord } from './licenseLogic';

export interface Env {
  LICENSES: KVNamespace;
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
      const currentStatus = resolveStatus(machine, license, machineHash, now);
      if (currentStatus.tier === 'paid') {
        // Licença paga nunca consome nada — devolve o status pago sem gravar.
        return jsonResponse(currentStatus);
      }
      if (machine.firstUsedAt === null) {
        machine.firstUsedAt = now;
      }
      machine.creditsUsed += clampCredits(credits);
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

- [ ] **Step 3: Manual verification with `wrangler dev` + `curl`**

In one terminal, from `poui-vscode/license-worker/`, run: `npm run dev`
Wait for it to print the local URL (typically `http://localhost:8787`).

In another terminal, run this sequence (replace `8787` if wrangler picked a different port):

```bash
# 1. Start a trial for a fake machine
curl -s -X POST http://localhost:8787/trial/start -H 'Content-Type: application/json' -d '{"machineHash":"test-hash-1"}'
# Expected: {"tier":"trial","daysLeft":14,"usedPct":0}

# 2. Consume credits for a "high" effort generation (weight 2)
curl -s -X POST http://localhost:8787/trial/consume -H 'Content-Type: application/json' -d '{"machineHash":"test-hash-1","credits":2}'
# Expected: {"tier":"trial","daysLeft":14,"usedPct":5}  (2 of 40 = 5%)

# 3. Consume enough credits to exhaust the budget (38 more, total 40)
curl -s -X POST http://localhost:8787/trial/consume -H 'Content-Type: application/json' -d '{"machineHash":"test-hash-1","credits":38}'
# Expected: {"tier":"expired"}

# 4. Status check confirms it stays expired
curl -s "http://localhost:8787/license/status?machineHash=test-hash-1"
# Expected: {"tier":"expired"}

# 5. A brand-new machine that never called /trial/start
curl -s -X POST http://localhost:8787/trial/consume -H 'Content-Type: application/json' -d '{"machineHash":"never-seen","credits":2}'
# Expected: {"tier":"unknown"}
```

Confirm each response matches before moving on. Stop the `wrangler dev` process (Ctrl+C) when done.

- [ ] **Step 4: Commit**

```bash
git add poui-vscode/license-worker/src/worker.ts
git commit -m "feat(license-worker): add POST /trial/consume endpoint

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01K77S8diJJpHAV1RdsNJS6r"
```

---

### Task 3: Extension — `usedPct`, `effortToCredits`, `fetchConsumeCredits`, percentage-based display

**Files:**
- Modify: `poui-vscode/src/licenseCheck.ts`
- Test: `poui-vscode/src/test/unit/licenseCheck.test.ts`

**Interfaces:**
- Consumes: nothing new from other tasks (this file has no dependency on the Worker's TypeScript — it's a separate deployable, talks over HTTP).
- Produces: `LicenseStatus` gains `usedPct?: number`; `effortToCredits(effort: string): number`; `fetchConsumeCredits(baseUrl: string, machineHash: string, credits: number, fetchFn?: typeof fetch): Promise<LicenseStatus>`; `formatPaidBadge`, `formatStatusBarItem`, `shouldShowExpiryWarning` now read `usedPct` instead of `daysLeft`.

- [ ] **Step 1: Write the failing tests**

In `poui-vscode/src/test/unit/licenseCheck.test.ts`, replace the `shouldShowExpiryWarning`, `formatPaidBadge`, and `formatStatusBarItem` `describe` blocks (keep every other block — `computeMachineHash`, `isPlaceholderMachineId`, `isAccessAllowed`, `isCacheFresh`, `fetchTrialStart`, `fetchLicenseStatus`, `activateLicenseKey` — unchanged) with:

```typescript
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
```

Update the `import` block at the top of the file to add the three new names:

```typescript
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run (from `poui-vscode/`): `npm run test:unit`
Expected: FAIL — `effortToCredits`/`fetchConsumeCredits` not exported, and the existing `shouldShowExpiryWarning`/`formatPaidBadge`/`formatStatusBarItem` implementations still read `daysLeft` so several assertions mismatch.

- [ ] **Step 3: Implement the changes in `licenseCheck.ts`**

Add `usedPct` to the interface:

```typescript
export interface LicenseStatus {
  tier: LicenseTier;
  daysLeft?: number;
  usedPct?: number;
  licenseKey?: string;
}
```

Replace `shouldShowExpiryWarning`:

```typescript
export function shouldShowExpiryWarning(status: LicenseStatus | undefined, thresholdPct: number): boolean {
  return status?.tier === 'trial' && typeof status.usedPct === 'number' && status.usedPct >= thresholdPct;
}
```

Replace `formatPaidBadge`:

```typescript
export function formatPaidBadge(status: LicenseStatus | undefined): string {
  if (status?.tier === 'paid') {
    return '';
  }
  if (status?.tier === 'trial' && typeof status.usedPct === 'number') {
    return `🔒 trial — ${status.usedPct}% usado`;
  }
  return '🔒 requer licença';
}
```

Replace `formatStatusBarItem`:

```typescript
export function formatStatusBarItem(status: LicenseStatus | undefined): StatusBarPresentation | undefined {
  if (status?.tier === 'paid') {
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

Add, right after `formatStatusBarItem` and before `postJson`:

```typescript
/** Peso em créditos do trial pra cada nível de poui.effort — precisa
 * continuar igual ao clampCredits do license-worker (Worker só clampa
 * a faixa válida, quem decide o mapeamento é sempre o cliente). */
export function effortToCredits(effort: string): number {
  if (effort === 'high') {
    return 2;
  }
  if (effort === 'xhigh' || effort === 'max') {
    return 3;
  }
  return 1; // low, medium, ou qualquer valor não reconhecido
}
```

Add, right after `fetchTrialStart` (keep `fetchLicenseStatus`/`activateLicenseKey` where they are):

```typescript
export async function fetchConsumeCredits(
  baseUrl: string,
  machineHash: string,
  credits: number,
  fetchFn: typeof fetch = fetch,
): Promise<LicenseStatus> {
  return (await postJson(fetchFn, `${baseUrl}/trial/consume`, { machineHash, credits })) as LicenseStatus;
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
git commit -m "feat(vscode-ext): switch trial display to a single usedPct, add credit reporting

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01K77S8diJJpHAV1RdsNJS6r"
```

---

### Task 4: Extension — report credit usage from `requireLicense.ts`

**Files:**
- Modify: `poui-vscode/src/requireLicense.ts`

**Interfaces:**
- Consumes: `effortToCredits`, `fetchConsumeCredits` (Task 3, `./licenseCheck`).
- Produces: `requireLicense(...)` behavior unchanged from the caller's point of view (same signature, same return semantics) — this task only adds a fire-and-forget side effect.

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

async function offerPurchaseOrActivate(message: string, showMessage: typeof vscode.window.showErrorMessage): Promise<void> {
  const choice = await showMessage(message, 'Ativar Licença', 'Comprar Licença');
  if (choice === 'Ativar Licença') {
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
    if (sessionStatus?.tier === 'trial' && typeof sessionStatus.usedPct === 'number') {
      if (!hasShownExpiryWarning && shouldShowExpiryWarning(sessionStatus, EXPIRY_WARNING_THRESHOLD_PCT)) {
        hasShownExpiryWarning = true;
        void offerPurchaseOrActivate(
          `PO-UI: seu trial está em ${sessionStatus.usedPct}% de uso. Ative uma licença paga para continuar usando sem interrupção.`,
          vscode.window.showInformationMessage,
        );
      }
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

- [ ] **Step 3: Run the full unit suite (nothing here is directly unit-tested — this file is `vscode`-dependent by convention — but confirm nothing else broke)**

Run (from `poui-vscode/`): `npm run test:unit`
Expected: all tests still pass (same count as after Task 3 — this task adds no new unit tests, `requireLicense.ts` behavior is covered by the integration suite and Task 5's manual verification).

- [ ] **Step 4: Commit**

```bash
git add poui-vscode/src/requireLicense.ts
git commit -m "feat(vscode-ext): report effort-weighted credit usage on every paid command

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01K77S8diJJpHAV1RdsNJS6r"
```

---

### Task 5: Deploy the Worker and verify the whole thing live

**Files:** none (deployment + manual verification only).

**Interfaces:** none — this task consumes the finished Tasks 1-4 as a whole.

> **STOP before Step 2.** `wrangler deploy` updates the **production** Cloudflare Worker that the real extension talks to (`WORKER_BASE_URL` in `licenseCheck.ts` is hardcoded to it, there's no staging URL). Get the user's explicit go-ahead before running it — this is exactly the kind of shared-infrastructure change that needs a live confirmation, not a checkbox ticked on autopilot.

- [ ] **Step 1: Run the full Worker test suite one more time**

Run (from `poui-vscode/license-worker/`): `npm test && npm run typecheck`
Expected: all green, no type errors.

- [ ] **Step 2: Ask the user to confirm, then deploy the Worker**

Run (from `poui-vscode/license-worker/`): `npm run deploy`
Expected: `wrangler` prints the deployed Worker URL — confirm it matches `WORKER_BASE_URL` in `poui-vscode/src/licenseCheck.ts` (`https://poui-license.alscosta.workers.dev`).

- [ ] **Step 3: Run the full extension test suite**

Run (from `poui-vscode/`): `npm run test:unit && npm run test`
Expected: all unit tests green; all integration tests green (commands still register correctly from the rebuilt bundle).

- [ ] **Step 4: Package and install the extension**

Run (from `poui-vscode/`):

```bash
npm run package
code --install-extension poui-vscode-<version>.vsix --force
```

(Replace `<version>` with whatever `package.json`'s `"version"` field currently says.)

- [ ] **Step 5: Live verification against the real deployed Worker**

Reload the VS Code window (`Ctrl+Shift+P` → "Developer: Reload Window"), then:

1. Run any paid command once (e.g. "PO-UI: Lint de Componentes" is free — use a paid one like "PO-UI: Revisar Código" on any open file, or "PO-UI: Gerar Componente"). Confirm the status bar item appears showing a percentage (`$(clock) PO-UI: trial N% usado`), not raw days.
2. Run the same paid command a few more times. Confirm the percentage in the status bar increases each time.
3. Confirm `poui.effort` set to `high` (the default) increases the percentage roughly twice as fast as it would at `low`/`medium` — not required to prove precisely, just sanity-check the trend makes sense.
4. Confirm the 6 free commands (`PO-UI: Lint de Componentes`, `PO-UI: Auditoria de Qualidade`, `PO-UI: Preview no Browser`, `PO-UI: Reverter Componente Gerado`, `PO-UI: Consultar Documentação de Componente`, `PO-UI: Configurar Motor de IA`) do **not** move the percentage.
5. Report back what you saw before considering this task done.

- [ ] **Step 6: Update the memory file for this feature**

Once the user confirms Step 5 looks right, update
`project-vscode-monetization-ux.md` (or a new memory file if it makes more
sense) in the memory directory with: final commit hashes, the deployed
Worker version, and that day+credit cap trial is live in production.
