# Licenciamento e Gate por Comando (poui-vscode) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. **Exceção: a Task 1 NÃO é despachada como subagent — é executada diretamente pelo controller, interativamente com o usuário, porque envolve criar uma conta e autenticar via navegador.**

**Goal:** Trial de 14 dias por instalação (resistente a "limpar storage e recomeçar", já que o estado vive num backend, não só localmente), com gate nos 8 comandos que chamam o motor de IA — 6 comandos determinísticos ficam sempre grátis — e um comando novo `PO-UI: Ativar Licença` pra inserir uma chave paga.

**Architecture:** Um Cloudflare Worker + KV (`poui-vscode/license-worker/`, projeto standalone) guarda o estado de trial/licença por hash de máquina. A extensão calcula um hash de `vscode.env.machineId`, consulta o Worker uma vez por ativação (cacheado em memória pela sessão), e cada um dos 8 comandos pagos checa esse cache antes de rodar. A URL do Worker é uma constante fixa no código (nunca um setting do usuário) — se fosse configurável, qualquer um apontaria pra um servidor falso que sempre aprova.

**Tech Stack:** TypeScript, Cloudflare Workers + KV (`wrangler` CLI), `mocha`+`ts-node` (mesma convenção já usada no resto da extensão), Node `fetch`/`crypto` nativos (sem dependência nova no lado da extensão).

**Spec:** `poui-vscode/docs/superpowers/specs/2026-09-06-vscode-license-gating-design.md` (aprovada pelo usuário, commit `d91c3c4`).

## Global Constraints

- Nenhum módulo testável via `mocha`+`ts-node` (`licenseCheck.ts`, a lógica pura do Worker) pode `import` o módulo `vscode`.
- Toda espera de rede/CLI visível ao usuário precisa de `vscode.window.withProgress`.
- Credencial/chave de licença nunca vai para `settings.json` — só via `context.secrets`.
- `WORKER_BASE_URL` é uma constante fixa no código, nunca um setting `poui.*` configurável.
- Trial: 14 dias por hash de máquina, registrado no Worker (idempotente — nunca reinicia `firstSeen` num hash já visto).
- Licença paga: 1 dispositivo por vez — reativar noutra máquina substitui o vínculo anterior (não rejeita, não pede suporte).
- Checagem de licença: uma vez por ativação da extensão (nunca uma chamada de rede por comando).
- Janela de graça offline: 3 dias a partir do último sucesso confirmado — depois disso, bloqueia em vez de permitir uso offline indefinido.
- Baseline atual: `poui-vscode` unitário = **330 passing**; suíte de integração = **14 passing**. `license-worker` é um projeto novo, começa do zero.

---

## Task 1 (interativa — controller executa direto com o usuário, sem subagent): Conta Cloudflare, login, KV e primeiro deploy

**Files:**
- Create: `poui-vscode/license-worker/package.json`
- Create: `poui-vscode/license-worker/tsconfig.json`
- Create: `poui-vscode/license-worker/wrangler.toml`
- Create: `poui-vscode/license-worker/src/worker.ts` (stub temporário — substituído na Task 3)
- Create: `poui-vscode/license-worker/.gitignore`

**Interfaces:**
- Produces: a URL real do Worker deployado (formato `https://poui-license.<subdomínio>.workers.dev`) e o `id` do namespace KV `LICENSES` — ambos precisam ser registrados no ledger e usados pra substituir o placeholder da Task 4 antes de despachá-la.

- [ ] **Step 1: Confirmar/criar conta Cloudflare**

Se o usuário ainda não tem conta: acessar `https://dash.cloudflare.com/sign-up` no navegador, criar conta gratuita (não pede cartão pra uso de Workers no free tier). Confirmar que o login funciona no dashboard antes de seguir.

- [ ] **Step 2: Autenticar a CLI**

Run: `cd poui-vscode && npx --yes wrangler login`

Isso abre o navegador pra autorizar a CLI. Esperar o usuário completar o fluxo (mensagem de sucesso no terminal: "Successfully logged in").

- [ ] **Step 3: Escaturar o projeto do Worker**

