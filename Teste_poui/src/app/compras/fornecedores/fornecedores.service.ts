import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Fornecedor } from './models/fornecedor.model';

export interface ProtheusListResponse<T> {
  items: T[];
  hasNext: boolean;
  po_sync_date?: string;
}

export interface GetFornecedoresParams {
  page?: number;
  pageSize?: number;
  q?: string;
  order?: string;
}

@Injectable({ providedIn: 'root' })
export class FornecedoresService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/rest/api/crm/v1/customerVendor';
  // type: 1=cliente, 2=fornecedor, 3=ambos
  private readonly supplierType = '2';

  getAll(params: GetFornecedoresParams = {}): Observable<ProtheusListResponse<Fornecedor>> {
    const httpParams = new HttpParams({
      fromObject: this.cleanParams({ ...params, type: this.supplierType }),
    });
    return this.http.get<ProtheusListResponse<Fornecedor>>(this.baseUrl, { params: httpParams });
  }

  // Protheus uses concatenated key: code (6) + storeId (2)
  getById(code: string, storeId: string): Observable<Fornecedor> {
    return this.http.get<Fornecedor>(
      `${this.baseUrl}/${this.supplierType}/${code}${storeId}`
    );
  }

  create(data: Partial<Fornecedor>): Observable<Fornecedor> {
    return this.http.post<Fornecedor>(this.baseUrl, data);
  }

  update(code: string, storeId: string, data: Partial<Fornecedor>): Observable<Fornecedor> {
    return this.http.put<Fornecedor>(
      `${this.baseUrl}/${this.supplierType}/${code}${storeId}`,
      data
    );
  }

  delete(code: string, storeId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/${this.supplierType}/${code}${storeId}`
    );
  }

  private cleanParams(params: Record<string, unknown>): Record<string, string> {
    return Object.fromEntries(
      Object.entries(params)
        .filter(([, v]) => v !== null && v !== undefined && v !== '')
        .map(([k, v]) => [k, String(v)])
    );
  }
}
