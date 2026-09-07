import * as vscode from 'vscode';
import { getCachedLicenseStatus } from './requireLicense';
import { formatPaidBadge } from './licenseCheck';
import { GROUPS, sortedGroupEntries } from './menuLogic';

interface MenuQuickPickItem extends vscode.QuickPickItem {
  commandId?: string;
}

export function buildMenuItems(): MenuQuickPickItem[] {
  const paidBadge = formatPaidBadge(getCachedLicenseStatus());
  const items: MenuQuickPickItem[] = [];
  for (const group of GROUPS) {
    items.push({ label: group.label, kind: vscode.QuickPickItemKind.Separator });
    for (const entry of sortedGroupEntries(group)) {
      items.push({
        label: entry.label,
        description: entry.paid ? paidBadge : undefined,
        commandId: entry.commandId,
      });
    }
  }
  return items;
}

export function registerMenuCommand(
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel,
): vscode.Disposable {
  return vscode.commands.registerCommand('poui.menu', async () => {
    const choice = await vscode.window.showQuickPick(buildMenuItems(), {
      placeHolder: 'O que você quer fazer?',
    });
    if (!choice?.commandId) {
      return;
    }
    await vscode.commands.executeCommand(choice.commandId);
  });
}
