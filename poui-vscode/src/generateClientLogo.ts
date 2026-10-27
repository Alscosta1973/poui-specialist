import * as vscode from 'vscode';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { spawn } from 'node:child_process';

/** Imagem encontrada pelo client-logo.cjs (`list`). */
export interface LogoImage {
  file: string;
  width: number | null;
  height: number | null;
  role: 'nome' | 'simbolo' | 'tela';
}

/** Resultado do client-logo.cjs (`apply`). */
export interface LogoApplyResult {
  files: string[];
  html: boolean;
  avatar: boolean;
  notes: string[];
}

const ROLE_LABEL: Record<LogoImage['role'], string> = {
  nome: 'parece logo com nome',
  simbolo: 'parece símbolo',
  tela: 'parece print de tela',
};

/** Itens do QuickPick: logos prováveis primeiro, prints de tela por último. */
export function buildLogoPickItems(images: LogoImage[], preferRole: 'nome' | 'simbolo'): { label: string; description: string; image: LogoImage }[] {
  const ordem = (i: LogoImage) => (i.role === preferRole ? 0 : i.role === 'tela' ? 2 : 1);
  return [...images]
    .sort((a, b) => ordem(a) - ordem(b))
    .map((image) => ({
      label: path.basename(image.file),
      description: `${image.width ?? '?'}×${image.height ?? '?'} — ${ROLE_LABEL[image.role]}`,
      image,
    }));
}

/** Script do plugin (skills/poui-logo/client-logo.cjs), copiado para assets/agent-prompts no build. */
function scriptPath(context: vscode.ExtensionContext): string {
  return path.join(context.extensionUri.fsPath, 'assets', 'agent-prompts', 'client-logo.cjs');
}

function runScript(context: vscode.ExtensionContext, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    // node do PATH (o execPath do host da extensão é o Electron do VS Code); sem shell: caminhos com espaço
    const filho = spawn('node', [scriptPath(context), ...args]);
    let out = '';
    let err = '';
    filho.stdout.on('data', (d) => (out += String(d)));
    filho.stderr.on('data', (d) => (err += String(d)));
    filho.on('error', (e) => reject(e));
    filho.on('close', (c) => (c === 0 ? resolve(out) : reject(new Error(err.trim() || `client-logo saiu com código ${c}`))));
  });
}

/**
 * Pergunta e aplica o logo do cliente num projeto (customização). Sem logo, o app fica com o TOTVS.
 * Reutilizado pelo scaffold (projectRoot informado) e pelo comando `poui.clientLogo` (workspace aberto).
 */
export async function askAndApplyClientLogo(
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel,
  projectRoot: string,
): Promise<boolean> {
  const escolhidos = await vscode.window.showOpenDialog({
    canSelectMany: true,
    openLabel: 'Usar este arquivo',
    title: 'Logo do cliente — documento (.docx) com o logo, ou as imagens',
    filters: { 'Documento ou imagem': ['docx', 'png', 'jpg', 'jpeg', 'svg'] },
  });
  if (!escolhidos?.length) {
    return false;
  }

  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'poui-logo-'));
  try {
    const images = JSON.parse(await runScript(context, ['list', ...escolhidos.map((u) => u.fsPath), '--out', tmp])) as LogoImage[];
    if (images.length === 0) {
      void vscode.window.showWarningMessage('PO-UI: nenhuma imagem encontrada no arquivo escolhido.');
      return false;
    }

    const nome = await vscode.window.showQuickPick(buildLogoPickItems(images, 'nome'), {
      title: 'Logo com o nome do cliente (aparece com o menu aberto)',
      placeHolder: 'Escolha a imagem do logo completo',
      ignoreFocusOut: true,
    });
    if (!nome) {
      return false;
    }
    const gerar = { label: '$(wand) Gerar a partir do logo com nome', description: 'recomendado — usa o símbolo à esquerda do logo', image: undefined };
    const outros = buildLogoPickItems(
      images.filter((i) => i.file !== nome.image.file),
      'simbolo',
    );
    const simbolo = await vscode.window.showQuickPick([gerar, ...outros], {
      title: 'Símbolo do cliente (menu recolhido e avatar da barra)',
      ignoreFocusOut: true,
    });
    if (!simbolo) {
      return false;
    }
    const cliente = await vscode.window.showInputBox({
      prompt: 'Nome do cliente (texto alternativo do logo e nome dos arquivos)',
      placeHolder: 'FFM',
      ignoreFocusOut: true,
      validateInput: (v) => (v.trim() ? undefined : 'Informe o nome do cliente'),
    });
    if (!cliente) {
      return false;
    }

    const args = ['apply', projectRoot, '--cliente', cliente.trim(), '--nome', nome.image.file];
    if (simbolo.image) {
      args.push('--simbolo', simbolo.image.file);
    }
    const result = JSON.parse(await runScript(context, args)) as LogoApplyResult;
    outputChannel.appendLine(`Logo do cliente "${cliente.trim()}" aplicado:`);
    for (const f of result.files) {
      outputChannel.appendLine(`  ✓ public/${f}`);
    }
    outputChannel.appendLine('  ✓ app.html: p-logo (menu aberto), p-short-logo (menu recolhido), p-logo-alt');
    outputChannel.appendLine(result.avatar ? '  ✓ app.ts: avatar da barra com o símbolo do cliente' : '  ⚠ avatar não alterado');
    for (const n of result.notes) {
      outputChannel.appendLine(`  ℹ ${n}`);
    }
    const ver = await vscode.window.showInformationMessage(
      `PO-UI: logo de "${cliente.trim()}" aplicado no menu e na barra.`,
      'Ver os logos',
    );
    if (ver === 'Ver os logos') {
      for (const f of result.files) {
        await vscode.commands.executeCommand('vscode.open', vscode.Uri.file(path.join(projectRoot, 'public', f)));
      }
    }
    return true;
  } catch (e) {
    outputChannel.appendLine(`✗ ${(e as Error).message}`);
    void vscode.window.showErrorMessage(`PO-UI: não foi possível aplicar o logo — ${(e as Error).message}`);
    return false;
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
}

export function registerClientLogoCommand(context: vscode.ExtensionContext, outputChannel: vscode.OutputChannel): vscode.Disposable {
  return vscode.commands.registerCommand('poui.clientLogo', async () => {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    const root = workspaceFolder?.uri.fsPath;
    const temShell = root && (await fs.access(path.join(root, 'src', 'app', 'app.html')).then(() => true).catch(() => false));
    if (!root || !temShell) {
      void vscode.window.showErrorMessage('PO-UI: abra a pasta do projeto Angular (com src/app/app.html) para aplicar o logo do cliente.');
      return;
    }
    outputChannel.show(true);
    await askAndApplyClientLogo(context, outputChannel, root);
  });
}