```json
// poui-vscode/license-worker/package.json
{
  "name": "poui-license-worker",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "typecheck": "tsc --noEmit",
    "test": "mocha --require ts-node/register --timeout 15000 \"test/**/*.test.ts\""
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20250101.0",
    "@types/mocha": "^10.0.10",
    "@types/node": "^22.0.0",
    "mocha": "^11.8.0",
    "ts-node": "^10.9.2",
    "typescript": "^5.7.0",
    "wrangler": "^4.0.0"
  }
}
```

```json
// poui-vscode/license-worker/tsconfig.json
{
  "compilerOptions": {
    "module": "es2022",
    "target": "es2022",
    "lib": ["es2022"],
    "types": ["@cloudflare/workers-types"],
    "strict": true,
    "moduleResolution": "bundler",
    "noEmit": true
  },
  "include": ["src/**/*.ts", "test/**/*.ts"]
}
```

```toml
# poui-vscode/license-worker/wrangler.toml
name = "poui-license"
main = "src/worker.ts"
compatibility_date = "2026-09-06"

[[kv_namespaces]]
binding = "LICENSES"
id = ""
```

```typescript
// poui-vscode/license-worker/src/worker.ts (stub temporário — Task 3 substitui pelo handler real)
export default {
  async fetch(): Promise<Response> {
    return new Response(JSON.stringify({ ok: true, note: 'stub — Task 3 substitui isto' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  },
};
```

```
# poui-vscode/license-worker/.gitignore
node_modules/
.wrangler/
```

Run: `cd poui-vscode/license-worker && npm install`

- [ ] **Step 4: Criar o namespace KV e preencher o `id`**

Run: `cd poui-vscode/license-worker && npx wrangler kv namespace create LICENSES`

A saída inclui um bloco TOML com o `id` real — copiar esse `id` pro campo `id = ""` do `wrangler.toml` criado no Step 3.

- [ ] **Step 5: Primeiro deploy (obtém a URL real)**

Run: `cd poui-vscode/license-worker && npx wrangler deploy`

A saída do comando mostra a URL real do Worker deployado (formato
`https://poui-license.<subdomínio-da-conta>.workers.dev`). **Anotar essa
URL exata** — ela é necessária pra Task 4.

- [ ] **Step 6: Confirmar que o stub responde**

Run: `curl -s <URL-do-Step-5>`
Expected: `{"ok":true,"note":"stub — Task 3 substitui isto"}`

- [ ] **Step 7: Registrar a URL real e atualizar a Task 4 deste plano**

No ledger da execução (se estiver rodando via `subagent-driven-development`),
registrar a URL exata e o `id` do KV. **Editar a seção da Task 4 abaixo
neste mesmo arquivo de plano**, substituindo o placeholder
`https://poui-license.SUBSTITUIR-PELA-URL-REAL.workers.dev` (no bloco de
código de `licenseCheck.ts`) pela URL real obtida no Step 5 — antes de
despachar a Task 4, pra que o subagent implementador nunca veja um
placeholder.

- [ ] **Step 8: Commit**

```bash
git add poui-vscode/license-worker/package.json poui-vscode/license-worker/tsconfig.json poui-vscode/license-worker/wrangler.toml poui-vscode/license-worker/src/worker.ts poui-vscode/license-worker/.gitignore
git commit -m "chore(license-worker): scaffold Cloudflare Worker project with a deployed stub"
```

(`package-lock.json` gerado pelo `npm install` do Step 3 também deve ser
commitado junto, se existir.)

---

## Task 2: `licenseLogic.ts` — lógica pura do Worker

**Files:**
- Create: `poui-vscode/license-worker/src/licenseLogic.ts`
- Test: `poui-vscode/license-worker/test/licenseLogic.test.ts`

**Interfaces:**
- Produces: `TRIAL_DAYS: number`, `MachineRecord`, `LicenseRecord`, `LicenseTier`,
  `StatusResult`, `computeDaysLeft(firstSeenIso, nowIso, trialDays?): number`,
  `resolveStatus(machine, license, machineHash, nowIso): StatusResult`,
  `shouldActivate(license): { ok: boolean; reason?: string }` — consumidos
  pela Task 3.

- [ ] **Step 1: Escrever o teste**

```typescript
// poui-vscode/license-worker/test/licenseLogic.test.ts
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
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd poui-vscode/license-worker && npm test`
Expected: FAIL — `Cannot find module '../src/licenseLogic'`.

- [ ] **Step 3: Implementar**

