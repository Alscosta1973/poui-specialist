import { ComponentPairInput, LintFinding, findSubscribeBlocks } from './lintRules';

export interface LintFixResult {
  tsContent?: string;
  htmlContent?: string;
  appliedFixIds: string[];
}

/** IDs cujo fix é uma inserção/remoção de texto mecânica e segura o
 * suficiente para automatizar. H01/H02 (`*ngIf`/`*ngFor` → `@if`/`@for`)
 * ficam de fora desta fatia: exigem balancear a tag de fechamento em HTML
 * arbitrário, risco real de gerar template quebrado — apenas reportados. */
const AUTO_FIXABLE_IDS = new Set(['L01', 'L02', 'L06', 'L07', 'H03', 'H04', 'H06']);

function ensureAngularCoreImport(content: string, symbols: string[]): string {
  const importRe = /import\s*\{([^}]*)\}\s*from\s*'@angular\/core';/;
  const match = importRe.exec(content);
  if (match) {
    const names = match[1].split(',').map((s) => s.trim()).filter(Boolean);
    let changed = false;
    for (const symbol of symbols) {
      if (!names.includes(symbol)) {
        names.push(symbol);
        changed = true;
      }
    }
    if (!changed) {
      return content;
    }
    const newImport = `import { ${names.join(', ')} } from '@angular/core';`;
    return content.slice(0, match.index) + newImport + content.slice(match.index + match[0].length);
  }

  const insertion = `import { ${symbols.join(', ')} } from '@angular/core';\n`;
  const importLines = [...content.matchAll(/^import .+;$/gm)];
  const lastImport = importLines[importLines.length - 1];
  if (lastImport) {
    const insertAt = lastImport.index! + lastImport[0].length + 1;
    return content.slice(0, insertAt) + insertion + content.slice(insertAt);
  }
  return insertion + content;
}

function fixL01(tsContent: string): string {
  let updated = ensureAngularCoreImport(tsContent, ['ChangeDetectionStrategy']);
  updated = updated.replace(/@Component\s*\(\s*\{/, (m) => `${m}\n  changeDetection: ChangeDetectionStrategy.OnPush,`);
  return updated;
}

function fixL02(tsContent: string): string {
  let updated = ensureAngularCoreImport(tsContent, ['AfterViewInit', 'ChangeDetectorRef', 'inject']);

  const classRe = /export class (\w+)(\s+implements\s+([^{]+))?\s*\{/;
  const classMatch = classRe.exec(updated);
  if (!classMatch) {
    return updated;
  }

  const [full, , implementsClause, implementsList] = classMatch;
  let replacement: string;
  if (implementsClause) {
    const names = implementsList.split(',').map((s) => s.trim());
    if (!names.includes('AfterViewInit')) {
      names.push('AfterViewInit');
    }
    replacement = full.replace(implementsClause, ` implements ${names.join(', ')}`);
  } else {
    replacement = full.replace(/\{$/, 'implements AfterViewInit {');
  }

  const injection = [
    '',
    '  private readonly cdr = inject(ChangeDetectorRef);',
    '',
    '  ngAfterViewInit(): void {',
    '    setTimeout(() => this.cdr.detectChanges());',
    '  }',
  ].join('\n');

  updated = updated.slice(0, classMatch.index) + replacement + injection + updated.slice(classMatch.index + full.length);
  return updated;
}

/** Reescaneia `tsContent` diretamente (em vez de usar as linhas das findings
 * originais) porque fixes anteriores (L01/L02) podem ter deslocado o
 * conteúdo — depender de números de linha calculados antes deles quebraria
 * a inserção. */
function fixL06(tsContent: string): string {
  const insertions: { at: number; text: string }[] = [];
  for (const block of findSubscribeBlocks(tsContent)) {
    const openBraceMatch = /^\(\s*\{/.exec(block.body);
    if (!openBraceMatch) {
      continue; // forma função, não objeto — não mexe
    }
    if (/error\s*:/.test(block.body)) {
      continue;
    }
    insertions.push({ at: block.start + openBraceMatch[0].length, text: '\n    error: () => {},' });
  }
  let updated = tsContent;
  for (const insertion of insertions.sort((a, b) => b.at - a.at)) {
    updated = updated.slice(0, insertion.at) + insertion.text + updated.slice(insertion.at);
  }
  return updated;
}

function fixL07(tsContent: string, findings: LintFinding[]): string {
  const l07 = findings.filter((f) => f.id === 'L07' && f.fixable);
  if (l07.length === 0) {
    return tsContent;
  }
  return tsContent.replace(/error\s*:\s*\([^)]*\)\s*=>\s*\{([^}]*)\}/g, (match, body: string) => {
    if (/\.set\(\s*false\s*\)/.test(body)) {
      return match;
    }
    if (body.trim().length === 0) {
      return match.replace(/\{([^}]*)\}$/, '{ this.loading.set(false); }');
    }
    return match.replace(body, ` this.loading.set(false);${body}`);
  });
}

function fixH03(htmlContent: string): string {
  return htmlContent.replace(/@for\s*\(([^)]*)\)/g, (match, header: string) => {
    if (/\btrack\b/.test(header)) {
      return match;
    }
    return `@for (${header}; track $index)`;
  });
}

function fixH04(htmlContent: string): string {
  return htmlContent.replace(/\s+p-selected-rows(="[^"]*")?/g, '');
}

function fixH06(htmlContent: string): string {
  return htmlContent.replace(/\bp-max-length\b/g, 'p-maxlength');
}

export function applyLintFixes(input: ComponentPairInput, findings: LintFinding[]): LintFixResult {
  const appliedFixIds: string[] = [];
  let tsContent = input.tsContent;
  let htmlContent = input.htmlContent;

  const has = (id: string) => findings.some((f) => f.id === id && f.fixable && AUTO_FIXABLE_IDS.has(id));

  if (has('L01')) {
    tsContent = fixL01(tsContent);
    appliedFixIds.push('L01');
  }
  if (has('L02')) {
    tsContent = fixL02(tsContent);
    appliedFixIds.push('L02');
  }
  if (has('L06')) {
    const before = tsContent;
    tsContent = fixL06(tsContent);
    if (tsContent !== before) {
      appliedFixIds.push('L06');
    }
  }
  if (has('L07')) {
    const before = tsContent;
    tsContent = fixL07(tsContent, findings);
    if (tsContent !== before) {
      appliedFixIds.push('L07');
    }
  }
  if (htmlContent !== undefined) {
    if (has('H03')) {
      htmlContent = fixH03(htmlContent);
      appliedFixIds.push('H03');
    }
    if (has('H04')) {
      htmlContent = fixH04(htmlContent);
      appliedFixIds.push('H04');
    }
    if (has('H06')) {
      htmlContent = fixH06(htmlContent);
      appliedFixIds.push('H06');
    }
  }

  return { tsContent, htmlContent, appliedFixIds };
}
