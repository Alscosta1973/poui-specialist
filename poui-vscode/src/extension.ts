import * as vscode from 'vscode';
import { registerGenerateComponentCommand } from './generateComponent';
import { registerGenerateTestCommand } from './generateTest';
import { registerLintCommand } from './generateLint';
import { registerQualityCommand } from './generateQuality';
import { registerReviewCommand } from './generateReview';
import { registerPreviewCommand } from './generatePreview';
import { registerE2eCommand } from './generateE2e';
import { stopTrackedServer } from './devServerRegistry';

export function activate(context: vscode.ExtensionContext): void {
  const outputChannel = vscode.window.createOutputChannel('PO-UI');
  context.subscriptions.push(outputChannel);

  // Limpeza única do segredo do fluxo antigo de API key (removido): quem
  // atualiza de uma versão anterior não fica com a chave órfã no SecretStorage.
  // `delete` numa chave inexistente é no-op, então é fire-and-forget.
  void context.secrets.delete('poui.anthropicApiKey');

  context.subscriptions.push(registerGenerateComponentCommand(context, outputChannel));
  context.subscriptions.push(registerGenerateTestCommand(context, outputChannel));
  context.subscriptions.push(registerLintCommand(context, outputChannel));
  context.subscriptions.push(registerQualityCommand(context, outputChannel));
  context.subscriptions.push(registerReviewCommand(context, outputChannel));
  context.subscriptions.push(registerPreviewCommand(context, outputChannel));
  context.subscriptions.push(registerE2eCommand(context, outputChannel));

  // Preview/E2E deixam um `ng serve` rodando em background (reaproveitado
  // entre execuções via devServerRegistry). Ao fechar esta janela/desativar
  // a extensão, encerra o que ela mesma rastreou pra cada workspace aberto —
  // sem isso, o processo sobrevive à janela do VS Code que o criou.
  context.subscriptions.push({
    dispose: () => {
      for (const folder of vscode.workspace.workspaceFolders ?? []) {
        void stopTrackedServer(folder.uri.fsPath);
      }
    },
  });
}

export function deactivate(): void {}
