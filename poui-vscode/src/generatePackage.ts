import * as vscode from 'vscode';
import * as fs from 'node:fs/promises';
import { accessSync } from 'node:fs';
import * as path from 'node:path';
import { findSevenZip, packageProject } from './packaging';

export function registerPackageCommand(
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel,
): vscode.Disposable {
  return vscode.commands.registerCommand('poui.package', async () => {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      void vscode.window.showErrorMessage('PO-UI: abra uma pasta de projeto Angular antes de empacotar.');
      return;
    }
    const workspaceRoot = workspaceFolder.uri.fsPath;

    const hasAngularJson = await fs
      .access(path.join(workspaceRoot, 'angular.json'))
      .then(() => true)
      .catch(() => false);
    if (!hasAngularJson) {
      void vscode.window.showErrorMessage('PO-UI: nenhum projeto Angular encontrado — empacotamento cancelado.');
      return;
    }

    const sevenZipPath = findSevenZip(process.env.PATH ?? '', existsSync);

    let proceedWithoutSevenZip = false;
    if (!sevenZipPath) {
      const choice = await vscode.window.showWarningMessage(
        'PO-UI: 7-Zip não encontrado (nem no PATH, nem em C:\\Program Files\\7-Zip). O fallback (Compress-Archive) é conhecido por gerar um .app que o Protheus falha ao extrair (UNZIPAPP FError: 161 / "Falha ao renomear").',
        { modal: true },
        'Prosseguir mesmo assim',
        'Cancelar',
      );
      if (choice !== 'Prosseguir mesmo assim') {
        return;
      }
      proceedWithoutSevenZip = true;
    }

    outputChannel.clear();
    outputChannel.show(true);
    outputChannel.appendLine('Empacotando projeto...');

    const result = await packageProject(workspaceRoot, { sevenZipPath, proceedWithoutSevenZip }, outputChannel);

    if (!result.success) {
      outputChannel.appendLine(`✗ ${result.errorMessage ?? 'erro desconhecido'}`);
      void vscode.window.showErrorMessage(`PO-UI: falha ao empacotar — ${result.errorMessage ?? 'erro desconhecido'}.`);
      return;
    }

    const relativeAppPath = result.appPath ? path.relative(workspaceRoot, result.appPath).split(path.sep).join('/') : '';
    const summary = result.usedRiskyFallback
      ? `PO-UI: pacote gerado em ${relativeAppPath} — ⚠ com Compress-Archive (7-Zip ausente), pode falhar ao extrair no Protheus.`
      : `PO-UI: pacote gerado e verificado em ${relativeAppPath}.`;
    outputChannel.appendLine(`✅ ${summary}`);

    if (result.usedRiskyFallback) {
      void vscode.window.showWarningMessage(summary);
    } else {
      void vscode.window.showInformationMessage(summary);
    }
  });
}

function existsSync(candidatePath: string): boolean {
  try {
    accessSync(candidatePath);
    return true;
  } catch {
    return false;
  }
}
