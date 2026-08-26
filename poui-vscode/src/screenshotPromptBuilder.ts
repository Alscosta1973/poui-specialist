import { assembleSystemPrompt } from './systemPromptAssembly';

export async function buildScreenshotSystemPrompt(assetsDir: string): Promise<string> {
  return assembleSystemPrompt(['poui-screenshot-skill.md'], assetsDir);
}

export function buildScreenshotUserPrompt(imagePath: string): string {
  return [
    `Leia a imagem em "${imagePath}" usando a ferramenta Read (ela suporta arquivos de imagem —`,
    'retorna o conteúdo visual diretamente para você) e analise-a seguindo os Passos 1 e 2 do',
    'skill acima (tipo de componente, campos visíveis, módulo sugerido, ações customizadas, nome',
    'da classe e endpoint).',
    '',
    'Em vez do laudo em texto livre do Passo 3, responda SOMENTE com o manifesto no formato',
    'estruturado abaixo, uma linha por chave, sem nenhum texto antes ou depois:',
    '',
    'TYPE: <tipo inferido, um dos tipos válidos do plugin>',
    'MODULE: <módulo inferido, kebab-case>',
    'ENTITY: <entidade em PascalCase>',
    'API_PATH: <endpoint kebab-case começando com />',
    'FIELDS: <campo1(req se obrigatório), campo2, campo3, ...>',
    'RULES: <regra1; regra2 — omita esta linha inteira se não houver nenhuma regra>',
    '',
    'Não gere nenhum arquivo nesta etapa — só a análise.',
  ].join('\n');
}

export interface ScreenshotManifest {
  type: string;
  module: string;
  entity: string;
  apiPath: string;
  fields: string;
  rules?: string;
}

function extractField(text: string, label: string): string | undefined {
  const re = new RegExp(`^${label}:\\s*(.+)$`, 'm');
  const match = re.exec(text);
  return match ? match[1].trim() : undefined;
}

/** Extrai o manifesto estruturado da resposta do agente — tolerante a
 * narração/log de tool-use ao redor (o texto acumulado do sink inclui tudo
 * isso, não só a resposta final). Só as linhas `CHAVE: valor` importam. */
export function parseScreenshotManifest(text: string): ScreenshotManifest | undefined {
  const type = extractField(text, 'TYPE');
  const module = extractField(text, 'MODULE');
  const entity = extractField(text, 'ENTITY');
  const apiPath = extractField(text, 'API_PATH');
  const fields = extractField(text, 'FIELDS');
  const rules = extractField(text, 'RULES');

  if (!type || !module || !entity || !apiPath || !fields) {
    return undefined;
  }

  return { type, module, entity, apiPath, fields, rules };
}
