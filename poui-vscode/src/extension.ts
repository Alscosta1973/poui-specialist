import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext): void {
  const outputChannel = vscode.window.createOutputChannel('PO-UI');
  context.subscriptions.push(outputChannel);
}

export function deactivate(): void {}
