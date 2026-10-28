import type { EntityNaming } from './naming';
import type { GeneratorBackend, GeneratorType } from './generatorTypes';
import { assembleSystemPrompt } from './systemPromptAssembly';

/** Arquivos de referência do tipo + o template do FWRestModel quando o backend é uma rotina MVC. */
export function generatorReferenceFiles(type: GeneratorType, backend?: GeneratorBackend): string[] {
  return backend?.kind === 'mvc' ? [...type.referenceFiles, 'templates-mvc-rest.md'] : type.referenceFiles;
}

export async function buildGeneratorSystemPrompt(
  type: GeneratorType,
  assetsDir: string,
  backend?: GeneratorBackend,
): Promise<string> {
  return assembleSystemPrompt(generatorReferenceFiles(type, backend), assetsDir);
}

export function buildGeneratorUserPrompt(
  type: GeneratorType,
  naming: EntityNaming,
  moduleName: string,
  apiPath: string,
  sourceFilePath?: string,
  backend?: GeneratorBackend,
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
  if (backend?.kind === 'mvc') {
    lines.push(
      `Backend: rotina MVC existente ${backend.source} via FWRestModel (--mvc ${backend.source}). Siga`,
      `templates-mvc-rest.md: gere RM_${backend.source}.prw (recurso /rest/fwmodel) e use o ProtheusMvcService`,
      '(src/app/core/protheus-mvc.ts + protheus-mvc.service.ts + specs) no lugar do service REST próprio.',
      'Monte a MvcModelSpec pelo ModelDef (AddFields/AddGrid em qualquer nível); se ele não estiver nos arquivos, pergunte.',
    );
  }
  if (backend?.kind === 'odata') {
    lines.push(
      'Filtro da lista no padrão oData (--odata): siga a seção "Filtro oData (opcional)" de',
      'templates-tlpp-contract.md — parâmetro `filter` com expressão oData, backend com FWAdapterBaseV2',
      '(AddMapFields como lista permitida) e helper toODataFilter + spec no frontend.',
    );
  }
  return lines.join('\n');
}
