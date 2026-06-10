/**
 * @generated  poui-specialist v1.0
 * @author     Andre Costa <andre.andrelscosta@gmail.com>
 * @license    Uso permitido · redistribuição proibida sem autorização escrita
 * @see        https://github.com/Alscosta1973/poui-specialist
 */
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PedidoCompra } from './pedido-compra/models/pedido-compra.model';

export interface ProtheusListResponse<T> {
  items:        T[];
  hasNext:      boolean;
  po_sync_date?: string;
}

export interface GetAllParams {
  page?:     number;
  pageSize?: number;
  q?:        string;
  order?:    string;
  [key: string]: unknown;
}

@Injectable({ providedIn: 'root' })
export class PedidoCompraService {
  private readonly http    = inject(HttpClient);
  private readonly baseUrl = '/rest/api/custom/v1/pedidocompra';

  getAll(params: GetAllParams = {}): Observable<ProtheusListResponse<PedidoCompra>> {
    const httpParams = new HttpParams({ fromObject: this.cleanParams(params) });
    return this.http.get<ProtheusListResponse<PedidoCompra>>(this.baseUrl, { params: httpParams });
  }

  getById(id: string): Observable<PedidoCompra> {
    return this.http.get<PedidoCompra>(`${this.baseUrl}/${id}`);
  }

  create(data: Partial<PedidoCompra>): Observable<PedidoCompra> {
    return this.http.post<PedidoCompra>(this.baseUrl, data);
  }

  update(id: string, data: Partial<PedidoCompra>): Observable<PedidoCompra> {
    return this.http.put<PedidoCompra>(`${this.baseUrl}/${id}`, data);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  /** Cancela o pedido de compra pelo número (C7_NUM). */
  cancel(numero: string): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/${numero}/cancelar`, {});
  }

  private cleanParams(params: GetAllParams): Record<string, string> {
    return Object.fromEntries(
      Object.entries(params)
        .filter(([, v]) => v !== null && v !== undefined && v !== '')
        .map(([k, v]) => [k, String(v)])
    );
  }
}
