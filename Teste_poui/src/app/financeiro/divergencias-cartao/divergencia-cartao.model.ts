export type TxOk = '1' | '2' | '3' | '4' | '5' | 'S' | 'N';

export interface DivergenciaCartao {
  ZB1_DTTRAN: string;
  ZB1_NSU: string;
  ZB1_BAND: string;
  ZB1_VLBRUT: number;
  ZB1_PARCTT: number;
  ZB1_ZB4PER: number;
  ZB1_TXADM: number;
  ZB1_VLRLIQ: number;
  ZB1_TXADCL: number;
  ZB1_TXOK: TxOk;
  ZB1_OBS?: string;
  // computed by API / mock
  TT_VLVLIQ: number;
  TT_DIFBLU: number;
  TT_DIFORT: number;
}

export interface SummaryCard {
  txok: string;
  label: string;
  color: string;
  qtd: number;
  vlrLiqContrato: number;
  difBluOrt: number;
}

export interface DivergenciaCartaoResponse {
  items: DivergenciaCartao[];
  hasNext: boolean;
  summary: SummaryCard[];
}

export interface RegularizarRequest {
  nsus: string[];
}

export const STATUS_MAP: Record<string, { label: string; color: string }> = {
  '1': { label: 'MDR',               color: 'color-07' },
  '2': { label: 'Antecipação',       color: 'color-08' },
  '3': { label: 'MDR + Antecipação', color: 'color-06' },
  '4': { label: 'Em Acordo',         color: 'color-09' },
  '5': { label: 'Regularizado',      color: 'color-11' },
};
