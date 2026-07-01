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
export class PedidosService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/rest/api/custom/v1/pedidos';

  getAll(params: GetAllParams = {}): Observable<ProtheusListResponse<Pedido>> {
    const httpParams = new HttpParams({ fromObject: this.cleanParams(params) });
    return this.http.get<ProtheusListResponse<Pedido>>(this.baseUrl, { params: httpParams });
  }

  getById(id: string): Observable<Pedido> {
    return this.http.get<Pedido>(`${this.baseUrl}/${id}`);
  }

  create(data: Partial<Pedido>): Observable<Pedido> {
    return this.http.post<Pedido>(this.baseUrl, data);
  }

  update(id: string, data: Partial<Pedido>): Observable<Pedido> {
    return this.http.put<Pedido>(`${this.baseUrl}/${id}`, data);
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
getByKey(codigo: string, loja: string): Observable<Parceiro> {
  return this.http.get<Parceiro>(`${this.baseUrl}/${codigo}/${loja}`);
}

updateByKey(codigo: string, loja: string, data: Partial<Parceiro>): Observable<Parceiro> {
  return this.http.put<Parceiro>(`${this.baseUrl}/${codigo}/${loja}`, data);
}

deleteByKey(codigo: string, loja: string): Observable<void> {
  return this.http.delete<void>(`${this.baseUrl}/${codigo}/${loja}`);
}

// List component — navigate to edit using separate route params
tableActions: PoTableAction[] = [
  {
    label: 'Editar',
    icon: 'po-icon-edit',
    action: (row: Parceiro) =>
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
  "errorMessage": "{\"code\":\"MA0001\",\"message\":\"Registro j\\u00e1 existe\",\"detailedMessage\":\"\"}"
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

## Estratégias de Paginação

### Offset Pagination (padrão atual — page/pageSize)

```
GET /rest/api/custom/v1/pedidos?page=2&pageSize=10
```

| Vantagem | Desvantagem |
|----------|-------------|
| Simples — TOTVS REST Framework suporta nativamente | Dados dinâmicos: insert no meio desloca itens entre páginas |
| `page` intuitivo para o usuário | Ineficiente em tabelas grandes (SQL usa OFFSET que varre todas as linhas anteriores) |
| Compatível com po-table `show-more` padrão | Duplicatas ou itens pulados quando dados mudam entre requests |

**Quando usar:** a maioria dos cenários ERP — listas de pedidos, clientes, produtos. Dados estáticos ou com baixa taxa de inserção simultânea.

---

### Cursor Pagination (keyset — para grandes datasets)

O servidor retorna um `cursor` opaco na resposta. O cliente envia `cursor=<token>` em vez de `page=N` nas requisições seguintes.

**Contrato esperado do backend Protheus:**

```json
// GET /rest/api/custom/v1/logs?pageSize=50
{
  "items": [ ... ],
  "hasNext": true,
  "cursor": "eyJpZCI6MTAwMH0="
}

// Próxima página — sem page=2, com cursor
// GET /rest/api/custom/v1/logs?pageSize=50&cursor=eyJpZCI6MTAwMH0=
{
  "items": [ ... ],
  "hasNext": false,
  "cursor": null
}
```

O cursor é gerado pelo backend — pode ser um ID codificado em Base64, timestamp, ou hash. O frontend trata como string opaca.

**Interface TypeScript:**

```typescript
export interface ProtheusListResponse<T> {
  items: T[];
  hasNext: boolean;
  cursor?: string | null;   // presente em cursor pagination
  po_sync_date?: string;
}
```

**Service com suporte a ambos os modos:**

```typescript
export interface GetAllParams {
  // Offset mode
  page?: number;
  pageSize?: number;
  // Cursor mode (mutuamente exclusivo com page)
  cursor?: string;
  // Compartilhados
  q?: string;
  order?: string;
  [key: string]: unknown;
}

@Injectable({ providedIn: 'root' })
export class LogsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/rest/api/custom/v1/logs';

  getAll(params: GetAllParams = {}): Observable<ProtheusListResponse<Log>> {
    // Se cursor fornecido, omitir page (mutuamente exclusivos)
    const cleanedParams = { ...params };
    if (cleanedParams.cursor) {
      delete cleanedParams.page;
    }
    const httpParams = new HttpParams({ fromObject: this.cleanParams(cleanedParams) });
    return this.http.get<ProtheusListResponse<Log>>(this.baseUrl, { params: httpParams });
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

**Componente com cursor pagination:**

```typescript
@Component({ standalone: true, changeDetection: ChangeDetectionStrategy.OnPush })
export class LogsComponent implements OnInit, AfterViewInit {
  private readonly service  = inject(LogsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly items   = signal<Log[]>([]);
  readonly loading = signal(false);
  readonly hasNext = signal(false);

  private currentCursor: string | null = null;
  private lastSearch = '';

  ngOnInit(): void { this.load(); }
  ngAfterViewInit(): void { setTimeout(() => this.cdr.detectChanges()); }

  onShowMore(): void {
    if (!this.currentCursor) return;
    this.loading.set(true);
    this.service
      .getAll({ cursor: this.currentCursor, pageSize: 50, q: this.lastSearch })
      .pipe(finalize(() => this.loading.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          this.items.update(prev => [...prev, ...res.items]);
          this.hasNext.set(res.hasNext);
          this.currentCursor = res.cursor ?? null;
        },
        error: () => this.notification.error('Erro ao carregar mais registros.'),
      });
  }

  private load(q = ''): void {
    this.lastSearch = q;
    this.currentCursor = null;   // reset cursor ao recarregar
    this.loading.set(true);
    this.service
      .getAll({ pageSize: 50, q })
      .pipe(finalize(() => this.loading.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          this.items.set(res.items);
          this.hasNext.set(res.hasNext);
          this.currentCursor = res.cursor ?? null;
        },
        error: () => this.notification.error('Erro ao carregar registros.'),
      });
  }
}
```

| Vantagem | Desvantagem |
|----------|-------------|
| Estável com dados dinâmicos — insert não desloca itens | Requer implementação adicional no backend ADVPL |
| Eficiente em tabelas grandes (usa índice, sem OFFSET) | Não permite saltar para página arbitrária (ex: ir direto p/ pág 5) |
| Sem duplicatas entre páginas | Cursor expira se sessão REST reinicia no Protheus |

**Quando usar:** logs de auditoria, tabelas com milhões de linhas, dados com alta taxa de inserção (filas, eventos), `po-infinite-scroll` custom.

**Como negociar com o backend:** pedir ao desenvolvedor ADVPL que adicione campo `cursor` na resposta (Base64 do último ID ou timestamp retornado). No frontend, basta passar `cursor=<token>` em vez de `page=N`.

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
private readonly baseUrl = `${environment.apiBaseUrl}/api/custom/v1/pedidos`;
```
