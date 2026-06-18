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
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, appConfig)
  .catch(err => console.error(err));
```

---

## app.component.ts

```typescript
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PoMenuModule, PoToolbarModule, PoMenuItem } from '@po-ui/ng-components';
import { ProAppConfigService } from '@totvs/protheus-lib-core';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, PoMenuModule, PoToolbarModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  constructor(private proAppConfigService: ProAppConfigService) {
    if (!this.proAppConfigService.insideProtheus()) {
      this.proAppConfigService.loadAppConfig();
    }
  }

  readonly menus: PoMenuItem[] = [
    // TODO: adicione itens de menu correspondentes às rotas
    // { label: 'Pedidos', link: '/pedidos', shortLabel: 'Pedidos', icon: 'po-icon-user' },
    { label: 'Sair', shortLabel: 'Sair', icon: 'po-icon-exit', action: this.closeApp.bind(this) },
  ];

  private closeApp(): void {
    if (this.proAppConfigService.insideProtheus()) {
      this.proAppConfigService.callAppClose();
    }
  }
}
```

## app.component.html

```html
<div class="po-wrapper">
  <po-toolbar p-title="{{ModuleName}}"></po-toolbar>
  <po-menu [p-menus]="menus" [p-filter]="true" [p-collapsed]="true"></po-menu>
  <div class="container-fluid">
    <router-outlet></router-outlet>
  </div>
</div>
```

> **`[p-collapsed]="true"`** — menu inicia recolhido, que é o padrão quando o app roda dentro do Protheus.

> **Toolbar por componente (alternativa):** Remova `po-toolbar` do shell e adicione `<po-toolbar p-title="...">` dentro de cada componente individualmente. Isso permite que cada página tenha seu próprio título e ações na toolbar.

## app.component.scss

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
    "@angular/animations": "^17.3.0",
    "@angular/common": "^17.3.0",
    "@angular/compiler": "^17.3.0",
    "@angular/core": "^17.3.0",
    "@angular/forms": "^17.3.0",
    "@angular/platform-browser": "^17.3.0",
    "@angular/platform-browser-dynamic": "^17.3.0",
    "@angular/router": "^17.3.0",
    "@po-ui/ng-components": "^17.0.0",
    "@po-ui/ng-templates": "^17.0.0",
    "@totvs/po-theme": "^17.0.0",
    "@totvs/protheus-lib-core": "^17.0.0",
    "rxjs": "~7.8.0",
    "tslib": "^2.6.0",
    "zone.js": "~0.14.0"
  },
  "devDependencies": {
    "@angular-devkit/build-angular": "^17.3.0",
    "@angular/cli": "~17.3.0",
    "@angular/compiler-cli": "^17.3.0",
    "typescript": "~5.4.0"
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
