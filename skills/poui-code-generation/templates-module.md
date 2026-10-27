# Template: module

Gera o scaffold completo de aplicação Angular 17+: config, roteamento, componente shell, ponto de entrada e arquivos de projeto.

---

## app.config.ts

```typescript
import { ApplicationConfig, importProvidersFrom } from '@angular/core';
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
```

---

## app.routes.ts

```typescript
import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: '{{firstRoute}}', pathMatch: 'full' },
  // TODO: adicione as rotas de feature usando loadComponent:
  // {
  //   path: '{{firstRoute}}',
  //   loadComponent: () =>
  //     import('./{{moduleName}}/{{kebab-name}}/{{kebab-name}}.component')
  //       .then(m => m.{{ComponentClass}}),
  // },
  // {
  //   path: '{{firstRoute}}/novo',
  //   loadComponent: () =>
  //     import('./{{moduleName}}/{{kebab-name}}-edit/{{kebab-name}}-edit.component')
  //       .then(m => m.{{ComponentClass}}EditComponent),
  // },
  // {
  //   path: '{{firstRoute}}/:id',
  //   loadComponent: () =>
  //     import('./{{moduleName}}/{{kebab-name}}-edit/{{kebab-name}}-edit.component')
  //       .then(m => m.{{ComponentClass}}EditComponent),
  // },
  { path: '**', redirectTo: '{{firstRoute}}' },
];
```

---

## main.ts

```typescript
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

bootstrapApplication(App, appConfig)
  .catch(err => console.error(err));
```

---

## app.ts

```typescript
import { AfterViewInit, ChangeDetectionStrategy, Component, DestroyRef, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { defer, filter } from 'rxjs';
import {
  PoMenuComponent,
  PoMenuItem,
  PoMenuModule,
  PoToolbarAction,
  PoToolbarModule,
  PoToolbarProfile,
} from '@po-ui/ng-components';
import { ProAppConfigService, ProThreadInfoService } from '@totvs/protheus-lib-core';
import { APP_VERSION } from './app-version';

/** Usuário logado no Protheus (vazio fora do Protheus) → sem perfil na barra. */
export function montarPerfil(info: { displayName?: string; userName?: string } | undefined): PoToolbarProfile | undefined {
  const title = info?.displayName?.trim() || info?.userName?.trim();
  return title ? { title, subtitle: info?.userName?.trim() ?? '' } : undefined;
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, PoMenuModule, PoToolbarModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App implements AfterViewInit {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly proAppConfigService = inject(ProAppConfigService);
  private readonly poMenu = viewChild.required<PoMenuComponent>('poMenu');

  readonly titulo = `{{ModuleName}} - v${APP_VERSION}`;
  readonly perfil = signal<PoToolbarProfile | undefined>(undefined);
  readonly acoesPerfil: PoToolbarAction[] = [
    { icon: 'an an-sign-out', label: 'Sair', type: 'danger', separator: true, action: () => this.closeApp() },
  ];
  readonly menus: PoMenuItem[] = [
    // { label: 'Pedidos', shortLabel: 'Pedidos', icon: 'an an-list-checks', link: '/pedidos' },
    { label: 'Sair', shortLabel: 'Sair', icon: 'an an-sign-out', action: () => this.closeApp() },
  ];

  constructor() {
    if (!this.proAppConfigService.insideProtheus()) {
      this.proAppConfigService.loadAppConfig();
    }
    // usuário da thread do FwCallApp; fora do Protheus não há token e o serviço lança erro na hora
    const threadInfo = inject(ProThreadInfoService);
    if (this.proAppConfigService.insideProtheus()) {
      defer(() => threadInfo.getUserInfoThread())
        .pipe(takeUntilDestroyed())
        .subscribe({
          next: (info) => this.perfil.set(montarPerfil(info)),
          error: () => this.perfil.set(undefined),
        });
    }
  }

  ngAfterViewInit(): void {
    // padrão TOTVS: o menu volta a recolher depois de escolher uma opção
    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.poMenu().collapse());
  }

  private closeApp(): void {
    if (this.proAppConfigService.insideProtheus()) {
      this.proAppConfigService.callAppClose();
    }
  }
}
```

`src/app/app-version.ts`:

```typescript
/** Versão exibida na barra do app ("Nome - vX.Y.Z"). Atualizar a cada entrega. */
export const APP_VERSION = '1.0.0';
```

## app.html

```html
<div class="po-wrapper">
  <po-toolbar
    [p-title]="titulo"
    [p-profile]="perfil()"
    [p-profile-actions]="acoesPerfil">
  </po-toolbar>
  <po-menu
    #poMenu
    [p-menus]="menus"
    [p-filter]="true"
    [p-collapsed]="true"
    [p-automatic-toggle]="true"
    p-logo="assets/logos/totvs.svg"
    p-short-logo="assets/logos/totvs-short-symbol.svg">
  </po-menu>
  <div class="container-fluid">
    <router-outlet></router-outlet>
  </div>
</div>
```

