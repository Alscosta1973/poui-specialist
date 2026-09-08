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
