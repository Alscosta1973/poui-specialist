import * as vscode from 'vscode';
import { registerGenerateListComponentCommand } from './generateListComponent';

export function activate(context: vscode.ExtensionContext): void {
  const outputChannel = vscode.window.createOutputChannel('PO-UI');
  context.subscriptions.push(outputChannel);

  // Limpeza única do segredo do fluxo antigo de API key (removido): quem
  // atualiza de uma versão anterior não fica com a chave órfã no SecretStorage.
  // `delete` numa chave inexistente é no-op, então é fire-and-forget.
  void context.secrets.delete('poui.anthropicApiKey');

  context.subscriptions.push(registerGenerateListComponentCommand(context, outputChannel));
}

export function deactivate(): void {}
