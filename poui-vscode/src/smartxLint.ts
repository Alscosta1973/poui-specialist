import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { LintFinding, LintSeverity } from './lintRules';
import { applySmartxFixes, lintSmartxSource } from './smartxLintRules';

// Fontes Protheus costumam estar em cp1252: lidos e gravados como latin1 (1 byte = 1 caractere) para
// que o fix devolva exatamente os mesmos bytes fora do trecho alterado — também vale para UTF-8.
const ENCODING: BufferEncoding = 'latin1';
const SOURCE_RE = /\.(prw|prx|tlpp)$/i;
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'out', '.angular']);

export interface SmartxLintResult {
  files: string[];
  findings: LintFinding[];
}

/** Fontes `.prw`/`.prx`/`.tlpp` sob `rootDir` (caminhos relativos com `/`, ordenados). */
export async function findProtheusSources(rootDir: string): Promise<string[]> {
  const found: string[] = [];
  async function walk(dir: string): Promise<void> {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) {
          await walk(full);
        }
      } else if (SOURCE_RE.test(entry.name)) {
        found.push(path.relative(rootDir, full).split(path.sep).join('/'));
      }
    }
  }
  await walk(rootDir);
  return found.sort((a, b) => a.localeCompare(b));
}

export async function runSmartxLint(rootDir: string): Promise<SmartxLintResult> {
  const files = await findProtheusSources(rootDir);
  const findings: LintFinding[] = [];
  for (const file of files) {
    const content = await fs.readFile(path.join(rootDir, file), ENCODING);
    findings.push(...lintSmartxSource(file, content));
  }
  return { files, findings };
}

const SEVERITY_ORDER: LintSeverity[] = ['ERROR', 'WARNING', 'INFO'];
const SEVERITY_LABEL: Record<LintSeverity, string> = { ERROR: 'ERRORS', WARNING: 'WARNINGS', INFO: 'INFO' };

export function formatSmartxReport(rootLabel: string, result: SmartxLintResult): string {
  const lines = [`Smart X lint — ${rootLabel}`, '', `Fontes analisados: ${result.files.length}`, ''];
  if (result.findings.length === 0) {
    lines.push('Nenhum problema encontrado.');
    return lines.join('\n');
  }
  const count = (s: LintSeverity): number => result.findings.filter((f) => f.severity === s).length;
  for (const severity of SEVERITY_ORDER) {
    const doNivel = result.findings.filter((f) => f.severity === severity);
    if (doNivel.length === 0) {
      continue;
    }
    lines.push(`${SEVERITY_LABEL[severity]} (${doNivel.length}):`);
    for (const f of doNivel) {
      lines.push(`  ${f.file}:${f.line}   [${f.id}] ${f.message}`);
    }
    lines.push('');
  }
  lines.push(`Total: ${count('ERROR')} erro(s), ${count('WARNING')} aviso(s), ${count('INFO')} info(s)`);
  lines.push('Regras: skills/smartx/smartx-rules.md (plugin poui-specialist).');
  return lines.join('\n');
}

export interface SmartxFixOutcome {
  fixedSummaryLines: string[];
  manualReviewLines: string[];
}

/** Aplica os fixes seguros (SX02, SX06) arquivo a arquivo e separa o que continua manual. */
export async function applySmartxFixesToDisk(rootDir: string, result: SmartxLintResult): Promise<SmartxFixOutcome> {
  const fixedSummaryLines: string[] = [];
  const manualReviewLines: string[] = [];
  const porArquivo = new Map<string, LintFinding[]>();
  for (const f of result.findings) {
    porArquivo.set(f.file, [...(porArquivo.get(f.file) ?? []), f]);
  }
  for (const file of porArquivo.keys()) {
    const full = path.join(rootDir, file);
    const fix = applySmartxFixes(await fs.readFile(full, ENCODING));
    if (fix.appliedFixIds.length > 0) {
      await fs.writeFile(full, fix.content, ENCODING);
      for (const id of fix.appliedFixIds) {
        fixedSummaryLines.push(`✓ ${file} — [${id}] corrigido`);
      }
    }
    // o que sobra depois do fix (linhas já renumeradas) precisa de análise manual
    for (const f of lintSmartxSource(file, fix.content)) {
      manualReviewLines.push(`⚠ ${f.file}:${f.line} [${f.id}] — ${f.message}`);
    }
  }
  return { fixedSummaryLines, manualReviewLines };
}
