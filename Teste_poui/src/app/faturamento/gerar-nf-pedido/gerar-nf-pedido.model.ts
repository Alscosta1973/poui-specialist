/**
 * @generated  poui-specialist v1.0
 * @author     Andre Costa <andre.andrelscosta@gmail.com>
 * @license    Uso permitido · redistribuição proibida sem autorização escrita
 * @see        https://github.com/Alscosta1973/poui-specialist
 */

export interface PedidoSC5 {
  numPedido:   string;
  cliente:     string;
  loja:        string;
  produto:     string;
  descricao:   string;
  nomCliente:  string;
  emissao:     string;
  qtdTotal:    number;
  prcVenda:    number;
  vlrTotal:    number;
  status:      string;
  $selected?:  boolean;
}

export interface ItemPedidoSC6 {
  recno:      number;
  numPedido:  string;
  item:       string;
  produto:    string;
  qtdVenda:   number;
  prcVenda:   number;
  valor:      number;
  emissao:    string;
  $selected?: boolean;
}

export interface GerarNfRequest {
  itens: Array<{
    numPedido:  string;
    itemPedido: string;
    recno:      number;
  }>;
}

export interface FiltrosPedido {
  numPedido:      string;
  codCliente:     string;
  dataEmissaoDe:  string;
  dataEmissaoAte: string;
}
