/**
 * @generated  poui-specialist v1.10.0
 * @author     Andre Costa <andre.andrelscosta@gmail.com>
 * @license    Uso permitido · redistribuição proibida sem autorização escrita
 * @see        https://github.com/Alscosta1973/poui-specialist
 */

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SolicitacaoCompra } from './models/solicitacao-compra.model';

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

// Rota consistente com WSRESTFUL SolicitacoesAPI (backend/compras/solicitacoes.tlpp)
@Injectable({ providedIn: 'root' })
export class SolicitacaoCompraService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/custom/v1/solicitacoes';

  getAll(params: GetAllParams = {}): Observable<ProtheusListResponse<SolicitacaoCompra>> {
    const httpParams = new HttpParams({ fromObject: this.cleanParams(params) });
    return this.http.get<ProtheusListResponse<SolicitacaoCompra>>(this.baseUrl, { params: httpParams });
  }

  // ::id do WSRESTFUL mapeia para C1_NUM (numero)
  getById(numero: string): Observable<SolicitacaoCompra> {
    return this.http.get<SolicitacaoCompra>(`${this.baseUrl}/${numero}`);
  }

  create(data: Partial<SolicitacaoCompra>): Observable<SolicitacaoCompra> {
    return this.http.post<SolicitacaoCompra>(this.baseUrl, data);
  }

  update(numero: string, data: Partial<SolicitacaoCompra>): Observable<SolicitacaoCompra> {
    return this.http.put<SolicitacaoCompra>(`${this.baseUrl}/${numero}`, data);
  }

  delete(numero: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${numero}`);
  }

  private cleanParams(params: GetAllParams): Record<string, string> {
    return Object.fromEntries(
      Object.entries(params)
        .filter(([, v]) => v !== null && v !== undefined && v !== '')
        .map(([k, v]) => [k, String(v)])
    );
  }
}
