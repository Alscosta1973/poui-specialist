import * as vscode from 'vscode';
import { registerGenerateComponentCommand } from './generateComponent';
import { registerGenerateTestCommand } from './generateTest';

export function activate(context: vscode.ExtensionContext): void {
  const outputChannel = vscode.window.createOutputChannel('PO-UI');
  context.subscriptions.push(outputChannel);

  // Limpeza única do segredo do fluxo antigo de API key (removido): quem
  // atualiza de uma versão anterior não fica com a chave órfã no SecretStorage.
  // `delete` numa chave inexistente é no-op, então é fire-and-forget.
  void context.secrets.delete('poui.anthropicApiKey');

  context.subscriptions.push(registerGenerateComponentCommand(context, outputChannel));
  context.subscriptions.push(registerGenerateTestCommand(context, outputChannel));
}

export function deactivate(): void {}
