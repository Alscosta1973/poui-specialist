# Angular 17–21+ Module Structure for PO-UI / Protheus Projects

## Recommended Folder Structure

```
src/
├── app/
│   ├── app.component.ts        ← root shell: po-toolbar + po-menu + router-outlet
│   ├── app.component.html
│   ├── app.component.scss
│   ├── app.config.ts           ← providers: router, httpClient, protheus-lib-core
│   ├── app.routes.ts           ← top-level lazy routes
│   └── <feature>/              ← one folder per domain (e.g. financeiro, compras)
│       ├── <entity>-list/
│       │   ├── <entity>-list.component.ts
│       │   ├── <entity>-list.component.html
│       │   └── <entity>-list.component.scss
│       ├── <entity>-edit/
│       │   ├── <entity>-edit.component.ts
│       │   ├── <entity>-edit.component.html
│       │   └── <entity>-edit.component.scss
│       ├── <entity>.service.ts
│       └── models/
│           └── <entity>.model.ts
├── environments/
│   ├── environment.ts
│   └── environment.prod.ts
├── index.html
├── main.ts
└── styles.scss
proxy.conf.json
```

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

## app.component.ts (shell with Protheus integration)

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
    { label: 'Pedidos', link: '/pedidos', shortLabel: 'Pedidos', icon: 'po-icon-user' },
    { label: 'Sair',     shortLabel: 'Sair', icon: 'po-icon-exit', action: this.closeApp.bind(this) },
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
  <po-toolbar p-title="Meu Sistema"></po-toolbar>
  <po-menu [p-menus]="menus" [p-filter]="true" [p-collapsed]="true"></po-menu>
  <div class="container-fluid">
    <router-outlet></router-outlet>
  </div>
</div>
```

> **`[p-collapsed]="true"`** — menu começa recolhido, padrão quando o app abre dentro do Protheus.

---

## Escolha do padrão de componente

| Necessidade | Template recomendado |
|---|---|
| Lista simples sem filtros avançados | `page-list` |
| Lista com busca avançada + filtros ativos | `page-dynamic-search` |
| CRUD completo em componente único (modal) | `modal-crud` |
| Formulário complexo com muitos campos | `page-edit` |
| Painel de análise com gráficos | `dashboard` |

---

## Toolbar: shell vs por componente

**Opção A — toolbar no shell** (padrão deste plugin): `<po-toolbar>` no `app.component.html`. Título fixo do app.

**Opção B — toolbar por componente**: sem `<po-toolbar>` no shell; cada componente tem seu próprio `<po-toolbar p-title="...">`. Permite título dinâmico por página.

---

## NgModule vs Standalone

Este plugin gera **Standalone Components** (padrão Angular 17–21+).

| | Standalone (este plugin) | NgModules |
|---|---|---|
| Angular mínimo | 14+ (estável no 17) | Todas as versões |
| Padrão oficial | ✅ Angular 17–21+ recomendado | ⚠️ Legado |
| Geração | `ng new <projeto>` | `ng new <projeto> --no-standalone` |
| Bootstrap | `bootstrapApplication()` | `platformBrowserDynamic().bootstrapModule()` |
| Providers | `app.config.ts` | `app.module.ts` |

Para integrar em projetos NgModule existentes, envolva o componente em um `NgModule` wrapper.

---

## app.routes.ts

```typescript
import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'pedidos', pathMatch: 'full' },
  {
    path: 'pedidos',
    loadComponent: () =>
      import('./financeiro/pedidos-list/pedidos-list.component')
        .then(m => m.PedidosListComponent),
  },
  {
    path: 'pedidos/novo',
    loadComponent: () =>
      import('./financeiro/pedidos-edit/pedidos-edit.component')
        .then(m => m.PedidosEditComponent),
  },
  {
    path: 'pedidos/:codigo/:loja',
    loadComponent: () =>
      import('./financeiro/pedidos-edit/pedidos-edit.component')
        .then(m => m.PedidosEditComponent),
  },
  { path: '**', redirectTo: 'pedidos' },
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