```typescript
// poui-vscode/license-worker/src/licenseLogic.ts
export const TRIAL_DAYS = 14;

export interface MachineRecord {
  firstSeen: string;
  lastSeen: string;
  licenseKey: string | null;
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
  licenseKey?: string;
}

export function computeDaysLeft(firstSeenIso: string, nowIso: string, trialDays: number = TRIAL_DAYS): number {
  const firstSeen = new Date(firstSeenIso).getTime();
  const now = new Date(nowIso).getTime();
  const elapsedDays = Math.floor((now - firstSeen) / (1000 * 60 * 60 * 24));
  return Math.max(0, trialDays - elapsedDays);
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
  const daysLeft = computeDaysLeft(machine.firstSeen, nowIso);
  return daysLeft > 0 ? { tier: 'trial', daysLeft } : { tier: 'expired' };
}

export function shouldActivate(license: LicenseRecord | undefined): { ok: boolean; reason?: string } {
  if (!license || license.status !== 'active') {
    return { ok: false, reason: 'invalid_key' };
  }
  return { ok: true };
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `cd poui-vscode/license-worker && npm test`
Expected: `13 passing`.

- [ ] **Step 5: Commit**

```bash
git add poui-vscode/license-worker/src/licenseLogic.ts poui-vscode/license-worker/test/licenseLogic.test.ts
git commit -m "feat(license-worker): add pure trial/license resolution logic"
```

---

## Task 3: `worker.ts` — handler HTTP real + redeploy

**Files:**
- Modify: `poui-vscode/license-worker/src/worker.ts` (substitui o stub da Task 1)

**Interfaces:**
- Consumes: `resolveStatus`, `shouldActivate`, `MachineRecord`, `LicenseRecord` (Task 2).
- Produces: os três endpoints HTTP reais (`/trial/start`, `/license/status`, `/license/activate`) — consumidos pela Task 4 (do lado da extensão) via a URL já obtida na Task 1.

- [ ] **Step 1: Implementar o handler**

```typescript
// poui-vscode/license-worker/src/worker.ts
import { resolveStatus, shouldActivate, MachineRecord, LicenseRecord } from './licenseLogic';

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

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const now = new Date().toISOString();

    if (url.pathname === '/trial/start' && request.method === 'POST') {
      const { machineHash } = (await request.json()) as { machineHash: string };
      const key = `machine:${machineHash}`;
      let machine = await readJson<MachineRecord>(env.LICENSES, key);
      if (!machine) {
        machine = { firstSeen: now, lastSeen: now, licenseKey: null };
      } else {
        machine.lastSeen = now;
      }
      await writeJson(env.LICENSES, key, machine);
      const license = machine.licenseKey
        ? await readJson<LicenseRecord>(env.LICENSES, `license:${machine.licenseKey}`)
        : undefined;
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
      const machine = (await readJson<MachineRecord>(env.LICENSES, `machine:${machineHash}`)) ?? {
        firstSeen: now,
        lastSeen: now,
        licenseKey: null,
      };
      machine.licenseKey = licenseKey;
      await writeJson(env.LICENSES, `machine:${machineHash}`, machine);
      return jsonResponse({ ok: true, tier: 'paid' });
    }

    return jsonResponse({ error: 'not_found' }, 404);
  },
};
```

- [ ] **Step 2: Type-check**

Run: `cd poui-vscode/license-worker && npm run typecheck`
Expected: sem erros.

- [ ] **Step 3: Redeploy**

Run: `cd poui-vscode/license-worker && npx wrangler deploy`

(A autenticação da Task 1 já fica salva localmente — este `deploy` roda
sem precisar abrir navegador de novo.)

- [ ] **Step 4: Smoke test real com `curl` contra os 3 endpoints**

Usar a URL obtida na Task 1 (chamar `<URL>` abaixo):

```bash
curl -s -X POST <URL>/trial/start -H "Content-Type: application/json" -d '{"machineHash":"smoke-test-hash"}'
# Expected: {"tier":"trial","daysLeft":14}

curl -s "<URL>/license/status?machineHash=smoke-test-hash"
# Expected: {"tier":"trial","daysLeft":14} (ou 13 se rodar no dia seguinte)

