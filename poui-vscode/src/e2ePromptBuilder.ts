import { assembleSystemPrompt } from './systemPromptAssembly';

/** `poui-e2e-skill.md` (o skill em si) + `poui-test-skill.md` (a tabela de
 * detecção de família do Passo 2, que o `poui-e2e` reaproveita por
 * referência textual — sem ela carregada, o agente não tem como aplicar a
 * mesma regra). Não inclui `poui-preview` porque a extensão já cuida de
 * subir o dev server em código (`devServer.ts`), sem precisar que o agente
 * siga aqueles passos. */
export const E2E_REFERENCE_FILES = ['poui-e2e-skill.md', 'poui-test-skill.md'];

export async function buildE2eSystemPrompt(assetsDir: string): Promise<string> {
  return assembleSystemPrompt(E2E_REFERENCE_FILES, assetsDir);
}

function deriveKebabName(targetRelativePath: string): string {
  const base = targetRelativePath.split('/').pop() ?? targetRelativePath;
  return base.replace(/\.component\.ts$/, '');
}

export function buildE2eUserPrompt(targetRelativePath: string, previewUrl: string): string {
  const kebabName = deriveKebabName(targetRelativePath);
  const specRelativePath = `e2e/${kebabName}.e2e.spec.ts`;

  return [
    `Gere um teste E2E real com @playwright/test para o componente`,
    `\`${targetRelativePath}\`.`,
    'Leia esse arquivo primeiro para identificar a família (list/form/detail/complex/other),',
    'pelas regras de mapeamento carregadas nos arquivos de referência acima.',
    `O dev server já está rodando e a rota já está registrada — navegue com`,
    `\`browser_navigate\` para \`${previewUrl}\` e capture \`browser_snapshot\``,
    '(árvore de acessibilidade, não screenshot) para descobrir os seletores reais',
    '(roles, labels, texto) presentes na página de verdade. Nunca invente seletores',
    'genéricos que não apareçam no snapshot capturado.',
    `Escreva o spec em \`${specRelativePath}\`, com o roteiro de interação da`,
    'família identificada (carregado nos arquivos de referência), usando os',
    'seletores reais descobertos no snapshot.',
    'Não rode `npx playwright test` nem qualquer outro comando — apenas escreva',
    'o arquivo de spec.',
  ].join('\n');
}
