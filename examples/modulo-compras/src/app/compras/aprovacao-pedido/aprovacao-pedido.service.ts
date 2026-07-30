/**
 * @generated  poui-specialist v1.10.0
 * @author     Andre Costa <andre.andrelscosta@gmail.com>
 * @license    Uso permitido · redistribuição proibida sem autorização escrita
 * @see        https://github.com/Alscosta1973/poui-specialist
 */

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AprovacaoPedido, AprovacaoActionResponse } from './aprovacao-pedido.model';

// NOTA: se o projeto já possuir um tipo compartilhado equivalente (ex.: em src/app/shared/),
// substitua esta interface local pela importação do tipo existente para evitar duplicação.
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
export class AprovacaoPedidoService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/custom/v1/aprovacao-pedido';

  getAll(params: GetAllParams = {}): Observable<ProtheusListResponse<AprovacaoPedido>> {
    const httpParams = new HttpParams({ fromObject: this.cleanParams(params) });
    return this.http.get<ProtheusListResponse<AprovacaoPedido>>(this.baseUrl, { params: httpParams });
  }

  aprovar(numero: string): Observable<AprovacaoActionResponse> {
    return this.http.post<AprovacaoActionResponse>(`${this.baseUrl}/${numero}/aprovar`, {});
  }

  rejeitar(numero: string, motivo: string): Observable<AprovacaoActionResponse> {
    return this.http.post<AprovacaoActionResponse>(`${this.baseUrl}/${numero}/rejeitar`, { motivo });
  }

  private cleanParams(params: GetAllParams): Record<string, string> {
    return Object.fromEntries(
      Object.entries(params)
        .filter(([, v]) => v !== null && v !== undefined && v !== '')
        .map(([k, v]) => [k, String(v)])
    );
  }
}
