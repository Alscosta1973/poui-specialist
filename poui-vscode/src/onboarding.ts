import * as vscode from 'vscode';
import { shouldShowWhatsNew } from './versionNotice';

const LAST_SEEN_VERSION_KEY = 'poui.lastSeenVersion';
const WALKTHROUGH_ID = 'andre-costa.poui-vscode#poui.gettingStarted';

export async function showFirstRunOrWhatsNew(context: vscode.ExtensionContext, currentVersion: string): Promise<void> {
  const lastSeenVersion = context.globalState.get<string>(LAST_SEEN_VERSION_KEY);

  if (lastSeenVersion === undefined) {
    const choice = await vscode.window.showInformationMessage(
      'Bem-vindo ao PO-UI Specialist! Seu trial de 14 dias começou.',
      'Ver Guia Rápido',
    );
    if (choice === 'Ver Guia Rápido') {
      void vscode.commands.executeCommand('workbench.action.openWalkthrough', WALKTHROUGH_ID);
    }
  } else if (shouldShowWhatsNew(lastSeenVersion, currentVersion)) {
    const choice = await vscode.window.showInformationMessage(
      `PO-UI Specialist atualizado para v${currentVersion}.`,
      'Ver Changelog',
    );
    if (choice === 'Ver Changelog') {
      void vscode.commands.executeCommand(
        'markdown.showPreview',
        vscode.Uri.joinPath(context.extensionUri, 'CHANGELOG.md'),
      );
    }
  }

  await context.globalState.update(LAST_SEEN_VERSION_KEY, currentVersion);
}
