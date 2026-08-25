import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { lintComponentPair, LintFinding, LintSeverity } from './lintRules';
import { applyLintFixes } from './lintFixes';
import { findFiles } from './fsWalk';

export interface ComponentPairPath {
  tsPath: string;
  htmlPath?: string;
}

export interface LintRunResult {
  pairs: ComponentPairPath[];
  findings: LintFinding[];
}

/** Casa cada `*.component.ts` (ignorando `*.component.spec.ts`) sob `rootDir`
 * com o `.html` irmão, quando existir. */
export async function findComponentPairs(rootDir: string): Promise<ComponentPairPath[]> {
  const tsFiles = await findFiles(rootDir, (name) => name.endsWith('.component.ts') && !name.endsWith('.spec.ts'));
  const pairs: ComponentPairPath[] = [];

  for (const fullPath of tsFiles) {
    const htmlPath = fullPath.replace(/\.ts$/, '.html');
    const hasHtml = await fs
      .access(htmlPath)
      .then(() => true)
      .catch(() => false);
    pairs.push({
      tsPath: path.relative(rootDir, fullPath).split(path.sep).join('/'),
      htmlPath: hasHtml ? path.relative(rootDir, htmlPath).split(path.sep).join('/') : undefined,
    });
  }

  return pairs;
}

export async function runLint(rootDir: string): Promise<LintRunResult> {
  const pairs = await findComponentPairs(rootDir);
  const findings: LintFinding[] = [];

  for (const pair of pairs) {
    const tsContent = await fs.readFile(path.join(rootDir, pair.tsPath), 'utf8');
    const htmlContent = pair.htmlPath ? await fs.readFile(path.join(rootDir, pair.htmlPath), 'utf8') : undefined;
    findings.push(
      ...lintComponentPair({
        tsPath: pair.tsPath,
        tsContent,
        htmlPath: pair.htmlPath,
        htmlContent,
      }),
    );
  }

  return { pairs, findings };
}

const SEVERITY_ORDER: LintSeverity[] = ['ERROR', 'WARNING', 'INFO'];
const SEVERITY_LABEL: Record<LintSeverity, string> = { ERROR: 'ERRORS', WARNING: 'WARNINGS', INFO: 'INFO' };

export function formatLintReport(rootLabel: string, result: LintRunResult): string {
  const lines: string[] = [`/poui-specialist:lint — ${rootLabel}`, ''];
  lines.push(`Arquivos analisados: ${result.pairs.length} componente(s)`, '');

  if (result.findings.length === 0) {
    lines.push('Nenhum problema encontrado.');
    return lines.join('\n');
  }

  const bySeverity = new Map<LintSeverity, LintFinding[]>();
  for (const severity of SEVERITY_ORDER) {
    bySeverity.set(severity, []);
  }
  for (const finding of result.findings) {
    bySeverity.get(finding.severity)!.push(finding);
  }

  for (const severity of SEVERITY_ORDER) {
    const findings = bySeverity.get(severity)!;
    if (findings.length === 0) {
      continue;
    }
    lines.push(`${SEVERITY_LABEL[severity]} (${findings.length}):`);
    for (const f of findings) {
      lines.push(`  ${f.file}:${f.line}   [${f.id}] ${f.message}`);
    }
    lines.push('');
  }

  const errorCount = bySeverity.get('ERROR')!.length;
  const warningCount = bySeverity.get('WARNING')!.length;
  const infoCount = bySeverity.get('INFO')!.length;
  lines.push(`Total: ${errorCount} erro(s), ${warningCount} aviso(s), ${infoCount} info(s)`);

  return lines.join('\n');
}

export interface ApplyFixesOutcome {
  fixedSummaryLines: string[];
  manualReviewLines: string[];
}

/** Aplica os fixes automáticos disponíveis, escreve os arquivos de volta e
 * separa o que foi corrigido do que ainda precisa de revisão manual (achados
 * `fixable: false`, ou `fixable: true` no relatório mas cuja forma real do
 * código não bateu com o padrão automatizável). */
export async function applyLintFixesToDisk(rootDir: string, result: LintRunResult): Promise<ApplyFixesOutcome> {
  const fixedSummaryLines: string[] = [];
  const manualReviewLines: string[] = [];

  for (const pair of result.pairs) {
    const findings = result.findings.filter((f) => f.file === pair.tsPath || f.file === pair.htmlPath);
    if (findings.length === 0) {
      continue;
    }

    const tsContent = await fs.readFile(path.join(rootDir, pair.tsPath), 'utf8');
    const htmlContent = pair.htmlPath ? await fs.readFile(path.join(rootDir, pair.htmlPath), 'utf8') : undefined;

    const fixResult = applyLintFixes(
      { tsPath: pair.tsPath, tsContent, htmlPath: pair.htmlPath, htmlContent },
      findings,
    );

    if (fixResult.appliedFixIds.length > 0) {
      await fs.writeFile(path.join(rootDir, pair.tsPath), fixResult.tsContent ?? tsContent, 'utf8');
      if (pair.htmlPath && fixResult.htmlContent !== undefined) {
        await fs.writeFile(path.join(rootDir, pair.htmlPath), fixResult.htmlContent, 'utf8');
      }
      for (const id of fixResult.appliedFixIds) {
        fixedSummaryLines.push(`✓ ${pair.tsPath} — [${id}] corrigido`);
      }
    }

    for (const finding of findings) {
      if (!fixResult.appliedFixIds.includes(finding.id)) {
        manualReviewLines.push(`⚠ ${finding.file}:${finding.line} [${finding.id}] — ${finding.message}`);
      }
    }
  }

  return { fixedSummaryLines, manualReviewLines };
}
