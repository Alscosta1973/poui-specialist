export interface Cliente {
  codigo: string;
  loja: string;
  nome: string;
  nomeFantasia: string;
  cnpj: string;
  cidade: string;
  uf: string;
  telefone: string;
}

export interface ClientesResponse {
  items: Cliente[];
  hasNext: boolean;
  total: number;
}
