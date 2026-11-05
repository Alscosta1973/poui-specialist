import * as vscode from 'vscode';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { checkEngineAvailable } from './cliCheck';
import { runAgentForCommand } from './runAgentForCommand';
import { EngineId } from './engineTypes';
import { getEngineAdapter } from './engineRegistry';
import { requireLicense } from './requireLicense';
import { lintSmartxSource } from './smartxLintRules';
import { applySmartxFixesToDisk, formatSmartxReport, runSmartxLint } from './smartxLint';
import {
  buildSmartxGenerateUserPrompt,
  buildSmartxMigrateUserPrompt,
  buildSmartxReviewUserPrompt,
  buildSmartxSystemPrompt,
  isValidAlias,
  isValidNamespace,
  isValidRoutineId,
  parseKeyFields,
  SMARTX_GENERATE_REFERENCE_FILES,
  SMARTX_MIGRATE_REFERENCE_FILES,
  SMARTX_REVIEW_REFERENCE_FILES,
  SmartxRoutineSpec,
  validateKeyFields,
} from './smartxPromptBuilder';

type SmartxAction = 'generate' | 'migrate' | 'review';

const ACTIONS: Array<vscode.QuickPickItem & { action: SmartxAction }> = [
  { label: 'Gerar rotina Smart X', detail: 'Modelo + Interface TLPP + Launcher no padrão do TDN (sem Angular)', action: 'generate' },
  { label: 'Migrar browse para Smart X', detail: 'Liga a nova visão num mBrowse/FWMBrowse existente (hasSmartX/setSmartX, legendas, filtros)', action: 'migrate' },
  { label: 'Revisar fontes Smart X', detail: 'Regras SX01–SX11 e SXR1–SXR8 — somente leitura', action: 'review' },
];

const SOURCE_FILTERS = { 'ADVPL/TLPP': ['prw', 'prx', 'tlpp'] };
const REVIEW_TOOLS = 'Read,Glob,Grep';

function relativeTo(root: string, target: string): string {
  return path.relative(root, target).split(path.sep).join('/') || '.';
}

async function ask(prompt: string, validate: (v: string) => string | undefined, value?: string): Promise<string | undefined> {
  const answer = await vscode.window.showInputBox({ prompt, value, validateInput: (v) => validate(v.trim()) });
  return answer?.trim();
}

/** Coleta as entradas da rotina; undefined se o usuário cancelar em qualquer passo. */
async function askRoutineSpec(): Promise<SmartxRoutineSpec | undefined> {
  const routineId = await ask('Identificador da rotina (classe do Modelo e da Interface), ex.: ZA0CAD', (v) =>
    isValidRoutineId(v) ? undefined : 'Começa por letra; letras, números e _ — até 10 caracteres.');
  if (!routineId) return undefined;
  const description = await ask('Descrição da rotina, ex.: Cadastro de Autores', (v) => (v ? undefined : 'Informe a descrição.'));
  if (!description) return undefined;
  const namespaceBase = await ask('Namespace base (gera .model e .interface), ex.: custom.cadastro.autor', (v) =>
    isValidNamespace(v) ? undefined : 'Minúsculas separadas por ponto, pelo menos dois segmentos (ex.: custom.cadastro.autor).');
  if (!namespaceBase) return undefined;
  const alias = await ask('Alias da tabela principal, ex.: ZA0', (v) => (isValidAlias(v) ? undefined : 'Alias de 3 caracteres (ex.: ZA0, SB1).'));
  if (!alias) return undefined;
  const keyText = await ask(`Campos da chave, com a filial (ex.: ${alias.toUpperCase()}_FILIAL, ${alias.toUpperCase()}_CODIGO)`, (v) =>
    validateKeyFields(alias, parseKeyFields(v)));
  if (!keyText) return undefined;
  const launcher = await ask('Nome do launcher (menu). Em RPO de cliente use até 8 caracteres (User Function)', (v) =>
    isValidRoutineId(v) ? undefined : 'Começa por letra; letras, números e _ — até 10 caracteres.', `${routineId.toUpperCase().slice(0, 6)}SX`);
  if (!launcher) return undefined;
  const extras = await vscode.window.showInputBox({
    prompt: 'Adicionais (opcional): grids 1:N, objetos 1:1, campo de legenda, ponto de entrada. Enter para nenhum.',
    placeHolder: 'ex.: grid ZA1 ligado por ZA1_CODAUT; legenda por ZA0_TIPO; PE formPos',
  });
  if (extras === undefined) return undefined;
  return {
    routineId,
    description,
    namespaceBase,
    alias: alias.toUpperCase(),
    keyFields: parseKeyFields(keyText),
    launcher,
    extras,
  };
}

