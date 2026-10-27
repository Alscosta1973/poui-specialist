import * as vscode from 'vscode';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { readProjectName } from './packaging';
import {
  AppRootEntry,
  DoctorFinding,
  analyzeAppPackage,
  analyzeAppRoot,
  formatDoctorReport,
  listZipEntries,
} from './appDoctor';

/** RootPath do ambiente (ex.: C:\TOTVS12\Protheus\protheus_data) — onde fica http-root/app-root. */
const ROOT_PATH_SETTING = 'protheusRootPath';

async function listDir(dir: string): Promise<AppRootEntry[] | undefined> {
  const itens = await fs.readdir(dir, { withFileTypes: true }).catch(() => undefined);
  return itens?.map((i) => ({ name: i.name, isDir: i.isDirectory() }));
}

export function registerDoctorCommand(
  _context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel,
): vscode.Disposable {
  return vscode.commands.registerCommand('poui.doctor', async () => {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      void vscode.window.showErrorMessage('PO-UI: abra a pasta do projeto Angular antes de rodar o diagnóstico.');
      return;
    }
    const workspaceRoot = workspaceFolder.uri.fsPath;

    const angularJsonRaw = await fs.readFile(path.join(workspaceRoot, 'angular.json'), 'utf8').catch(() => undefined);
    if (!angularJsonRaw) {
      void vscode.window.showErrorMessage('PO-UI: nenhum projeto Angular encontrado (angular.json) — diagnóstico cancelado.');
      return;
    }
    const projectName = readProjectName(JSON.parse(angularJsonRaw));

    outputChannel.clear();
    outputChannel.show(true);
    outputChannel.appendLine(`Diagnóstico do app "${projectName}" no Protheus (FwCallApp)`);
    outputChannel.appendLine('');

    const achados: DoctorFinding[] = [];
    const appPath = path.join(workspaceRoot, 'Resource', `${projectName}.app`);
    let entradas: string[] = [];
    const pacote = await fs.readFile(appPath).catch(() => undefined);
    if (!pacote) {
      achados.push({
        level: 'error',
        message: `Resource/${projectName}.app não encontrado.`,
        hint: 'Gere o pacote com "PO-UI: Empacotar Projeto (.app)".',
      });
    } else {
      try {
        entradas = listZipEntries(pacote);
        achados.push(...analyzeAppPackage(entradas, projectName));
      } catch (error) {
        achados.push({ level: 'error', message: `Resource/${projectName}.app: ${(error as Error).message}.` });
      }
    }

    const config = vscode.workspace.getConfiguration('poui');
    let rootPath = (config.get<string>(ROOT_PATH_SETTING) ?? '').trim();
    if (!rootPath) {
      const informado = await vscode.window.showInputBox({
        prompt: 'RootPath do ambiente Protheus (pasta que contém http-root\\app-root) — em branco para conferir só o pacote',
        placeHolder: 'C:\\TOTVS12\\Protheus\\protheus_data',
        ignoreFocusOut: true,
      });
      rootPath = (informado ?? '').trim();
      if (rootPath) {
        await config.update(ROOT_PATH_SETTING, rootPath, vscode.ConfigurationTarget.Workspace);
      }
    }

    if (rootPath && entradas.length > 0) {
      const appRoot = path.join(rootPath, 'http-root', 'app-root');
      const itens = await listDir(appRoot);
      if (!itens) {
        achados.push({
          level: 'warn',
          message: `${appRoot} não encontrado.`,
          hint: 'Confira o RootPath do ambiente no appserver.ini (setting poui.protheusRootPath).',
        });
      } else {
        const envFiles: Record<string, string[]> = {};
        for (const pasta of itens.filter((i) => i.isDir && i.name.startsWith(`${projectName}_env_`))) {
          envFiles[pasta.name] = ((await listDir(path.join(appRoot, pasta.name))) ?? []).map((i) => i.name);
        }
        achados.push(...analyzeAppRoot(itens, entradas, projectName, envFiles));
      }
    }

    outputChannel.appendLine(formatDoctorReport(achados));
    const erros = achados.filter((a) => a.level === 'error').length;
    const avisos = achados.filter((a) => a.level === 'warn').length;
    if (erros + avisos === 0) {
      void vscode.window.showInformationMessage(`PO-UI: nenhum problema encontrado no app "${projectName}".`);
    } else {
      void vscode.window.showWarningMessage(
        `PO-UI: ${erros} erro(s) e ${avisos} aviso(s) no app "${projectName}" — veja o painel "PO-UI".`,
      );
    }
  });
}
