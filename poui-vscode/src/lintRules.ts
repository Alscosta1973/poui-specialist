export type LintSeverity = 'ERROR' | 'WARNING' | 'INFO';

export interface LintFinding {
  id: string;
  severity: LintSeverity;
  file: string;
  line: number;
  message: string;
  fixable: boolean;
}

export interface ComponentPairInput {
  tsPath: string;
  tsContent: string;
  htmlPath?: string;
  htmlContent?: string;
}

function lineAt(content: string, index: number): number {
  return content.slice(0, index).split('\n').length;
}

/** Localiza o `)` que fecha o `(` em `openParenIndex`, respeitando aninhamento. */
function findMatchingParen(content: string, openParenIndex: number): number {
  let depth = 0;
  for (let i = openParenIndex; i < content.length; i++) {
    if (content[i] === '(') {
      depth++;
    } else if (content[i] === ')') {
      depth--;
      if (depth === 0) {
        return i;
      }
    }
  }
  return -1;
}

export function findSubscribeBlocks(content: string): { start: number; end: number; body: string }[] {
  const blocks: { start: number; end: number; body: string }[] = [];
  const re = /\.subscribe\s*\(/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(content))) {
    const openParenIndex = match.index + match[0].length - 1;
    const closeParenIndex = findMatchingParen(content, openParenIndex);
    if (closeParenIndex === -1) {
      continue;
    }
    blocks.push({
      start: openParenIndex,
      end: closeParenIndex,
      body: content.slice(openParenIndex, closeParenIndex + 1),
    });
  }
  return blocks;
}

/** `.pipe(finalize(() => loading.set(false)), ...)` antes de um `.subscribe(`
 * já garante o reset de loading em sucesso E erro — o padrão que o próprio
 * gerador do plugin usa. Sem essa checagem, L07 falso-positivava em todo
 * componente gerado com esse padrão (achado testando de verdade no VS
 * Code). Olha só o `.pipe(` mais próximo antes do `.subscribe(` — se tiver
 * `finalize(` com `.set(false)` dentro dessa janela, considera resolvido. */
