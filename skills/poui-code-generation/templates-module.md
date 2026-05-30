# Template: module

Generates Angular 17+ application config files: `app.config.ts` and `app.routes.ts`.

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

## app.routes.ts

```typescript
import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: '{{firstRoute}}', pathMatch: 'full' },
  // TODO: add feature routes using loadComponent pattern:
  // {
  //   path: '{{firstRoute}}',
  //   loadComponent: () =>
  //     import('./{{moduleName}}/{{kebab-name}}-list/{{kebab-name}}-list.component')
  //       .then(m => m.{{ComponentClass}}ListComponent),
  // },
  { path: '**', redirectTo: '{{firstRoute}}' },
];
```

## main.ts

```typescript
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, appConfig)
  .catch(err => console.error(err));
```

## app.component.ts (shell with po-menu)

```typescript
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PoMenuModule, PoToolbarModule, PoMenuItem } from '@po-ui/ng-components';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, PoMenuModule, PoToolbarModule],
  template: `
    <po-toolbar p-title="{{ModuleName}}"></po-toolbar>
    <po-menu [p-menus]="menus" p-collapsed="false"></po-menu>
    <router-outlet></router-outlet>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  readonly menus: PoMenuItem[] = [
    // TODO: add menu items matching routes
  ];
}
```
