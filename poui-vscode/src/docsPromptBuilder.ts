import { assembleSystemPrompt } from './systemPromptAssembly';

export interface ComponentCategory {
  file: string;
  components: string[];
}

/** Remove tudo que não seja letra/dígito e baixa a caixa — deixa "po-table",
 * "PoTable" e "POTABLE" equivalentes pra comparação, sem precisar adivinhar
 * se o usuário digitou kebab-case ou PascalCase. */
function normalizeToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Extrai a tabela "Component Reference Files" de `poui-components/SKILL.md`
 * — cada linha `- **Categoria** (comp1, comp2, ...): see \`arquivo.md\`` vira
 * uma categoria. Não hardcoda a lista de componentes em código: se o SKILL.md
 * ganhar/perder um componente, o parser acompanha automaticamente. */
export function parseComponentCategories(skillMdContent: string): ComponentCategory[] {
  const categories: ComponentCategory[] = [];
  const re = /\(([^)]+)\):\s*see\s*`([^`]+)`/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(skillMdContent))) {
    const components = match[1]
      .split(',')
      .map((c) => normalizeToken(c.trim().replace(/^\[|\]$/g, '')))
      .filter(Boolean);
    categories.push({ file: match[2], components });
  }
  return categories;
}

export function findComponentReferenceFile(categories: ComponentCategory[], componentName: string): string | undefined {
  const normalized = normalizeToken(componentName);
  return categories.find((c) => c.components.includes(normalized))?.file;
}

export async function buildDocsSystemPrompt(assetsDir: string, referenceFile: string | undefined): Promise<string> {
  const files = ['poui-components-skill.md'];
  if (referenceFile) {
    files.push(referenceFile);
  }
  return assembleSystemPrompt(files, assetsDir);
}

export function buildDocsUserPrompt(componentName: string): string {
  return [
    `Documente o componente PO-UI "${componentName}" usando o(s) arquivo(s) de referência acima:`,
    'inputs, outputs, tipos TypeScript e um exemplo de uso.',
    '',
    'Se o componente não for encontrado nos arquivos de referência carregados: informe que não foi',
    'encontrado, liste as categorias/componentes disponíveis pelos títulos do SKILL.md, e sugira o',
    'componente mais próximo pelo nome.',
  ].join('\n');
}
