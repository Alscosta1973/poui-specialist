/**
 * @generated  poui-specialist v1.16.2
 * @author     Andre Costa <andre.andrelscosta@gmail.com>
 * @license    Uso permitido · redistribuição proibida sem autorização escrita
 * @see        https://github.com/Alscosta1973/poui-specialist
 * @node       not detected (>=18.19 required)
 * @angular    ^21.2.0 (17-21+ supported)
 */

export interface Fornecedor {
  id: string;
  codigo: string;
  loja: string;
  nome: string;
  nomeFantasia?: string;
  cnpj?: string;
  municipio?: string;
  estado?: string;
  telefone?: string;
  email?: string;
  /** 1 = Inativo · 2 = Ativo */
  situacao?: string;
}
