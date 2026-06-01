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

---

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
  private readonly baseUrl = '/rest/api/custom/v1/clientes';

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

---

## Composite Key Pattern (código + loja)

Most Protheus entities use a composite key: `codigo` (6 chars) + `loja` (2 chars).

```typescript
// Service — composite key in URL path
getByKey(codigo: string, loja: string): Observable<Fornecedor> {
  return this.http.get<Fornecedor>(`${this.baseUrl}/${codigo}/${loja}`);
}

updateByKey(codigo: string, loja: string, data: Partial<Fornecedor>): Observable<Fornecedor> {
  return this.http.put<Fornecedor>(`${this.baseUrl}/${codigo}/${loja}`, data);
}

deleteByKey(codigo: string, loja: string): Observable<void> {
  return this.http.delete<void>(`${this.baseUrl}/${codigo}/${loja}`);
}

// List component — navigate to edit using separate route params
tableActions: PoTableAction[] = [
  {
    label: 'Editar',
    icon: 'po-icon-edit',
    action: (row: Fornecedor) =>
      this.router.navigate([row.codigo, row.loja], { relativeTo: this.route }),
  },
];

// Routes — edit receives both params
{ path: ':codigo/:loja', loadComponent: () => ... }

// Edit component — read composite key from route
ngOnInit(): void {
  const { codigo, loja } = this.route.snapshot.params;
  if (codigo && loja) {
    this.codigo = codigo;
    this.loja = loja;
    this.isEdit.set(true);
    this.loadRecord();
  }
}
```

---

## Protheus Error Handling

Protheus REST does **not** follow a simple `{ message }` error shape. Errors arrive as:

```json
{
  "errorMessage": "{\"code\":\"MA0001\",\"message\":\"Fornecedor j\\u00e1 existe\",\"detailedMessage\":\"\"}"
}
```

The inner string is JSON and the text is URI-encoded. Always use this decoder:

```typescript
// In components that call create/update/delete
private parseProtheusError(err: any): string {
  try {
    const errObj = JSON.parse(err.error?.errorMessage ?? '{}');
    const msg    = decodeURIComponent(escape(errObj.message ?? ''));
    const detail = errObj.detailedMessage
      ? ` — ${decodeURIComponent(escape(errObj.detailedMessage))}`
      : '';
    return `Erro ${errObj.code}: ${msg}${detail}`;
  } catch {
    return err.error?.message ?? 'Erro ao processar a requisição.';
  }
}

// Usage
save(): void {
  this.service.create(this.values)
    .pipe(
      catchError((err) => {
        this.notification.error(this.parseProtheusError(err));
        return EMPTY;
      })
    )
    .subscribe(() => {
      this.notification.success('Salvo com sucesso!');
      this.router.navigate(['..'], { relativeTo: this.route });
    });
}
```

---

## HTTP Status Code Handling

| Status | Meaning | Suggested Action |
|--------|---------|-----------------|
| 400 | Bad request / validation | Show decoded Protheus error message |
| 401 | Unauthorized | Redirect to login (handle in interceptor) |
| 403 | Forbidden | Show "Sem permissão" message |
| 404 | Not found | Show "Registro não encontrado" and navigate back |
| 409 | Conflict / duplicate | Show specific conflict message |
| 500 | Server error | Show generic "Erro interno" message |

---

## Proxy Configuration (proxy.conf.json)

For local development, proxy `/rest` to the Protheus AppServer so CORS is avoided:

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

Add to `package.json` start script:
```json
"start": "ng serve --proxy-config proxy.conf.json"
```

---

## Environment-Based Base URL

```typescript
// src/environments/environment.ts
export const environment = {
  production: false,
  apiBaseUrl: '/rest',
};

// src/environments/environment.prod.ts
export const environment = {
  production: true,
  apiBaseUrl: '/rest',
};

// In service — use environment to build URL
private readonly baseUrl = `${environment.apiBaseUrl}/api/custom/v1/clientes`;
```
