export type StatusConciliacao = '1' | '2' | '3' | '4' | '5' | '6';

export interface MovimentoAdquirente {
  id: string;
  dtPagamento: string;  // yyyy-MM-dd
  titulo: string;
  numPedido: string;
  numParcela: string;
  vlBruto: number;
  vlTaxa: number;
  vlLiquido: number;
  status: StatusConciliacao;
  lote: string;
}

export interface ContaReceber {
  id: string;
  pedido: string;
  emissao: string;      // yyyy-MM-dd
  numTitulo: string;
  parcela: string;
  valor: number;
  vlTaxa: number;
  prefixo: string;
  vlLiquido: number;
  status: StatusConciliacao;
}

export interface ConfirmarConciliacaoRequest {
  banco: string;
  agencia: string;
  conta: string;
  movimentoId: string;
  tituloId: string;
}