curl -s -X POST <URL>/license/activate -H "Content-Type: application/json" -d '{"machineHash":"smoke-test-hash","licenseKey":"DOES-NOT-EXIST"}'
# Expected: {"ok":false,"reason":"invalid_key"} com status HTTP 400
```

Se os três baterem com o esperado, apagar a entrada de teste do KV (opcional,
pra não deixar lixo): `npx wrangler kv key delete --binding=LICENSES "machine:smoke-test-hash"`.

- [ ] **Step 5: Commit**

```bash
git add poui-vscode/license-worker/src/worker.ts
git commit -m "feat(license-worker): implement the real trial/status/activate HTTP handlers"
```

---

## Task 4: `licenseCheck.ts` — módulo puro do lado da extensão

**Files:**
- Create: `poui-vscode/src/licenseCheck.ts`
- Test: `poui-vscode/src/test/unit/licenseCheck.test.ts`

**Interfaces:**
- Produces: `WORKER_BASE_URL: string`, `LicenseTier`, `LicenseStatus`,
  `ActivationResult`, `computeMachineHash(machineId, salt?): string`,
  `isPlaceholderMachineId(machineId): boolean`,
  `isAccessAllowed(status): boolean`,
  `isCacheFresh(fetchedAtIso, nowMs, graceMs): boolean`,
  `fetchTrialStart(baseUrl, machineHash, fetchFn?): Promise<LicenseStatus>`,
  `fetchLicenseStatus(baseUrl, machineHash, fetchFn?): Promise<LicenseStatus>`,
  `activateLicenseKey(baseUrl, machineHash, licenseKey, fetchFn?): Promise<ActivationResult>` —
  consumidos pelas Tasks 5 e 6.

**⚠️ Antes de despachar esta task**: confirmar que a Task 1 já rodou e
que a URL real do Worker está disponível. Substituir
`https://poui-license.SUBSTITUIR-PELA-URL-REAL.workers.dev` no código
abaixo pela URL exata obtida na Task 1, Step 5, **antes** de repassar
este texto pra quem for implementar.

- [ ] **Step 1: Escrever o teste**

```typescript
// poui-vscode/src/test/unit/licenseCheck.test.ts
import * as assert from 'node:assert';
import {
  computeMachineHash,
  isPlaceholderMachineId,
  isAccessAllowed,
  isCacheFresh,
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
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd poui-vscode && npx mocha --require ts-node/register --timeout 15000 "src/test/unit/licenseCheck.test.ts"`
Expected: FAIL — `Cannot find module '../../licenseCheck'`.

- [ ] **Step 3: Implementar**

