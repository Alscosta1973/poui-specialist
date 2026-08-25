import type { EntityNaming } from './naming';
import type { GeneratorType } from './generatorTypes';
import { assembleSystemPrompt } from './systemPromptAssembly';

export async function buildGeneratorSystemPrompt(type: GeneratorType, assetsDir: string): Promise<string> {
  return assembleSystemPrompt(type.referenceFiles, assetsDir);
}

export function buildGeneratorUserPrompt(
  type: GeneratorType,
  naming: EntityNaming,
  moduleName: string,
  apiPath: string,
  sourceFilePath?: string,
): string {
  const lines = [
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
  ];
  if (sourceFilePath) {
    lines.push(`Arquivo fonte a converter: ${sourceFilePath}`);
  }
  return lines.join('\n');
}
