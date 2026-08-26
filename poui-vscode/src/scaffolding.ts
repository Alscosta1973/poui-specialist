import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

const execAsync = promisify(exec);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsonObject = any;

const MIN_NODE_MAJOR = 20;
const MIN_NODE_MINOR = 11;

/** PO-UI 21 exige Node >= 20.11.0. */
export function checkNodeVersion(versionString: string): { ok: boolean; message?: string } {
  const [major, minor] = versionString.replace(/^v/, '').split('.').map(Number);
  const ok = major > MIN_NODE_MAJOR || (major === MIN_NODE_MAJOR && minor >= MIN_NODE_MINOR);
  if (ok) {
    return { ok: true };
  }
  return {
    ok: false,
    message: `Node.js ${versionString} detectado — abaixo do mínimo exigido pelo PO-UI 21 (>=${MIN_NODE_MAJOR}.${MIN_NODE_MINOR}.0). Atualize o Node.js antes de continuar: https://nodejs.org`,
  };
}

export function titleCase(name: string): string {
  return name
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export const APP_CONFIG_TS = `import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { ProtheusLibCoreModule } from '@totvs/protheus-lib-core';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptorsFromDi()),
    provideAnimations(),
    importProvidersFrom(ProtheusLibCoreModule),
  ],
};
`;

export function buildAppRoutesTs(includeDemo: boolean): string {
  const demoRoute = includeDemo
    ? "  { path: 'inicio', loadComponent: () => import('./home/home.component').then(m => m.HomeComponent) },\n"
    : '  // As rotas de feature serão adicionadas aqui via /generate\n';
  return `import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'inicio', pathMatch: 'full' },
${demoRoute}  { path: '**', redirectTo: 'inicio' },
];
`;
}

export function buildAppComponentTs(includeDemo: boolean): string {
  const inicioMenuItem = includeDemo
    ? "    { label: 'Início', link: '/inicio', shortLabel: 'Início', icon: 'po-icon-home' },\n"
    : '';
  return `import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PoMenuModule, PoToolbarModule, PoMenuItem } from '@po-ui/ng-components';
import { ProAppConfigService } from '@totvs/protheus-lib-core';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, PoMenuModule, PoToolbarModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  constructor(private proAppConfigService: ProAppConfigService) {
    if (!this.proAppConfigService.insideProtheus()) {
      this.proAppConfigService.loadAppConfig();
    }
  }

  readonly menus: PoMenuItem[] = [
${inicioMenuItem}    { label: 'Sair', shortLabel: 'Sair', icon: 'po-icon-exit', action: this.closeApp.bind(this) },
  ];

  private closeApp(): void {
    if (this.proAppConfigService.insideProtheus()) {
      this.proAppConfigService.callAppClose();
    }
  }
}
`;
}

export function buildAppComponentHtml(projectTitle: string): string {
  return `<div class="po-wrapper">
  <po-toolbar p-title="${projectTitle}"></po-toolbar>
  <po-menu [p-menus]="menus" [p-filter]="true" [p-collapsed]="true"></po-menu>
  <div class="container-fluid">
    <router-outlet></router-outlet>
  </div>
</div>
`;
}

export const STYLES_SCSS = `@import url('https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700;800&display=swap');

* { box-sizing: border-box; }

body {
  margin: 0;
  font-family: 'Open Sans', Arial, sans-serif;
}

/* Quirk #17 — po-decimal e po-number não alinham à direita por padrão (PO-UI v17) */
po-decimal input,
po-number input {
  text-align: right;
}
`;

export function buildIndexHtmlTitle(existingIndexHtml: string, projectTitle: string): string {
  return existingIndexHtml.replace(/<title>.*?<\/title>/, `<title>${projectTitle}</title>`);
}

export function buildProxyConfigJson(protheusUrl: string): string {
  return (
    JSON.stringify(
      {
        '/rest': {
          target: protheusUrl,
          secure: false,
          changeOrigin: true,
          logLevel: 'debug',
        },
      },
      null,
      2,
    ) + '\n'
  );
}

export function buildHomeComponentTs(protheusUrl: string): string {
  return `import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PoPageModule, PoToolbarModule, PoWidgetModule } from '@po-ui/ng-components';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [PoPageModule, PoToolbarModule, PoWidgetModule],
  template: \`
    <po-toolbar p-title="Bem-vindo"></po-toolbar>
    <po-page-default p-title="Projeto PO-UI + Protheus">
      <div class="po-row">
        <po-widget class="po-md-12 po-lg-4 po-mt-2" p-title="Próximos passos">
          <p>1. Gere um componente: <code>PO-UI: Gerar Componente</code></p>
          <p>2. Gere os testes: <code>PO-UI: Gerar Teste Unitário</code></p>
          <p>3. Revise o código: <code>PO-UI: Revisar Código</code></p>
        </po-widget>
        <po-widget class="po-md-12 po-lg-4 po-mt-2" p-title="Tipos disponíveis">
          <ul>
            <li>page-list / page-dynamic-search</li>
            <li>modal-crud / page-edit / stepper-form</li>
            <li>dashboard / upload / po-tree</li>
            <li>infinite-scroll / action-list</li>
          </ul>
        </po-widget>
        <po-widget class="po-md-12 po-lg-4 po-mt-2" p-title="Projeto configurado">
          <p>✓ PO-UI configurado</p>
          <p>✓ Proxy para Protheus: <strong>${protheusUrl}</strong></p>
          <p>✓ OnPush habilitado</p>
          <p>✓ strict: false (compatível com libs Protheus)</p>
        </po-widget>
      </div>
    </po-page-default>
  \`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {}
`;
}

/** `tsconfig.json` gerado por `ng new` traz comentários de bloco no topo —
 * JSON estrito não aceita isso, então (igual ao Passo 5 do plugin original)
 * a correção é busca-e-substituição em texto puro, nunca `JSON.parse`. */
export function fixTsconfigStrictness(tsconfigText: string): string {
  return tsconfigText
    .replace(/"strict":\s*true/, '"strict": false')
    .replace(/"noPropertyAccessFromIndexSignature":\s*true/, '"noPropertyAccessFromIndexSignature": false');
}

const TOTVS_STYLES = [
  'node_modules/@totvs/po-theme/css/po-theme-default-variables.min.css',
  'node_modules/@totvs/po-theme/css/po-theme-default.min.css',
  'node_modules/@po-ui/style/css/po-theme-core.min.css',
  'src/styles.scss',
];

/** Um projeto recém-criado tem estado conhecido — em vez de mesclar
 * cuidadosamente (como `packageProject` faz num projeto arbitrário já
 * existente), sobrescreve `styles` com a ordem exata do tema TOTVS,
 * descartando qualquer entrada de tema comunitário injetada pelo `ng add`. */
export function setAngularJsonStyles(angularJson: JsonObject, projectName: string): JsonObject {
  const fixed = JSON.parse(JSON.stringify(angularJson)) as JsonObject;
  fixed.projects[projectName].architect.build.options.styles = [...TOTVS_STYLES];
  return fixed;
}

export interface ScaffoldParams {
  projectName: string;
  protheusUrl: string;
  includeDemo: boolean;
}

export interface ScaffoldResult {
  success: boolean;
  steps: string[];
  projectDir?: string;
  errorMessage?: string;
}

export interface OutputSink {
  appendLine(value: string): void;
}

async function run(command: string, cwd: string, sink: OutputSink, timeout = 300000): Promise<void> {
  sink.appendLine(`$ ${command}`);
  await execAsync(command, { cwd, timeout, maxBuffer: 20 * 1024 * 1024 });
}

/** Orquestra os Passos 1-9 do `/poui-specialist:scaffold` original. Não
 * testado unitariamente (mistura `ng new`/`ng add`/`npm install` reais,
 * minutos de execução) — validado com uma execução real de ponta a ponta,
 * mesma convenção de `packageProject`/`configurePlaywright`. */
export async function scaffoldProject(parentDir: string, params: ScaffoldParams, sink: OutputSink): Promise<ScaffoldResult> {
  const steps: string[] = [];
  const projectDir = path.join(parentDir, params.projectName);
  const projectTitle = titleCase(params.projectName);

  try {
    const nodeCheck = checkNodeVersion(process.version);
    if (!nodeCheck.ok) {
      return { success: false, steps, errorMessage: nodeCheck.message };
    }

    sink.appendLine(`Criando projeto Angular "${params.projectName}" (pode levar 1-3 minutos)...`);
    await run(
      `ng new ${params.projectName} --standalone --routing --style scss --skip-git --skip-tests --package-manager npm`,
      parentDir,
      sink,
    );
    steps.push('Projeto Angular criado (ng new)');

    sink.appendLine('Instalando pacotes PO-UI e Protheus...');
    await run('ng add @po-ui/ng-components@21 --configSideMenu=false --skip-confirmation', projectDir, sink);
    await run('ng add @po-ui/ng-templates@21 --skip-confirmation', projectDir, sink);
    await run('npm install @totvs/po-theme@^21 @totvs/protheus-lib-core@^21', projectDir, sink);
    steps.push('Pacotes PO-UI/Protheus instalados');

    const angularJsonPath = path.join(projectDir, 'angular.json');
    const angularJson = JSON.parse(await fs.readFile(angularJsonPath, 'utf8'));
    const projectKey = Object.keys(angularJson.projects)[0];
    const withStyles = setAngularJsonStyles(angularJson, projectKey);
    withStyles.projects[projectKey].architect.build.options.outputPath = {
      base: `dist/${params.projectName}`,
      browser: '',
    };
    await fs.writeFile(angularJsonPath, JSON.stringify(withStyles, null, 2) + '\n', 'utf8');
    steps.push('angular.json: estilos PO-UI + outputPath configurados');

    const tsconfigPath = path.join(projectDir, 'tsconfig.json');
    const tsconfigText = await fs.readFile(tsconfigPath, 'utf8');
    await fs.writeFile(tsconfigPath, fixTsconfigStrictness(tsconfigText), 'utf8');
    steps.push('tsconfig.json: strict relaxado (compatibilidade com libs Protheus)');

    await fs.writeFile(path.join(projectDir, 'src', 'app', 'app.config.ts'), APP_CONFIG_TS, 'utf8');
    await fs.writeFile(path.join(projectDir, 'src', 'app', 'app.routes.ts'), buildAppRoutesTs(params.includeDemo), 'utf8');
    // `ng new` (Angular CLI 21) gera o componente raiz como app.ts/app.html/app.scss
    // com a classe `App` — não mais app.component.ts/AppComponent (convenção antiga).
    // main.ts já importa `App` de './app/app'; sobrescrever esses arquivos no lugar
    // certo evita ter que editar main.ts também.
    await fs.writeFile(path.join(projectDir, 'src', 'app', 'app.ts'), buildAppComponentTs(params.includeDemo), 'utf8');
    await fs.writeFile(path.join(projectDir, 'src', 'app', 'app.html'), buildAppComponentHtml(projectTitle), 'utf8');
    await fs.writeFile(path.join(projectDir, 'src', 'styles.scss'), STYLES_SCSS, 'utf8');
    const indexHtmlPath = path.join(projectDir, 'src', 'index.html');
    const indexHtml = await fs.readFile(indexHtmlPath, 'utf8');
    await fs.writeFile(indexHtmlPath, buildIndexHtmlTitle(indexHtml, projectTitle), 'utf8');
    steps.push('Shell da aplicação (app.config/routes/component, styles, index.html) escrito');

    if (params.includeDemo) {
      const homeDir = path.join(projectDir, 'src', 'app', 'home');
      await fs.mkdir(homeDir, { recursive: true });
      await fs.writeFile(path.join(homeDir, 'home.component.ts'), buildHomeComponentTs(params.protheusUrl), 'utf8');
      steps.push('Componente demo (home) criado');
    }

    await fs.writeFile(path.join(projectDir, 'proxy.conf.json'), buildProxyConfigJson(params.protheusUrl), 'utf8');
    const packageJsonPath = path.join(projectDir, 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
    packageJson.scripts.start = 'ng serve --proxy-config proxy.conf.json';
    await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n', 'utf8');
    const gitignorePath = path.join(projectDir, '.gitignore');
    const gitignoreContent = await fs.readFile(gitignorePath, 'utf8').catch(() => '');
    if (!gitignoreContent.includes('proxy.conf.json')) {
      await fs.writeFile(gitignorePath, `${gitignoreContent}\n# Proxy — pode conter endereços internos\nproxy.conf.json\n`, 'utf8');
    }
    steps.push('proxy.conf.json criado, package.json/.gitignore atualizados');

    // Melhor esforço — se a máquina não tem git user.name/user.email configurados
    // (só por repo, sem fallback global, por exemplo), o projeto já criado com
    // sucesso não deve ser reportado como falha só por causa disso.
    try {
      await run('git init', projectDir, sink);
      await run('git add .', projectDir, sink);
      await execAsync('git commit -m "chore: scaffold Angular + PO-UI via poui-vscode"', { cwd: projectDir, timeout: 30000 });
      steps.push('Repositório git inicializado com o commit inicial');
    } catch (error) {
      const err = error as { stdout?: string; stderr?: string; message: string };
      const gitErrorMessage = `${err.stdout ?? ''}${err.stderr ?? ''}`.trim() || err.message;
      sink.appendLine(`⚠ git init/commit falhou, projeto criado mesmo assim: ${gitErrorMessage}`);
      steps.push(`⚠ git init/commit falhou (projeto criado normalmente): ${gitErrorMessage}`);
    }

    sink.appendLine('Verificando o build...');
    await run('ng build --configuration development', projectDir, sink, 180000);
    steps.push('Build de verificação: ok');

    return { success: true, steps, projectDir };
  } catch (error) {
    const err = error as { stdout?: string; stderr?: string; message: string };
    const errorMessage = `${err.stdout ?? ''}${err.stderr ?? ''}`.trim() || err.message;
    return { success: false, steps, errorMessage, projectDir };
  }
}
