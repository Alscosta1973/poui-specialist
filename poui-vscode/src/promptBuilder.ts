import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { EntityNaming } from './naming';
import type { GeneratorType } from './generatorTypes';

export async function buildGeneratorSystemPrompt(type: GeneratorType, assetsDir: string): Promise<string> {
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

export function buildGeneratorUserPrompt(
  type: GeneratorType,
  naming: EntityNaming,
  moduleName: string,
  apiPath: string,
): string {
  return [
    `Gere um componente do tipo \`${type.id}\` (${type.label}) para a entidade "${naming.entityPascal}".`,
    `Módulo: ${moduleName}`,
    `Endpoint REST Protheus: ${apiPath}`,
    `Nome base sugerido: ${naming.entityPascal}.`,
    `Classe/seletor/diretório sugeridos genericamente: ${naming.componentClass}, ${naming.selector}, src/app/${moduleName}/${naming.entityKebab}-list/`,
    `— siga a convenção de nomenclatura específica do tipo \`${type.id}\` carregada nos`,
    'arquivos de referência acima em vez dessa sugestão genérica, caso sejam diferentes',
    '(ex: sufixo de classe, nome de diretório, ou ausência de componente Angular para',
    'tipos que só geram service/contrato backend).',
    `Service: ${naming.serviceClass} (arquivo ${naming.serviceFileBase}.ts)`,
  ].join('\n');
}