/** Lint Smart X nos fontes escritos pelo agente, anexado ao output channel. */
async function lintWritten(cwd: string, files: string[], outputChannel: vscode.OutputChannel): Promise<void> {
  const fontes = files.filter((f) => /\.(prw|prx|tlpp)$/i.test(f));
  if (fontes.length === 0) {
    return;
  }
  outputChannel.appendLine('');
  outputChannel.appendLine('Lint Smart X nos fontes gerados/alterados:');
  let total = 0;
  for (const f of fontes) {
    const full = path.isAbsolute(f) ? f : path.join(cwd, f);
    const content = await fs.readFile(full, 'latin1').catch(() => undefined);
    if (content === undefined) continue;
    for (const finding of lintSmartxSource(relativeTo(cwd, full), content)) {
      total++;
      outputChannel.appendLine(`  ${finding.file}:${finding.line}   [${finding.id}] ${finding.message}`);
    }
  }
  outputChannel.appendLine(total === 0 ? '  Nenhum problema encontrado.' : `  ${total} achado(s) — revise antes de compilar.`);
}

export function registerSmartxCommand(context: vscode.ExtensionContext, outputChannel: vscode.OutputChannel): vscode.Disposable {
  return vscode.commands.registerCommand('poui.smartx', async () => {
    if (!(await requireLicense(context, outputChannel))) {
      return;
    }
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      void vscode.window.showErrorMessage('PO-UI: abra a pasta dos fontes Protheus antes de usar o Smart X.');
      return;
    }
    const cwd = workspaceFolder.uri.fsPath;

    const engineId = vscode.workspace.getConfiguration('poui').get<EngineId>('aiEngine', 'claude');
    const cliCheck = await checkEngineAvailable(engineId);
    if (!cliCheck.available) {
      void vscode.window.showErrorMessage(
        `PO-UI: CLI do motor "${engineId}" não encontrado ou não está no PATH — instale e faça login antes de continuar.${cliCheck.errorMessage ? ` (${cliCheck.errorMessage})` : ''}`,
      );
      return;
    }

    const choice = await vscode.window.showQuickPick(ACTIONS, { placeHolder: 'Smart X (Protheus 12.1.2610+) — o que fazer?' });
    if (!choice) {
      return;
    }

    let referenceFiles: string[];
    let userPrompt: string;
    let tools: string | undefined;
    let addDir: string | undefined;
    let titulo: string;

    if (choice.action === 'generate') {
      const spec = await askRoutineSpec();
      if (!spec) return;
      const destino = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        defaultUri: workspaceFolder.uri,
        openLabel: 'Gerar nesta pasta',
        title: 'Pasta onde gravar os fontes Smart X',
      });
      if (!destino?.[0]) return;
      referenceFiles = SMARTX_GENERATE_REFERENCE_FILES;
      userPrompt = buildSmartxGenerateUserPrompt(spec, relativeTo(cwd, destino[0].fsPath));
      titulo = `gerando rotina Smart X ${spec.routineId}`;
    } else if (choice.action === 'migrate') {
      const fonte = await vscode.window.showOpenDialog({
        canSelectMany: false,
        defaultUri: workspaceFolder.uri,
        filters: SOURCE_FILTERS,
        title: 'Fonte com mBrowse/FWMBrowse a migrar',
      });
      if (!fonte?.[0]) return;
      referenceFiles = SMARTX_MIGRATE_REFERENCE_FILES;
      userPrompt = buildSmartxMigrateUserPrompt(relativeTo(cwd, fonte[0].fsPath));
      addDir = path.dirname(fonte[0].fsPath);
      titulo = `migrando ${path.basename(fonte[0].fsPath)} para Smart X`;
    } else {
      const alvo = await vscode.window.showOpenDialog({
        canSelectFiles: true,
        canSelectFolders: true,
        canSelectMany: false,
        defaultUri: workspaceFolder.uri,
        openLabel: 'Revisar',
        title: 'Arquivo ou pasta com fontes Smart X',
      });
      if (!alvo?.[0]) return;
      referenceFiles = SMARTX_REVIEW_REFERENCE_FILES;
      userPrompt = buildSmartxReviewUserPrompt(relativeTo(cwd, alvo[0].fsPath));
      tools = REVIEW_TOOLS;
      titulo = `revisando ${relativeTo(cwd, alvo[0].fsPath)}`;
    }

    outputChannel.clear();
    outputChannel.show(true);
    outputChannel.appendLine(`Smart X — ${titulo}...`);
    if (tools && !getEngineAdapter(engineId).capabilities.restrictsTools) {
      outputChannel.appendLine(`⚠ o motor "${engineId}" não garante revisão somente-leitura (restrição de ferramentas não suportada).`);
    }

    const assetsDir = path.join(context.extensionUri.fsPath, 'assets', 'agent-prompts');
    let systemPrompt: string;
    try {
      systemPrompt = await buildSmartxSystemPrompt(referenceFiles, assetsDir);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      void vscode.window.showErrorMessage(`PO-UI: falha ao carregar os arquivos de referência — ${message}.`);
      return;
    }

    const result = await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: `PO-UI: ${titulo}...` },
      () =>
        runAgentForCommand(
          context,
          engineId,
          {
            cwd,
            systemPrompt,
            userPrompt,
            tools,
            addDir,
            model: vscode.workspace.getConfiguration('poui').get<string>('model'),
            effort: vscode.workspace.getConfiguration('poui').get<'low' | 'medium' | 'high' | 'xhigh' | 'max'>('effort'),
          },
          outputChannel,
        ),
    );

    if (!result.succeeded) {
      const message = `PO-UI: Smart X falhou — ${result.errorMessage ?? 'erro desconhecido'}.`;
      void vscode.window.showErrorMessage(
        result.isAuthError ? `${message} Rode \`${engineId}\` em um terminal para fazer login novamente.` : message,
      );
      return;
    }

    if (choice.action !== 'review') {
      await lintWritten(cwd, result.filesWritten, outputChannel);
    }
    void vscode.window.showInformationMessage('PO-UI: Smart X concluído. Veja o output channel "PO-UI".');
  });
}

