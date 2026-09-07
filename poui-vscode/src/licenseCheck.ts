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
export const WORKER_BASE_URL = 'https://poui-license.alscosta.workers.dev';

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

export function shouldShowExpiryWarning(status: LicenseStatus | undefined, thresholdDays: number): boolean {
  return status?.tier === 'trial' && typeof status.daysLeft === 'number' && status.daysLeft <= thresholdDays;
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
