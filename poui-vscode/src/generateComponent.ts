import * as vscode from 'vscode';
import * as path from 'node:path';
import { deriveEntityNaming, isValidModuleName, resolveFixedModuleName } from './naming';
import { buildGeneratorSystemPrompt, buildGeneratorUserPrompt } from './promptBuilder';
import { checkEngineAvailable } from './cliCheck';
import { runAgent } from './agentRuntime';
import { runBuildFixLoop } from './buildFixLoop';
import { GENERATOR_TYPES, GeneratorType } from './generatorTypes';

/** Nome de entidade aceitável: começa por letra e usa apenas letras, dígitos,
 * espaço, hífen ou underscore — evita entradas como `---` ou `123`, que
 * derivariam nomes quebrados em `deriveEntityNaming`. */
const ENTITY_NAME_PATTERN = /^[A-Za-z][A-Za-z0-9 _-]*$/;

interface TypeQuickPickItem extends vscode.QuickPickItem {
  type?: GeneratorType;
}

function buildTypeQuickPickItems(): TypeQuickPickItem[] {
  const items: TypeQuickPickItem[] = [];
  let lastFamily: string | undefined;
  for (const type of GENERATOR_TYPES) {
    if (type.family !== lastFamily) {
      items.push({ label: type.family, kind: vscode.QuickPickItemKind.Separator });
      lastFamily = type.family;
    }
    items.push({ label: type.label, description: type.id, detail: type.description, type });
  }
  return items;
}

export function registerGenerateComponentCommand(
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel,
): vscode.Disposable {
  return vscode.commands.registerCommand('poui.generate.component', async () => {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      void vscode.window.showErrorMessage(
        'PO-UI: abra uma pasta de projeto Angular antes de gerar um componente.',
      );
      return;
    }

    const engineId = vscode.workspace.getConfiguration('poui').get<'claude' | 'codex' | 'gemini'>('aiEngine', 'claude');

    const cliCheck = await checkEngineAvailable(engineId);
    if (!cliCheck.available) {
      void vscode.window.showErrorMessage(
        `PO-UI: CLI do motor "${engineId}" não encontrado ou não está no PATH — instale e faça login antes de gerar código.${cliCheck.errorMessage ? ` (${cliCheck.errorMessage})` : ''}`,
      );
      return;
    }

    const typeChoice = await vscode.window.showQuickPick(buildTypeQuickPickItems(), {
      placeHolder: 'Qual tipo de componente você quer gerar?',
    });
    if (!typeChoice?.type) {
      return;
    }
    const type = typeChoice.type;

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

    const naming = deriveEntityNaming(rawName);
    if (naming.wasAutoCorrected) {
      void vscode.window.showWarningMessage(
        `PO-UI: nome corrigido para PascalCase: ${naming.entityPascal}.`,
      );
    }

    let moduleName: string;
    if (type.requiresModule) {
      const moduleInput = await vscode.window.showInputBox({
        prompt: 'Módulo Angular de destino (ex: financeiro)',
        validateInput: (value) =>
          isValidModuleName(value) ? undefined : 'Use minúsculas, números e hífen, começando por letra.',
      });
      if (!moduleInput) {
        return;
      }
      moduleName = moduleInput;
    } else {
      moduleName = resolveFixedModuleName(type.fixedModule, naming.entityKebab);
      outputChannel.appendLine(`Tipo \`${type.id}\` tem destino fixo — usando módulo "${moduleName}".`);
    }

    const apiPathInput = await vscode.window.showInputBox({
      prompt: 'Endpoint REST Protheus (Enter para usar o padrão)',
      value: naming.defaultApiPath,
    });
    if (apiPathInput === undefined) {
      return;
    }
    const resolvedApiPath = apiPathInput.trim() || naming.defaultApiPath;

    let sourceFilePath: string | undefined;
    if (type.requiresSourceFile) {
      const sourceFileUris = await vscode.window.showOpenDialog({
        title: 'Selecione o arquivo .prw/.tlpp de origem',
        canSelectMany: false,
        filters: { 'ADVPL/TLPP': ['prw', 'tlpp'] },
      });
      if (!sourceFileUris || sourceFileUris.length === 0) {
        return;
      }
      sourceFilePath = sourceFileUris[0].fsPath;
    }

    outputChannel.clear();
    outputChannel.show(true);
    outputChannel.appendLine(`Gerando ${type.id} para ${naming.entityPascal} em ${moduleName}...`);

    const assetsDir = path.join(context.extensionUri.fsPath, 'assets', 'agent-prompts');
    let systemPrompt: string;
    try {
      systemPrompt = await buildGeneratorSystemPrompt(type, assetsDir);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      void vscode.window.showErrorMessage(
        `PO-UI: falha ao carregar os arquivos de referência — ${message}.`,
      );
      return;
    }
    const userPrompt = buildGeneratorUserPrompt(type, naming, moduleName, resolvedApiPath, sourceFilePath);

    const result = await runAgent(
      {
        cwd: workspaceFolder.uri.fsPath,
        systemPrompt,
        userPrompt,
        addDir: sourceFilePath ? path.dirname(sourceFilePath) : undefined,
        model: vscode.workspace.getConfiguration('poui').get<string>('model'),
        effort: vscode.workspace
          .getConfiguration('poui')
          .get<'low' | 'medium' | 'high' | 'xhigh' | 'max'>('effort'),
      },
      outputChannel,
      engineId,
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

    outputChannel.appendLine('Verificando o build...');
    const buildFix = await runBuildFixLoop(
      {
        cwd: workspaceFolder.uri.fsPath,
        filesWritten: result.filesWritten,
        systemPrompt,
        engineId,
        model: vscode.workspace.getConfiguration('poui').get<string>('model'),
        effort: vscode.workspace
          .getConfiguration('poui')
          .get<'low' | 'medium' | 'high' | 'xhigh' | 'max'>('effort'),
      },
      outputChannel,
    );

    const summary = `PO-UI: ${result.filesWritten.length} arquivo(s) gerado(s)${
      buildFix.finalSuccess ? ', build ok.' : ' — build ainda com erro(s), revise antes de usar.'
    }`;
    const openChoice = buildFix.finalSuccess
      ? await vscode.window.showInformationMessage(summary, 'Abrir arquivo gerado')
      : await vscode.window.showWarningMessage(summary, 'Abrir arquivo gerado');
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
