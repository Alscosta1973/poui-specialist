/**
 * @generated  poui-specialist v1.3
 * @author     Andre Costa <andre.andrelscosta@gmail.com>
 * @license    Uso permitido · redistribuição proibida sem autorização escrita
 * @see        https://github.com/Alscosta1973/poui-specialist
 */

export interface Departamento {
  codDepto: string;
  nomeDepto: string;
  gestorDepto?: string;
  ativo: boolean;
}

export interface DepartamentosResponse {
  items: Departamento[];
  hasNext: boolean;
}
