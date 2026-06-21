export interface Titulo {
  numero: string;
  parceiro: string;
  valor: number;
  venc: string;
  situacao: string;
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
