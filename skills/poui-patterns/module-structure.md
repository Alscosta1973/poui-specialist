# Angular 17+ Module Structure for PO-UI Projects

## Recommended Folder Structure

```
src/
├── app/
│   ├── app.component.ts        ← root component (shell with po-menu)
│   ├── app.config.ts           ← providers: router, httpClient
│   ├── app.routes.ts           ← top-level lazy routes
│   └── <feature>/              ← one folder per domain/module
│       ├── <feature>-list/
│       │   ├── <feature>-list.component.ts
│       │   ├── <feature>-list.component.html
│       │   └── <feature>-list.component.scss
│       ├── <feature>-edit/
│       │   ├── <feature>-edit.component.ts
│       │   ├── <feature>-edit.component.html
│       │   └── <feature>-edit.component.scss
│       ├── <feature>.service.ts
│       └── models/
│           └── <feature>.model.ts
```

---

## app.config.ts

```typescript
import { ApplicationConfig } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptorsFromDi()),
  ],
};
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
    path: 'clientes/:id',
    loadComponent: () =>
      import('./financeiro/clientes-edit/clientes-edit.component')
        .then(m => m.ClientesEditComponent),
  },
  { path: '**', redirectTo: 'clientes' },
];
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
        error: () => this.loading.set(false),
      });
  }
}
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

## App Component Shell (with po-menu)

```typescript
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, PoMenuModule, PoToolbarModule],
  template: `
    <po-toolbar p-title="Meu Sistema"></po-toolbar>
    <po-menu [p-menus]="menus"></po-menu>
    <router-outlet></router-outlet>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  readonly menus: PoMenuItem[] = [
    { label: 'Clientes', link: '/clientes', icon: 'po-icon-user' },
  ];
}
```
