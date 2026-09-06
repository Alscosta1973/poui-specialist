import * as vscode from 'vscode';
import { computeMachineHash, activateLicenseKey, WORKER_BASE_URL } from './licenseCheck';
import { setSessionStatus } from './requireLicense';

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
    const result = await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: 'PO-UI: ativando licença...' },
      () => activateLicenseKey(WORKER_BASE_URL, machineHash, licenseKey.trim()),
    );

    if (!result.ok) {
      void vscode.window.showErrorMessage(`PO-UI: falha ao ativar a licença (${result.reason ?? 'erro desconhecido'}).`);
      return;
    }

    await context.secrets.store('poui.licenseKey', licenseKey.trim());
    setSessionStatus({ tier: 'paid', licenseKey: licenseKey.trim() });
    outputChannel.appendLine('PO-UI: licença ativada com sucesso.');
    void vscode.window.showInformationMessage('PO-UI: licença ativada com sucesso.');
  });
}