```typescript
// poui-vscode/src/licenseCheck.ts
import * as crypto from 'node:crypto';

export type LicenseTier = 'trial' | 'paid' | 'expired' | 'unknown';

export interface LicenseStatus {
  tier: LicenseTier;
  daysLeft?: number;
  licenseKey?: string;
}

export interface ActivationResult {
  ok: boolean;
  tier?: LicenseTier;
  reason?: string;
}

/** URL do Worker de licenciamento (Task 1/3 do plano de implementação).
 * Fixa no código de propósito, nunca um setting `poui.*` — se fosse
 * configurável, qualquer um apontaria pra um servidor falso que sempre
 * aprova a licença. */
export const WORKER_BASE_URL = 'https://poui-license.SUBSTITUIR-PELA-URL-REAL.workers.dev';

const MACHINE_ID_SALT = 'poui-vscode-license-v1';
const KNOWN_PLACEHOLDER_MACHINE_ID = 'someValue.machineId';

export function computeMachineHash(machineId: string, salt: string = MACHINE_ID_SALT): string {
  return crypto.createHash('sha256').update(`${machineId}:${salt}`).digest('hex');
}

export function isPlaceholderMachineId(machineId: string): boolean {
  return machineId === KNOWN_PLACEHOLDER_MACHINE_ID;
}

export function isAccessAllowed(status: LicenseStatus | undefined): boolean {
  return status?.tier === 'trial' || status?.tier === 'paid';
}

export function isCacheFresh(fetchedAtIso: string, nowMs: number, graceMs: number): boolean {
  return nowMs - new Date(fetchedAtIso).getTime() < graceMs;
}

async function postJson(fetchFn: typeof fetch, url: string, body: unknown): Promise<unknown> {
  const response = await fetchFn(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return response.json();
}

export async function fetchTrialStart(
  baseUrl: string,
  machineHash: string,
  fetchFn: typeof fetch = fetch,
): Promise<LicenseStatus> {
  return (await postJson(fetchFn, `${baseUrl}/trial/start`, { machineHash })) as LicenseStatus;
}

export async function fetchLicenseStatus(
  baseUrl: string,
  machineHash: string,
  fetchFn: typeof fetch = fetch,
): Promise<LicenseStatus> {
  const response = await fetchFn(`${baseUrl}/license/status?machineHash=${encodeURIComponent(machineHash)}`);
  return (await response.json()) as LicenseStatus;
}

export async function activateLicenseKey(
  baseUrl: string,
  machineHash: string,
  licenseKey: string,
  fetchFn: typeof fetch = fetch,
): Promise<ActivationResult> {
  return (await postJson(fetchFn, `${baseUrl}/license/activate`, { machineHash, licenseKey })) as ActivationResult;
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `cd poui-vscode && npm run test:unit`
Expected: `345 passing` (330 baseline + 15 desta task).

- [ ] **Step 5: Commit**

```bash
git add poui-vscode/src/licenseCheck.ts poui-vscode/src/test/unit/licenseCheck.test.ts
git commit -m "feat(vscode-ext): add pure license/trial check module"
```

---

## Task 5: `requireLicense.ts` — wrapper vscode-aware

**Files:**
- Create: `poui-vscode/src/requireLicense.ts`

**Interfaces:**
- Consumes: `WORKER_BASE_URL`, `computeMachineHash`, `isPlaceholderMachineId`,
  `isAccessAllowed`, `isCacheFresh`, `fetchTrialStart`, `fetchLicenseStatus`,
  `LicenseStatus` (Task 4).
- Produces: `initializeLicenseStatus(context): Promise<void>`,
  `getCachedLicenseStatus(): LicenseStatus | undefined`,
  `setSessionStatus(status): void`,
  `requireLicense(context, outputChannel): boolean` — consumidos pelas
  Tasks 6 e 7.

Este arquivo importa `vscode` (é a camada fina de integração, mesmo
padrão de `configureEngine.ts`) — sem teste unitário próprio, já que a
decisão pura (`isAccessAllowed`/`isCacheFresh`) já foi extraída e testada
na Task 4.

- [ ] **Step 1: Implementar**

```typescript
// poui-vscode/src/requireLicense.ts
import * as vscode from 'vscode';
import {
  WORKER_BASE_URL,
  computeMachineHash,
  isPlaceholderMachineId,
  isAccessAllowed,
  isCacheFresh,
  fetchTrialStart,
  fetchLicenseStatus,
  LicenseStatus,
} from './licenseCheck';

const GRACE_PERIOD_MS = 3 * 24 * 60 * 60 * 1000;
const CACHE_KEY = 'poui.licenseStatusCache';

interface CachedStatus {
  status: LicenseStatus;
  fetchedAt: string;
}

let sessionStatus: LicenseStatus | undefined;

export function getCachedLicenseStatus(): LicenseStatus | undefined {
  return sessionStatus;
}

export function setSessionStatus(status: LicenseStatus): void {
  sessionStatus = status;
}

export async function initializeLicenseStatus(context: vscode.ExtensionContext): Promise<void> {
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
}

export function requireLicense(context: vscode.ExtensionContext, outputChannel: vscode.OutputChannel): boolean {
  if (isAccessAllowed(sessionStatus)) {
    return true;
  }
  outputChannel.appendLine('PO-UI: licença expirada ou não confirmada — ative uma licença para continuar.');
  void vscode.window.showErrorMessage(
    'PO-UI: seu trial expirou ou não foi possível confirmar sua licença.',
    'Ativar Licença',
  ).then((choice) => {
    if (choice === 'Ativar Licença') {
      void vscode.commands.executeCommand('poui.activateLicense');
    }
  });
  return false;
}
```

- [ ] **Step 2: Compilar**

Run: `cd poui-vscode && npm run compile`
Expected: sem erros de TypeScript.

- [ ] **Step 3: Commit**

```bash
git add poui-vscode/src/requireLicense.ts
git commit -m "feat(vscode-ext): add requireLicense gate and session-status cache"
```

---

## Task 6: `activateLicense.ts` — comando `poui.activateLicense`

**Files:**
- Create: `poui-vscode/src/activateLicense.ts`
- Modify: `poui-vscode/src/extension.ts`
- Modify: `poui-vscode/package.json`

**Interfaces:**
- Consumes: `computeMachineHash`, `activateLicenseKey`, `WORKER_BASE_URL` (Task 4);
  `setSessionStatus`, `initializeLicenseStatus` (Task 5).
- Produces: comando `poui.activateLicense` registrado; `extension.ts` chama
  `initializeLicenseStatus` uma vez na ativação.

- [ ] **Step 1: Implementar `activateLicense.ts`**

```typescript
// poui-vscode/src/activateLicense.ts
import * as vscode from 'vscode';
import { computeMachineHash, activateLicenseKey, WORKER_BASE_URL } from './licenseCheck';
import { setSessionStatus } from './requireLicense';

