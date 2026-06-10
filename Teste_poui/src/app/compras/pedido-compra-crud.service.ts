/**
 * @generated  poui-specialist v1.0
 * @author     Andre Costa <andre.andrelscosta@gmail.com>
 * @license    Uso permitido · redistribuição proibida sem autorização escrita
 * @see        https://github.com/Alscosta1973/poui-specialist
 */
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PedidoCompraItem, PedidoCompraForm } from './models/pedido-compra-crud.model';

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
export class PedidoCompraCrudService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/rest/api/custom/v1/pedidocompra';

  /** Lista pedidos com paginação e filtro opcional. */
  getAll(params: GetAllParams = {}): Observable<ProtheusListResponse<PedidoCompraItem>> {
    const httpParams = new HttpParams({ fromObject: this.cleanParams(params) });
    return this.http.get<ProtheusListResponse<PedidoCompraItem>>(this.baseUrl, { params: httpParams });
  }

  /** Retorna um pedido pelo número. */
  getById(numero: string): Observable<PedidoCompraItem> {
    return this.http.get<PedidoCompraItem>(`${this.baseUrl}/${numero}`);
  }

  /** Cria um novo pedido. O número é gerado pelo backend. */
  create(data: Partial<PedidoCompraForm>): Observable<PedidoCompraItem> {
    return this.http.post<PedidoCompraItem>(this.baseUrl, data);
  }

  /** Atualiza os dados de um pedido existente. */
  update(numero: string, data: Partial<PedidoCompraForm>): Observable<PedidoCompraItem> {
    return this.http.put<PedidoCompraItem>(`${this.baseUrl}/${numero}`, data);
  }

  /** Cancela um pedido (DELETE semântico — Protheus não remove fisicamente). */
  cancel(numero: string): Observable<void> {
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
