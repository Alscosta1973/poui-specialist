/**
 * @generated  poui-specialist v1.0
 * @author     Andre Costa <andre.andrelscosta@gmail.com>
 * @license    Uso permitido · redistribuição proibida sem autorização escrita
 * @see        https://github.com/Alscosta1973/poui-specialist
 */

export interface ItemPedidoCompra {
  item:        string;   // C7_ITEM
  produto:     string;   // C7_PRODUTO
  descricao:   string;   // C7_DESCRI
  unidade:     string;   // C7_UM  ('UN', 'KG', 'CX', etc.)
  quantidade:  number;   // C7_QUANT
  valorUnit:   number;   // C7_PRECO
  valorTotal:  number;   // C7_TOTAL
}

export interface PedidoCompra {
  numero:      string;                     // C7_NUM
  emissao:     string;                     // C7_EMISSAO — ISO 8601 ('YYYY-MM-DD')
  fornecedor:  string;                     // C7_FORNECE
  loja:        string;                     // C7_LOJA
  valorTotal:  number;                     // C7_TOTAL
  status:      'A' | 'E' | 'C';           // A=Aberto, E=Encerrado, C=Cancelado
  itens:       ItemPedidoCompra[];         // array embutido retornado pelo GET lista
}