export function registerActivateLicenseCommand(
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel,
): vscode.Disposable {
  return vscode.commands.registerCommand('poui.activateLicense', async () => {
    const licenseKey = await vscode.window.showInputBox({
      prompt: 'Chave de licença PO-UI (ex: POUI-XXXX-XXXX-XXXX)',
      validateInput: (v) => (v.trim() ? undefined : 'Informe a chave de licença.'),
    });
    if (!licenseKey) {
      return;
    }

    const machineHash = computeMachineHash(vscode.env.machineId);
    const result = await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: 'PO-UI: ativando licença...' },
      () => activateLicenseKey(WORKER_BASE_URL, machineHash, licenseKey.trim()),
    );

    if (!result.ok) {
      void vscode.window.showErrorMessage(`PO-UI: falha ao ativar a licença (${result.reason ?? 'erro desconhecido'}).`);
      return;
    }

    await context.secrets.store('poui.licenseKey', licenseKey.trim());
    setSessionStatus({ tier: 'paid', licenseKey: licenseKey.trim() });
    outputChannel.appendLine('PO-UI: licença ativada com sucesso.');
    void vscode.window.showInformationMessage('PO-UI: licença ativada com sucesso.');
  });
}
```

- [ ] **Step 2: Registrar em `extension.ts`**

Adicionar os imports:

```typescript
import { registerActivateLicenseCommand } from './activateLicense';
import { initializeLicenseStatus } from './requireLicense';
```

E, dentro de `activate()`, logo após a linha de limpeza do segredo antigo
(`void context.secrets.delete('poui.anthropicApiKey');`), adicionar:

```typescript
  void initializeLicenseStatus(context);
```

(Fire-and-forget de propósito — `activate()` não é `async`, e bloquear a
ativação da extensão numa chamada de rede prejudicaria o tempo de
inicialização do VS Code. `requireLicense()` já trata o caso de
`sessionStatus` ainda não populado como bloqueado, então não há janela de
bypass.)

E, junto aos outros `context.subscriptions.push(registerXCommand(...))`,
adicionar:

```typescript
  context.subscriptions.push(registerActivateLicenseCommand(context, outputChannel));
```

- [ ] **Step 3: Adicionar o comando em `package.json`**

Em `contributes.commands`, depois da entrada de `poui.configureEngine`:

```json
      { "command": "poui.configureEngine", "title": "PO-UI: Configurar Motor de IA" },
      { "command": "poui.activateLicense", "title": "PO-UI: Ativar Licença" }
