/**
 * @generated  poui-specialist v1.0
 * @author     Andre Costa <andre.andrelscosta@gmail.com>
 * @license    Uso permitido · redistribuição proibida sem autorização escrita
 * @see        https://github.com/Alscosta1973/poui-specialist
 */
import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PedidoCompraMaster, ItemCompra } from './models/pedido-compra-stacked.model';

export interface PedidoCompraFiltros {
  campo1?:  string; // Nº Pedido
  campo2?:  string; // Fornecedor
  dataDE?:  string; // Emissão De (ISO)
  dataATE?: string; // Emissão Até (ISO)
}

export interface ProtheusPageResponse<T> {
  items:   T[];
  hasNext: boolean;
}

@Injectable({ providedIn: 'root' })
export class PedidoCompraStackedService {
  private readonly http    = inject(HttpClient);
  private readonly baseUrl = '/rest/api/custom/v1/pedidoscompra';

  buscar(filtros: PedidoCompraFiltros): Observable<ProtheusPageResponse<PedidoCompraMaster>> {
    let params = new HttpParams();
    if (filtros.campo1?.trim())  params = params.set('numero',    filtros.campo1.trim());
    if (filtros.campo2?.trim())  params = params.set('fornecedor', filtros.campo2.trim());
    if (filtros.dataDE?.trim())  params = params.set('dataDE',    filtros.dataDE.trim());
    if (filtros.dataATE?.trim()) params = params.set('dataATE',   filtros.dataATE.trim());
    return this.http.get<ProtheusPageResponse<PedidoCompraMaster>>(this.baseUrl, { params });
  }

  getItens(numero: string): Observable<ItemCompra[]> {
    return this.http.get<ItemCompra[]>(`${this.baseUrl}/${numero}/itens`);
  }

  aprovarItens(numero: string, itens: ItemCompra[]): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${numero}/aprovar`, { itens });
  }
}
