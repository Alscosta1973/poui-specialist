export interface EntityNaming {
  entityPascal: string;
  entityKebab: string;
  entityKebabPlural: string;
  componentClass: string;
  selector: string;
  serviceClass: string;
  serviceFileBase: string;
  defaultApiPath: string;
  wasAutoCorrected: boolean;
}

export function toPascalCase(raw: string): string {
  return raw
    .trim()
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

export function toKebabCase(pascal: string): string {
  return pascal.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

function pluralize(kebab: string): string {
  return kebab.endsWith('s') ? kebab : `${kebab}s`;
}

export function deriveEntityNaming(rawName: string): EntityNaming {
  if (!rawName || !rawName.trim()) {
    throw new Error('Nome da entidade não pode ser vazio.');
  }

  const inputTrimmed = rawName.trim();
  const entityPascal = toPascalCase(inputTrimmed);
  const wasAutoCorrected = entityPascal !== inputTrimmed;
  const entityKebab = toKebabCase(entityPascal);
  const entityKebabPlural = pluralize(entityKebab);

  return {
    entityPascal,
    entityKebab,
    entityKebabPlural,
    componentClass: `${entityPascal}ListComponent`,
    selector: `app-${entityKebab}-list`,
    serviceClass: `${entityPascal}Service`,
    serviceFileBase: `${entityKebab}.service`,
    defaultApiPath: `/rest/api/custom/v1/${entityKebabPlural}`,
    wasAutoCorrected,
  };
}

export function isValidModuleName(module: string): boolean {
  return /^[a-z][a-z0-9-]*$/.test(module.trim());
}

/** Resolve o módulo de destino para tipos com `requiresModule: false` — usa o
 * `fixedModule` do tipo (ex: `auth-login` sempre em `auth`) quando declarado,
 * ou o próprio nome derivado da entidade quando não há destino fixo (ex:
 * `module`, que usa o nome escolhido pelo usuário como módulo). */
export function resolveFixedModuleName(fixedModule: string | undefined, entityKebab: string): string {
  return fixedModule ?? entityKebab;
}
