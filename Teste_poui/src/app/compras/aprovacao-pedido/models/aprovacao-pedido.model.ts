export interface PedidoAprovacao {
  numero:     string;
  emissao:    string;   // ISO 8601 'YYYY-MM-DD'
  fornecedor: string;
  loja:       string;
  valorTotal: number;
  status:     'P' | 'A' | 'R';
}

export interface ItemPedidoAprovacao {
  item:       string;
  produto:    string;
  descricao:  string;
  unidade:    string;
  quantidade: number;
  valorUnit:  number;
  valorTotal: number;
}
