/**
 * @generated  poui-specialist v1.10.0
 * @author     Andre Costa <andre.andrelscosta@gmail.com>
 * @license    Uso permitido · redistribuição proibida sem autorização escrita
 * @see        https://github.com/Alscosta1973/poui-specialist
 */

// Linha achatada retornada por GET /api/custom/v1/pedidos (WSRESTFUL PedidosAPI,
// backend/compras/pedidos.tlpp). Chave composta: numero + item (C7_NUM + C7_ITEM).
export interface PedidoCompraItem {
  numero: string;
  item: string;
  produto: string;
  quantidade: number;
  preco: number;
  fornecedor: string;
  loja: string;
  emissao: string; // formato yyyyMMdd (DtoS do Protheus) — ver _PedRow em pedidos.tlpp
}

// Linha do browse de detalhe — item do pedido com o valor total calculado
// (quantidade * preco) para exibição, já que o backend não retorna esse campo.
export interface PedidoCompraItemDetail extends PedidoCompraItem {
  valorTotal: number;
}

// Cabeçalho do pedido — agregado client-side a partir de PedidoCompraItem
// agrupado por 'numero', pois o backend não expõe um endpoint de cabeçalho
// separado (SC7 é lida sempre no nível de item em _PedLista/_PedCons).
export interface PedidoCompra {
  numero: string;
  fornecedor: string;
  loja: string;
  emissao: string; // ISO 'yyyy-MM-dd' — convertido de PedidoCompraItem.emissao (yyyyMMdd)
  qtdItens: number;
  valorTotal: number;
}
