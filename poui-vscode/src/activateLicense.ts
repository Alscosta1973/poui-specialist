import * as vscode from 'vscode';
import { computeMachineHash, activateLicenseKey, WORKER_BASE_URL } from './licenseCheck';
import { persistConfirmedStatus } from './requireLicense';

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
    let result;
    try {
      result = await vscode.window.withProgress(
        { location: vscode.ProgressLocation.Notification, title: 'PO-UI: ativando licença...' },
        () => activateLicenseKey(WORKER_BASE_URL, machineHash, licenseKey.trim()),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      void vscode.window.showErrorMessage(`PO-UI: falha ao ativar a licença — verifique sua conexão e tente novamente. (${message})`);
      return;
    }

    if (!result.ok) {
      void vscode.window.showErrorMessage(`PO-UI: falha ao ativar a licença (${result.reason ?? 'erro desconhecido'}).`);
      return;
    }

    await context.secrets.store('poui.licenseKey', licenseKey.trim());
    await persistConfirmedStatus(context, { tier: 'paid', licenseKey: licenseKey.trim() });
    outputChannel.appendLine('PO-UI: licença ativada com sucesso.');
    void vscode.window.showInformationMessage('PO-UI: licença ativada com sucesso.');
  });
}
