# Template: service

Gera um service Angular `Injectable` que consome a API REST do Protheus, incluindo o helper padrão de decodificação de erros do Protheus.

## {{serviceFile}}.ts

```typescript
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { {{ModelInterface}} } from './models/{{modelFile}}.model';

export interface ProtheusListResponse<T> {
  items: T[];
  hasNext: boolean;
  po_sync_date?: string;
}

export interface GetAllParams {
  page?: number;
  pageSize?: number;
  q?: string;
  order?: string;
  [key: string]: unknown;
}

@Injectable({ providedIn: 'root' })
export class {{ServiceClass}} {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '{{apiPath}}';

  getAll(params: GetAllParams = {}): Observable<ProtheusListResponse<{{ModelInterface}}>> {
    const httpParams = new HttpParams({ fromObject: this.cleanParams(params) });
    return this.http.get<ProtheusListResponse<{{ModelInterface}}>>(this.baseUrl, { params: httpParams });
  }

  getById(id: string): Observable<{{ModelInterface}}> {
    return this.http.get<{{ModelInterface}}>(`${this.baseUrl}/${id}`);
  }

  create(data: Partial<{{ModelInterface}}>): Observable<{{ModelInterface}}> {
    return this.http.post<{{ModelInterface}}>(this.baseUrl, data);
  }

  update(id: string, data: Partial<{{ModelInterface}}>): Observable<{{ModelInterface}}> {
    return this.http.put<{{ModelInterface}}>(`${this.baseUrl}/${id}`, data);
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

## models/{{modelFile}}.model.ts

```typescript
export interface {{ModelInterface}} {
  // TODO: adicione os campos correspondentes à resposta REST do Protheus
}
```

---

## Formato de erro Protheus

O REST do Protheus retorna erros em um formato específico que requer decodificação. Sempre use `parseProtheusError` nos componentes:

```typescript
// Copie este helper em qualquer componente que realize operações de escrita (salvar/excluir)
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
```

Uso no `catchError`:
```typescript
.pipe(
  catchError((err) => {
    this.notification.error(this.parseProtheusError(err));
    return EMPTY;
  })
)
```