function hasFinalizeLoadingReset(tsContent: string, subscribeStart: number): boolean {
  const windowStart = Math.max(0, subscribeStart - 500);
  const prefix = tsContent.slice(windowStart, subscribeStart);
  const pipeIndex = prefix.lastIndexOf('.pipe(');
  if (pipeIndex === -1) {
    return false;
  }
  const pipeSection = prefix.slice(pipeIndex);
  return /finalize\s*\(/.test(pipeSection) && /\.set\(\s*false\s*\)/.test(pipeSection);
}

function lintTs(tsPath: string, tsContent: string, htmlContent: string | undefined): LintFinding[] {
  const findings: LintFinding[] = [];

  // L01 — ChangeDetectionStrategy.OnPush ausente
  if (!/ChangeDetectionStrategy\.OnPush/.test(tsContent)) {
    const idx = tsContent.search(/@Component\s*\(/);
    findings.push({
      id: 'L01',
      severity: 'ERROR',
      file: tsPath,
      line: idx >= 0 ? lineAt(tsContent, idx) : 1,
      message: 'ChangeDetectionStrategy.OnPush ausente',
      fixable: true,
    });
  }

  // L02 — po-page-* no template sem ngAfterViewInit + detectChanges (Quirk #1)
  const usesPoPage = htmlContent ? /<po-page-[a-z-]+/i.test(htmlContent) : false;
  if (usesPoPage && !/ngAfterViewInit/.test(tsContent)) {
    findings.push({
      id: 'L02',
      severity: 'ERROR',
      file: tsPath,
      line: 1,
      message: 'Componente com po-page-* sem ngAfterViewInit + detectChanges (Quirk #1)',
      fixable: true,
    });
  }

  // L03 — estado local com `public x =` em vez de signal()
  for (const m of tsContent.matchAll(/^\s*public\s+\w+\s*=\s*(\S.*)$/gm)) {
    if (!m[1].trim().startsWith('signal(')) {
      findings.push({
        id: 'L03',
        severity: 'WARNING',
        file: tsPath,
        line: lineAt(tsContent, m.index!),
        message: 'Estado local com "public x =" em vez de signal()',
        fixable: false,
      });
    }
  }

  // L04 — @Input() em vez de input()
  for (const m of tsContent.matchAll(/@Input\(\)/g)) {
    findings.push({
      id: 'L04',
      severity: 'WARNING',
      file: tsPath,
      line: lineAt(tsContent, m.index!),
      message: '@Input() em vez de input()',
      fixable: false,
    });
  }

  // L05 — inject() não usado, construtor com muitos parâmetros
  const ctorMatch = /constructor\s*\(([^)]*)\)/.exec(tsContent);
  if (ctorMatch) {
    const params = ctorMatch[1].trim();
    const paramCount = params.length === 0 ? 0 : params.split(',').length;
    const usesInject = /\binject\(/.test(tsContent);
    if (paramCount > 2 && !usesInject) {
      findings.push({
        id: 'L05',
        severity: 'ERROR',
        file: tsPath,
        line: lineAt(tsContent, ctorMatch.index),
        message: 'inject() não usado — construtor com muitos parâmetros',
        fixable: false,
      });
    }
  }

  // L06 / L07 — subscribe() sem callback error: / error: sem loading.set(false)
  for (const block of findSubscribeBlocks(tsContent)) {
    const isObjectForm = /^\(\s*\{/.test(block.body);
    const hasError = /error\s*:/.test(block.body);
    if (!hasError) {
      findings.push({
        id: 'L06',
        severity: 'WARNING',
        file: tsPath,
        line: lineAt(tsContent, block.start),
        message: 'subscribe() sem callback error: — loading pode travar',
        fixable: isObjectForm,
      });
      continue;
    }
    const errorMatch = /error\s*:\s*\([^)]*\)\s*=>\s*\{/.exec(block.body);
    const errorBodyIsBlock = errorMatch !== null;
    if (!/\.set\(\s*false\s*\)/.test(block.body) && !hasFinalizeLoadingReset(tsContent, block.start)) {
      findings.push({
        id: 'L07',
        severity: 'ERROR',
        file: tsPath,
        line: lineAt(tsContent, block.start),
        message: 'Ausência de loading.set(false) no callback error:',
        fixable: errorBodyIsBlock,
      });
    }
  }

  return findings;
}

function lintHtml(htmlPath: string, htmlContent: string, tsContent: string): LintFinding[] {
  const findings: LintFinding[] = [];
  const isOnPush = /ChangeDetectionStrategy\.OnPush/.test(tsContent);

  // H01 — *ngIf em vez de @if
  for (const m of htmlContent.matchAll(/\*ngIf/g)) {
    findings.push({
      id: 'H01',
      severity: 'INFO',
      file: htmlPath,
      line: lineAt(htmlContent, m.index!),
      message: '*ngIf em vez de @if (Angular 17+ Control Flow)',
      fixable: false,
    });
  }

  // H02 — *ngFor em vez de @for
  for (const m of htmlContent.matchAll(/\*ngFor/g)) {
    findings.push({
      id: 'H02',
      severity: 'INFO',
      file: htmlPath,
      line: lineAt(htmlContent, m.index!),
      message: '*ngFor em vez de @for (Angular 17+ Control Flow)',
      fixable: false,
    });
  }

  // H03 — @for sem track expression
  const forRe = /@for\s*\(/g;
  let forMatch: RegExpExecArray | null;
  while ((forMatch = forRe.exec(htmlContent))) {
    const openParenIndex = forMatch.index + forMatch[0].length - 1;
    const closeParenIndex = findMatchingParen(htmlContent, openParenIndex);
    if (closeParenIndex === -1) {
      continue;
    }
    const header = htmlContent.slice(openParenIndex, closeParenIndex + 1);
    if (!/\btrack\b/.test(header)) {
      findings.push({
        id: 'H03',
        severity: 'WARNING',
        file: htmlPath,
        line: lineAt(htmlContent, forMatch.index),
        message: '@for sem track expression — impacto em performance',
        fixable: true,
      });
    }
  }

  // H04 — p-selected-rows em po-table (não existe)
  const poTableRe = /<po-table\b[^>]*>/gi;
  let tableMatch: RegExpExecArray | null;
  while ((tableMatch = poTableRe.exec(htmlContent))) {
    const tag = tableMatch[0];
    if (/p-selected-rows/.test(tag)) {
      findings.push({
        id: 'H04',
        severity: 'ERROR',
        file: htmlPath,
        line: lineAt(htmlContent, tableMatch.index),
        message: 'p-selected-rows em po-table (não existe) (Quirk #6)',
        fixable: true,
      });
    }
    // H05 — po-table sem [p-height] em componente OnPush
    if (isOnPush && !/\[p-height\]/.test(tag)) {
      findings.push({
        id: 'H05',
        severity: 'WARNING',
        file: htmlPath,
        line: lineAt(htmlContent, tableMatch.index),
        message: 'po-table sem [p-height] em componente OnPush (Quirk #12)',
        fixable: false,
      });
    }
  }

  // H06 — p-max-length em vez de p-maxlength
  for (const m of htmlContent.matchAll(/\bp-max-length\b/g)) {
    findings.push({
      id: 'H06',
      severity: 'WARNING',
      file: htmlPath,
      line: lineAt(htmlContent, m.index!),
      message: 'p-max-length em vez de p-maxlength (Quirk #4)',
      fixable: true,
    });
  }

  // H07 — (p-value-change) em po-dynamic-form (não existe)
  const dynFormRe = /<po-dynamic-form\b[^>]*>/gi;
  let dynFormMatch: RegExpExecArray | null;
  while ((dynFormMatch = dynFormRe.exec(htmlContent))) {
    if (/\(p-value-change\)/.test(dynFormMatch[0])) {
      findings.push({
        id: 'H07',
        severity: 'ERROR',
        file: htmlPath,
        line: lineAt(htmlContent, dynFormMatch.index),
        message: '(p-value-change) em po-dynamic-form (não existe) (Quirk #13)',
        fixable: false,
      });
    }
  }

  return findings;
}

export function lintComponentPair(input: ComponentPairInput): LintFinding[] {
  const findings = lintTs(input.tsPath, input.tsContent, input.htmlContent);
  if (input.htmlPath && input.htmlContent !== undefined) {
    findings.push(...lintHtml(input.htmlPath, input.htmlContent, input.tsContent));
  }
  return findings;
}
