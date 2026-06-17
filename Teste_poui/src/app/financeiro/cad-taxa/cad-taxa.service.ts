/**
 * @generated  poui-specialist v1.3
 * @author     Andre Costa <andre.andrelscosta@gmail.com>
 * @license    Uso permitido · redistribuição proibida sem autorização escrita
 * @see        https://github.com/Alscosta1973/poui-specialist
 */

import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TaxaCartao } from './models/taxa-cartao.model';

export interface TaxaCartaoPage {
  items: TaxaCartao[];
  hasNext: boolean;
}

@Injectable({ providedIn: 'root' })
export class CadTaxaService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/financeiro/cad-taxa';

  getAll(params: { page: number; pageSize: number; q: string }): Observable<TaxaCartaoPage> {
    const httpParams = new HttpParams()
      .set('page', params.page)
      .set('pageSize', params.pageSize)
      .set('q', params.q);
    return this.http.get<TaxaCartaoPage>(this.baseUrl, { params: httpParams });
  }

  create(data: Partial<TaxaCartao>): Observable<TaxaCartao> {
    return this.http.post<TaxaCartao>(this.baseUrl, data);
  }

  update(id: string, data: Partial<TaxaCartao>): Observable<TaxaCartao> {
    return this.http.put<TaxaCartao>(`${this.baseUrl}/${id}`, data);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
