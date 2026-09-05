import * as vscode from 'vscode';
import * as path from 'node:path';
import { checkEngineAvailable } from './cliCheck';
import { runAgent } from './agentRuntime';
import { buildTestSystemPrompt, buildTestUserPrompt } from './testPromptBuilder';
import { isKarmaConfigured } from './karmaCheck';
import { configureKarma } from './karmaSetup';
import { EngineId } from './engineTypes';

/** Arquivos elegíveis: qualquer `.component.ts` ou `.service.ts` do projeto —
 * gerado pelo plugin ou legado, seguindo o mesmo escopo do comando original. */
function isEligibleTarget(fsPath: string): boolean {
  return fsPath.endsWith('.component.ts') || fsPath.endsWith('.service.ts');
}

export function registerGenerateTestCommand(
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel,
): vscode.Disposable {
  return vscode.commands.registerCommand('poui.generate.test', async () => {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      void vscode.window.showErrorMessage(
        'PO-UI: abra uma pasta de projeto Angular antes de gerar um teste.',
      );
      return;
    }

    const engineId = vscode.workspace.getConfiguration('poui').get<EngineId>('aiEngine', 'claude');
    const cliCheck = await checkEngineAvailable(engineId);
    if (!cliCheck.available) {
      void vscode.window.showErrorMessage(
        `PO-UI: CLI do motor "${engineId}" não encontrado ou não está no PATH — instale e faça login antes de gerar código.${cliCheck.errorMessage ? ` (${cliCheck.errorMessage})` : ''}`,
      );
      return;
    }

    if (!(await isKarmaConfigured(workspaceFolder.uri.fsPath))) {
      const choice = await vscode.window.showWarningMessage(
        'PO-UI: este projeto não parece ter o Karma configurado (nenhum target `test` usando ' +
          '@angular/build:karma em angular.json) — o spec ainda será gerado, mas `ng test` não vai rodar ' +
          'até configurar um test runner.',
        'Configurar Karma',
        'Continuar sem configurar',
      );
      if (choice === 'Configurar Karma') {
        outputChannel.clear();
        outputChannel.show(true);
        const setupResult = await vscode.window.withProgress(
          { location: vscode.ProgressLocation.Notification, title: 'PO-UI: configurando Karma...' },
          () => configureKarma(workspaceFolder.uri.fsPath, outputChannel),
        );
        for (const step of setupResult.steps) {
          outputChannel.appendLine(`✓ ${step}`);
        }
        if (setupResult.success) {
          void vscode.window.showInformationMessage(
            'PO-UI: Karma configurado! Rode `PO-UI: Gerar Teste Unitário` de novo para gerar o teste.',
          );
        } else {
          void vscode.window.showErrorMessage(
            `PO-UI: falha ao configurar o Karma — ${setupResult.errorMessage ?? 'erro desconhecido'}.`,
          );
        }
        return;
      }
      if (choice !== 'Continuar sem configurar') {
        return;
      }
    }

    const defaultDir = vscode.Uri.file(path.join(workspaceFolder.uri.fsPath, 'src', 'app'));
    const picked = await vscode.window.showOpenDialog({
      canSelectMany: false,
      canSelectFolders: false,
      defaultUri: defaultDir,
      filters: { 'TypeScript': ['ts'] },
      openLabel: 'Gerar teste para este arquivo',
      title: 'Selecione o componente ou service para gerar o teste',
    });
    const target = picked?.[0];
    if (!target) {
      return;
    }
    if (!isEligibleTarget(target.fsPath)) {
      void vscode.window.showErrorMessage(
        'PO-UI: selecione um arquivo `.component.ts` ou `.service.ts`.',
      );
      return;
    }

    const relativePath = path.relative(workspaceFolder.uri.fsPath, target.fsPath).split(path.sep).join('/');

    outputChannel.clear();
    outputChannel.show(true);
    outputChannel.appendLine(`Gerando teste unitário para ${relativePath}...`);

    const assetsDir = path.join(context.extensionUri.fsPath, 'assets', 'agent-prompts');
    let systemPrompt: string;
    try {
      systemPrompt = await buildTestSystemPrompt(assetsDir);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      void vscode.window.showErrorMessage(
        `PO-UI: falha ao carregar os arquivos de referência — ${message}.`,
      );
      return;
    }
    const userPrompt = buildTestUserPrompt(relativePath);

    const result = await runAgent(
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
      engineId,
    );

    if (!result.succeeded) {
      const message = `PO-UI: falha ao gerar teste — ${result.errorMessage ?? 'erro desconhecido'}.`;
      if (result.isAuthError) {
        void vscode.window.showErrorMessage(
          `${message} Rode \`${engineId}\` em um terminal para fazer login novamente.`,
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
      `PO-UI: teste gerado. Rode \`ng test\` manualmente para verificar.`,
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
