// Prompts dos comandos Smart X da extensão (gerar rotina, migrar browse, revisar).
// Os arquivos de referência são cópias de skills/smartx/* e dos templates feitas por scripts/sync-prompts.mjs.
import { assembleSystemPrompt } from './systemPromptAssembly';

export const SMARTX_GENERATE_REFERENCE_FILES = ['code-generator-infra.md', 'templates-smartx.md', 'smartx-reference.md', 'smartx-rules.md'];
export const SMARTX_MIGRATE_REFERENCE_FILES = ['code-generator-infra.md', 'templates-smartx-browse.md', 'smartx-browse-migration.md', 'smartx-rules.md'];
export const SMARTX_REVIEW_REFERENCE_FILES = ['code-reviewer.md', 'smartx-rules.md', 'smartx-reference.md'];

export interface SmartxRoutineSpec {
  routineId: string;
  description: string;
  namespaceBase: string;
  alias: string;
  keyFields: string[];
  launcher: string;
  /** Texto livre: grids 1:N, objetos 1:1, campo de legenda, ponto de entrada. */
  extras: string;
}

/** Identificador da rotina = nome das classes do Modelo e da Interface (até 10 caracteres). */
export function isValidRoutineId(value: string): boolean {
  return /^[A-Za-z][A-Za-z0-9_]{0,9}$/.test(value.trim());
}

/** Namespace TLPP em minúsculas com pelo menos dois segmentos (ex.: custom.cadastro.autor). */
export function isValidNamespace(value: string): boolean {
  return /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(value.trim());
}

export function isValidAlias(value: string): boolean {
  return /^[A-Z][A-Z0-9]{2}$/.test(value.trim().toUpperCase());
}

/** Prefixo dos campos: tabelas padrão `Sxx` usam 2 caracteres (SB1 → B1_); as demais, o alias (ZA0 → ZA0_). */
export function fieldPrefix(alias: string): string {
  const a = alias.trim().toUpperCase();
  return a.startsWith('S') ? a.slice(1) : a;
}

export function parseKeyFields(text: string): string[] {
  return text
    .split(/[\s,;]+/)
    .map((f) => f.trim().toUpperCase())
    .filter((f) => f.length > 0);
}

/** Mensagem de erro, ou undefined se a chave é válida: precisa da filial e de campos do próprio alias. */
export function validateKeyFields(alias: string, fields: string[]): string | undefined {
  const prefix = fieldPrefix(alias);
  if (fields.length === 0) {
    return 'Informe os campos da chave (ex.: ZA0_FILIAL, ZA0_CODIGO).';
  }
  const alheios = fields.filter((f) => !f.startsWith(`${prefix}_`));
  if (alheios.length > 0) {
    return `Campos fora do alias ${alias.toUpperCase()} (prefixo ${prefix}_): ${alheios.join(', ')}.`;
  }
  if (!fields.includes(`${prefix}_FILIAL`)) {
    return `A chave deve começar pela filial: inclua ${prefix}_FILIAL (exigência do TDN).`;
  }
  return undefined;
}

export async function buildSmartxSystemPrompt(referenceFiles: string[], assetsDir: string): Promise<string> {
  return assembleSystemPrompt(referenceFiles, assetsDir);
}

export function buildSmartxGenerateUserPrompt(spec: SmartxRoutineSpec, targetDir: string): string {
  const chave = `{${spec.keyFields.map((f) => `"${f}"`).join(', ')}}`;
  return [
    'Gere uma rotina Smart X — tipo `smartx` — seguindo templates-smartx.md e a referência smartx-reference.md',
    'carregados acima. É código Protheus (TLPP/ADVPL): NÃO gere nada de Angular, não rode ng build.',
    `Identificador da rotina (classe do Modelo e da Interface): ${spec.routineId}`,
    `Descrição: ${spec.description}`,
    `Namespaces: ${spec.namespaceBase}.model e ${spec.namespaceBase}.interface`,
    `Alias principal: ${spec.alias.toUpperCase()} · chave: ${chave}`,
    `Launcher: ${spec.launcher}`,
    spec.extras.trim()
      ? `Adicionais pedidos pelo usuário: ${spec.extras.trim()}`
      : 'Sem grids, objetos 1:1, legenda ou PE adicionais — só o objeto principal.',
    `Pasta de destino dos fontes: ${targetDir}`,
    'Use os nomes de arquivo do template (<namespace>.model.<rotina>.tlpp, <namespace>.interface.<rotina>.tlpp,',
    '<launcher>.prw). Se faltar informação para um adicional (campos de vínculo, chave do grid), pergunte — não invente.',
    'Antes de terminar, confira o código contra as regras SX01–SX11 de smartx-rules.md e corrija o que bater.',
    'Termine listando os arquivos criados e os próximos passos (compilar, cadastrar o launcher no menu,',
    'User Function de até 8 caracteres se o RPO for de cliente).',
  ].join('\n');
}

export function buildSmartxMigrateUserPrompt(sourceRelativePath: string): string {
  return [
    `Migre o browse do fonte \`${sourceRelativePath}\` para a nova visão Smart X — tipo \`smartx-browse\` —`,
    'seguindo templates-smartx-browse.md e smartx-browse-migration.md carregados acima.',
    'Edite o arquivo in-place (só os trechos necessários, nunca reescreva o arquivo inteiro) e mantenha a visão',
    'clássica funcionando (hasSmartX/setSmartX). Se houver bloqueio (tabela temporária, AxCadastro, Tree,',
    'mais de um browse), pare e explique antes de alterar.',
    'Ao final, confira as regras SX01–SX11 de smartx-rules.md e mostre o relatório final do template.',
  ].join('\n');
}

export function buildSmartxReviewUserPrompt(targetRelativePath: string): string {
  return [
    `Revise os fontes Protheus Smart X em \`${targetRelativePath}\` (arquivo ou pasta: .prw, .prx, .tlpp)`,
    'como o /poui-specialist:review --focus smartx: aplique SOMENTE as regras SX01–SX11 e SXR1–SXR8 de',
    'smartx-rules.md, usando smartx-reference.md como contexto.',
    'Para cada achado: arquivo, linha aproximada, trecho exato, severidade (CRITICAL/WARNING/INFO — ERROR das',
    'regras = CRITICAL) e a correção em ADVPL/TLPP. Leia o contexto antes de apontar — evite falsos positivos.',
    'Não modifique nenhum arquivo: revisão somente leitura. Apresente o relatório como texto, agrupado por',
    'arquivo e severidade, e não se ofereça para aplicar as correções.',
  ].join('\n');
}
