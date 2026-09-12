import * as vscode from 'vscode';
import { computeMachineHash, fetchDevUnlock, fetchLicenseStatus, WORKER_BASE_URL } from './licenseCheck';
import { persistConfirmedStatus } from './requireLicense';

export function registerDevUnlockCommand(
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel,
): vscode.Disposable {
  return vscode.commands.registerCommand('poui.devUnlock', async () => {
    const password = await vscode.window.showInputBox({
      prompt: 'Senha de desbloqueio de máquina de desenvolvedor',
      password: true,
      validateInput: (v) => (v.trim() ? undefined : 'Informe a senha.'),
    });
    if (!password) {
      return;
    }

    const machineHash = computeMachineHash(vscode.env.machineId);
    let result;
    try {
      result = await vscode.window.withProgress(
        { location: vscode.ProgressLocation.Notification, title: 'PO-UI: desbloqueando máquina...' },
        () => fetchDevUnlock(WORKER_BASE_URL, machineHash, password.trim()),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      void vscode.window.showErrorMessage(`PO-UI: falha ao desbloquear — verifique sua conexão e tente novamente. (${message})`);
      return;
    }

    if (!result.ok) {
      void vscode.window.showErrorMessage(`PO-UI: falha ao desbloquear (${result.reason ?? 'erro desconhecido'}).`);
      return;
    }

    // O desbloqueio no servidor já valeu neste ponto — uma falha aqui só
    // atrasa o cache local refletir isso (a próxima checagem de licença
    // busca o status real de qualquer forma), não deve virar erro pro
    // usuário depois de já ter tido sucesso.
    try {
      const status = await fetchLicenseStatus(WORKER_BASE_URL, machineHash);
      await persistConfirmedStatus(context, status);
    } catch {
      // best-effort — ver comentário acima.
    }
    outputChannel.appendLine('PO-UI: máquina desbloqueada como dev com sucesso.');
    void vscode.window.showInformationMessage('PO-UI: máquina desbloqueada com sucesso.');
  });
}
