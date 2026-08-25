import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { findFiles } from './fsWalk';

/** Marca dois espaços exatos, igual ao plugin original — não normalizar. */
const GENERATED_MARKER = '@generated  poui-specialist';

export type QualityCriterionKey = 'onpush' | 'loading' | 'error' | 'cleanup';

export interface QualityCriterionResult {
  key: QualityCriterionKey;
  label: string;
  passed: boolean;
  suggestion: string;
}

export type QualityClassification = 'aprovado' | 'atencao' | 'critico';

export interface ComponentQualityResult {
  filePath: string;
  criteria: QualityCriterionResult[];
  classification: QualityClassification;
}

export function evaluateComponentQuality(filePath: string, tsContent: string): ComponentQualityResult {
  const criteria: QualityCriterionResult[] = [
    {
      key: 'onpush',
      label: 'OnPush',
      passed: /ChangeDetectionStrategy\.OnPush/.test(tsContent),
      suggestion: 'Adicionar changeDetection: ChangeDetectionStrategy.OnPush no decorator @Component',
    },
    {
      key: 'loading',
      label: 'Loading state',
      passed: /finalize\(/.test(tsContent),
      suggestion: 'Adicionar finalize(() => this.loading.set(false)) nas chamadas HTTP',
    },
    {
      key: 'error',
      label: 'Error handling',
      passed: /notification\.error\(/.test(tsContent) || /catchError\(/.test(tsContent),
      suggestion: "Adicionar notification.error(...) ou catchError(...) no tratamento de erro",
    },
    {
      key: 'cleanup',
      label: 'Cleanup observables',
      passed: /takeUntilDestroyed/.test(tsContent),
      suggestion: 'Adicionar .pipe(takeUntilDestroyed()) nos observables',
    },
  ];

  const onPush = criteria.find((c) => c.key === 'onpush')!.passed;
  const othersAllPass = criteria.filter((c) => c.key !== 'onpush').every((c) => c.passed);

  let classification: QualityClassification;
  if (!onPush) {
    classification = 'critico';
  } else if (!othersAllPass) {
    classification = 'atencao';
  } else {
    classification = 'aprovado';
  }

  return { filePath, criteria, classification };
}

export interface RouteAudit {
  routePath: string;
  lazy: boolean;
}

/** Rotas de redirect puro (`redirectTo`, sem `component`/`loadComponent`) não
 * referenciam nenhum componente — não fazem parte da auditoria de lazy
 * loading (achado testando de verdade em VS Code: as rotas `''` e `'**'`
 * típicas de um `app.routes.ts` real são redirects, e apareciam como
 * "❌ component direto" mesmo sem usar `component:` de jeito nenhum). */
export function auditRoutesLazyLoading(routesContent: string): RouteAudit[] {
  const audits: RouteAudit[] = [];
  const pathRe = /path\s*:\s*['"]([^'"]*)['"]/g;
  const matches = [...routesContent.matchAll(pathRe)];

  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index!;
    const end = i + 1 < matches.length ? matches[i + 1].index! : routesContent.length;
    const chunk = routesContent.slice(start, end);
    const hasLoadComponent = /loadComponent\s*:/.test(chunk);
    const hasComponent = /\bcomponent\s*:/.test(chunk);
    if (!hasLoadComponent && !hasComponent) {
      continue;
    }
    audits.push({ routePath: matches[i][1], lazy: hasLoadComponent });
  }

  return audits;
}

export async function findGeneratedComponents(rootDir: string): Promise<string[]> {
  const tsFiles = await findFiles(rootDir, (name) => name.endsWith('.component.ts') && !name.endsWith('.spec.ts'));
  const generated: string[] = [];
  for (const fullPath of tsFiles) {
    const content = await fs.readFile(fullPath, 'utf8');
    if (content.includes(GENERATED_MARKER)) {
      generated.push(fullPath);
    }
  }
  return generated;
}

export interface QualityAuditResult {
  results: ComponentQualityResult[];
  routes: RouteAudit[];
}

export async function runQualityAudit(rootDir: string): Promise<QualityAuditResult> {
  const generatedFiles = await findGeneratedComponents(rootDir);
  const results: ComponentQualityResult[] = [];
  for (const fullPath of generatedFiles) {
    const content = await fs.readFile(fullPath, 'utf8');
    const relativePath = path.relative(rootDir, fullPath).split(path.sep).join('/');
    results.push(evaluateComponentQuality(relativePath, content));
  }

  const routesPath = path.join(rootDir, 'src', 'app', 'app.routes.ts');
  const routesContent = await fs
    .readFile(routesPath, 'utf8')
    .catch(() => '');
  const routes = routesContent ? auditRoutesLazyLoading(routesContent) : [];

  return { results, routes };
}

function formatComponentBlock(result: ComponentQualityResult): string[] {
  const lines: string[] = [`${result.filePath} — ${result.criteria.filter((c) => c.passed).length}/4 critérios`];
  if (result.classification !== 'aprovado') {
    lines.push('| Critério              | Status | Ação sugerida |');
    lines.push('|-----------------------|--------|----------------|');
    for (const c of result.criteria) {
      lines.push(`| ${c.label.padEnd(21)} | ${c.passed ? '✅' : '❌'}     | ${c.passed ? '—' : c.suggestion} |`);
    }
  }
  return lines;
}

export function formatQualityReport(results: ComponentQualityResult[], routes: RouteAudit[]): string {
  const lines: string[] = ['## Relatório de Qualidade PO-UI', `Componentes: ${results.length} | Rotas: ${routes.length}`, ''];

  const aprovados = results.filter((r) => r.classification === 'aprovado');
  const atencao = results.filter((r) => r.classification === 'atencao');
  const criticos = results.filter((r) => r.classification === 'critico');

  lines.push(`### ✅ Aprovados (${aprovados.length})`);
  for (const r of aprovados) {
    lines.push(`- ${r.filePath} — 4/4 critérios`);
  }
  lines.push('');

  lines.push(`### ⚠️ Atenção necessária (${atencao.length})`);
  for (const r of atencao) {
    lines.push(...formatComponentBlock(r), '');
  }

  lines.push(`### 🔴 Críticos (${criticos.length})`);
  for (const r of criticos) {
    lines.push(...formatComponentBlock(r), '');
  }

  if (routes.length > 0) {
    lines.push('### Rotas auditadas (app.routes.ts)');
    lines.push('| Rota | Lazy loading |');
    lines.push('|------|--------------|');
    for (const route of routes) {
      lines.push(`| ${route.routePath} | ${route.lazy ? '✅ loadComponent' : '❌ component direto'} |`);
    }
    lines.push('');
  }

  lines.push(`Resumo: ${aprovados.length} aprovados · ${atencao.length} com atenção · ${criticos.length} críticos`);
  lines.push('Nenhuma alteração foi feita automaticamente. Edite os arquivos indicados para corrigir.');

  return lines.join('\n');
}