```

- [ ] **Step 4: Compilar**

Run: `cd poui-vscode && npm run compile`
Expected: sem erros.

- [ ] **Step 5: Commit**

```bash
git add poui-vscode/src/activateLicense.ts poui-vscode/src/extension.ts poui-vscode/package.json
git commit -m "feat(vscode-ext): add PO-UI: Ativar Licença command"
```

---

## Task 7: Gate nos 8 comandos pagos

**Files:**
- Modify: `poui-vscode/src/generateComponent.ts`
- Modify: `poui-vscode/src/generateTest.ts`
- Modify: `poui-vscode/src/generateE2e.ts`
- Modify: `poui-vscode/src/generateScreenshot.ts`
- Modify: `poui-vscode/src/generateReview.ts`
- Modify: `poui-vscode/src/generateConnect.ts`
- Modify: `poui-vscode/src/generateScaffold.ts`
- Modify: `poui-vscode/src/generatePackage.ts`

**Interfaces:**
- Consumes: `requireLicense` (Task 5).

Os 6 comandos determinísticos/infra (`configureEngine`, `docs`, `lint`,
`quality`, `preview`, `undo`) **não** são tocados nesta task — continuam
sempre liberados. Nenhum dos 8 arquivos abaixo tem teste unitário próprio
(todos importam `vscode` diretamente, mesma convenção já estabelecida) —
a verificação é `npm run compile` + `npm run test:unit` sem regressão.

Cada um dos 8 arquivos recebe exatamente a mesma mudança de forma: um
import novo, e um guard logo na primeira linha do corpo do
`async () => { ... }` do `registerCommand`.

- [ ] **Step 1: `generateComponent.ts`** — adicionar o import (junto aos
outros já existentes no topo do arquivo):

```typescript
import { requireLicense } from './requireLicense';
```

E, logo na primeira linha dentro de
`return vscode.commands.registerCommand('poui.generate.component', async () => {`
(antes de `const workspaceFolder = ...`):

```typescript
    if (!requireLicense(context, outputChannel)) {
      return;
    }
```

- [ ] **Step 2: `generateTest.ts`** — mesmo padrão: import de
`requireLicense`, guard logo no início do corpo de
`registerCommand('poui.generate.test', async () => { ... })`.

- [ ] **Step 3: `generateE2e.ts`** — mesmo padrão, dentro de
`registerCommand('poui.generate.e2e', async () => { ... })`.

- [ ] **Step 4: `generateScreenshot.ts`** — mesmo padrão, dentro de
`registerCommand('poui.generate.screenshot', async () => { ... })`
(este comando tem só UM `registerCommand` — o guard vai no início desse
único handler, não em cada chamada interna de `runAgentForCommand`).

- [ ] **Step 5: `generateReview.ts`** — mesmo padrão, dentro de
`registerCommand('poui.review', async () => { ... })`.

- [ ] **Step 6: `generateConnect.ts`** — mesmo padrão, dentro de
`registerCommand('poui.connect', async () => { ... })`.

- [ ] **Step 7: `generateScaffold.ts`** — mesmo padrão, dentro de
`registerCommand('poui.scaffold', async () => { ... })`.

- [ ] **Step 8: `generatePackage.ts`** — mesmo padrão, dentro de
`registerCommand('poui.package', async () => { ... })`.

- [ ] **Step 9: Compilar e rodar a suíte inteira**

Run: `cd poui-vscode && npm run compile && npm run test:unit`
Expected: compilação sem erros, `345 passing` (mesmo total da Task 4 —
nenhum teste novo nesta task, pelo mesmo motivo dos outros 8 comandos
não terem teste unitário próprio).

- [ ] **Step 10: Commit**

```bash
git add poui-vscode/src/generateComponent.ts poui-vscode/src/generateTest.ts poui-vscode/src/generateE2e.ts poui-vscode/src/generateScreenshot.ts poui-vscode/src/generateReview.ts poui-vscode/src/generateConnect.ts poui-vscode/src/generateScaffold.ts poui-vscode/src/generatePackage.ts
git commit -m "feat(vscode-ext): gate the 8 AI-engine commands behind requireLicense"
```

---

## Task 8: Suíte de integração — registro do comando novo

**Files:**
- Modify: `poui-vscode/src/test/suite/extension.test.ts`

**Interfaces:**
- Consumes: comando `poui.activateLicense` (Task 6).

- [ ] **Step 1: Adicionar o caso de teste**

Mesmo padrão dos outros 15 casos já existentes:

```typescript
  it('registers the poui.activateLicense command after activation', async () => {
    const ext = vscode.extensions.getExtension('andre-costa.poui-vscode');
    await ext?.activate();
    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes('poui.activateLicense'));
  });
```

- [ ] **Step 2: Rodar a suíte de integração**

Run: `cd poui-vscode && npm run test`
Expected: `16 passing` (15 já existentes + este novo caso).

- [ ] **Step 3: Commit**

```bash
git add poui-vscode/src/test/suite/extension.test.ts
git commit -m "test(vscode-ext): cover poui.activateLicense registration in the integration suite"
```

---

## Task 9: Validação manual de ponta a ponta

**Files:** nenhum — checklist de verificação real, sem a qual esta
feature não deve ser considerada pronta (mesmo padrão já seguido em toda
esta extensão).

- [ ] **Step 1: Empacotar e instalar em 2 perfis/máquinas diferentes**

Run: `cd poui-vscode && npx @vscode/vsce package` — instalar o `.vsix`
via "Extensions: Install from VSIX..." em dois perfis de VS Code
diferentes (ou duas máquinas/VMs), simulando dois "dispositivos".

- [ ] **Step 2: Validar o início do trial**

No dispositivo 1: rodar qualquer um dos 8 comandos pagos (ex: `PO-UI:
Gerar Componente`) — deve funcionar (trial começa automaticamente),
mostrando "14 dias restantes" implicitamente (sem bloqueio).

- [ ] **Step 3: Validar resistência a reset**

Limpar o storage global da extensão nesse mesmo dispositivo (Command
Palette → "Developer: Reload Window" não basta; usar "Clear Extension
Data" se disponível, ou reinstalar a extensão) e rodar um comando pago de
novo — o Worker deve devolver o `firstSeen` original (dias restantes não
volta pra 14), confirmando que o reset local não afeta o trial real.

- [ ] **Step 4: Validar ativação de licença paga**

Gerar uma chave de teste manualmente no KV
(`npx wrangler kv key put --binding=LICENSES "license:POUI-TEST-0001" '{"email":"teste@example.com","status":"active","createdAt":"2026-09-06T00:00:00.000Z","boundMachineHash":null}'`
rodado de dentro de `poui-vscode/license-worker/`), rodar `PO-UI: Ativar
Licença` no dispositivo 1, colar a chave — deve confirmar sucesso e
liberar os comandos pagos indefinidamente.

- [ ] **Step 5: Validar substituição de dispositivo**

Rodar `PO-UI: Ativar Licença` no dispositivo 2 com a **mesma** chave —
deve funcionar. Voltar ao dispositivo 1 e rodar um comando pago — deve
cair de volta pro cálculo de trial (ou bloquear, se o trial já tiver
expirado), confirmando que a reativação substituiu o vínculo.

- [ ] **Step 6: Validar comandos sempre grátis**

Com o trial expirado (ou sem licença nenhuma) num dos dispositivos,
confirmar que `PO-UI: Consultar Documentação`, `Lint de Componentes`,
`Auditoria de Qualidade`, `Preview no Browser`, `Reverter Componente
Gerado` e `Configurar Motor de IA` continuam funcionando normalmente.

- [ ] **Step 7: Limpar dados de teste do KV**

Apagar as entradas `machine:*`/`license:*` criadas durante o teste
manual (`npx wrangler kv key delete --binding=LICENSES "<chave>"` pra
cada uma), pra não deixar lixo de teste no KV de produção.

---

## Self-Review

**Cobertura da spec**: as 4 áreas da spec (Worker+KV, `licenseCheck.ts`,
`requireLicense.ts`+gate, `activateLicense.ts`) têm task correspondente
(1-3, 4, 5+7, 6). O tratamento de erro (janela de graça de 3 dias, bloqueio
na primeira sincronização sem rede, placeholder de `machineId`) está
implementado em `requireLicense.ts`/`licenseCheck.ts` (Tasks 4-5) e
coberto pelos testes da Task 4. A substituição de dispositivo (1 licença =
1 dispositivo, reativar substitui) está em `worker.ts` (Task 3) e testada
na Task 2 (`resolveStatus` com `boundMachineHash` diferente) e validada
manualmente na Task 9.

**Placeholders**: o único "placeholder" no sentido literal
(`https://poui-license.SUBSTITUIR-PELA-URL-REAL.workers.dev`) é um valor
de infraestrutura que só existe depois que a Task 1 roda de verdade — a
Task 4 já traz a instrução explícita de substituí-lo pela URL real antes
de ser despachada, não é uma lacuna de design deixada em aberto.

**Consistência de tipos**: `LicenseStatus`/`LicenseTier`/`ActivationResult`
(Task 4) usados identicamente em `requireLicense.ts` (Task 5) e
`activateLicense.ts` (Task 6). `MachineRecord`/`LicenseRecord`/`StatusResult`
(Task 2, lado do Worker) usados identicamente em `worker.ts` (Task 3) — são
tipos TypeScript separados (dois projetos npm distintos, sem pacote
compartilhado), mas o contrato JSON de fio (`{tier, daysLeft?, licenseKey?}`
vs `{ok, tier?, reason?}`) bate exatamente entre os dois lados, verificado
manualmente linha a linha nesta revisão.
