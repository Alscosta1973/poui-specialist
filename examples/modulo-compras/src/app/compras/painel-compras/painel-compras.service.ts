/**
 * @generated  poui-specialist v1.10.0
 * @author     Andre Costa <andre.andrelscosta@gmail.com>
 * @license    Uso permitido · redistribuição proibida sem autorização escrita
 * @see        https://github.com/Alscosta1973/poui-specialist
 */
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { PoChartSerie } from '@po-ui/ng-components';
import { Observable, forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Pedido {
  numero: string;
  fornecedor: string;
  valorTotal: number;
  status: string;
  dataEmissao: string;
}

export interface Solicitacao {
  numero: string;
  status: string;
  solicitante: string;
  dataSolicitacao: string;
}

export interface Fornecedor {
  codigo: string;
  razaoSocial: string;
  ativo: boolean;
}

export interface ProtheusListResponse<T> {
  items: T[];
  hasNext: boolean;
}

export interface PainelComprasDashboardData {
  totalPedidosAbertos: number;
  totalSolicitacoesPendentes: number;
  valorTotalPedidos: number;
  fornecedoresAtivos: number;
  statusCategories: string[];
  statusSeries: PoChartSerie[];
}

@Injectable({ providedIn: 'root' })
export class PainelComprasService {
  private readonly http = inject(HttpClient);

  private readonly pedidosUrl = '/api/custom/v1/pedidos';
  private readonly solicitacoesUrl = '/api/custom/v1/solicitacoes';
  private readonly fornecedoresUrl = '/api/custom/v1/fornecedores';

  getDashboardData(): Observable<PainelComprasDashboardData> {
    return forkJoin({
      pedidos: this.http.get<ProtheusListResponse<Pedido>>(this.pedidosUrl),
      solicitacoes: this.http.get<ProtheusListResponse<Solicitacao>>(this.solicitacoesUrl),
      fornecedores: this.http.get<ProtheusListResponse<Fornecedor>>(this.fornecedoresUrl),
    }).pipe(
      map(({ pedidos, solicitacoes, fornecedores }) =>
        this.buildDashboardData(pedidos.items, solicitacoes.items, fornecedores.items),
      ),
    );
  }

  private buildDashboardData(
    pedidos: Pedido[],
    solicitacoes: Solicitacao[],
    fornecedores: Fornecedor[],
  ): PainelComprasDashboardData {
    const statusMap = new Map<string, number>();
    pedidos.forEach(pedido => {
      statusMap.set(pedido.status, (statusMap.get(pedido.status) ?? 0) + 1);
    });

    return {
      totalPedidosAbertos: pedidos.filter(pedido => pedido.status === 'Aberto').length,
      totalSolicitacoesPendentes: solicitacoes.filter(
        solicitacao => solicitacao.status === 'Pendente',
      ).length,
      valorTotalPedidos: pedidos.reduce(
        (acumulado, pedido) => acumulado + (pedido.valorTotal ?? 0),
        0,
      ),
      fornecedoresAtivos: fornecedores.filter(fornecedor => fornecedor.ativo).length,
      statusCategories: Array.from(statusMap.keys()),
      statusSeries: [{ label: 'Pedidos por status', data: Array.from(statusMap.values()) }],
    };
  }
}
