/**
 * @generated  poui-specialist v1.10.0
 * @author     Andre Costa <andre.andrelscosta@gmail.com>
 * @license    Uso permitido · redistribuição proibida sem autorização escrita
 * @see        https://github.com/Alscosta1973/poui-specialist
 */

/**
 * Contrato consistente com backend/compras/solicitacoes.tlpp (WSRESTFUL SolicitacoesAPI,
 * tabela SC1). O skeleton atual do backend só serializa "numero" (C1_NUM) em GetKey — os
 * demais campos abaixo refletem os comentários TODO do backend (C1_FILIAL, C1_PRODUTO,
 * C1_DESCRI, C1_QUANT, C1_EMISSAO, C1_OBS) e devem ser confirmados/ajustados quando a
 * regra de negocio de SolicService for implementada (/advpl-specialist:generate rest).
 */
export interface SolicitacaoCompra {
  /** C1_NUM — chave da Solicitação de Compra */
  numero: string;
  /** C1_FILIAL — TODO: ainda não serializado por SolicService.GetKey/LstPage */
  filial: string;
  /** C1_PRODUTO */
  produto: string;
  /** C1_DESCRI — usado pelo backend no LIKE da busca rápida (q) */
  descricao: string;
  /** C1_QUANT */
  quantidade: number;
  /** C1_EMISSAO — formato ISO (yyyy-MM-dd) esperado do backend */
  emissao: string;
  /**
   * TODO: SC1 não possui campo de status nativo — backend deve derivar
   * (ex.: C1_QUJE x C1_QUANT) e expor como 'Pendente' | 'Atendida' | 'Cancelada'.
   */
  status: 'Pendente' | 'Atendida' | 'Cancelada';
  /** C1_OBS */
  obs?: string;
}
