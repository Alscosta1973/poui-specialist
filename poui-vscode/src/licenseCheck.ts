import * as crypto from 'node:crypto';

export type LicenseTier = 'trial' | 'paid' | 'expired' | 'unknown';

export interface LicenseStatus {
  tier: LicenseTier;
  daysLeft?: number;
  usedPct?: number;
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

export function shouldShowExpiryWarning(status: LicenseStatus | undefined, thresholdPct: number): boolean {
  return status?.tier === 'trial' && typeof status.usedPct === 'number' && status.usedPct >= thresholdPct;
}

/** Rótulo curto pra sinalizar, em qualquer UI (QuickPick, webview), que um
 * comando é pago — mesmo texto usado no badge do `poui.menu` e no painel de
 * detalhe da galeria de templates, pra não ter duas variações do aviso. */
export function formatPaidBadge(status: LicenseStatus | undefined): string {
  if (status?.tier === 'paid') {
    return '';
  }
  if (status?.tier === 'trial' && typeof status.usedPct === 'number') {
    return `🔒 trial — ${status.usedPct}% usado`;
  }
  return '🔒 requer licença';
}

export type StatusBarSeverity = 'normal' | 'warning' | 'error';

export interface StatusBarPresentation {
  text: string;
  tooltip: string;
  severity: StatusBarSeverity;
}

/** Igual ao badge acima, mas pra um item persistente na status bar — fica
 * sempre visível em vez de só aparecer quando um comando pago é executado.
 * Escondido de propósito pra licença paga (undefined): usuário que já pagou
 * não precisa de lembrete constante. */
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

export async function fetchConsumeCredits(
  baseUrl: string,
  machineHash: string,
  credits: number,
  fetchFn: typeof fetch = fetch,
): Promise<LicenseStatus> {
  return (await postJson(fetchFn, `${baseUrl}/trial/consume`, { machineHash, credits })) as LicenseStatus;
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
