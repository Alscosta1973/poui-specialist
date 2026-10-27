import * as vscode from 'vscode';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { spawn } from 'node:child_process';
import { readProjectName } from './packaging';
import { requireLicense } from './requireLicense';
import { formatDoctorReport } from './appDoctor';
import {
  SmokeEvent,
  SmokeSettings,
  SMOKE_OUT_DIR,
  analyzeSmoke,
  buildSmokeConfig,
  buildSmokeGitignoreAdditions,
  missingSmokeSettings,
} from './smokeReport';

const PERGUNTA: Record<keyof SmokeSettings, { prompt: string; placeHolder: string }> = {
  webAppUrl: { prompt: 'URL da WebApp do Protheus', placeHolder: 'http://localhost:8080/webapp/' },
  program: { prompt: 'Programa inicial (módulo onde está a rotina)', placeHolder: 'SIGAFIN' },
  environment: { prompt: 'Ambiente do AppServer', placeHolder: 'PROTHEUS_LOCAL' },
  user: { prompt: 'Usuário Protheus', placeHolder: 'admin' },
  passwordFile: {
    prompt: 'Arquivo com a senha do usuário (só a senha; relativo ao projeto ou absoluto) — nunca é exibido',
    placeHolder: 'protheus-dev.secret',
  },
  menuSearch: { prompt: 'Texto a pesquisar no menu do módulo', placeHolder: 'Monitor RCA' },
  menuItem: { prompt: 'Texto exato do item de menu (se a pesquisa trouxer mais de um) — opcional', placeHolder: '' },
};

/** Script do plugin (skills/poui-smoke/smoke-protheus.cjs), copiado para assets/agent-prompts no build. */
function scriptPath(context: vscode.ExtensionContext): string {
  return path.join(context.extensionUri.fsPath, 'assets', 'agent-prompts', 'smoke-protheus.cjs');
}

async function playwrightNoProjeto(workspaceRoot: string): Promise<boolean> {
  for (const mod of ['@playwright/test', 'playwright-core', 'playwright']) {
    const ok = await fs
      .access(path.join(workspaceRoot, 'node_modules', ...mod.split('/'), 'package.json'))
      .then(() => true)
      .catch(() => false);
    if (ok) {
      return true;
    }
  }
  return false;
}

