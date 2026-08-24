/**
 * @generated  poui-specialist v1.16.2
 * @author     Andre Costa <andre.andrelscosta@gmail.com>
 * @license    Uso permitido · redistribuição proibida sem autorização escrita
 * @see        https://github.com/Alscosta1973/poui-specialist
 * @node       not detected (>=18.19 required)
 * @angular    ^21.2.0 (17-21+ supported)
 */

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Fornecedor } from './models/fornecedor.model';

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
export class FornecedoresService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/rest/api/custom/v1/fornecedores';

  getAll(params: GetAllParams = {}): Observable<ProtheusListResponse<Fornecedor>> {
    const httpParams = new HttpParams({ fromObject: this.cleanParams(params) });
    return this.http.get<ProtheusListResponse<Fornecedor>>(this.baseUrl, { params: httpParams });
  }

  getById(id: string): Observable<Fornecedor> {
    return this.http.get<Fornecedor>(`${this.baseUrl}/${id}`);
  }

  create(data: Partial<Fornecedor>): Observable<Fornecedor> {
    return this.http.post<Fornecedor>(this.baseUrl, data);
  }

  update(id: string, data: Partial<Fornecedor>): Observable<Fornecedor> {
    return this.http.put<Fornecedor>(`${this.baseUrl}/${id}`, data);
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
