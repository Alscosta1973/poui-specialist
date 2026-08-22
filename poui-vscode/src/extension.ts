import * as vscode from 'vscode';
import { setApiKey } from './apiKey';
import { registerGeneratePageListCommand } from './generatePageList';

export function activate(context: vscode.ExtensionContext): void {
  const outputChannel = vscode.window.createOutputChannel('PO-UI');
  context.subscriptions.push(outputChannel);

  context.subscriptions.push(
    vscode.commands.registerCommand('poui.setApiKey', async () => {
      const value = await vscode.window.showInputBox({
        prompt: 'API key da Anthropic (ANTHROPIC_API_KEY)',
        password: true,
        ignoreFocusOut: true,
      });
      if (!value) {
        return;
      }
      try {
        await setApiKey(context.secrets, value);
        void vscode.window.showInformationMessage('PO-UI: API key configurada.');
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        void vscode.window.showErrorMessage(`PO-UI: ${message}`);
      }
    }),
  );

  context.subscriptions.push(registerGeneratePageListCommand(context, outputChannel));
}

export function deactivate(): void {}
