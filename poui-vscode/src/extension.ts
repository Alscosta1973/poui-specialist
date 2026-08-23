import * as vscode from 'vscode';
import { registerGeneratePageListCommand } from './generatePageList';

export function activate(context: vscode.ExtensionContext): void {
  const outputChannel = vscode.window.createOutputChannel('PO-UI');
  context.subscriptions.push(outputChannel);

  context.subscriptions.push(registerGeneratePageListCommand(context, outputChannel));
}

export function deactivate(): void {}
