import * as vscode from 'vscode';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { deriveRouteRegistration, insertRoute, routeExists } from './previewRoutes';
import { ensureDevServer } from './devServerRegistry';

export function registerPreviewCommand(
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel,
): vscode.Disposable {
  return vscode.commands.registerCommand('poui.preview', async () => {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      void vscode.window.showErrorMessage(
        'PO-UI: abra uma pasta de projeto Angular antes de abrir o preview.',
      );
      return;
    }
    const workspaceRoot = workspaceFolder.uri.fsPath;

    const defaultDir = vscode.Uri.file(path.join(workspaceRoot, 'src', 'app'));
    const picked = await vscode.window.showOpenDialog({
      canSelectMany: false,
      canSelectFiles: true,
      canSelectFolders: false,
      defaultUri: defaultDir,
      filters: { 'Componente Angular': ['ts'] },
      openLabel: 'Abrir preview deste componente',
      title: 'Selecione o componente a visualizar',
    });
    const target = picked?.[0];
    if (!target) {
      return;
    }
    if (!target.fsPath.endsWith('.component.ts')) {
      void vscode.window.showErrorMessage('PO-UI: selecione um arquivo `.component.ts`.');
      return;
    }

    outputChannel.clear();
    outputChannel.show(true);

    const tsContent = await fs.readFile(target.fsPath, 'utf8');
    let registration;
    try {
      registration = deriveRouteRegistration(workspaceRoot, target.fsPath, tsContent);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      void vscode.window.showErrorMessage(`PO-UI: ${message}`);
      return;
    }

    const routesPath = path.join(workspaceRoot, 'src', 'app', 'app.routes.ts');
    let routesContent: string;
    try {
      routesContent = await fs.readFile(routesPath, 'utf8');
    } catch {
      void vscode.window.showErrorMessage('PO-UI: src/app/app.routes.ts não encontrado.');
      return;
    }

    if (routeExists(routesContent, registration.routeSegment)) {
      outputChannel.appendLine(`Rota já registrada: ${registration.routeSegment}`);
    } else {
      try {
        const updatedRoutes = insertRoute(routesContent, registration);
        await fs.writeFile(routesPath, updatedRoutes, 'utf8');
        outputChannel.appendLine(`Rota registrada: ${registration.routeSegment}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        void vscode.window.showErrorMessage(`PO-UI: falha ao registrar a rota — ${message}`);
        return;
      }
    }

    const devServerResult = await ensureDevServer(workspaceRoot, outputChannel);
    if (!devServerResult.ok) {
      void vscode.window.showErrorMessage(`PO-UI: ${devServerResult.errorMessage}`);
      return;
    }
    const { port } = devServerResult;

    const url = `http://localhost:${port}/${registration.routeSegment}`;
    await vscode.env.openExternal(vscode.Uri.parse(url));

    void vscode.window.showInformationMessage(
      `PO-UI: preview disponível em ${url}. O servidor Angular continua rodando na porta ${port}.`,
    );
  });
}
