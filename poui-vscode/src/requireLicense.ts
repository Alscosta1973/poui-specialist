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
