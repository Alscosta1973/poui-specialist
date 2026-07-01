# Template: Route Guards (Angular 17+ Functional)

Use this template when the user needs route protection in a PO-UI / Protheus Angular app.
Common scenarios: block unauthenticated navigation, warn on unsaved form changes.

---

## Placeholders

| Placeholder | Description | Example |
|-------------|-------------|---------|
| `{{kebab-name}}` | Guard file name (kebab-case) | `auth-guard` |
| `{{GuardName}}` | Exported const name (camelCase + Guard) | `authGuard` |
| `{{moduleName}}` | Feature folder | `core` |

---

## Template A — CanActivate: Protheus auth guard

Verifica se o app está rodando dentro do Protheus antes de ativar uma rota.
Se não estiver, redireciona para a rota raiz com mensagem de erro.

**File:** `src/app/{{moduleName}}/{{kebab-name}}.ts`

```typescript
/**
 * @generated  poui-specialist v1.10.0
 * @author     Andre Costa <andre.andrelscosta@gmail.com>
 * @license    Uso permitido · redistribuição proibida sem autorização escrita
 * @see        https://github.com/Alscosta1973/poui-specialist
 */
import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { ProAppConfigService } from '@totvs/protheus-lib-core';
import { PoNotificationService } from '@po-ui/ng-components';

export const {{GuardName}}: CanActivateFn = (_route, _state) => {
  const proConfig = inject(ProAppConfigService);
  const router    = inject(Router);
  const notify    = inject(PoNotificationService);

  if (proConfig.insideProtheus()) {
    return true;
  }

  notify.error('Acesso negado. Execute o módulo dentro do Protheus.');
  return router.createUrlTree(['/']);
};
```

**Registration in `app.routes.ts`:**
```typescript
import { {{GuardName}} } from './{{moduleName}}/{{kebab-name}}';

export const routes: Routes = [
  {
    path: 'financeiro/pedidos',
    canActivate: [{{GuardName}}],
    loadComponent: () => import('./financeiro/pedidos-list/pedidos-list.component')
      .then(m => m.PedidosListComponent),
  },
];
```

---

## Template B — CanDeactivate: unsaved changes guard

Impede navegação acidental quando há alterações não salvas em um formulário.

**File:** `src/app/{{moduleName}}/{{kebab-name}}.ts`

```typescript
/**
 * @generated  poui-specialist v1.10.0
 * @author     Andre Costa <andre.andrelscosta@gmail.com>
 * @license    Uso permitido · redistribuição proibida sem autorização escrita
 * @see        https://github.com/Alscosta1973/poui-specialist
 */
import { CanDeactivateFn } from '@angular/router';

/** Interface que componentes com formulário devem implementar */
export interface HasUnsavedChanges {
  hasUnsavedChanges(): boolean;
}

export const {{GuardName}}: CanDeactivateFn<HasUnsavedChanges> = (component) => {
  if (!component.hasUnsavedChanges()) {
    return true;
  }
  return confirm('Há alterações não salvas. Deseja sair mesmo assim?');
};
```

**Componente com formulário — implementar a interface:**
```typescript
export class PedidoEditComponent implements HasUnsavedChanges {
  private readonly isDirty = signal(false);

  // Marcar dirty quando usuário editar qualquer campo
  onFormChanged(): void { this.isDirty.set(true); }

  // Limpar dirty após salvar com sucesso
  private onSaveSuccess(): void { this.isDirty.set(false); }

  hasUnsavedChanges(): boolean { return this.isDirty(); }
}
```

**Registration in `app.routes.ts`:**
```typescript
import { {{GuardName}} } from './{{moduleName}}/{{kebab-name}}';

export const routes: Routes = [
  {
    path: 'financeiro/pedidos/:id/editar',
    canDeactivate: [{{GuardName}}],
    loadComponent: () => import('./financeiro/pedido-edit/pedido-edit.component')
      .then(m => m.PedidoEditComponent),
  },
];
```

---

## Template C — CanActivate: permission guard (Protheus user access level)

Verifica nível de acesso do usuário a partir do `ProAppConfigService`.

```typescript
/**
 * @generated  poui-specialist v1.10.0
 * @author     Andre Costa <andre.andrelscosta@gmail.com>
 * @license    Uso permitido · redistribuição proibida sem autorização escrita
 * @see        https://github.com/Alscosta1973/poui-specialist
 */
import { CanActivateFn, ActivatedRouteSnapshot, Router } from '@angular/router';
import { inject } from '@angular/core';
import { ProAppConfigService } from '@totvs/protheus-lib-core';
import { PoNotificationService } from '@po-ui/ng-components';

/**
 * Uso: canActivate: [permissionGuard]
 * Dados da rota: data: { requiredPermission: 'FINANCEIRO_ADMIN' }
 */
export const {{GuardName}}: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const proConfig  = inject(ProAppConfigService);
  const router     = inject(Router);
  const notify     = inject(PoNotificationService);

  const required: string = route.data['requiredPermission'];
  if (!required) return true;

  const userProfile = proConfig.getCurrentUser?.()?.profile ?? '';
  if (userProfile === required || userProfile === 'ADMIN') {
    return true;
  }

  notify.error(`Sem permissão para acessar esta página. Perfil necessário: ${required}`);
  return router.createUrlTree(['/']);
};
```

---

## Selection Guide

| Cenário | Template |
|---------|---------|
| Proteger rota para usuários dentro do Protheus | A — Protheus auth guard |
| Confirmar saída de formulário com dados não salvos | B — Unsaved changes |
| Controle por perfil/permissão Protheus | C — Permission guard |
| Combinar: auth + permission | `canActivate: [authGuard, permissionGuard]` |
