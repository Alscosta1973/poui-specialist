import * as vscode from 'vscode';
import * as fs from 'node:fs/promises';
import { accessSync } from 'node:fs';
import * as path from 'node:path';
import { findSevenZip, packageProject } from './packaging';
import { packageSources, sourcesZipName } from './sourcePackaging';
import { requireLicense } from './requireLicense';

export function registerPackageCommand(
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel,
): vscode.Disposable {
  return vscode.commands.registerCommand('poui.package', async () => {
    if (!(await requireLicense(context, outputChannel))) {
      return;
    }
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      void vscode.window.showErrorMessage('PO-UI: abra uma pasta de projeto Angular antes de empacotar.');
      return;
    }
    const workspaceRoot = workspaceFolder.uri.fsPath;

    const hasAngularJson = await fs
      .access(path.join(workspaceRoot, 'angular.json'))
      .then(() => true)
      .catch(() => false);
    if (!hasAngularJson) {
      void vscode.window.showErrorMessage('PO-UI: nenhum projeto Angular encontrado — empacotamento cancelado.');
      return;
    }

    const conteudo = await vscode.window.showQuickPick(
      [
        { label: 'Somente o .app', description: 'Resource/<projeto>.app', fontes: false },
        {
          label: '.app + zip dos fontes para o cliente',
          description: 'Resource/<projeto>-fontes.zip: projeto Angular sem node_modules/dist/proxy local, com LEIA-ME',
          fontes: true,
        },
      ],
      { title: 'PO-UI: Empacotar Projeto', placeHolder: 'O que gerar?' },
    );
    if (!conteudo) {
      return;
    }

    const sevenZipPath = findSevenZip(process.env.PATH ?? '', existsSync);

    let proceedWithoutSevenZip = false;
    if (!sevenZipPath) {
      const choice = await vscode.window.showWarningMessage(
        'PO-UI: 7-Zip não encontrado (nem no PATH, nem em C:\\Program Files\\7-Zip). O fallback (Compress-Archive) é conhecido por gerar um .app que o Protheus falha ao extrair (UNZIPAPP FError: 161 / "Falha ao renomear").',
        { modal: true },
        'Prosseguir mesmo assim',
        'Cancelar',
      );
      if (choice !== 'Prosseguir mesmo assim') {
        return;
      }
      proceedWithoutSevenZip = true;
    }

    outputChannel.clear();
    outputChannel.show(true);
    outputChannel.appendLine('Empacotando projeto...');

    const result = await packageProject(workspaceRoot, { sevenZipPath, proceedWithoutSevenZip }, outputChannel);

    if (!result.success) {
      outputChannel.appendLine(`✗ ${result.errorMessage ?? 'erro desconhecido'}`);
      void vscode.window.showErrorMessage(`PO-UI: falha ao empacotar — ${result.errorMessage ?? 'erro desconhecido'}.`);
      return;
    }

    const relativeAppPath = result.appPath ? path.relative(workspaceRoot, result.appPath).split(path.sep).join('/') : '';
    let summary = result.usedRiskyFallback
      ? `PO-UI: pacote gerado em ${relativeAppPath} — ⚠ com Compress-Archive (7-Zip ausente), pode falhar ao extrair no Protheus.`
      : `PO-UI: pacote gerado e verificado em ${relativeAppPath}.`;

    if (conteudo.fontes && result.appPath) {
      const projectName = path.basename(result.appPath, '.app');
      outputChannel.appendLine('Gerando o zip dos fontes para o cliente...');
      const fontes = await packageSources(workspaceRoot, projectName, sevenZipPath, outputChannel);
      if (!fontes.success) {
        outputChannel.appendLine(`✗ Zip dos fontes: ${fontes.errorMessage ?? 'erro desconhecido'}`);
        void vscode.window.showErrorMessage(`PO-UI: .app gerado, mas o zip dos fontes falhou — ${fontes.errorMessage ?? 'erro desconhecido'}.`);
      } else {
        summary += ` Fontes: Resource/${sourcesZipName(projectName)} (${fontes.fileCount} arquivos).`;
        if (fontes.warnings.length > 0) {
          void vscode.window.showWarningMessage(
            `PO-UI: ${fontes.warnings.length} aviso(s) no zip dos fontes (ferramenta citada ou credencial no código) — ver o painel de saída antes de enviar ao cliente.`,
          );
        }
      }
    }
    outputChannel.appendLine(`✅ ${summary}`);

    if (result.usedRiskyFallback) {
      void vscode.window.showWarningMessage(summary);
    } else {
      void vscode.window.showInformationMessage(summary);
    }
  });
}

function existsSync(candidatePath: string): boolean {
  try {
    accessSync(candidatePath);
    return true;
  } catch {
    return false;
  }
}
