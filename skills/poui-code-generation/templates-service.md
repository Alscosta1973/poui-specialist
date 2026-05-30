# Template: service

Generates an Angular `Injectable` service consuming Protheus REST API.

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

## models/{{modelFile}}.model.ts

```typescript
export interface {{ModelInterface}} {
  // TODO: add fields matching the Protheus REST response
}
```
