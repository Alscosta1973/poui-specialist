import * as vscode from 'vscode';
import * as path from 'node:path';
import { deriveEntityNaming, isValidModuleName } from './naming';
import { buildListSystemPrompt, buildListUserPrompt } from './promptBuilder';
import { checkClaudeCliAvailable } from './cliCheck';
import { runGeneratePageList } from './agentRuntime';
import { LIST_COMPONENT_TYPES, ListComponentType } from './listTypes';

/** Nome de entidade aceitável: começa por letra e usa apenas letras, dígitos,
 * espaço, hífen ou underscore — evita entradas como `---` ou `123`, que
 * derivariam nomes quebrados em `deriveEntityNaming`. */
const ENTITY_NAME_PATTERN = /^[A-Za-z][A-Za-z0-9 _-]*$/;

export function registerGenerateListComponentCommand(
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel,
): vscode.Disposable {
  return vscode.commands.registerCommand('poui.generate.listComponent', async () => {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      void vscode.window.showErrorMessage(
        'PO-UI: abra uma pasta de projeto Angular antes de gerar um componente.',
      );
      return;
    }

    const cliCheck = await checkClaudeCliAvailable();
    if (!cliCheck.available) {
      void vscode.window.showErrorMessage(
        `PO-UI: CLI do Claude Code não encontrado ou não está no PATH — instale (https://code.claude.com) e faça login com \`claude\` antes de gerar código.${cliCheck.errorMessage ? ` (${cliCheck.errorMessage})` : ''}`,
      );
      return;
    }

    const typeChoice = await vscode.window.showQuickPick(
      LIST_COMPONENT_TYPES.map((type) => ({
        label: type.label,
        description: type.id,
        detail: type.description,
        type,
      })),
      { placeHolder: 'Qual tipo de componente de lista você quer gerar?' },
    );
    if (!typeChoice) {
      return;
    }
    const type: ListComponentType = typeChoice.type;

    const rawName = await vscode.window.showInputBox({
      prompt: 'Nome da entidade (ex: Pedidos)',
      validateInput: (value) => {
        const trimmed = value.trim();
        if (!trimmed) {
          return 'Informe um nome.';
        }
        return ENTITY_NAME_PATTERN.test(trimmed)
          ? undefined
          : 'Use letras, números, espaço, hífen ou underscore, começando por letra.';
      },
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
    outputChannel.appendLine(`Gerando ${type.id} para ${naming.entityPascal} em ${moduleName}...`);

    const assetsDir = path.join(context.extensionUri.fsPath, 'assets', 'agent-prompts');
    let systemPrompt: string;
    try {
      systemPrompt = await buildListSystemPrompt(type, assetsDir);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      void vscode.window.showErrorMessage(
        `PO-UI: falha ao carregar os arquivos de referência — ${message}.`,
      );
      return;
    }
    const userPrompt = buildListUserPrompt(type, naming, moduleName, resolvedApiPath);

    const result = await runGeneratePageList(
      {
        cwd: workspaceFolder.uri.fsPath,
        systemPrompt,
        userPrompt,
        model: vscode.workspace.getConfiguration('poui').get<string>('model'),
        effort: vscode.workspace
          .getConfiguration('poui')
          .get<'low' | 'medium' | 'high' | 'xhigh' | 'max'>('effort'),
      },
      outputChannel,
    );

    if (!result.succeeded) {
      const message = `PO-UI: falha ao gerar componente — ${result.errorMessage ?? 'erro desconhecido'}.`;
      if (result.isAuthError) {
        void vscode.window.showErrorMessage(
          `${message} Rode \`claude\` em um terminal para fazer login novamente.`,
        );
        return;
      }
      void vscode.window.showErrorMessage(message);
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
      try {
        const firstFile = path.isAbsolute(result.filesWritten[0])
          ? result.filesWritten[0]
          : path.join(workspaceFolder.uri.fsPath, result.filesWritten[0]);
        const doc = await vscode.workspace.openTextDocument(firstFile);
        await vscode.window.showTextDocument(doc);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        void vscode.window.showErrorMessage(
          `PO-UI: não foi possível abrir o arquivo gerado — ${message}.`,
        );
      }
    }
  });
}
