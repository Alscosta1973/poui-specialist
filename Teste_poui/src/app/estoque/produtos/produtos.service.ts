import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Produto } from './models/produto.model';

export interface ProtheusListResponse<T> {
  items: T[];
  hasNext: boolean;
}

export interface GetProdutosParams {
  page?: number;
  pageSize?: number;
  q?: string;
  [key: string]: unknown;
}

@Injectable({ providedIn: 'root' })
export class ProdutosService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/rest/api/treinamento/v1/servicoProdutos';

  getAll(params: GetProdutosParams = {}): Observable<ProtheusListResponse<Produto>> {
    const httpParams = new HttpParams({ fromObject: this.cleanParams(params) });
    return this.http.get<ProtheusListResponse<Produto>>(this.baseUrl, { params: httpParams });
  }

  getById(codigo: string): Observable<Produto> {
    return this.http.get<Produto>(`${this.baseUrl}/${codigo}`);
  }

  create(data: Partial<Produto>): Observable<Produto> {
    return this.http.post<Produto>(this.baseUrl, data);
  }

  update(codigo: string, data: Partial<Produto>): Observable<Produto> {
    return this.http.put<Produto>(`${this.baseUrl}/${codigo}`, data);
  }

  delete(codigo: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${codigo}`);
  }

  private cleanParams(params: Record<string, unknown>): Record<string, string> {
    return Object.fromEntries(
      Object.entries(params)
        .filter(([, v]) => v !== null && v !== undefined && v !== '')
        .map(([k, v]) => [k, String(v)])
    );
  }
}
