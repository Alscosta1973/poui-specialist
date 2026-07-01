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

## Template A — Auth token interceptor (Protheus JWT / token)

**File:** `src/app/{{moduleName}}/{{kebab-name}}.ts`

```typescript
/**
 * @generated  poui-specialist v1.6.0
 * @author     Andre Costa <andre.andrelscosta@gmail.com>
 * @license    Uso permitido · redistribuição proibida sem autorização escrita
 * @see        https://github.com/Alscosta1973/poui-specialist
 */
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { ProAppConfigService } from '@totvs/protheus-lib-core';

/**
 * Injeta o token Protheus no header Authorization de toda requisição HTTP.
 * Registrar em app.config.ts: provideHttpClient(withInterceptors([{{InterceptorName}}]))
 */
export const {{InterceptorName}}: HttpInterceptorFn = (req, next) => {
  const proConfig = inject(ProAppConfigService);

  if (!proConfig.insideProtheus()) {
    return next(req);
  }

  const token = proConfig.getTokenAuthorizationBearer?.() ?? '';

  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq);
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
 * @generated  poui-specialist v1.6.0
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

---

## Template C — Loading overlay interceptor

Substitui o uso manual de `isLoading` signal em cada componente por um overlay global.

**File:** `src/app/{{moduleName}}/{{kebab-name}}.ts`

```typescript
/**
 * @generated  poui-specialist v1.6.0
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

---

## Selection Guide

| Cenário | Template |
|---------|---------|
| App Protheus com JWT / token | A — Auth token |
| Tradução de erros Protheus (Latin-1) | B — Error translation |
| Loading global sem signal por componente | C — Loading overlay |
| Múltiplos interceptors | Combinar A + B em array: `withInterceptors([authInterceptor, errorInterceptor])` |
