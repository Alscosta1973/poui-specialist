import * as vscode from 'vscode';
import { formatStatusBarItem, LicenseStatus } from './licenseCheck';

let statusBarItem: vscode.StatusBarItem | undefined;

export function createLicenseStatusBarItem(context: vscode.ExtensionContext): vscode.StatusBarItem {
  const item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  item.command = 'poui.activateLicense';
  context.subscriptions.push(item);
  statusBarItem = item;
  return item;
}

/** Chamado sempre que o status de licença é (re)carregado — na ativação, e
 * de novo depois de uma ativação de chave bem-sucedida. */
export function updateLicenseStatusBar(status: LicenseStatus | undefined): void {
  if (!statusBarItem) {
    return;
  }
  const presentation = formatStatusBarItem(status);
  if (!presentation) {
    statusBarItem.hide();
    return;
  }
  statusBarItem.text = presentation.text;
  statusBarItem.tooltip = presentation.tooltip;
  statusBarItem.backgroundColor =
    presentation.severity === 'error'
      ? new vscode.ThemeColor('statusBarItem.errorBackground')
      : presentation.severity === 'warning'
        ? new vscode.ThemeColor('statusBarItem.warningBackground')
        : undefined;
  statusBarItem.show();
}
