import * as vscode from 'vscode';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { findGeneratedGroups, removeRouteBlock, GeneratedGroup } from './undo';

function toRouteSegment(workspaceRoot: string, groupDir: string): string {
  const srcAppDir = path.join(workspaceRoot, 'src', 'app');
  return path.relative(srcAppDir, groupDir).split(path.sep).join('/');
}

interface GroupQuickPickItem extends vscode.QuickPickItem {
  group: GeneratedGroup;
}

export function registerUndoCommand(
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel,
): vscode.Disposable {
  return vscode.commands.registerCommand('poui.undo', async () => {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      void vscode.window.showErrorMessage('PO-UI: abra uma pasta de projeto Angular antes de reverter uma geração.');
      return;
    }
    const workspaceRoot = workspaceFolder.uri.fsPath;

    const hasAngularJson = await fs
      .access(path.join(workspaceRoot, 'angular.json'))
      .then(() => true)
      .catch(() => false);
    if (!hasAngularJson) {
      void vscode.window.showErrorMessage('PO-UI: nenhum projeto Angular encontrado — reversão cancelada.');
      return;
    }

    const groups = await findGeneratedGroups(workspaceRoot);
    if (groups.length === 0) {
      void vscode.window.showInformationMessage(
        'PO-UI: nenhum componente gerado pelo plugin encontrado em src/app/.',
      );
      return;
    }

    const items: GroupQuickPickItem[] = groups.map((group) => {
      const routeSegment = toRouteSegment(workspaceRoot, group.dir);
      return {
        label: routeSegment,
        detail: `${group.files.length} arquivo(s)`,
        group,
      };
    });

    const choice = await vscode.window.showQuickPick(items, {
      placeHolder: 'Qual componente gerado você quer reverter?',
    });
    if (!choice) {
      return;
    }

    const routeSegment = toRouteSegment(workspaceRoot, choice.group.dir);
    const relativeFiles = choice.group.files.map((f) => path.relative(workspaceRoot, f).split(path.sep).join('/'));

    const confirmation = await vscode.window.showWarningMessage(
      `PO-UI: remover ${relativeFiles.length} arquivo(s) em "${routeSegment}" e a rota correspondente em app.routes.ts? Esta ação não pode ser desfeita automaticamente.`,
      { modal: true, detail: relativeFiles.join('\n') },
      'Remover',
    );
    if (confirmation !== 'Remover') {
      return;
    }

    outputChannel.clear();
    outputChannel.show(true);
    outputChannel.appendLine(`Revertendo ${routeSegment}...`);

    const routesPath = path.join(workspaceRoot, 'src', 'app', 'app.routes.ts');
    const routesContent = await fs.readFile(routesPath, 'utf8').catch(() => undefined);
    if (routesContent === undefined) {
      outputChannel.appendLine('⚠ src/app/app.routes.ts não encontrado — pulando remoção de rota.');
    } else {
      const { content, removed } = removeRouteBlock(routesContent, routeSegment);
      if (removed) {
        await fs.writeFile(routesPath, content, 'utf8');
        outputChannel.appendLine(`Rota removida de app.routes.ts: path: '${routeSegment}'`);
      } else {
        outputChannel.appendLine(
          `⚠ Rota '${routeSegment}' não encontrada em app.routes.ts — pode já ter sido removida manualmente.`,
        );
      }
    }

    for (const file of choice.group.files) {
      await fs.rm(file, { force: true });
      outputChannel.appendLine(`Removido: ${path.relative(workspaceRoot, file).split(path.sep).join('/')}`);
    }

    const remainingInDir = await fs.readdir(choice.group.dir).catch(() => ['?']);
    if (remainingInDir.length === 0) {
      await fs.rmdir(choice.group.dir).catch(() => undefined);
    }

    void vscode.window.showInformationMessage(
      `PO-UI: ${relativeFiles.length} arquivo(s) removido(s). Veja o output channel "PO-UI".`,
    );
  });
}
