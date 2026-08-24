import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { EntityNaming } from './naming';
import type { ListComponentType } from './listTypes';

export async function buildListSystemPrompt(type: ListComponentType, assetsDir: string): Promise<string> {
  const sections = await Promise.all(
    type.referenceFiles.map(async (file) => {
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
    'Esta é uma execução não interativa, de um único turno: não há como fazer',
    'perguntas ao usuário nem receber respostas, portanto não peça confirmação,',
    'não apresente a lista de arquivos para aprovação e não aguarde autorização',
    'para criar diretórios — escreva os arquivos diretamente. Não crie os',
    'diretórios `skills/`, `agents/` ou `commands/` no workspace do usuário:',
    'esses caminhos se referem aos arquivos internos de referência deste plugin,',
    'não a algo que deva ser criado aqui.',
  ].join(' ');

  return [preamble, ...sections].join('\n\n---\n\n');
}

export function buildListUserPrompt(
  type: ListComponentType,
  naming: EntityNaming,
  moduleName: string,
  apiPath: string,
): string {
  return [
    `Gere um componente do tipo \`${type.id}\` (${type.label}) para a entidade "${naming.entityPascal}".`,
    `Módulo: ${moduleName}`,
    `Endpoint REST Protheus: ${apiPath}`,
    `Classe do componente: ${naming.componentClass}`,
    `Seletor: ${naming.selector}`,
    `Service: ${naming.serviceClass} (arquivo ${naming.serviceFileBase}.ts)`,
    `Diretório de destino: src/app/${moduleName}/${naming.entityKebab}-list/`,
  ].join('\n');
}
