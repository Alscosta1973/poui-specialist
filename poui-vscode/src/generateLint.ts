import * as vscode from 'vscode';
import * as path from 'node:path';
import { runLint, formatLintReport, applyLintFixesToDisk } from './lint';

export function registerLintCommand(
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel,
): vscode.Disposable {
  return vscode.commands.registerCommand('poui.lint', async () => {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      void vscode.window.showErrorMessage(
        'PO-UI: abra uma pasta de projeto Angular antes de rodar o lint.',
      );
      return;
    }

    const defaultDir = vscode.Uri.file(path.join(workspaceFolder.uri.fsPath, 'src', 'app'));
    const picked = await vscode.window.showOpenDialog({
      canSelectMany: false,
      canSelectFiles: false,
      canSelectFolders: true,
      defaultUri: defaultDir,
      openLabel: 'Rodar lint nesta pasta',
      title: 'Selecione a pasta a analisar',
    });
    const targetFolder = picked?.[0];
    if (!targetFolder) {
      return;
    }

    const relativeLabel = path.relative(workspaceFolder.uri.fsPath, targetFolder.fsPath).split(path.sep).join('/') || '.';

    outputChannel.clear();
    outputChannel.show(true);
    outputChannel.appendLine(`Analisando ${relativeLabel}...`);

    const result = await runLint(targetFolder.fsPath);
    outputChannel.appendLine('');
    outputChannel.appendLine(formatLintReport(relativeLabel, result));

    if (result.pairs.length === 0) {
      void vscode.window.showWarningMessage(`PO-UI: nenhum componente encontrado em ${relativeLabel}.`);
      return;
    }
    if (result.findings.length === 0) {
      void vscode.window.showInformationMessage(`PO-UI: nenhum problema encontrado em ${relativeLabel}.`);
      return;
    }

    const hasFixable = result.findings.some((f) => f.fixable);
    if (!hasFixable) {
      void vscode.window.showWarningMessage(
        `PO-UI: ${result.findings.length} problema(s) encontrado(s) — nenhum com correção automática disponível. Veja o output channel "PO-UI".`,
      );
      return;
    }

    const choice = await vscode.window.showWarningMessage(
      `PO-UI: ${result.findings.length} problema(s) encontrado(s). Aplicar as correções automáticas disponíveis?`,
      'Aplicar correções',
      'Só relatório',
    );
    if (choice !== 'Aplicar correções') {
      return;
    }

    const outcome = await applyLintFixesToDisk(targetFolder.fsPath, result);
    outputChannel.appendLine('');
    outputChannel.appendLine(`Fixes aplicados em ${relativeLabel}:`);
    for (const line of outcome.fixedSummaryLines) {
      outputChannel.appendLine(line);
    }
    if (outcome.manualReviewLines.length > 0) {
      outputChannel.appendLine('');
      outputChannel.appendLine('Não corrigidos automaticamente (requerem análise manual):');
      for (const line of outcome.manualReviewLines) {
        outputChannel.appendLine(line);
      }
    }
    outputChannel.appendLine('');
    outputChannel.appendLine('Execute ng build para verificar compilação.');

    void vscode.window.showInformationMessage(
      `PO-UI: ${outcome.fixedSummaryLines.length} correção(ões) aplicada(s). Veja o output channel "PO-UI".`,
    );
  });
}
