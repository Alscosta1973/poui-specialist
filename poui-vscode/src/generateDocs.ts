import * as vscode from 'vscode';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { checkEngineAvailable } from './cliCheck';
import { runAgent } from './agentRuntime';
import { parseComponentCategories, findComponentReferenceFile, buildDocsSystemPrompt, buildDocsUserPrompt } from './docsPromptBuilder';
import { EngineId } from './engineTypes';

export function registerDocsCommand(
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel,
): vscode.Disposable {
  return vscode.commands.registerCommand('poui.docs', async () => {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      void vscode.window.showErrorMessage('PO-UI: abra uma pasta de projeto antes de consultar a documentação.');
      return;
    }

    const engineId = vscode.workspace.getConfiguration('poui').get<EngineId>('aiEngine', 'claude');
    const cliCheck = await checkEngineAvailable(engineId);
    if (!cliCheck.available) {
      void vscode.window.showErrorMessage(
        `PO-UI: CLI do motor "${engineId}" não encontrado ou não está no PATH — instale e faça login antes de consultar.${cliCheck.errorMessage ? ` (${cliCheck.errorMessage})` : ''}`,
      );
      return;
    }

    const componentName = await vscode.window.showInputBox({
      prompt: 'Nome do componente PO-UI',
      placeHolder: 'po-table, po-lookup, po-page-edit, po-input...',
      validateInput: (v) => (v.trim() ? undefined : 'Informe um nome de componente.'),
    });
    if (!componentName) {
      return;
    }

    const assetsDir = path.join(context.extensionUri.fsPath, 'assets', 'agent-prompts');
    const skillMdContent = await fs.readFile(path.join(assetsDir, 'poui-components-skill.md'), 'utf8').catch(() => undefined);
    if (skillMdContent === undefined) {
      void vscode.window.showErrorMessage('PO-UI: falha ao carregar a referência de componentes (poui-components-skill.md ausente).');
      return;
    }

    const categories = parseComponentCategories(skillMdContent);
    const referenceFile = findComponentReferenceFile(categories, componentName);

    outputChannel.clear();
    outputChannel.show(true);
    outputChannel.appendLine(`Consultando documentação de ${componentName}...`);

    let systemPrompt: string;
    try {
      systemPrompt = await buildDocsSystemPrompt(assetsDir, referenceFile);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      void vscode.window.showErrorMessage(`PO-UI: falha ao carregar os arquivos de referência — ${message}.`);
      return;
    }

    const result = await runAgent(
      {
        cwd: workspaceFolder.uri.fsPath,
        systemPrompt,
        userPrompt: buildDocsUserPrompt(componentName),
        tools: 'Read',
        model: vscode.workspace.getConfiguration('poui').get<string>('model'),
        effort: vscode.workspace
          .getConfiguration('poui')
          .get<'low' | 'medium' | 'high' | 'xhigh' | 'max'>('effort'),
      },
      outputChannel,
      engineId,
    );

    if (!result.succeeded) {
      const message = `PO-UI: falha ao consultar a documentação — ${result.errorMessage ?? 'erro desconhecido'}.`;
      if (result.isAuthError) {
        void vscode.window.showErrorMessage(`${message} Rode \`${engineId}\` em um terminal para fazer login novamente.`);
        return;
      }
      void vscode.window.showErrorMessage(message);
      return;
    }

    void vscode.window.showInformationMessage(`PO-UI: documentação de ${componentName} exibida no output channel "PO-UI".`);
  });
}