> Shell no **padrão visual TOTVS** (`skills/poui-patterns/padrao-totvs.md`): título com a versão, usuário no perfil, menu recolhido que abre ao passar o mouse (`p-automatic-toggle`), logo TOTVS (assets do `@totvs/common-assets` no `angular.json`) e recolhe a cada navegação. No Angular 21 o componente raiz é `app.ts` / `App`.


> **Toolbar por componente (alternativa):** Remova `po-toolbar` do shell e adicione `<po-toolbar p-title="...">` dentro de cada componente individualmente. Isso permite que cada página tenha seu próprio título e ações na toolbar.

## app.scss

```scss
// Estilos globais do shell da aplicação
```

---

## src/index.html

```html
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>{{ModuleName}}</title>
  <base href="/">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="icon" type="image/x-icon" href="favicon.ico">
</head>
<body>
  <app-root></app-root>
</body>
</html>
```

---

## package.json

```json
{
  "name": "{{kebab-name}}",
  "version": "0.0.0",
  "scripts": {
    "ng": "ng",
    "start": "ng serve --proxy-config proxy.conf.json",
    "build": "ng build",
    "watch": "ng build --watch --configuration development",
    "test": "ng test"
  },
  "private": true,
  "dependencies": {
    "@angular/animations": "^21.0.0",
    "@angular/common": "^21.0.0",
    "@angular/compiler": "^21.0.0",
    "@angular/core": "^21.0.0",
    "@angular/forms": "^21.0.0",
    "@angular/platform-browser": "^21.0.0",
    "@angular/platform-browser-dynamic": "^21.0.0",
    "@angular/router": "^21.0.0",
    "@angular/cdk": "^21.0.0",
    "@po-ui/ng-components": "^21.22.0",
    "@po-ui/ng-templates": "^21.22.0",
    "@totvs/po-theme": "^21.22.0",
    "@totvs/protheus-lib-core": "^21.0.0",
    "rxjs": "~7.8.0",
    "tslib": "^2.6.0",
    "zone.js": "~0.15.0"
  },
  "devDependencies": {
    "@angular-devkit/build-angular": "^21.0.0",
    "@angular/cli": "~21.0.0",
    "@angular/compiler-cli": "^21.0.0",
    "typescript": "~5.9.0"
  }
}
```

> **Nota:** Verifique as versões mais recentes compatíveis de `@po-ui/ng-components`, `@totvs/po-theme` e `@totvs/protheus-lib-core` que correspondam à sua versão do Angular no npm antes de executar `npm install`.

---

## angular.json (styles section — critical for PO-UI theme)

O array `architect.build.options.styles` deve incluir os arquivos CSS do tema PO-UI:

```json
"styles": [
  "node_modules/@totvs/po-theme/css/po-theme-default-variables.min.css",
  "node_modules/@totvs/po-theme/css/po-theme-default.min.css",
  "node_modules/@po-ui/style/css/po-theme-core.min.css",
  "src/styles.scss"
]
```

Sem esses arquivos os componentes PO-UI são renderizados sem nenhum estilo.

---

## angular.json (outputPath — crítico para deploy no Protheus)

```json
"outputPath": {
  "base": "dist/{{kebab-name}}",
  "browser": ""
}
```

O builder `@angular/build:application` (padrão desde Angular 17+) por padrão gera a saída em `dist/<projeto>/browser/`, reservando a raiz de `dist/<projeto>/` para uma eventual build de servidor (SSR). O Protheus (`FWCallApp`/`AjustaIndex` em `FWCALLAPP.PRW`) espera `index.html` diretamente na raiz da pasta publicada — sem esse ajuste, o deploy falha com **"Falha ao Ajustar os arquivos Index"**. Com `browser: ""`, o `ng build` já entrega `index.html` direto em `dist/{{kebab-name}}/`, sem subpasta.

---

## proxy.conf.json

Usado durante o desenvolvimento local para fazer proxy das chamadas `/rest` para o AppServer Protheus:

```json
{
  "/rest": {
    "target": "http://localhost:8084",
    "secure": false,
    "changeOrigin": true,
    "logLevel": "debug"
  }
}
```

Execute com: `ng serve --proxy-config proxy.conf.json`

---

## tsconfig.json — desabilitar strict mode

Todos os projetos PO-UI / Protheus devem desabilitar o strict mode para evitar
erros de compilação gerados pelas restrições do TypeScript strict com os padrões
de criação de objetos usados pelas libs do Protheus:

```json
{
  "compilerOptions": {
    "strict": false,
    "noPropertyAccessFromIndexSignature": false,
    "noImplicitOverride": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

Edite o arquivo `tsconfig.json` na raiz do projeto e altere `"strict": true` para
`"strict": false` e `"noPropertyAccessFromIndexSignature": true` para `false`.
As demais flags (`noImplicitOverride`, `noImplicitReturns`, `noFallthroughCasesInSwitch`)
podem ser mantidas pois não causam incompatibilidades.

---

## src/styles.scss — estilos globais obrigatórios

```scss
@import url('https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700;800&display=swap');

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
```
