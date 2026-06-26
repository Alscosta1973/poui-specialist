/**
 * @generated  poui-specialist v1.0
 * @author     Andre Costa <andre.andrelscosta@gmail.com>
 * @license    Uso permitido · redistribuição proibida sem autorização escrita
 * @see        https://github.com/Alscosta1973/poui-specialist
 */
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PedidoAprovacao, ItemPedidoAprovacao } from './aprovacao-pedido/models/aprovacao-pedido.model';

export interface AprovacaoFiltros {
  numero?:    string;
  fornecedor?: string;
  dataDE?:    string;
  dataATE?:   string;
}

@Injectable({ providedIn: 'root' })
export class AprovacaoPedidoService {
  private readonly http    = inject(HttpClient);
  private readonly baseUrl = '/rest/api/custom/v1/aprovacaopedido';

  getAll(filtros: AprovacaoFiltros = {}): Observable<{ items: PedidoAprovacao[]; hasNext: boolean }> {
    const params = new HttpParams({ fromObject: this._clean(filtros as Record<string, unknown>) });
    return this.http.get<{ items: PedidoAprovacao[]; hasNext: boolean }>(this.baseUrl, { params });
  }

  getItens(numero: string): Observable<ItemPedidoAprovacao[]> {
    return this.http.get<ItemPedidoAprovacao[]>(`${this.baseUrl}/${numero}/itens`);
  }

  aprovar(numero: string): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/${numero}/aprovar`, {});
  }

  reprovar(numero: string, motivo: string): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/${numero}/reprovar`, { motivo });
  }

  private _clean(obj: Record<string, unknown>): Record<string, string> {
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([, v]) => v !== null && v !== undefined && v !== '')
        .map(([k, v]) => [k, String(v)])
    );
  }
}
