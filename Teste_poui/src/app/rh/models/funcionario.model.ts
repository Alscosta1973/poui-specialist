// @generated poui-specialist v1.0
// Entidade: Funcionario | Tabela Protheus: SRA

/**
 * Representa um Funcionário da tabela SRA do Protheus.
 */
export interface Funcionario {
  /** RA_MAT — Matrícula do funcionário (chave) */
  matricula: string;
  /** RA_NOME — Nome completo */
  nome: string;
  /** RA_CIC — CPF */
  cpf?: string;
  /** RA_NASC — Data de nascimento (ISO date YYYY-MM-DD) */
  dataNascimento?: string;
  /** RA_ESCOL — Escolaridade */
  escolaridade?: string;
  /** RA_DEFFI — Deficiência */
  deficiencia?: string;
  /** RA_CARGO — Cargo */
  cargo?: string;
  /** RA_DEPTO — Departamento */
  departamento?: string;
  /** RA_CCUSTO — Centro de Custo */
  centroCusto?: string;
  /** RA_ADMISSA — Data de admissão (ISO date YYYY-MM-DD) */
  dataAdmissao: string;
  /** RA_SITFOLH — Situação: A=Ativo, I=Inativo, F=Férias */
  situacao?: 'A' | 'I' | 'F';
  /** RA_TPCONTR — Tipo de contrato */
  tipoContrato?: 'CLT' | 'PJ' | 'EST';
  /** RA_TURNO — Turno */
  turno?: string;
  /** RA_SALARIO — Salário */
  salario?: number;
  /** RA_END — Endereço */
  endereco?: string;
  /** RA_BAIRRO — Bairro */
  bairro?: string;
  /** RA_MUN — Município */
  municipio?: string;
  /** RA_EST — Estado (UF) */
  estado?: string;
  /** RA_CEP — CEP */
  cep?: string;
  /** RA_BANCO — Banco */
  banco?: string;
  /** RA_AGENCIA — Agência */
  agencia?: string;
  /** RA_NUMCONT — Conta corrente */
  conta?: string;
}

/**
 * Payload para criação (POST) e edição (PUT) de Funcionário.
 * Campos read-only do sistema (e.g. matrícula em edição) são opcionais aqui.
 */
export interface FuncionarioForm {
  /** RA_MAT — obrigatório apenas no POST; omitido no PUT (usa a rota /:mat) */
  matricula?: string;
  /** RA_NOME */
  nome: string;
  /** RA_CIC */
  cpf?: string;
  /** RA_NASC */
  dataNascimento?: string;
  /** RA_ESCOL */
  escolaridade?: string;
  /** RA_DEFFI */
  deficiencia?: string;
  /** RA_CARGO */
  cargo?: string;
  /** RA_DEPTO */
  departamento?: string;
  /** RA_CCUSTO */
  centroCusto?: string;
  /** RA_ADMISSA */
  dataAdmissao: string;
  /** RA_SITFOLH */
  situacao?: 'A' | 'I' | 'F';
  /** RA_TPCONTR */
  tipoContrato?: 'CLT' | 'PJ' | 'EST';
  /** RA_TURNO */
  turno?: string;
  /** RA_SALARIO */
  salario?: number;
  /** RA_END */
  endereco?: string;
  /** RA_BAIRRO */
  bairro?: string;
  /** RA_MUN */
  municipio?: string;
  /** RA_EST */
  estado?: string;
  /** RA_CEP */
  cep?: string;
  /** RA_BANCO */
  banco?: string;
  /** RA_AGENCIA */
  agencia?: string;
  /** RA_NUMCONT */
  conta?: string;
}

/**
 * Envelope paginado retornado pelo endpoint GET /rh/funcionarios.
 * Segue o padrão TOTVS Protheus REST (hasNext).
 */
export interface FuncionariosResponse {
  items: Funcionario[];
  hasNext: boolean;
  /** Página atual (1-based) */
  page?: number;
  /** Tamanho da página */
  pageSize?: number;
  /** Total de registros, quando disponível */
  total?: number;
}

/**
 * Parâmetros de consulta para GET /rh/funcionarios.
 */
export interface FuncionariosParams {
  filial?: string;
  page?: number;
  pageSize?: number;
  /** Filtro por nome (busca parcial) */
  nome?: string;
  /** Filtro por situação */
  situacao?: 'A' | 'I' | 'F';
}
