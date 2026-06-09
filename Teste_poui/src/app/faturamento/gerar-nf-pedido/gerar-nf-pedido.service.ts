/**
 * @generated  poui-specialist v1.0
 * @author     Andre Costa <andre.andrelscosta@gmail.com>
 * @license    Uso permitido · redistribuição proibida sem autorização escrita
 * @see        https://github.com/Alscosta1973/poui-specialist
 */
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { FiltrosPedido, GerarNfRequest, ItemPedidoSC6, PedidoSC5 } from './gerar-nf-pedido.model';

@Injectable({ providedIn: 'root' })
export class GerarNfPedidoService {
  private readonly http = inject(HttpClient);
  private readonly base = '/rest/api/faturamento/v1';

  buscarPedidos(filtros: Partial<FiltrosPedido>): Observable<PedidoSC5[]> {
    let params = new HttpParams();
    if (filtros.numPedido)      params = params.set('numPedido',      filtros.numPedido);
    if (filtros.codCliente)     params = params.set('codCliente',     filtros.codCliente);
    if (filtros.dataEmissaoDe)  params = params.set('dataEmissaoDe',  filtros.dataEmissaoDe);
    if (filtros.dataEmissaoAte) params = params.set('dataEmissaoAte', filtros.dataEmissaoAte);
    return this.http
      .get<{ items: PedidoSC5[] }>(`${this.base}/pedidos`, { params })
      .pipe(map(r => r.items));
  }

  buscarItens(numPedido: string): Observable<ItemPedidoSC6[]> {
    return this.http
      .get<{ items: ItemPedidoSC6[] }>(`${this.base}/pedidos/${numPedido}/itens`)
      .pipe(map(r => r.items));
  }

  gerarNf(request: GerarNfRequest): Observable<void> {
    return this.http.post<void>(`${this.base}/gerar-nf`, request);
  }
}
