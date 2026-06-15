export interface DivergenciaCartao {
  nsu: string;           // ZB1_NSU
  data: string;          // ZB1_DATA (formato yyyy-MM-dd)
  bandeira: string;      // ZB1_BNDRA
  vlBruto: number;       // ZB1_VLRBRT
  parcela: number;       // ZB1_PARCEL
  totalParcelas: number; // ZB1_PARCTT
  txContrato: number;    // ZB4_TXPERC (4 decimais)
  vlLiquido: number;     // ZB1_VLRLIQ * ZB1_PARCTT (calculado em _CrgTmp)
  txMdr: number;         // ZB1_TXADM (4 decimais)
  vlInformado: number;   // ZB1_VLRLIQ (valor informado pela operadora)
  difBlumar: number;     // TT_DIFBLU (calculado: vlLiquido - vlInformado)
  txCliente: number;     // TX do cliente (4 decimais)
  difCliente: number;    // diferenca pelo cliente
  txOk: TxOkStatus;     // status de divergencia
  observacao: string;    // ZB1_OBS - historico com prefixo data/hora/usuario
  $selected?: boolean;   // propriedade injetada pelo po-table para controle de marcacao
}

export type TxOkStatus = '1' | '2' | '3' | '4' | '5';

export interface TotaisStatus {
  tipo: TxOkStatus;
  label: string;
  count: number;
  vlTotal: number;
  vlDif: number;
}

export interface ConfirmarRequest {
  nsus: string[];
}

export interface RegularizarRequest {
  nsus: string[];
  observacao: string;
}

export interface RevalidarTaxaRequest {
  nsus: string[];
}

export interface SalvarObsRequest {
  nsu: string;
  observacao: string;
}
