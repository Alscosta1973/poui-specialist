# Template: HTTP Interceptor (Angular 17+ Functional)

Use this template when the user needs an HttpInterceptorFn for Protheus REST integration.
Common scenarios: inject auth token, translate Protheus error messages, add loading overlay, retry on 401.

---

## Placeholders

| Placeholder | Description | Example |
|-------------|-------------|---------|
| `{{kebab-name}}` | Interceptor file name (kebab-case) | `auth-interceptor` |
| `{{InterceptorName}}` | Exported const name (camelCase + Interceptor) | `authInterceptor` |
| `{{moduleName}}` | Feature folder | `core` |

---

## Template A — App context interceptor (Protheus headers)

> **Nota:** A autenticação Bearer é tratada internamente por `ProAuthInteceptor` da lib
> `@totvs/protheus-lib-core` — não existe `getTokenAuthorizationBearer` em `ProAppConfigService`.
> Este template adiciona headers de contexto de aplicação (app name, versão) que alguns
> backends Protheus utilizam para logging e auditoria.

**File:** `src/app/{{moduleName}}/{{kebab-name}}.ts`

```typescript
/**
 * @generated  poui-specialist v1.9.0
 * @author     Andre Costa <andre.andrelscosta@gmail.com>
 * @license    Uso permitido · redistribuição proibida sem autorização escrita
 * @see        https://github.com/Alscosta1973/poui-specialist
 */
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { ProAppConfigService } from '@totvs/protheus-lib-core';

/**
 * Injeta headers de contexto Protheus em toda requisição HTTP.
 * X-App-Name: identifica o módulo chamador nos logs do backend.
 * Nota: a autenticação Bearer é tratada pela ProAuthInteceptor da lib.
 * Registrar em app.config.ts: provideHttpClient(withInterceptors([{{InterceptorName}}]))
 */
export const {{InterceptorName}}: HttpInterceptorFn = (req, next) => {
  const proConfig = inject(ProAppConfigService);

  if (!proConfig.insideProtheus()) {
    return next(req);
  }

  const appName = proConfig.nameApp || 'poui-app';

  const enrichedReq = req.clone({
    setHeaders: { 'X-App-Name': appName },
  });

  return next(enrichedReq);
};
```

**Registration in `app.config.ts`:**
```typescript
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { {{InterceptorName}} } from './{{moduleName}}/{{kebab-name}}';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(withInterceptors([{{InterceptorName}}])),
    // ... outros providers
  ],
};
```

---

## Template B — Error translation interceptor

**File:** `src/app/{{moduleName}}/{{kebab-name}}.ts`

```typescript
/**
 * @generated  poui-specialist v1.9.0
 * @author     Andre Costa <andre.andrelscosta@gmail.com>
 * @license    Uso permitido · redistribuição proibida sem autorização escrita
 * @see        https://github.com/Alscosta1973/poui-specialist
 */
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { PoNotificationService } from '@po-ui/ng-components';

/**
 * Intercepta erros HTTP e traduz mensagens do Protheus (Latin-1 → UTF-8).
 * Exibe notificação de erro via PoNotificationService.
 * Registrar em app.config.ts: provideHttpClient(withInterceptors([{{InterceptorName}}]))
 */
export const {{InterceptorName}}: HttpInterceptorFn = (req, next) => {
  const notification = inject(PoNotificationService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const msg = parseProtheusError(error);
      notification.error(msg);
      return throwError(() => error);
    }),
  );
};

function parseProtheusError(error: HttpErrorResponse): string {
  try {
    if (error.error?.errorMessage) {
      return decodeProtheusLatin1(error.error.errorMessage);
    }
    if (error.error?.message) {
      return error.error.message;
    }
  } catch {
    // fallback
  }
  return `Erro ${error.status}: ${error.statusText || 'Erro inesperado'}`;
}

function decodeProtheusLatin1(raw: string): string {
  try {
    const bytes = Uint8Array.from(raw.split('').map(c => c.charCodeAt(0)));
    return new TextDecoder('iso-8859-1').decode(bytes);
  } catch {
    return raw;
  }
}
```

**Registration in `app.config.ts`:**
```typescript
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { {{InterceptorName}} } from './{{moduleName}}/{{kebab-name}}';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(withInterceptors([{{InterceptorName}}])),
    // ... outros providers
  ],
};
```

---

## Template C — Loading overlay interceptor

Substitui o uso manual de `isLoading` signal em cada componente por um overlay global.

**File:** `src/app/{{moduleName}}/{{kebab-name}}.ts`

```typescript
/**
 * @generated  poui-specialist v1.9.0
 * @author     Andre Costa <andre.andrelscosta@gmail.com>
 * @license    Uso permitido · redistribuição proibida sem autorização escrita
 * @see        https://github.com/Alscosta1973/poui-specialist
 */
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { LoadingService } from './loading.service'; // gerar com /generate service Loading

export const {{InterceptorName}}: HttpInterceptorFn = (req, next) => {
  const loadingService = inject(LoadingService);

  // Permitir que requisições individuais suprimam o overlay via header
  if (req.headers.has('X-Skip-Loading')) {
    return next(req.clone({ headers: req.headers.delete('X-Skip-Loading') }));
  }

  loadingService.show();
  return next(req).pipe(finalize(() => loadingService.hide()));
};
```

**`loading.service.ts` companion:**
```typescript
import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  readonly isLoading = signal(false);
  private count = 0;

  show(): void { this.count++; this.isLoading.set(true); }
  hide(): void { this.count = Math.max(0, this.count - 1); if (this.count === 0) this.isLoading.set(false); }
}
```

**Registration in `app.config.ts`:**
```typescript
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { {{InterceptorName}} } from './{{moduleName}}/{{kebab-name}}';
import { LoadingService } from './{{moduleName}}/loading.service';

export const appConfig: ApplicationConfig = {
  providers: [
    LoadingService,
    provideHttpClient(withInterceptors([{{InterceptorName}}])),
    // ... outros providers
  ],
};
```

---

## Selection Guide

| Cenário | Template |
|---------|---------|
| Headers de contexto (app name, auditoria) | A — App context |
| Tradução de erros Protheus (Latin-1) | B — Error translation |
| Loading global sem signal por componente | C — Loading overlay |
| Múltiplos interceptors | Combinar em array: `withInterceptors([appContextInterceptor, errorInterceptor])` |

> **Auth Bearer:** não implementar manualmente — a lib `@totvs/protheus-lib-core` injeta o
> token automaticamente via `ProAuthInteceptor`. Registre apenas `ProtheusLibCoreModule` em
> `app.config.ts` e o token será adicionado a todas as requisições dentro do Protheus.
