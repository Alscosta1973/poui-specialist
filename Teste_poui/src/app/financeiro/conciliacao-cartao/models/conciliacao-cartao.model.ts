export type StatusConciliacao = '1' | '2' | '3' | '4' | '5' | '6';

export interface MovimentoAdquirente {
  id: string;
  dtPagamento: string;  // yyyy-MM-dd
  titulo: string;       // TT_TITULO — numTitulo do SE1 vinculado; vazio quando não conciliado
  numPedido: string;
  numParcela: string;
  vlBruto: number;
  vlTaxa: number;
  vlLiquido: number;
  status: StatusConciliacao;
  lote: string;
  $selected?: boolean;  // propriedade injetada pelo po-table para controle de marcação
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
  $selected?: boolean;  // propriedade injetada pelo po-table para controle de marcação
}

export interface ConfirmarConciliacaoRequest {
  banco: string;
  agencia: string;
  conta: string;
  movimentoId: string;
  tituloId: string;
}
