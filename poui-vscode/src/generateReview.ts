import * as vscode from 'vscode';
import * as path from 'node:path';
import { checkEngineAvailable } from './cliCheck';
import { runAgent } from './agentRuntime';
import { buildReviewSystemPrompt, buildReviewUserPrompt, ReviewFocus } from './reviewPromptBuilder';
import { EngineId } from './engineTypes';
import { getEngineAdapter } from './engineRegistry';

/** Somente leitura — o `code-reviewer` original também não inclui Write/Edit
 * entre suas ferramentas: revisão nunca deve poder alterar o código sozinha. */
const REVIEW_TOOLS = 'Read,Glob,Grep';

const FOCUS_OPTIONS: Array<{ label: string; focus: ReviewFocus }> = [
  { label: 'Todas as categorias', focus: 'all' },
  { label: 'Boas práticas', focus: 'boas-praticas' },
  { label: 'Performance', focus: 'performance' },
  { label: 'Acessibilidade', focus: 'acessibilidade' },
  { label: 'Segurança', focus: 'seguranca' },
  { label: 'Quirks PO-UI', focus: 'poui' },
  { label: 'Qualidade (cobertura de testes)', focus: 'qualidade' },
];

export function registerReviewCommand(
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel,
): vscode.Disposable {
  return vscode.commands.registerCommand('poui.review', async () => {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      void vscode.window.showErrorMessage(
        'PO-UI: abra uma pasta de projeto Angular antes de rodar a revisão.',
      );
      return;
    }

    const engineId = vscode.workspace.getConfiguration('poui').get<EngineId>('aiEngine', 'claude');
    const cliCheck = await checkEngineAvailable(engineId);
    if (!cliCheck.available) {
      void vscode.window.showErrorMessage(
        `PO-UI: CLI do motor "${engineId}" não encontrado ou não está no PATH — instale e faça login antes de revisar código.${cliCheck.errorMessage ? ` (${cliCheck.errorMessage})` : ''}`,
      );
      return;
    }

    const defaultDir = vscode.Uri.file(path.join(workspaceFolder.uri.fsPath, 'src', 'app'));
    const picked = await vscode.window.showOpenDialog({
      canSelectMany: false,
      canSelectFiles: true,
      canSelectFolders: true,
      defaultUri: defaultDir,
      openLabel: 'Revisar',
      title: 'Selecione o arquivo ou pasta a revisar',
    });
    const target = picked?.[0];
    if (!target) {
      return;
    }

    const focusChoice = await vscode.window.showQuickPick(
      FOCUS_OPTIONS.map((o) => ({ label: o.label, focus: o.focus })),
      { placeHolder: 'Qual o foco da revisão?' },
    );
    if (!focusChoice) {
      return;
    }

    const relativePath = path.relative(workspaceFolder.uri.fsPath, target.fsPath).split(path.sep).join('/');

    outputChannel.clear();
    outputChannel.show(true);
    outputChannel.appendLine(`Revisando ${relativePath} (foco: ${focusChoice.label})...`);

    if (!getEngineAdapter(engineId).capabilities.restrictsTools) {
      outputChannel.appendLine(
        `⚠ o motor "${engineId}" não garante que a revisão seja somente-leitura (restrição de ferramentas não suportada) — o agente pode escrever no workspace durante a revisão.`,
      );
    }

    const assetsDir = path.join(context.extensionUri.fsPath, 'assets', 'agent-prompts');
    let systemPrompt: string;
    try {
      systemPrompt = await buildReviewSystemPrompt(assetsDir);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      void vscode.window.showErrorMessage(
        `PO-UI: falha ao carregar os arquivos de referência — ${message}.`,
      );
      return;
    }
    const userPrompt = buildReviewUserPrompt(relativePath, focusChoice.focus);

    const result = await runAgent(
      {
        cwd: workspaceFolder.uri.fsPath,
        systemPrompt,
        userPrompt,
        tools: REVIEW_TOOLS,
        model: vscode.workspace.getConfiguration('poui').get<string>('model'),
        effort: vscode.workspace
          .getConfiguration('poui')
          .get<'low' | 'medium' | 'high' | 'xhigh' | 'max'>('effort'),
      },
      outputChannel,
      engineId,
    );

    if (!result.succeeded) {
      const message = `PO-UI: falha ao revisar — ${result.errorMessage ?? 'erro desconhecido'}.`;
      if (result.isAuthError) {
        void vscode.window.showErrorMessage(
          `${message} Rode \`${engineId}\` em um terminal para fazer login novamente.`,
        );
        return;
      }
      void vscode.window.showErrorMessage(message);
      return;
    }

    void vscode.window.showInformationMessage('PO-UI: revisão concluída. Veja o output channel "PO-UI".');
  });
}
