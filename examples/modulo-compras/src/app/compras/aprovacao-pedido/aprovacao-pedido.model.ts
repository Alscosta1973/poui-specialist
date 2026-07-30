/**
 * @generated  poui-specialist v1.10.0
 * @author     Andre Costa <andre.andrelscosta@gmail.com>
 * @license    Uso permitido · redistribuição proibida sem autorização escrita
 * @see        https://github.com/Alscosta1973/poui-specialist
 */

export interface AprovacaoPedido {
  numero: string;
  filial: string;
  fornecedor: string;
  valor: number;
  dataEmissao: string;
  // TODO: ajustar os valores reais retornados pelo Protheus (ex.: 'Pendente' | 'Aprovado' | 'Rejeitado')
  status: string;
  aprovador: string;
}

export type AprovacaoAcaoTipo = 'aprovar' | 'rejeitar';

export interface AprovacaoActionDraft {
  tipo: AprovacaoAcaoTipo;
  row: AprovacaoPedido;
}

export interface AprovacaoActionResultItem {
  numero: string;
  status: 'ok' | 'erro';
  mensagem?: string;
}

export interface AprovacaoActionResponse {
  sucesso: number;
  falha: number;
  itens: AprovacaoActionResultItem[];
}

export interface AprovacaoActionResultSummary extends AprovacaoActionResponse {
  actionLabel: string;
}
