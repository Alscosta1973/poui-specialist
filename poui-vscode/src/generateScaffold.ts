import * as vscode from 'vscode';
import { scaffoldProject } from './scaffolding';
import { ensureDevServer } from './devServerRegistry';
import { requireLicense } from './requireLicense';
import { askAndApplyClientLogo } from './generateClientLogo';

export function registerScaffoldCommand(
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel,
): vscode.Disposable {
  return vscode.commands.registerCommand('poui.scaffold', async () => {
    if (!(await requireLicense(context, outputChannel))) {
      return;
    }
    const projectName = await vscode.window.showInputBox({
      prompt: 'Nome do novo projeto Angular',
      placeHolder: 'meu-projeto',
      validateInput: (v) => (/^[a-z][a-z0-9-]*$/.test(v.trim()) ? undefined : 'Use minúsculas, números e hífen, começando por letra.'),
    });
    if (!projectName) {
      return;
    }

    const parentDirUris = await vscode.window.showOpenDialog({
      canSelectFiles: false,
      canSelectFolders: true,
      canSelectMany: false,
      openLabel: 'Criar o projeto aqui dentro',
      title: `Selecione a pasta onde criar "${projectName}/"`,
    });
    const parentDir = parentDirUris?.[0];
    if (!parentDir) {
      return;
    }

    const protheusUrl = await vscode.window.showInputBox({
      prompt: 'URL do Protheus REST para o proxy (Enter para usar o padrão local)',
      value: 'http://localhost:8086',
    });
    if (protheusUrl === undefined) {
      return;
    }

    const demoChoice = await vscode.window.showQuickPick(
      [
        { label: 'Sim — incluir um componente de boas-vindas', value: true },
        { label: 'Não — projeto mínimo', value: false },
      ],
      { placeHolder: 'Incluir um componente demo?' },
    );
    if (demoChoice === undefined) {
      return;
    }

    outputChannel.clear();
    outputChannel.show(true);
    outputChannel.appendLine(`Criando "${projectName}" em ${parentDir.fsPath}...`);

    const result = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `PO-UI: criando ${projectName} (ng new + ng add + npm install — pode levar alguns minutos)`,
        cancellable: false,
      },
      () =>
        scaffoldProject(
          parentDir.fsPath,
          { projectName: projectName.trim(), protheusUrl: protheusUrl.trim() || 'http://localhost:8086', includeDemo: demoChoice.value },
          outputChannel,
        ),
    );

    if (!result.success) {
      outputChannel.appendLine(`✗ ${result.errorMessage ?? 'erro desconhecido'}`);
      void vscode.window.showErrorMessage(`PO-UI: falha ao criar o projeto — ${result.errorMessage ?? 'erro desconhecido'}.`);
      return;
    }

    outputChannel.appendLine('✅ Scaffold concluído.');

    // padrão visual TOTVS: customização usa o logo do cliente; sem logo fica o TOTVS
    if (result.projectDir) {
      const logo = await vscode.window.showQuickPick(
        [
          { label: 'Não — produto/uso interno: manter o logo TOTVS', value: false },
          { label: 'Sim — customização: usar o logo do cliente', description: 'documento .docx ou imagens', value: true },
        ],
        { title: 'O projeto é uma customização para um cliente?', ignoreFocusOut: true },
      );
      if (logo?.value) {
        await askAndApplyClientLogo(context, outputChannel, result.projectDir);
      }
    }

    const openChoice = await vscode.window.showInformationMessage(
      `PO-UI: projeto "${projectName}" criado em ${result.projectDir}.`,
      'Abrir pasta',
      'Iniciar servidor aqui',
    );

    if (openChoice === 'Abrir pasta' && result.projectDir) {
      await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(result.projectDir), { forceNewWindow: false });
      return;
    }

    if (openChoice === 'Iniciar servidor aqui' && result.projectDir) {
      const serverResult = await ensureDevServer(result.projectDir, outputChannel);
      if (serverResult.ok) {
        void vscode.window.showInformationMessage(`PO-UI: servidor rodando em http://localhost:${serverResult.port}`);
      } else {
        void vscode.window.showErrorMessage(`PO-UI: falha ao iniciar o servidor — ${serverResult.errorMessage}`);
      }
    }
  });
}
