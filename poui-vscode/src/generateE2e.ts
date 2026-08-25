import * as vscode from 'vscode';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { checkClaudeCliAvailable } from './cliCheck';
import { runClaudeAgent } from './agentRuntime';
import { buildE2eSystemPrompt, buildE2eUserPrompt } from './e2ePromptBuilder';
import { isPlaywrightConfigured } from './playwrightCheck';
import { configurePlaywright } from './playwrightSetup';
import { deriveRouteRegistration, routeExists } from './previewRoutes';
import { ensureDevServer } from './devServerRegistry';

/** Ferramentas nativas + as 3 do MCP do Playwright que o `poui-e2e` original
 * também libera (`browser_navigate`, `browser_snapshot`, `browser_wait_for`)
 * — sem `browser_click`/`browser_type`/etc., o agente só inspeciona e
 * escreve, nunca interage de verdade com a página durante a geração. */
const E2E_TOOLS =
  'Read,Write,Edit,Glob,Grep,mcp__playwright__browser_navigate,mcp__playwright__browser_snapshot,mcp__playwright__browser_wait_for';

/** `--tools`/`--permission-mode acceptEdits` cobrem as nativas, mas não
 * aprovam ferramentas MCP sozinhas (confirmado por teste real) — precisa
 * dessa lista à parte via `--allowedTools`. */
const E2E_MCP_ALLOWED_TOOLS =
  'mcp__playwright__browser_navigate,mcp__playwright__browser_snapshot,mcp__playwright__browser_wait_for';

function buildPlaywrightMcpConfig(): string {
  return JSON.stringify({
    mcpServers: {
      playwright: {
        command: 'npx',
        args: ['-y', '@playwright/mcp@latest', '--headless'],
      },
    },
  });
}

export function registerE2eCommand(
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel,
): vscode.Disposable {
  return vscode.commands.registerCommand('poui.generate.e2e', async () => {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      void vscode.window.showErrorMessage(
        'PO-UI: abra uma pasta de projeto Angular antes de gerar um teste E2E.',
      );
      return;
    }
    const workspaceRoot = workspaceFolder.uri.fsPath;

    const cliCheck = await checkClaudeCliAvailable();
    if (!cliCheck.available) {
      void vscode.window.showErrorMessage(
        `PO-UI: CLI do Claude Code não encontrado ou não está no PATH — instale (https://code.claude.com) e faça login com \`claude\` antes de gerar código.${cliCheck.errorMessage ? ` (${cliCheck.errorMessage})` : ''}`,
      );
      return;
    }

    if (!(await isPlaywrightConfigured(workspaceRoot))) {
      const choice = await vscode.window.showWarningMessage(
        'PO-UI: este projeto não parece ter o Playwright Test configurado (nenhum ' +
          '`playwright.config.ts`/`.js` na raiz) — o spec ainda será gerado, mas `npx playwright ' +
          'test` não vai rodar até configurar.',
        'Configurar Playwright',
        'Continuar sem configurar',
      );
      if (choice === 'Configurar Playwright') {
        outputChannel.clear();
        outputChannel.show(true);
        const setupResult = await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: 'PO-UI: configurando Playwright (baixando o Chromium, pode demorar)...',
          },
          () => configurePlaywright(workspaceRoot, outputChannel),
        );
        for (const step of setupResult.steps) {
          outputChannel.appendLine(`✓ ${step}`);
        }
        if (setupResult.success) {
          void vscode.window.showInformationMessage(
            'PO-UI: Playwright configurado! Rode `PO-UI: Gerar Teste E2E (Playwright)` de novo para gerar o teste.',
          );
        } else {
          void vscode.window.showErrorMessage(
            `PO-UI: falha ao configurar o Playwright — ${setupResult.errorMessage ?? 'erro desconhecido'}.`,
          );
        }
        return;
      }
      if (choice !== 'Continuar sem configurar') {
        return;
      }
    }

    const defaultDir = vscode.Uri.file(path.join(workspaceRoot, 'src', 'app'));
    const picked = await vscode.window.showOpenDialog({
      canSelectMany: false,
      canSelectFiles: true,
      canSelectFolders: false,
      defaultUri: defaultDir,
      filters: { 'Componente Angular': ['ts'] },
      openLabel: 'Gerar E2E para este componente',
      title: 'Selecione o componente a testar',
    });
    const target = picked?.[0];
    if (!target) {
      return;
    }
    if (!target.fsPath.endsWith('.component.ts')) {
      void vscode.window.showErrorMessage('PO-UI: selecione um arquivo `.component.ts`.');
      return;
    }

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
    if (!routeExists(routesContent, registration.routeSegment)) {
      void vscode.window.showErrorMessage(
        `PO-UI: a rota \`${registration.routeSegment}\` ainda não está registrada em app.routes.ts — ` +
          'rode `PO-UI: Preview no Browser` neste componente primeiro (ele registra a rota), depois gere o E2E.',
      );
      return;
    }

    const relativePath = path.relative(workspaceRoot, target.fsPath).split(path.sep).join('/');

    outputChannel.clear();
    outputChannel.show(true);

    const devServerResult = await ensureDevServer(workspaceRoot, outputChannel);
    if (!devServerResult.ok) {
      void vscode.window.showErrorMessage(`PO-UI: ${devServerResult.errorMessage}`);
      return;
    }
    const { port } = devServerResult;

    const previewUrl = `http://localhost:${port}/${registration.routeSegment}`;
    outputChannel.appendLine(`Gerando teste E2E para ${relativePath} contra ${previewUrl}...`);

    const assetsDir = path.join(context.extensionUri.fsPath, 'assets', 'agent-prompts');
    let systemPrompt: string;
    try {
      systemPrompt = await buildE2eSystemPrompt(assetsDir);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      void vscode.window.showErrorMessage(
        `PO-UI: falha ao carregar os arquivos de referência — ${message}.`,
      );
      return;
    }
    const userPrompt = buildE2eUserPrompt(relativePath, previewUrl);

    const result = await runClaudeAgent(
      {
        cwd: workspaceRoot,
        systemPrompt,
        userPrompt,
        tools: E2E_TOOLS,
        allowedTools: E2E_MCP_ALLOWED_TOOLS,
        mcpConfig: buildPlaywrightMcpConfig(),
        model: vscode.workspace.getConfiguration('poui').get<string>('model'),
        effort: vscode.workspace
          .getConfiguration('poui')
          .get<'low' | 'medium' | 'high' | 'xhigh' | 'max'>('effort'),
      },
      outputChannel,
    );

    if (!result.succeeded) {
      const message = `PO-UI: falha ao gerar teste E2E — ${result.errorMessage ?? 'erro desconhecido'}.`;
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
      'PO-UI: teste E2E gerado. Rode `npx playwright test` manualmente para verificar.',
      'Abrir arquivo gerado',
    );
    if (openChoice === 'Abrir arquivo gerado') {
      try {
        const firstFile = path.isAbsolute(result.filesWritten[0])
          ? result.filesWritten[0]
          : path.join(workspaceRoot, result.filesWritten[0]);
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
