import * as vscode from 'vscode';
import * as path from 'node:path';
import { deriveEntityNaming, resolveFixedModuleName } from './naming';
import { getGeneratorType } from './generatorTypes';
import { buildGeneratorSystemPrompt, buildGeneratorUserPrompt } from './promptBuilder';
import { buildScreenshotSystemPrompt, buildScreenshotUserPrompt, parseScreenshotManifest } from './screenshotPromptBuilder';
import { runAgent, OutputSink } from './agentRuntime';
import { runBuildFixLoop } from './buildFixLoop';

export function registerScreenshotCommand(
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel,
): vscode.Disposable {
  return vscode.commands.registerCommand('poui.generate.screenshot', async () => {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      void vscode.window.showErrorMessage('PO-UI: abra uma pasta de projeto Angular antes de gerar a partir de uma imagem.');
      return;
    }

    const imageUris = await vscode.window.showOpenDialog({
      title: 'Selecione a imagem (screenshot/wireframe)',
      canSelectMany: false,
      filters: { Imagens: ['png', 'jpg', 'jpeg', 'gif', 'webp'] },
    });
    if (!imageUris || imageUris.length === 0) {
      return;
    }
    const imagePath = imageUris[0].fsPath;

    outputChannel.clear();
    outputChannel.show(true);
    outputChannel.appendLine(`Analisando ${imagePath}...`);

    const assetsDir = path.join(context.extensionUri.fsPath, 'assets', 'agent-prompts');
    const model = vscode.workspace.getConfiguration('poui').get<string>('model');
    const effort = vscode.workspace
      .getConfiguration('poui')
      .get<'low' | 'medium' | 'high' | 'xhigh' | 'max'>('effort');
    const engineId = vscode.workspace.getConfiguration('poui').get<'claude' | 'codex' | 'gemini'>('aiEngine', 'claude');

    let analysisSystemPrompt: string;
    try {
      analysisSystemPrompt = await buildScreenshotSystemPrompt(assetsDir);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      void vscode.window.showErrorMessage(`PO-UI: falha ao carregar os arquivos de referência — ${message}.`);
      return;
    }

    const analysisLines: string[] = [];
    const sink: OutputSink = {
      appendLine(value: string) {
        analysisLines.push(value);
        outputChannel.appendLine(value);
      },
    };

    const analysisResult = await runAgent(
      {
        cwd: workspaceFolder.uri.fsPath,
        systemPrompt: analysisSystemPrompt,
        userPrompt: buildScreenshotUserPrompt(imagePath),
        tools: 'Read,Glob',
        model,
        effort,
      },
      sink,
      engineId,
    );

    if (!analysisResult.succeeded) {
      const message = `PO-UI: falha ao analisar a imagem — ${analysisResult.errorMessage ?? 'erro desconhecido'}.`;
      if (analysisResult.isAuthError) {
        void vscode.window.showErrorMessage(`${message} Rode \`${engineId}\` em um terminal para fazer login novamente.`);
        return;
      }
      void vscode.window.showErrorMessage(message);
      return;
    }

    const manifest = parseScreenshotManifest(analysisLines.join('\n'));
    if (!manifest) {
      void vscode.window.showErrorMessage(
        'PO-UI: não consegui interpretar a análise da imagem — veja o output channel "PO-UI" para o texto completo.',
      );
      return;
    }

    const type = getGeneratorType(manifest.type);
    if (!type) {
      void vscode.window.showErrorMessage(
        `PO-UI: a análise sugeriu o tipo "${manifest.type}", que não é um tipo válido do plugin.`,
      );
      return;
    }

    const naming = deriveEntityNaming(manifest.entity);
    const moduleName = type.requiresModule
      ? manifest.module
      : resolveFixedModuleName(type.fixedModule, naming.entityKebab);

    const summaryLines = [
      `Tipo: ${manifest.type}`,
      `Módulo: ${moduleName}`,
      `Entidade: ${naming.entityPascal}`,
      `Endpoint: ${manifest.apiPath}`,
      `Campos: ${manifest.fields}`,
    ];
    if (manifest.rules) {
      summaryLines.push(`Regras: ${manifest.rules}`);
    }

    const confirmation = await vscode.window.showInformationMessage(
      'PO-UI: análise da imagem concluída. Gerar os componentes agora?',
      { modal: true, detail: summaryLines.join('\n') },
      'Gerar',
    );
    if (confirmation !== 'Gerar') {
      return;
    }

    outputChannel.appendLine('');
    outputChannel.appendLine(`Gerando ${type.id} para ${naming.entityPascal} em ${moduleName}...`);

    let genSystemPrompt: string;
    try {
      genSystemPrompt = await buildGeneratorSystemPrompt(type, assetsDir);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      void vscode.window.showErrorMessage(`PO-UI: falha ao carregar os arquivos de referência — ${message}.`);
      return;
    }

    const baseUserPrompt = buildGeneratorUserPrompt(type, naming, moduleName, manifest.apiPath);
    const genUserPromptLines = [baseUserPrompt, '', `Campos identificados na imagem: ${manifest.fields}`];
    if (manifest.rules) {
      genUserPromptLines.push(`Regras adicionais identificadas na imagem: ${manifest.rules}`);
    }

    const result = await runAgent(
      {
        cwd: workspaceFolder.uri.fsPath,
        systemPrompt: genSystemPrompt,
        userPrompt: genUserPromptLines.join('\n'),
        model,
        effort,
      },
      sink,
      engineId,
    );

    if (!result.succeeded) {
      const message = `PO-UI: falha ao gerar componente — ${result.errorMessage ?? 'erro desconhecido'}.`;
      if (result.isAuthError) {
        void vscode.window.showErrorMessage(`${message} Rode \`${engineId}\` em um terminal para fazer login novamente.`);
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
        systemPrompt: genSystemPrompt,
        engineId,
        model,
        effort,
      },
      sink,
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
        void vscode.window.showErrorMessage(`PO-UI: não foi possível abrir o arquivo gerado — ${message}.`);
      }
    }
  });
}
