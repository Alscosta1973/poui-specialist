# Protheus REST Integration Patterns

## Standard Response Contract

```typescript
interface ProtheusListResponse<T> {
  items: T[];
  hasNext: boolean;
  po_sync_date?: string;
}
```

## Standard Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | `number` | Page number (starts at 1) |
| `pageSize` | `number` | Items per page (default: 10, max: 50) |
| `q` | `string` | Quick search across all text fields |
| `order` | `string` | Sort field, prefix with `-` for descending (e.g., `-nome`) |

## Generic Service Pattern

```typescript
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ProtheusListResponse<T> {
  items: T[];
  hasNext: boolean;
}

export interface GetAllParams {
  page?: number;
  pageSize?: number;
  q?: string;
  order?: string;
  [key: string]: unknown;
}

@Injectable({ providedIn: 'root' })
export class ClientesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/custom/v1/clientes';

  getAll(params: GetAllParams = {}): Observable<ProtheusListResponse<Cliente>> {
    const httpParams = new HttpParams({ fromObject: this.cleanParams(params) });
    return this.http.get<ProtheusListResponse<Cliente>>(this.baseUrl, { params: httpParams });
  }

  getById(id: string): Observable<Cliente> {
    return this.http.get<Cliente>(`${this.baseUrl}/${id}`);
  }

  create(data: Partial<Cliente>): Observable<Cliente> {
    return this.http.post<Cliente>(this.baseUrl, data);
  }

  update(id: string, data: Partial<Cliente>): Observable<Cliente> {
    return this.http.put<Cliente>(`${this.baseUrl}/${id}`, data);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  private cleanParams(params: GetAllParams): Record<string, string> {
    return Object.fromEntries(
      Object.entries(params)
        .filter(([, v]) => v !== null && v !== undefined && v !== '')
        .map(([k, v]) => [k, String(v)])
    );
  }
}
```

## Error Handling with PoNotificationService

```typescript
import { PoNotificationService } from '@po-ui/ng-components';
import { catchError, EMPTY } from 'rxjs';

private readonly notification = inject(PoNotificationService);

save(): void {
  this.service.create(this.form.value)
    .pipe(
      catchError((err) => {
        const msg = err.error?.message ?? 'Erro ao salvar. Tente novamente.';
        this.notification.error(msg);
        return EMPTY;
      })
    )
    .subscribe(() => {
      this.notification.success('Salvo com sucesso!');
      this.router.navigate(['..']);
    });
}
```

## HTTP Status Code Handling

| Status | Meaning | Suggested Action |
|--------|---------|-----------------|
| 400 | Bad request / validation | Show `err.error.message` to user |
| 401 | Unauthorized | Redirect to login (handle in interceptor) |
| 403 | Forbidden | Show "Sem permissão" message |
| 404 | Not found | Show "Registro não encontrado" and navigate back |
| 409 | Conflict / duplicate | Show specific conflict message |
| 500 | Server error | Show generic "Erro interno" message |

## Environment-Based Base URL

```typescript
// src/environments/environment.ts
export const environment = {
  apiBaseUrl: '/api',
};

// src/environments/environment.prod.ts
export const environment = {
  apiBaseUrl: 'https://protheus.company.com/api',
};

// In service:
private readonly baseUrl = `${environment.apiBaseUrl}/custom/v1/clientes`;
```

## Proxy Configuration (proxy.conf.json)

```json
{
  "/api": {
    "target": "http://localhost:8080",
    "secure": false,
    "changeOrigin": true,
    "logLevel": "debug"
  }
}
```
