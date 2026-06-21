/**
 * @generated  poui-specialist v1.3
 * @author     Andre Costa <andre.andrelscosta@gmail.com>
 * @license    Uso permitido · redistribuição proibida sem autorização escrita
 * @see        https://github.com/Alscosta1973/poui-specialist
 */

/** Tipo de pessoa jurídica (Protheus: A1_TIPO) */
export type TipoPessoa = 'F' | 'J' | 'X';

/** Situação/Ativo (Protheus: A1_MSBLQL) */
export type SituacaoParceiro = '1' | '2'; // 1=Ativo, 2=Bloqueado

/** Interface principal do Parceiro (entidade SA1/SA2 do Protheus) */
export interface Parceiro {
  /** Código do parceiro (A1_COD / A2_COD) */
  codigo: string;
  /** Loja (A1_LOJA / A2_LOJA) */
  loja: string;
  /** Nome / Razão social (A1_NOME / A2_NOME) */
  nome: string;
  /** Nome fantasia (A1_NREDUZ / A2_NREDUZ) */
  nomeFantasia: string;
  /** CNPJ ou CPF (A1_CGC / A2_CGC) */
  cnpjCpf: string;
  /** Inscrição Estadual (A1_INSCR / A2_INSCR) */
  inscricaoEstadual: string;
  /** Tipo de pessoa: F=Física, J=Jurídica, X=Exterior */
  tipoPessoa: TipoPessoa;
  /** Situação: 1=Ativo, 2=Bloqueado */
  situacao: SituacaoParceiro;
  /** Endereço (A1_END / A2_END) */
  endereco: string;
  /** Município (A1_MUN / A2_MUN) */
  municipio: string;
  /** UF (A1_EST / A2_EST) */
  uf: string;
  /** CEP (A1_CEP / A2_CEP) */
  cep: string;
  /** Telefone (A1_TEL / A2_TEL) */
  telefone: string;
  /** E-mail (A1_EMAIL / A2_EMAIL) */
  email: string;
  /** Limite de crédito (A1_LC / A2_LC) */
  limiteCredito: number;
  /** Saldo devedor atual */
  saldoDevedor: number;
  /** Data de cadastro */
  dataCadastro: string;
}

/** Filtros avançados para busca de parceiros */
export interface ParceiroFilter {
  codigo?: string;
  nome?: string;
  cnpjCpf?: string;
  tipoPessoa?: TipoPessoa;
  situacao?: SituacaoParceiro;
  uf?: string;
  municipio?: string;
}

/** Shape da resposta paginada do Protheus REST */
export interface ParceiroListResponse {
  items: Parceiro[];
  hasNext: boolean;
  total?: number;
}
