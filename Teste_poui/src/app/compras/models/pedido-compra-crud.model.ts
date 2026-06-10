/**
 * @generated  poui-specialist v1.0
 * @author     Andre Costa <andre.andrelscosta@gmail.com>
 * @license    Uso permitido · redistribuição proibida sem autorização escrita
 * @see        https://github.com/Alscosta1973/poui-specialist
 */

/** Item individual da grade de itens do Pedido de Compra. */
export interface ItemCompraForm {
  produto: string;
  descricao: string;
  unidade: string;
  quantidade: number;
  valorUnit: number;
  valorTotal: number;
}

/** Cabeçalho do Pedido de Compra (usado no formulário de inclusão/alteração). */
export interface PedidoCompraForm {
  numero: string;
  emissao: string;
  fornecedor: string;
  loja: string;
  condPagto: string;
  observacao: string;
  itens: ItemCompraForm[];
}

/** Representação de um item retornado pela API Protheus (lista e detalhe). */
export interface PedidoCompraItem {
  numero: string;
  emissao: string;
  fornecedor: string;
  loja: string;
  condPagto: string;
  observacao: string;
  totalPedido: number;
  itens: ItemCompraForm[];
}
