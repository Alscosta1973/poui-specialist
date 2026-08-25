import * as vscode from 'vscode';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { runQualityAudit, formatQualityReport } from './quality';

export function registerQualityCommand(
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel,
): vscode.Disposable {
  return vscode.commands.registerCommand('poui.quality', async () => {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      void vscode.window.showErrorMessage(
        'PO-UI: abra uma pasta de projeto Angular antes de rodar a auditoria de qualidade.',
      );
      return;
    }

    const hasAngularJson = await fs
      .access(path.join(workspaceFolder.uri.fsPath, 'angular.json'))
      .then(() => true)
      .catch(() => false);
    if (!hasAngularJson) {
      void vscode.window.showErrorMessage('PO-UI: nenhum projeto Angular encontrado — auditoria cancelada.');
      return;
    }

    outputChannel.clear();
    outputChannel.show(true);
    outputChannel.appendLine('Auditando qualidade dos componentes gerados...');

    const { results, routes } = await runQualityAudit(workspaceFolder.uri.fsPath);

    if (results.length === 0) {
      const message = 'PO-UI: nenhum componente gerado pelo plugin encontrado em src/app/.';
      outputChannel.appendLine(message);
      void vscode.window.showWarningMessage(message);
      return;
    }

    outputChannel.appendLine('');
    outputChannel.appendLine(formatQualityReport(results, routes));

    const criticos = results.filter((r) => r.classification === 'critico').length;
    const atencao = results.filter((r) => r.classification === 'atencao').length;
    const aprovados = results.length - criticos - atencao;
    void vscode.window.showInformationMessage(
      `PO-UI: ${aprovados} aprovado(s) · ${atencao} com atenção · ${criticos} crítico(s). Veja o output channel "PO-UI".`,
    );
  });
}
