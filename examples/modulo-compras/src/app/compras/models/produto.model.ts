/**
 * @generated  poui-specialist v1.10.0
 * @author     Andre Costa <andre.andrelscosta@gmail.com>
 * @license    Uso permitido · redistribuição proibida sem autorização escrita
 * @see        https://github.com/Alscosta1973/poui-specialist
 */
export interface Produto {
  codigo: string;
  descricao: string;
  tipo: string;
  unidadeMedida: string;
  grupo: string;
  localPadrao?: string;
  ativo: string;
  precoVenda: number;
  custoPadrao: number;
  pesoLiquido?: number;
  estoqueMinimo: number;
  estoqueMaximo?: number;
  controlaLote: string;
}
