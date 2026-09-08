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
