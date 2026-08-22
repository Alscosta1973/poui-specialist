import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { EntityNaming } from './naming';

const PAGE_LIST_PROMPT_FILES = [
  'code-generator-list.md',
  'templates-page-list.md',
  'templates-service.md',
  'table-components.md',
  'po-ui-quirks-table.md',
  'po-ui-quirks-onpush.md',
] as const;

export async function buildPageListSystemPrompt(assetsDir: string): Promise<string> {
  const sections = await Promise.all(
    PAGE_LIST_PROMPT_FILES.map(async (file) => {
      const filePath = path.join(assetsDir, file);
      const content = await fs.readFile(filePath, 'utf8');
      return `<!-- source: ${file} -->\n${content}`;
    }),
  );

  const preamble = [
    'Os arquivos de referência abaixo (agente + templates + quirks PO-UI) já foram',
    'carregados nesta mensagem — não tente ler novamente os caminhos relativos',
    '`skills/...` ou `agents/...` mencionados no texto, eles não existem no',
    'workspace do usuário. Gere os arquivos finais diretamente no workspace aberto.',
  ].join(' ');

  return [preamble, ...sections].join('\n\n---\n\n');
}

export function buildPageListUserPrompt(
  naming: EntityNaming,
  moduleName: string,
  apiPath: string,
): string {
  return [
    `Gere um componente page-list para a entidade "${naming.entityPascal}".`,
    `Módulo: ${moduleName}`,
    `Endpoint REST Protheus: ${apiPath}`,
    `Classe do componente: ${naming.componentClass}`,
    `Seletor: ${naming.selector}`,
    `Service: ${naming.serviceClass} (arquivo ${naming.serviceFileBase}.ts)`,
    `Diretório de destino: src/app/${moduleName}/${naming.entityKebab}-list/`,
  ].join('\n');
}
