import * as vscode from 'vscode';
import { isValidMvcSource } from './generatorTypes';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { checkEngineAvailable } from './cliCheck';
import { runAgentForCommand, createAgentRunner } from './runAgentForCommand';
import { runBuildFixLoop } from './buildFixLoop';
import { deriveRouteRegistration } from './previewRoutes';
import { readProjectName } from './packaging';
import { findMockInterceptors } from './connectDiagnostics';
import {
  buildProxyConfigJs,
  otherProxyEntries,
  setProxyConfigInAngularJson,
  updateStartScriptProxy,
  buildConnectGitignoreAdditions,
  PROXY_JS_FILE,
  PROXY_SECRET_FILE,
} from './protheusProxy';
import { buildConnectSystemPrompt, buildConnectUserPrompt, ConnectParams, EndpointInfo, InterceptorHandling } from './connectPromptBuilder';
import { EngineId } from './engineTypes';
import { requireLicense } from './requireLicense';

export function registerConnectCommand(
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel,
): vscode.Disposable {
  return vscode.commands.registerCommand('poui.connect', async () => {
    if (!(await requireLicense(context, outputChannel))) {
      return;
    }
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      void vscode.window.showErrorMessage('PO-UI: abra uma pasta de projeto Angular antes de conectar ao Protheus.');
      return;
    }
    const workspaceRoot = workspaceFolder.uri.fsPath;

    const engineId = vscode.workspace.getConfiguration('poui').get<EngineId>('aiEngine', 'claude');
    const cliCheck = await checkEngineAvailable(engineId);
    if (!cliCheck.available) {
      void vscode.window.showErrorMessage(
        `PO-UI: CLI do motor "${engineId}" não encontrado ou não está no PATH — instale e faça login antes de conectar.${cliCheck.errorMessage ? ` (${cliCheck.errorMessage})` : ''}`,
      );
      return;
    }

    const angularJsonPath = path.join(workspaceRoot, 'angular.json');
    const angularJsonRaw = await fs.readFile(angularJsonPath, 'utf8').catch(() => undefined);
    if (angularJsonRaw === undefined) {
      void vscode.window.showErrorMessage('PO-UI: nenhum projeto Angular encontrado — conexão cancelada.');
      return;
    }

    const picked = await vscode.window.showOpenDialog({
      canSelectMany: false,
      canSelectFolders: false,
      defaultUri: vscode.Uri.file(path.join(workspaceRoot, 'src', 'app')),
      filters: { 'Componente Angular': ['ts'] },
      openLabel: 'Conectar este componente',
      title: 'Selecione o componente a conectar ao Protheus',
    });
    const target = picked?.[0];
    if (!target || !target.fsPath.endsWith('.component.ts')) {
      if (target) {
        void vscode.window.showErrorMessage('PO-UI: selecione um arquivo `.component.ts`.');
      }
      return;
    }

    const tsContent = await fs.readFile(target.fsPath, 'utf8');
    let componentClass: string;
    let module: string;
    try {
      ({ componentClass, routeSegment: module } = deriveRouteRegistration(workspaceRoot, target.fsPath, tsContent));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      void vscode.window.showErrorMessage(`PO-UI: não foi possível analisar o componente selecionado — ${message}.`);
      return;
    }

    // --- Passo 3 do plugin original: coletar dados de conexão ---
    const protheusUrl = await vscode.window.showInputBox({
      prompt: 'URL base do Protheus REST',
      placeHolder: 'http://192.168.1.10:8086',
      validateInput: (v) => (v.trim() ? undefined : 'Informe a URL.'),
    });
    if (!protheusUrl) {
      return;
    }

    const apiPrefix = await vscode.window.showInputBox({
      prompt: 'Prefixo da API Protheus',
      value: '/rest/api/custom/v1',
    });
    if (apiPrefix === undefined) {
      return;
    }

    const endpointChoice = await vscode.window.showQuickPick(
      [
        { label: 'O endpoint GET já existe', value: 'existing' as const },
        { label: 'Ainda não existe — gerar contrato TLPP', value: 'new' as const },
        { label: 'Rotina MVC existente (FWRestModel)', value: 'mvc' as const },
      ],
      { placeHolder: 'O endpoint GET já existe no backend Protheus?' },
    );
    if (!endpointChoice) {
      return;
    }

    let endpoint: EndpointInfo;
    if (endpointChoice.value === 'existing') {
      const endpointPath = await vscode.window.showInputBox({
        prompt: 'URL completa do endpoint GET existente',
        placeHolder: `${apiPrefix.trim() || '/rest/api/custom/v1'}/...`,
      });
      if (!endpointPath) {
        return;
      }
      endpoint = { kind: 'existing', path: endpointPath };
    } else if (endpointChoice.value === 'mvc') {
      const source = await vscode.window.showInputBox({
        prompt: 'Fonte da rotina MVC (com ModelDef e MenuDef), ex.: MATA010',
        validateInput: (value) => (isValidMvcSource(value) ? undefined : 'Letras, números e _ — até 10 caracteres.'),
      });
      if (!source) {
        return;
      }
      endpoint = { kind: 'mvc', source: source.trim().toUpperCase() };
    } else {
      const businessRules = await vscode.window.showInputBox({
        prompt: 'Descreva os filtros e regras de negócio para gerar o contrato TLPP (seja conciso)',
      });
      if (!businessRules) {
        return;
      }
      endpoint = { kind: 'new', businessRules };
    }

    let filterStyle: 'simple' | 'odata' = 'simple';
    if (endpoint.kind !== 'mvc') {
      const filterChoice = await vscode.window.showQuickPick(
        [
          { label: 'Simples (padrão)', description: 'busca rápida `q` + parâmetros próprios', value: 'simple' as const },
          {
            label: 'oData',
            description: "filter=campo eq 'x' — padrão TOTVS/SmartX (12.1.2610+), backend com FWAdapterBaseV2",
            value: 'odata' as const,
          },
        ],
        { placeHolder: 'Formato do filtro da lista' },
      );
      if (!filterChoice) {
        return;
      }
      filterStyle = filterChoice.value;
    }

    const authChoice = await vscode.window.showQuickPick(
      [
        { label: 'Sem autenticação', value: 'none' as const },
        { label: 'Basic (usuário + senha)', value: 'basic' as const },
        { label: 'Bearer token', value: 'bearer' as const },
      ],
      { placeHolder: 'Autenticação do Protheus REST' },
    );
    if (!authChoice) {
      return;
    }

    // senha/token vão só para protheus-dev.secret (gitignored), lido pelo proxy.conf.js a cada requisição
    let username: string | undefined;
    let secret: string | undefined;
    if (authChoice.value === 'basic') {
      username = await vscode.window.showInputBox({ prompt: 'Usuário Protheus' });
      if (!username) {
        return;
      }
      secret = await vscode.window.showInputBox({ prompt: 'Senha Protheus', password: true });
      if (!secret) {
        return;
      }
    } else if (authChoice.value === 'bearer') {
      secret = await vscode.window.showInputBox({ prompt: 'Bearer token', password: true });
      if (!secret) {
        return;
      }
    }

    const tenantInput = await vscode.window.showInputBox({
      prompt: 'tenantId (empresa,filial — ex.: 99,01). Deixe em branco para usar o padrão do REST',
    });
    if (tenantInput === undefined) {
      return;
    }
    const tenantId = tenantInput.replace(/\s+/g, '') || undefined;

    const extraActionsInput = await vscode.window.showInputBox({
      prompt: 'Ações além do GET (POST/DELETE/etc.) — deixe em branco se não houver',
    });
    if (extraActionsInput === undefined) {
      return;
    }
    const extraActions = extraActionsInput.trim() || undefined;

    // Só pergunta a preferência de tratamento se de fato houver um interceptor
    // de mock pra este componente — evita uma pergunta sem sentido quando o
    // componente já usa HTTP real (achado numa auditoria plugin×extensão).
    const kebabName = path.basename(target.fsPath).replace(/\.component\.ts$/, '');
    const foundInterceptors = await findMockInterceptors(workspaceRoot, kebabName);

    let interceptorHandling: InterceptorHandling | undefined;
    if (foundInterceptors.length > 0) {
      const interceptorChoice = await vscode.window.showQuickPick(
        [
          { label: 'Remover do app.config.ts (recomendado para produção)', value: 'remove' as const },
          { label: 'Manter mas desativar (comentário — fácil rollback)', value: 'deactivate' as const },
        ],
        {
          placeHolder: `Como tratar o interceptor de mock encontrado (${path.basename(foundInterceptors[0])})?`,
        },
      );
      if (!interceptorChoice) {
        return;
      }
      interceptorHandling = interceptorChoice.value;
    }

    // --- Parte determinística: proxy e credencial nunca veem o CLI ---
    outputChannel.clear();
    outputChannel.show(true);
    outputChannel.appendLine(`Configurando ${PROXY_JS_FILE} para ${protheusUrl}...`);

    // .gitignore primeiro: o segredo só é gravado com o arquivo já ignorado
    const gitignorePath = path.join(workspaceRoot, '.gitignore');
    const gitignoreContent = (await fs.readFile(gitignorePath, 'utf8').catch(() => null)) ?? '';
    const additions = buildConnectGitignoreAdditions(gitignoreContent);
    if (additions) {
      await fs.writeFile(gitignorePath, gitignoreContent + additions, 'utf8');
      outputChannel.appendLine(`.gitignore atualizado (${PROXY_JS_FILE}, ${PROXY_SECRET_FILE}).`);
    }

    if (secret) {
      await fs.writeFile(path.join(workspaceRoot, PROXY_SECRET_FILE), secret, 'utf8');
      outputChannel.appendLine(`${PROXY_SECRET_FILE} gravado (fora do git).`);
    }

    const oldProxyContent = await fs.readFile(path.join(workspaceRoot, 'proxy.conf.json'), 'utf8').catch(() => undefined);
    const proxyJs = buildProxyConfigJs({
      protheusUrl,
      auth: authChoice.value,
      username,
      tenantId,
      otherEntries: otherProxyEntries(oldProxyContent),
    });
    await fs.writeFile(path.join(workspaceRoot, PROXY_JS_FILE), proxyJs, 'utf8');
    outputChannel.appendLine(`${PROXY_JS_FILE} configurado (Authorization${tenantId ? ' + tenantId' : ''} no proxy, Origin removido).`);
    if (oldProxyContent !== undefined) {
      outputChannel.appendLine(`proxy.conf.json mantido, mas o ativo agora é o ${PROXY_JS_FILE} (outras entradas copiadas).`);
    }

    const angularJson = JSON.parse(angularJsonRaw);
    const projectName = readProjectName(angularJson);
    if (angularJson?.projects?.[projectName]?.architect?.serve?.options?.proxyConfig !== PROXY_JS_FILE) {
      const fixed = setProxyConfigInAngularJson(angularJson, projectName, PROXY_JS_FILE);
      await fs.writeFile(angularJsonPath, JSON.stringify(fixed, null, 2) + '\n', 'utf8');
      outputChannel.appendLine(`angular.json: serve.options.proxyConfig → ${PROXY_JS_FILE}.`);
    }

    const packageJsonPath = path.join(workspaceRoot, 'package.json');
    const packageJsonRaw = await fs.readFile(packageJsonPath, 'utf8').catch(() => undefined);
    if (packageJsonRaw) {
      const packageJson = JSON.parse(packageJsonRaw);
      const start = packageJson?.scripts?.start as string | undefined;
      const novoStart = updateStartScriptProxy(start);
      if (start && novoStart !== start) {
        packageJson.scripts.start = novoStart;
        await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n', 'utf8');
        outputChannel.appendLine(`package.json: script start → ${novoStart}.`);
      }
    }

    // --- Parte agentiva: reescrita de mocks, interceptor, TLPP, spec ---
    outputChannel.appendLine('');
    outputChannel.appendLine(`Conectando ${componentClass}...`);

    const assetsDir = path.join(context.extensionUri.fsPath, 'assets', 'agent-prompts');
    let systemPrompt: string;
    try {
      systemPrompt = await buildConnectSystemPrompt(assetsDir, endpoint.kind === 'new', filterStyle === 'odata', endpoint.kind === 'mvc');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      void vscode.window.showErrorMessage(`PO-UI: falha ao carregar os arquivos de referência — ${message}.`);
      return;
    }

    const relativeComponentPath = path.relative(workspaceRoot, target.fsPath).split(path.sep).join('/');
    const connectParams: ConnectParams = {
      componentPath: relativeComponentPath,
      module,
      apiPrefix: apiPrefix.trim() || '/rest/api/custom/v1',
      endpoint,
      extraActions,
      interceptorHandling,
      filterStyle,
    };
    const userPrompt = buildConnectUserPrompt(connectParams);

    const model = vscode.workspace.getConfiguration('poui').get<string>('model');
    const effort = vscode.workspace
      .getConfiguration('poui')
      .get<'low' | 'medium' | 'high' | 'xhigh' | 'max'>('effort');

    const result = await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: `PO-UI: conectando ${componentClass}...` },
      () => runAgentForCommand(context, engineId, { cwd: workspaceRoot, systemPrompt, userPrompt, model, effort }, outputChannel),
    );

    if (!result.succeeded) {
      const message = `PO-UI: falha ao conectar — ${result.errorMessage ?? 'erro desconhecido'}.`;
      if (result.isAuthError) {
        void vscode.window.showErrorMessage(`${message} Rode \`${engineId}\` em um terminal para fazer login novamente.`);
        return;
      }
      void vscode.window.showErrorMessage(message);
      return;
    }

    if (result.filesWritten.length === 0) {
      void vscode.window.showWarningMessage('PO-UI: o agente terminou sem alterar nenhum arquivo.');
      return;
    }

    outputChannel.appendLine('Verificando o build...');
    const buildFix = await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: 'PO-UI: verificando o build...' },
      () =>
        runBuildFixLoop(
          { cwd: workspaceRoot, filesWritten: result.filesWritten, systemPrompt, engineId, model, effort },
          outputChannel,
          undefined,
          createAgentRunner(context),
        ),
    );

    const summary = `PO-UI: ${componentClass} conectado (${result.filesWritten.length} arquivo(s) alterado(s))${
      buildFix.finalSuccess ? ', build ok.' : ' — build ainda com erro(s), revise antes de usar.'
    } Rode \`ng test\` manualmente para conferir os specs.`;
    if (buildFix.finalSuccess) {
      void vscode.window.showInformationMessage(summary);
    } else {
      void vscode.window.showWarningMessage(summary);
    }
  });
}
