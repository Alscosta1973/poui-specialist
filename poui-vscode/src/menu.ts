import * as vscode from 'vscode';
import { getCachedLicenseStatus } from './requireLicense';
import { GROUPS, sortedGroupEntries } from './menuLogic';

interface MenuQuickPickItem extends vscode.QuickPickItem {
  commandId?: string;
}

function buildPaidBadge(): string {
  const status = getCachedLicenseStatus();
  if (status?.tier === 'paid') {
    return '';
  }
  if (status?.tier === 'trial' && typeof status.daysLeft === 'number') {
    return `🔒 trial — ${status.daysLeft} dia(s)`;
  }
  return '🔒 requer licença';
}

export function buildMenuItems(): MenuQuickPickItem[] {
  const paidBadge = buildPaidBadge();
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
