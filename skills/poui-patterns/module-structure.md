# Angular 17+ Module Structure for PO-UI / Protheus Projects

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
    { label: 'Clientes', link: '/clientes', shortLabel: 'Clientes', icon: 'po-icon-user' },
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
  <po-menu [p-menus]="menus" [p-filter]="true"></po-menu>
  <div class="container-fluid">
    <router-outlet></router-outlet>
  </div>
</div>
```

---

## app.routes.ts

```typescript
import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'clientes', pathMatch: 'full' },
  {
    path: 'clientes',
    loadComponent: () =>
      import('./financeiro/clientes-list/clientes-list.component')
        .then(m => m.ClientesListComponent),
  },
  {
    path: 'clientes/novo',
    loadComponent: () =>
      import('./financeiro/clientes-edit/clientes-edit.component')
        .then(m => m.ClientesEditComponent),
  },
  {
    path: 'clientes/:codigo/:loja',
    loadComponent: () =>
      import('./financeiro/clientes-edit/clientes-edit.component')
        .then(m => m.ClientesEditComponent),
  },
  { path: '**', redirectTo: 'clientes' },
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
  PoPageListModule,
  PoTableModule,
  PoNotificationService,
} from '@po-ui/ng-components';
import { ClientesService } from '../clientes.service';
import { Cliente } from '../models/cliente.model';

@Component({
  selector: 'app-clientes-list',
  standalone: true,
  imports: [PoPageListModule, PoTableModule],
  templateUrl: './clientes-list.component.html',
  styleUrl: './clientes-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientesListComponent implements OnInit {
  private readonly service = inject(ClientesService);
  private readonly router = inject(Router);
  private readonly notification = inject(PoNotificationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly items = signal<Cliente[]>([]);
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

The `architect.build.options.styles` array must include the PO-UI theme files or components render without styling:

```json
"styles": [
  "node_modules/@totvs/po-theme/css/po-theme-default-variables.min.css",
  "node_modules/@totvs/po-theme/css/po-theme-default.min.css",
  "node_modules/@po-ui/style/css/po-theme-core.min.css",
  "src/styles.scss"
]
```
