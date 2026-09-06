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
