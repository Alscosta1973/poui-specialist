// poui-vscode/src/configureEngine.ts
import * as vscode from 'vscode';
import { checkEngineAvailable } from './cliCheck';
import { runAgentForCommand } from './runAgentForCommand';
import { storeCredential, deleteCredential, hasCredential } from './engineCredentials';
import {
  buildEngineChoices,
  buildCredentialChoices,
  buildValidationOptions,
  getValidationTimeoutMs,
  interpretValidationResult,
  CredentialAction,
  ENGINE_LABELS,
} from './configureEngineLogic';
import { EngineId } from './engineTypes';

/** Comando de terminal pra disparar o login OAuth de cada motor. Codex:
 * `codex login` (assunção já existente em `codexAdapter.ts`, não
 * validada de ponta a ponta nesta sessão por falta de conta OpenAI — ver
 * Task 2). Gemini: só `gemini` sem argumentos — confirmado via
 * `gemini --help` real em 2026-09-06 (Task 1): não existe subcomando
 * `login`/`auth` dedicado, a autenticação OAuth acontece na primeira
 * execução interativa do próprio binário. */
const ENGINE_LOGIN_COMMAND: Partial<Record<EngineId, string>> = {
  codex: 'codex login',
  gemini: 'gemini',
};

interface EngineQuickPickItem extends vscode.QuickPickItem {
  engineId: EngineId;
}

interface CredentialQuickPickItem extends vscode.QuickPickItem {
  action: CredentialAction;
}

async function setActiveEngineIfConfirmed(
  engineId: EngineId,
  engineLabel: string,
  outputChannel: vscode.OutputChannel,
): Promise<void> {
  const choice = await vscode.window.showInformationMessage(`Definir ${engineLabel} como motor ativo?`, 'Sim', 'Não');
  if (choice !== 'Sim') {
    return;
  }
  await vscode.workspace.getConfiguration('poui').update('aiEngine', engineId, vscode.ConfigurationTarget.Global);
  outputChannel.appendLine(`PO-UI: motor ativo definido como ${engineLabel}.`);
  void vscode.window.showInformationMessage(`PO-UI: motor ativo definido como ${engineLabel}.`);
}

async function validateCredential(
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel,
  engineId: EngineId,
  engineLabel: string,
  workspaceRoot: string,
): Promise<boolean> {
  const result = await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: `PO-UI: testando conexão com ${engineLabel}...` },
    () =>
      runAgentForCommand(
        context,
        engineId,
        buildValidationOptions(workspaceRoot),
        outputChannel,
        undefined,
        getValidationTimeoutMs(),
      ),
  );
  const outcome = interpretValidationResult(engineLabel, result);
  if (outcome.kind === 'success') {
    void vscode.window.showInformationMessage(outcome.message);
    return true;
  }
  void vscode.window.showErrorMessage(outcome.message);
  return false;
}

async function configureCredentialEngine(
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel,
  engineId: EngineId,
  engineLabel: string,
  workspaceRoot: string,
): Promise<void> {
  const alreadyHasCredential = await hasCredential(context, engineId);
  const credentialChoice = await vscode.window.showQuickPick<CredentialQuickPickItem>(
    buildCredentialChoices(alreadyHasCredential).map((c) => ({ label: c.label, action: c.action })),
    { placeHolder: `Como você quer autenticar o ${engineLabel}?` },
  );
  if (!credentialChoice) {
    return;
  }

  if (credentialChoice.action === 'remove') {
    await deleteCredential(context, engineId);
    void vscode.window.showInformationMessage(`PO-UI: credencial salva do ${engineLabel} removida.`);
    return;
  }

  if (credentialChoice.action === 'oauth') {
    const loginCommand = ENGINE_LOGIN_COMMAND[engineId];
    const terminal = vscode.window.createTerminal(`PO-UI: Login ${engineLabel}`);
    terminal.show();
    if (loginCommand) {
      terminal.sendText(loginCommand);
    }
    const confirmed = await vscode.window.showInformationMessage(
      `Complete o login do ${engineLabel} no terminal aberto e clique em "Concluí o login".`,
      { modal: true },
      'Concluí o login',
    );
    if (confirmed !== 'Concluí o login') {
      return;
    }
  } else {
    const apiKey = await vscode.window.showInputBox({
      prompt: `API key do ${engineLabel}`,
      password: true,
      validateInput: (v) => (v.trim() ? undefined : 'Informe uma API key.'),
    });
    if (!apiKey) {
      return;
    }
    await storeCredential(context, engineId, apiKey);
  }

  const valid = await validateCredential(context, outputChannel, engineId, engineLabel, workspaceRoot);
  if (!valid) {
    const retry = await vscode.window.showWarningMessage(
      `PO-UI: não foi possível validar a conexão com ${engineLabel}.`,
      'Tentar de novo',
      'Cancelar',
    );
    if (retry === 'Tentar de novo') {
      await configureCredentialEngine(context, outputChannel, engineId, engineLabel, workspaceRoot);
    }
    return;
  }

  await setActiveEngineIfConfirmed(engineId, engineLabel, outputChannel);
}

export function registerConfigureEngineCommand(
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel,
): vscode.Disposable {
  return vscode.commands.registerCommand('poui.configureEngine', async () => {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? process.cwd();
    const activeEngineId = vscode.workspace.getConfiguration('poui').get<EngineId>('aiEngine', 'claude');

    const engineChoice = await vscode.window.showQuickPick<EngineQuickPickItem>(
      buildEngineChoices(activeEngineId).map((c) => ({ label: c.label, description: c.description, engineId: c.engineId })),
      { placeHolder: 'Qual motor de IA você quer configurar?' },
    );
    if (!engineChoice) {
      return;
    }
    const { engineId } = engineChoice;
    const engineLabel = ENGINE_LABELS[engineId];

    if (engineId === 'claude') {
      const cliCheck = await vscode.window.withProgress(
        { location: vscode.ProgressLocation.Notification, title: 'PO-UI: verificando CLI do Claude...' },
        () => checkEngineAvailable('claude'),
      );
      if (cliCheck.available) {
        void vscode.window.showInformationMessage(`PO-UI: CLI do Claude encontrada (${cliCheck.version}).`);
      } else {
        void vscode.window.showErrorMessage(
          `PO-UI: CLI do Claude não encontrada ou não está no PATH.${cliCheck.errorMessage ? ` (${cliCheck.errorMessage})` : ''}`,
        );
      }
      await setActiveEngineIfConfirmed(engineId, engineLabel, outputChannel);
      return;
    }

    await configureCredentialEngine(context, outputChannel, engineId, engineLabel, workspaceRoot);
  });
}
