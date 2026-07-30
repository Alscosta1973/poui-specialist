/**
 * @generated  poui-specialist v1.10.0
 * @author     Andre Costa <andre.andrelscosta@gmail.com>
 * @license    Uso permitido · redistribuição proibida sem autorização escrita
 * @see        https://github.com/Alscosta1973/poui-specialist
 */

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PedidoCompraItem } from './models/pedido-compra.model';

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

// Rota consistente com WSRESTFUL PedidosAPI (backend/compras/pedidos.tlpp).
// WSSYNTAX é fixo "/api/custom/v1/pedidos" (sem segmento {id}) — a chave
// composta numero+item é sempre recebida via WSRECEIVE numero, item, ou seja,
// via query string, inclusive em GET de registro único, PUT e DELETE.
@Injectable({ providedIn: 'root' })
export class PedidoCompraService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/custom/v1/pedidos';

  // Lista paginada de linhas achatadas (uma por item C7_NUM+C7_ITEM).
  // O componente agrupa o resultado por 'numero' para montar o browse master.
  // Busca rápida (q) filtra por C7_PRODUTO no backend — ver _PedLista.
  getAll(params: GetAllParams = {}): Observable<ProtheusListResponse<PedidoCompraItem>> {
    const httpParams = new HttpParams({ fromObject: this.cleanParams(params) });
    return this.http.get<ProtheusListResponse<PedidoCompraItem>>(this.baseUrl, { params: httpParams });
  }

  // Consulta uma linha específica pela chave composta (query string, não path) — ver _PedCons
  getByKey(numero: string, item: string): Observable<PedidoCompraItem> {
    const httpParams = new HttpParams({ fromObject: { numero, item } });
    return this.http.get<PedidoCompraItem>(this.baseUrl, { params: httpParams });
  }

  create(data: Partial<PedidoCompraItem>): Observable<PedidoCompraItem> {
    return this.http.post<PedidoCompraItem>(this.baseUrl, data);
  }

  // PUT também recebe numero+item via query string — ver _PedAlt
  update(numero: string, item: string, data: Partial<PedidoCompraItem>): Observable<PedidoCompraItem> {
    const httpParams = new HttpParams({ fromObject: { numero, item } });
    return this.http.put<PedidoCompraItem>(this.baseUrl, data, { params: httpParams });
  }

  // DELETE também recebe numero+item via query string — ver _PedExc
  delete(numero: string, item: string): Observable<void> {
    const httpParams = new HttpParams({ fromObject: { numero, item } });
    return this.http.delete<void>(this.baseUrl, { params: httpParams });
  }

  private cleanParams(params: GetAllParams): Record<string, string> {
    return Object.fromEntries(
      Object.entries(params)
        .filter(([, v]) => v !== null && v !== undefined && v !== '')
        .map(([k, v]) => [k, String(v)])
    );
  }
}
