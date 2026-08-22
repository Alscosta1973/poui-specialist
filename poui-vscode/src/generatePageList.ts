import * as vscode from 'vscode';
import * as path from 'node:path';
import { deriveEntityNaming, isValidModuleName } from './naming';
import { buildPageListSystemPrompt, buildPageListUserPrompt } from './promptBuilder';
import { getApiKey } from './apiKey';
import { runGeneratePageList } from './agentRuntime';

export function registerGeneratePageListCommand(
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel,
): vscode.Disposable {
  return vscode.commands.registerCommand('poui.generate.pageList', async () => {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      void vscode.window.showErrorMessage(
        'PO-UI: abra uma pasta de projeto Angular antes de gerar um componente.',
      );
      return;
    }

    const apiKey = await getApiKey(context.secrets);
    if (!apiKey) {
      const choice = await vscode.window.showErrorMessage(
        'PO-UI: configure a API key da Anthropic antes de gerar código.',
        'Configurar API Key',
      );
      if (choice === 'Configurar API Key') {
        await vscode.commands.executeCommand('poui.setApiKey');
      }
      return;
    }

    const rawName = await vscode.window.showInputBox({
      prompt: 'Nome da entidade (ex: Pedidos)',
      validateInput: (value) => (value.trim() ? undefined : 'Informe um nome.'),
    });
    if (!rawName) {
      return;
    }

    const moduleName = await vscode.window.showInputBox({
      prompt: 'Módulo Angular de destino (ex: financeiro)',
      validateInput: (value) =>
        isValidModuleName(value) ? undefined : 'Use minúsculas, números e hífen, começando por letra.',
    });
    if (!moduleName) {
      return;
    }

    const naming = deriveEntityNaming(rawName);
    if (naming.wasAutoCorrected) {
      void vscode.window.showWarningMessage(
        `PO-UI: nome corrigido para PascalCase: ${naming.entityPascal}.`,
      );
    }

    const apiPathInput = await vscode.window.showInputBox({
      prompt: 'Endpoint REST Protheus (Enter para usar o padrão)',
      value: naming.defaultApiPath,
    });
    if (apiPathInput === undefined) {
      return;
    }
    const resolvedApiPath = apiPathInput.trim() || naming.defaultApiPath;

    outputChannel.clear();
    outputChannel.show(true);
    outputChannel.appendLine(`Gerando page-list para ${naming.entityPascal} em ${moduleName}...`);

    const assetsDir = path.join(context.extensionUri.fsPath, 'assets', 'agent-prompts');
    const systemPrompt = await buildPageListSystemPrompt(assetsDir);
    const userPrompt = buildPageListUserPrompt(naming, moduleName, resolvedApiPath);

    const result = await runGeneratePageList(
      {
        cwd: workspaceFolder.uri.fsPath,
        apiKey,
        systemPrompt,
        userPrompt,
        model: vscode.workspace.getConfiguration('poui').get<string>('model'),
      },
      outputChannel,
    );

    if (!result.succeeded) {
      void vscode.window.showErrorMessage(
        `PO-UI: falha ao gerar componente — ${result.errorMessage ?? 'erro desconhecido'}.`,
      );
      return;
    }

    if (result.filesWritten.length === 0) {
      void vscode.window.showWarningMessage('PO-UI: o agente terminou sem gerar arquivos.');
      return;
    }

    const openChoice = await vscode.window.showInformationMessage(
      `PO-UI: ${result.filesWritten.length} arquivo(s) gerado(s).`,
      'Abrir arquivo gerado',
    );
    if (openChoice === 'Abrir arquivo gerado') {
      const firstFile = path.isAbsolute(result.filesWritten[0])
        ? result.filesWritten[0]
        : path.join(workspaceFolder.uri.fsPath, result.filesWritten[0]);
      const doc = await vscode.workspace.openTextDocument(firstFile);
      await vscode.window.showTextDocument(doc);
    }
  });
}
