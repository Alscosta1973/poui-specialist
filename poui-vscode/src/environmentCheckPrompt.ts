import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import * as vscode from 'vscode';
import { EnvCheckItem, checkEnvironment, parseMinNodeVersion } from './environmentCheck';

const execAsync = promisify(exec);

export interface OutputSink {
  appendLine(value: string): void;
}

/** Único fix realmente automatizável desta leva — `npm install -g` é baixo
 * risco (mesmo padrão de "só com clique explícito" do `karmaSetup.ts`/
 * `playwrightSetup.ts`). Node/Claude CLI/Git/7-Zip são instaladores de
 * sistema — pra esses só dá pra abrir o link de download. */
export async function installAngularCli(sink: OutputSink): Promise<boolean> {
  sink.appendLine('Instalando Angular CLI globalmente (npm install -g @angular/cli)...');
  try {
    await execAsync('npm install -g @angular/cli', { timeout: 300000, maxBuffer: 10 * 1024 * 1024 });
    sink.appendLine('✓ Angular CLI instalado.');
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    sink.appendLine(`✗ falha ao instalar o Angular CLI: ${message}`);
    return false;
  }
}

function reportToOutputChannel(items: EnvCheckItem[], sink: OutputSink): void {
  sink.appendLine('PO-UI: verificação de ambiente —');
  for (const item of items) {
    const mark = item.ok ? '✓' : '✗';
    const tag = item.required ? 'obrigatório' : 'opcional';
    sink.appendLine(`  ${mark} ${item.label} (${tag})${item.detail ? ` — ${item.detail}` : ''}`);
  }
}

export interface RunEnvironmentCheckDeps {
  checkEnvironmentFn: typeof checkEnvironment;
  installAngularCliFn: (sink: OutputSink) => Promise<boolean>;
}

const defaultDeps: RunEnvironmentCheckDeps = {
  checkEnvironmentFn: checkEnvironment,
  installAngularCliFn: installAngularCli,
};

export async function runEnvironmentCheck(
  context: vscode.ExtensionContext,
  outputChannel: OutputSink,
  deps: Partial<RunEnvironmentCheckDeps> = {},
): Promise<void> {
  const d: RunEnvironmentCheckDeps = { ...defaultDeps, ...deps };
  const enginesNode = (context.extension.packageJSON as { engines?: { node?: string } })?.engines?.node ?? '>=18.19.0';
  const minNodeVersion = parseMinNodeVersion(enginesNode);

  const items = await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: 'PO-UI: verificando ambiente...' },
    () => d.checkEnvironmentFn(minNodeVersion),
  );

  reportToOutputChannel(items, outputChannel);

  const missingRequired = items.filter((i) => i.required && !i.ok);
  const missingOptional = items.filter((i) => !i.required && !i.ok);

  if (missingRequired.length === 0 && missingOptional.length === 0) {
    void vscode.window.showInformationMessage(
      'PO-UI: ambiente ok — Node, Angular CLI, Claude Code CLI, Git e 7-Zip detectados.',
    );
    return;
  }

  for (const item of missingRequired) {
    if (item.npmInstallCommand) {
      const installLabel = `Instalar ${item.label}`;
      const choice = await vscode.window.showWarningMessage(
        `PO-UI: ${item.label} não encontrado — necessário para Criar Novo Projeto (Scaffold) e outros comandos.`,
        installLabel,
      );
      if (choice === installLabel) {
        const ok = await vscode.window.withProgress(
          { location: vscode.ProgressLocation.Notification, title: `PO-UI: instalando ${item.label}...` },
          () => d.installAngularCliFn(outputChannel),
        );
        void vscode.window.showInformationMessage(
          ok
            ? `PO-UI: ${item.label} instalado.`
            : `PO-UI: falha ao instalar ${item.label} — veja o output channel "PO-UI".`,
        );
      }
    } else if (item.installUrl) {
      const openLabel = 'Abrir site de instalação';
      const choice = await vscode.window.showErrorMessage(
        `PO-UI: ${item.label} não encontrado${item.detail ? ` (${item.detail})` : ''} — necessário para gerar/buildar projetos Angular.`,
        openLabel,
      );
      if (choice === openLabel) {
        void vscode.env.openExternal(vscode.Uri.parse(item.installUrl));
      }
    }
  }

  for (const item of missingOptional) {
    if (!item.installUrl) {
      continue;
    }
    const openLabel = 'Abrir site de instalação';
    void vscode.window
      .showInformationMessage(
        `PO-UI: ${item.label} não encontrado — opcional, necessário só para os comandos que dependem dele.`,
        openLabel,
      )
      .then((choice) => {
        if (choice === openLabel) {
          void vscode.env.openExternal(vscode.Uri.parse(item.installUrl as string));
        }
      });
  }
}

export function registerCheckEnvironmentCommand(
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel,
): vscode.Disposable {
  return vscode.commands.registerCommand('poui.checkEnvironment', () => {
    outputChannel.show(true);
    return runEnvironmentCheck(context, outputChannel);
  });
}
