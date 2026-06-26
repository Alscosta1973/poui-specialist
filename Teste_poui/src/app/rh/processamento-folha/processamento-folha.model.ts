// @generated poui-specialist v1.0 — action-list

export interface FolhaProcessamento {
  id: string;                   // chave: filial + competencia + tipo (ex: '001-202601-M')
  competencia: string;          // AAAAMM — ex: '202601'
  filial: string;
  tipo: 'M' | 'F' | '13';     // M=Mensal, F=Férias, 13=13º Salário
  situacao: 'P' | 'E' | 'C' | 'X'; // P=Pendente, E=Em Proc., C=Concluído, X=Cancelado
  totalFuncionarios: number;
  totalBruto: number;
  totalLiquido: number;
  dataProcessamento?: string;   // yyyy-MM-dd
}

export interface FolhaResponse {
  items: FolhaProcessamento[];
  hasNext: boolean;
}

export interface ActionConfig {
  id: string;
  label: string;
  icon: string;
  mode: 'single' | 'multi';
  endpoint: string;
  modalTitle: string;
  modalMessage: string;
  campoChave: string;
  danger?: boolean;
}

export interface ActionDraft<T> {
  config: ActionConfig;
  rows: T[];
  resolvedMessage: string;
}

export interface ActionResponse {
  sucesso: number;
  falha: number;
  itens: ActionItemResult[];
}

export interface ActionItemResult {
  id: string;
  status: 'ok' | 'erro';
  mensagem?: string;
}

export interface ActionResultSummary extends ActionResponse {
  actionLabel: string;
}
