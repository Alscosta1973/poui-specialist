import {
  resolveStatus,
  shouldActivate,
  clampCredits,
  shouldNotifyExpiry,
  isDevMachine,
  MachineRecord,
  LicenseRecord,
} from './licenseLogic';

export interface Env {
  LICENSES: KVNamespace;
  RESEND_API_KEY: string;
  DEV_MACHINE_HASHES?: string;
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
 * independente disso. Uma falha aqui (Resend fora do ar, chave inválida,
 * ou até o próprio write no KV falhando por rate limit/erro transitório)
 * não pode nunca vazar como exceção pro caller: as rotas que chamam essa
 * função devolvem a resposta de status já calculada por resolveStatus, e
 * essa resposta tem que sair normalmente não importa o que aconteça aqui
 * dentro. `notifiedExpiredAt` é marcado mesmo que o e-mail falhe, pra não
 * tentar reenviar a cada request se o Resend estiver fora do ar — mas se
 * o próprio write falhar, a tentativa de notificar simplesmente se repete
 * na próxima request (aceitável: pior caso é reenviar o e-mail). */
async function notifyIfExpired(env: Env, license: LicenseRecord, licenseKey: string, nowIso: string): Promise<void> {
  if (!shouldNotifyExpiry(license, nowIso)) {
    return;
  }
  try {
    await sendExpiryEmail(env.RESEND_API_KEY, license);
  } catch {
    // best-effort — ver comentário acima da função.
  }
  try {
    license.notifiedExpiredAt = nowIso;
    await writeJson(env.LICENSES, `license:${licenseKey}`, license);
  } catch {
    // best-effort — ver comentário acima da função.
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const now = new Date().toISOString();

    if (url.pathname === '/trial/start' && request.method === 'POST') {
      const { machineHash } = (await request.json()) as { machineHash: string };
      if (isDevMachine(machineHash, env.DEV_MACHINE_HASHES)) {
        return jsonResponse({ tier: 'paid' });
      }
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
      if (isDevMachine(machineHash, env.DEV_MACHINE_HASHES)) {
        return jsonResponse({ tier: 'paid' });
      }
      const key = `machine:${machineHash}`;
      const machine = await readJson<MachineRecord>(env.LICENSES, key);
      if (!machine) {
        return jsonResponse({ tier: 'unknown' });
      }
      const license = machine.licenseKey
        ? await readJson<LicenseRecord>(env.LICENSES, `license:${machine.licenseKey}`)
        : undefined;
      if (license && machine.licenseKey) {
        ctx.waitUntil(notifyIfExpired(env, license, machine.licenseKey, now));
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
      if (isDevMachine(machineHash, env.DEV_MACHINE_HASHES)) {
        return jsonResponse({ tier: 'paid' });
      }
      const machine = await readJson<MachineRecord>(env.LICENSES, `machine:${machineHash}`);
      const license = machine?.licenseKey
        ? await readJson<LicenseRecord>(env.LICENSES, `license:${machine.licenseKey}`)
        : undefined;
      if (license && machine?.licenseKey) {
        ctx.waitUntil(notifyIfExpired(env, license, machine.licenseKey, now));
      }
      return jsonResponse(resolveStatus(machine, license, machineHash, now));
    }

    if (url.pathname === '/license/activate' && request.method === 'POST') {
      const { machineHash, licenseKey } = (await request.json()) as { machineHash: string; licenseKey: string };
      const license = await readJson<LicenseRecord>(env.LICENSES, `license:${licenseKey}`);
      const check = shouldActivate(license, now);
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