export function registerSmokeCommand(context: vscode.ExtensionContext, outputChannel: vscode.OutputChannel): vscode.Disposable {
  return vscode.commands.registerCommand('poui.smokeProtheus', async () => {
    if (!(await requireLicense(context, outputChannel))) {
      return;
    }
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      void vscode.window.showErrorMessage('PO-UI: abra a pasta do projeto Angular antes do smoke no Protheus.');
      return;
    }
    const workspaceRoot = workspaceFolder.uri.fsPath;
    const angularJsonRaw = await fs.readFile(path.join(workspaceRoot, 'angular.json'), 'utf8').catch(() => undefined);
    if (!angularJsonRaw) {
      void vscode.window.showErrorMessage('PO-UI: nenhum projeto Angular encontrado (angular.json) — smoke cancelado.');
      return;
    }
    const appName = readProjectName(JSON.parse(angularJsonRaw));

    if (!(await playwrightNoProjeto(workspaceRoot))) {
      void vscode.window.showErrorMessage(
        'PO-UI: o smoke usa o Playwright do projeto — rode "PO-UI: Gerar Teste E2E (Playwright)" uma vez (ele instala) ou `npm i -D @playwright/test`.',
      );
      return;
    }

    const config = vscode.workspace.getConfiguration('poui.smoke');
    const settings = {} as SmokeSettings;
    for (const k of Object.keys(PERGUNTA) as (keyof SmokeSettings)[]) {
      settings[k] = config.get<string>(k) ?? '';
    }
    for (const k of [...missingSmokeSettings(settings), ...(settings.menuItem ? [] : (['menuItem'] as const))]) {
      const resposta = await vscode.window.showInputBox({ ...PERGUNTA[k], ignoreFocusOut: true });
      if (resposta === undefined) {
        return;
      }
      settings[k] = resposta.trim();
      if (settings[k] || k !== 'menuItem') {
        await config.update(k, settings[k], vscode.ConfigurationTarget.Workspace);
      }
    }
    if (missingSmokeSettings(settings).length > 0) {
      void vscode.window.showErrorMessage(`PO-UI: smoke cancelado — falta: ${missingSmokeSettings(settings).join(', ')}.`);
      return;
    }

    const smokeCfg = buildSmokeConfig(settings, workspaceRoot, appName);
    const senhaExiste = await fs.access(smokeCfg.passwordFile).then(() => true).catch(() => false);
    if (!senhaExiste) {
      void vscode.window.showErrorMessage(`PO-UI: crie o arquivo de senha ${settings.passwordFile} (uma linha, só a senha) e rode de novo.`);
      return;
    }

    // resultados e senha (quando dentro do projeto) fora do git
    const relSenha = path.relative(workspaceRoot, smokeCfg.passwordFile);
    const senhaNoProjeto = !relSenha.startsWith('..') && !path.isAbsolute(relSenha) ? relSenha.split(path.sep).join('/') : undefined;
    const gitignorePath = path.join(workspaceRoot, '.gitignore');
    const gitignore = (await fs.readFile(gitignorePath, 'utf8').catch(() => null)) ?? '';
    const adicoes = buildSmokeGitignoreAdditions(gitignore, senhaNoProjeto);
    if (adicoes) {
      await fs.writeFile(gitignorePath, gitignore + adicoes, 'utf8');
    }

    const cfgPath = path.join(os.tmpdir(), `poui-smoke-${Date.now()}.json`);
    await fs.writeFile(cfgPath, JSON.stringify(smokeCfg, null, 2), 'utf8');
    await fs.rm(path.join(smokeCfg.outDir, 'smoke-events.json'), { force: true });

    outputChannel.clear();
    outputChannel.show(true);
    outputChannel.appendLine(`Smoke no Protheus — abrindo "${settings.menuSearch}" em ${settings.webAppUrl} (${settings.program}/${settings.environment})...`);

    const codigo = await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: 'PO-UI: smoke no Protheus', cancellable: false },
      () =>
        new Promise<number>((resolve) => {
          // node do PATH (o execPath do host da extensão é o Electron do VS Code); sem shell: caminhos com espaço
          const filho = spawn('node', [scriptPath(context), cfgPath], { cwd: workspaceRoot });
          filho.stdout.on('data', (d) => outputChannel.append(String(d)));
          filho.stderr.on('data', (d) => outputChannel.append(String(d)));
          filho.on('close', (c) => resolve(c ?? 1));
          filho.on('error', (e) => {
            outputChannel.appendLine(`✗ ${e.message}`);
            resolve(1);
          });
        }),
    );
    await fs.rm(cfgPath, { force: true });

    const eventosRaw = await fs.readFile(path.join(smokeCfg.outDir, 'smoke-events.json'), 'utf8').catch(() => undefined);
    if (codigo !== 0 || !eventosRaw) {
      void vscode.window.showErrorMessage('PO-UI: o smoke não rodou — veja o painel "PO-UI".');
      return;
    }
    const achados = analyzeSmoke((JSON.parse(eventosRaw) as { events: SmokeEvent[] }).events, appName);
    outputChannel.appendLine('');
    outputChannel.appendLine(formatDoctorReport(achados));
    outputChannel.appendLine(`Screenshot: ${path.join(SMOKE_OUT_DIR, 'smoke.png')}`);

    const problemas = achados.filter((a) => a.level === 'error' || a.level === 'warn').length;
    const msg = problemas === 0 ? `PO-UI: "${appName}" abriu pelo menu do Protheus sem problemas.` : `PO-UI: smoke com ${problemas} problema(s) — veja o painel "PO-UI".`;
    const escolha = await (problemas === 0 ? vscode.window.showInformationMessage : vscode.window.showWarningMessage)(msg, 'Abrir screenshot');
    if (escolha === 'Abrir screenshot') {
      await vscode.commands.executeCommand('vscode.open', vscode.Uri.file(path.join(smokeCfg.outDir, 'smoke.png')));
    }
  });
}
