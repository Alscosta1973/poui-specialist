export interface Fornecedor {
  codigo: string;
  loja: string;
  nome: string;
  tipo: 'F' | 'J';
  cnpj: string;
  municipio: string;
  estado: string;
  bloqueado: 'S' | ' ';
}
