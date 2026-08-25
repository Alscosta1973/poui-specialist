import { assembleSystemPrompt } from './systemPromptAssembly';

export const REVIEW_REFERENCE_FILES = ['code-reviewer.md'];

export type ReviewFocus = 'boas-praticas' | 'performance' | 'acessibilidade' | 'seguranca' | 'poui' | 'qualidade' | 'all';

const FOCUS_LABEL: Record<ReviewFocus, string> = {
  'boas-praticas': 'boas práticas (OnPush, tipagem, signals, unsubscribe, inject(), computed())',
  performance: 'performance (trackBy, computed(), lazy loading, mutação de array)',
  acessibilidade: 'acessibilidade (p-label, aria-label, p-help)',
  seguranca: 'segurança (bypassSecurityTrust*, URL hardcoded, concatenação em HTTP)',
  poui: 'quirks PO-UI (po-table selection, loading state, column types, po-modal dismiss)',
  qualidade: 'qualidade (cobertura de testes — spec files ausentes)',
  all: 'todas as categorias (boas práticas, performance, acessibilidade, segurança, quirks PO-UI, qualidade)',
};

export async function buildReviewSystemPrompt(assetsDir: string): Promise<string> {
  return assembleSystemPrompt(REVIEW_REFERENCE_FILES, assetsDir);
}

export function buildReviewUserPrompt(targetRelativePath: string, focus: ReviewFocus = 'all'): string {
  return [
    `Revise o código PO-UI Angular em \`${targetRelativePath}\` (arquivo ou pasta) seguindo as`,
    'regras carregadas nos arquivos de referência acima.',
    `Foco: ${focus} — ${FOCUS_LABEL[focus]}.`,
    'Para cada achado: nome do arquivo, linha aproximada, o trecho de código exato, a',
    'severidade (CRITICAL/WARNING/INFO) e uma sugestão de correção com código.',
    'Leia o contexto antes de apontar um problema — evite falsos positivos.',
    'Não modifique nenhum arquivo: esta é uma revisão somente leitura. Apresente o relatório',
    'completo como texto na sua resposta, agrupado por arquivo e severidade.',
  ].join('\n');
}
