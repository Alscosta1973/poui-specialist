import { assembleSystemPrompt } from './systemPromptAssembly';

/** Arquivos da skill `poui-test` sincronizados em `assets/agent-prompts/` —
 * carregados sempre, deixando o próprio modelo escolher a família (list/
 * form/detail/complex/other) e os blocos avançados relevantes, do mesmo
 * jeito que os `GeneratorType.referenceFiles` fazem para geração. */
export const TEST_REFERENCE_FILES = [
  'poui-test-skill.md',
  'templates-test-base.md',
  'templates-test-list.md',
  'templates-test-form.md',
  'templates-test-detail.md',
  'templates-test-complex.md',
  'templates-test-other.md',
  'templates-test-advanced.md',
];

export async function buildTestSystemPrompt(assetsDir: string): Promise<string> {
  return assembleSystemPrompt(TEST_REFERENCE_FILES, assetsDir);
}

export function buildTestUserPrompt(targetRelativePath: string): string {
  const specRelativePath = targetRelativePath.replace(/\.ts$/, '.spec.ts');
  return [
    `Gere um teste unitário Karma + Jasmine completo para o arquivo \`${targetRelativePath}\`.`,
    'Leia esse arquivo primeiro, identifique a família (list/form/detail/complex/other)',
    'pelas regras de mapeamento carregadas nos arquivos de referência acima e, se o',
    'componente injetar um service, leia também o arquivo do service associado para',
    'extrair o apiPath e o modelo de dados usado.',
    `Escreva o resultado em \`${specRelativePath}\`, substituindo todos os placeholders`,
    'pelos valores reais extraídos do componente/service.',
    'Não rode `ng test` nem qualquer outro comando — apenas escreva o arquivo de spec.',
  ].join('\n');
}