export function registerSmartxLintCommand(context: vscode.ExtensionContext, outputChannel: vscode.OutputChannel): vscode.Disposable {
  return vscode.commands.registerCommand('poui.smartx.lint', async () => {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      void vscode.window.showErrorMessage('PO-UI: abra a pasta dos fontes Protheus antes de rodar o lint Smart X.');
      return;
    }
    const picked = await vscode.window.showOpenDialog({
      canSelectFiles: false,
      canSelectFolders: true,
      canSelectMany: false,
      defaultUri: workspaceFolder.uri,
      openLabel: 'Rodar lint Smart X nesta pasta',
      title: 'Pasta com fontes .prw/.prx/.tlpp',
    });
    const alvo = picked?.[0];
    if (!alvo) {
      return;
    }
    const label = relativeTo(workspaceFolder.uri.fsPath, alvo.fsPath);
    outputChannel.clear();
    outputChannel.show(true);
    outputChannel.appendLine(`Analisando ${label}...`);

    const result = await runSmartxLint(alvo.fsPath);
    outputChannel.appendLine('');
    outputChannel.appendLine(formatSmartxReport(label, result));

    if (result.files.length === 0) {
      void vscode.window.showWarningMessage(`PO-UI: nenhum fonte .prw/.prx/.tlpp encontrado em ${label}.`);
      return;
    }
    if (result.findings.length === 0) {
      void vscode.window.showInformationMessage(`PO-UI: nenhum problema Smart X em ${label}.`);
      return;
    }
    if (!result.findings.some((f) => f.fixable)) {
      void vscode.window.showWarningMessage(
        `PO-UI: ${result.findings.length} achado(s) Smart X — nenhum com correção automática. Veja o output channel "PO-UI".`,
      );
      return;
    }
    const escolha = await vscode.window.showWarningMessage(
      `PO-UI: ${result.findings.length} achado(s) Smart X. Aplicar as correções automáticas (SX02, SX06)?`,
      'Aplicar correções',
      'Só relatório',
    );
    if (escolha !== 'Aplicar correções') {
      return;
    }
    const outcome = await applySmartxFixesToDisk(alvo.fsPath, result);
    outputChannel.appendLine('');
    outputChannel.appendLine(`Fixes aplicados em ${label}:`);
    outcome.fixedSummaryLines.forEach((l) => outputChannel.appendLine(l));
    if (outcome.manualReviewLines.length > 0) {
      outputChannel.appendLine('');
      outputChannel.appendLine('Não corrigidos automaticamente (requerem análise manual):');
      outcome.manualReviewLines.forEach((l) => outputChannel.appendLine(l));
    }
    void vscode.window.showInformationMessage(
      `PO-UI: ${outcome.fixedSummaryLines.length} correção(ões) Smart X aplicada(s). Veja o output channel "PO-UI".`,
    );
  });
}
