import * as vscode from 'vscode';
import {
  WORKER_BASE_URL,
  computeMachineHash,
  isPlaceholderMachineId,
  isAccessAllowed,
  isCacheFresh,
  shouldShowExpiryWarning,
  fetchTrialStart,
  fetchLicenseStatus,
  LicenseStatus,
} from './licenseCheck';
import { updateLicenseStatusBar } from './licenseStatusBar';
import { buildPurchaseMailto } from './purchaseLink';

const GRACE_PERIOD_MS = 3 * 24 * 60 * 60 * 1000;
const CACHE_KEY = 'poui.licenseStatusCache';
const EXPIRY_WARNING_THRESHOLD_DAYS = 3;

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

export async function requireLicense(context: vscode.ExtensionContext, outputChannel: vscode.OutputChannel): Promise<boolean> {
  if (initPromise) {
    await initPromise;
  }
  if (isAccessAllowed(sessionStatus)) {
    if (sessionStatus?.tier === 'trial' && typeof sessionStatus.daysLeft === 'number') {
      if (!hasShownExpiryWarning && shouldShowExpiryWarning(sessionStatus, EXPIRY_WARNING_THRESHOLD_DAYS)) {
        hasShownExpiryWarning = true;
        void offerPurchaseOrActivate(
          `PO-UI: seu trial termina em ${sessionStatus.daysLeft} dia(s). Ative uma licença paga para continuar usando sem interrupção.`,
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