## Standalone Component Pattern

```typescript
import {
  Component,
  ChangeDetectionStrategy,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  PoPageModule,
  PoTableModule,
  PoNotificationService,
} from '@po-ui/ng-components';
import { PedidosService } from '../pedidos.service';
import { Pedido } from '../models/pedido.model';

@Component({
  selector: 'app-pedidos-list',
  standalone: true,
  imports: [PoPageModule, PoTableModule],
  templateUrl: './pedidos-list.component.html',
  styleUrl: './pedidos-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PedidosListComponent implements OnInit {
  private readonly service = inject(PedidosService);
  private readonly router = inject(Router);
  private readonly notification = inject(PoNotificationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly items = signal<Pedido[]>([]);
  readonly loading = signal(false);
  readonly hasNext = signal(false);

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.service.getAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.items.set(res.items);
          this.hasNext.set(res.hasNext);
          this.loading.set(false);
        },
        error: () => {
          this.notification.error('Erro ao carregar registros.');
          this.loading.set(false);
        },
      });
  }
}
```

---

## Environments

Angular environments são o lugar correto para URLs de API e flags de feature — nunca hardcode em services.

### Estrutura de arquivos

```
src/environments/
├── environment.ts           ← desenvolvimento local (proxy em localhost)
├── environment.staging.ts   ← homologação (URL de HML do Protheus)
└── environment.prod.ts      ← produção (URL de PRD do Protheus)
```

### environment.ts (desenvolvimento)

```typescript
export const environment = {
  production: false,
  apiUrl: '',            // vazio → proxy do Angular (proxy.conf.json) redireciona para localhost:8080
  protheusVersion: '12',
};
```

### environment.prod.ts (produção)

```typescript
export const environment = {
  production: true,
  apiUrl: 'https://protheus.empresa.com.br:8080',
  protheusVersion: '12',
};
```

### angular.json — configurar substituição de environment

```json
"configurations": {
  "production": {
    "fileReplacements": [
      {
        "replace": "src/environments/environment.ts",
        "with": "src/environments/environment.prod.ts"
      }
    ]
  }
}
```

### Uso no service

```typescript
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PedidosService {
  private readonly baseUrl = `${environment.apiUrl}/rest/api/custom/v1/pedidos`;
  // Em dev: '/rest/api/custom/v1/pedidos' → resolvido pelo proxy para localhost:8080
  // Em prod: 'https://protheus.empresa.com.br:8080/rest/api/custom/v1/pedidos'
}
```

### proxy.conf.json (apenas desenvolvimento)

```json
{
  "/rest": {
    "target": "http://localhost:8080",
    "secure": false,
    "changeOrigin": true,
    "logLevel": "warn"
  }
}
```

Registrar em `angular.json`:
```json
"serve": {
  "options": {
    "proxyConfig": "proxy.conf.json"
  }
}
```

> **Nota de segurança:** `proxy.conf.json` deve estar no `.gitignore` — contém URL do servidor de desenvolvimento que varia por máquina/ambiente.

---

## Icon Reference

Always use `po-icon-*` names. Never use `an an-*`.

| Action | Icon |
|--------|------|
| New / Add | `po-icon-plus` |
| Edit | `po-icon-edit` |
| Delete | `po-icon-delete` |
| Home | `po-icon-home` |
| User | `po-icon-user` |
| Exit / Close | `po-icon-exit` |
| Search | `po-icon-search` |
| Save | `po-icon-ok` |

---

## angular.json — Required Styles

```json
"styles": [
  "node_modules/@totvs/po-theme/css/po-theme-default-variables.min.css",
  "node_modules/@totvs/po-theme/css/po-theme-default.min.css",
  "node_modules/@po-ui/style/css/po-theme-core.min.css",
  "src/styles.scss"
]
```
