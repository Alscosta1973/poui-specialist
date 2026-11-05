// Regras Smart X SX01..SX11 para fontes Protheus (.prw/.prx/.tlpp).
// Fonte única das regras: skills/smartx/smartx-rules.md (o teste do plugin confere que os IDs batem).
// Tudo aqui é determinístico (regex + parser de argumentos) — sem IA.
import { LintFinding, LintSeverity } from './lintRules';

export const SMARTX_RULE_IDS = ['SX01', 'SX02', 'SX03', 'SX04', 'SX05', 'SX06', 'SX07', 'SX08', 'SX09', 'SX10', 'SX11'] as const;
export type SmartxRuleId = (typeof SMARTX_RULE_IDS)[number];

/** De-para oficial de cores legadas → PO-UI (TDN "mBrowse/FWMBrowse - Abertura do browse utilizando Smart X"). */
const LEGACY_COLORS = new Set(
  [
    'DISABLE', 'ENABLE', 'BR_AZUL.BMP', 'BR_AMARELO.BMP', 'VERMELHO', 'RED', 'LARANJA', 'ORANGE', 'AMARELO', 'YELLOW',
    'BR_MARRON_OCEAN', 'MARROM', 'BROWN', 'VERDE', 'GREEN', 'VERDE_ESCURO', 'HGREEN', 'AZUL_CLARO', 'LBLUE', 'AZUL', 'BLUE',
    'VIOLETA', 'VIOLET', 'ROXO', 'PINK', 'BRANCO', 'WHITE', 'CINZA', 'GRAY', 'PRETO', 'BLACK',
    ...'0123456789ABC'.split('').map((c) => `BR_PRETO_${c}`),
  ].map((c) => c.toUpperCase()),
);

/** Cor aceita sem o parâmetro cColorPoUi: está no de-para ou já é um token PO-UI. */
export function isKnownLegendColor(color: string): boolean {
  const c = color.trim();
  return LEGACY_COLORS.has(c.toUpperCase()) || /^(caption-tag-\d{2}|color-\d{2})$/i.test(c);
}

/** Troca comentários `//` e `/* *\/` por espaços (mantém quebras de linha e posições); ignora o que está entre aspas. */
export function stripAdvplComments(src: string): string {
  const out = src.split('');
  let quote: string | undefined;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quote) {
      if (ch === quote || ch === '\n') {
        quote = undefined;
      }
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === '/' && src[i + 1] === '/') {
      while (i < src.length && src[i] !== '\n') {
        out[i] = ' ';
        i++;
      }
      i--;
      continue;
    }
    if (ch === '/' && src[i + 1] === '*') {
      const end = src.indexOf('*/', i + 2);
      const stop = end === -1 ? src.length : end + 2;
      for (let j = i; j < stop; j++) {
        if (src[j] !== '\n' && src[j] !== '\r') {
          out[j] = ' ';
        }
      }
      i = stop - 1;
    }
  }
  return out.join('');
}

interface ParsedList {
  /** Índice do caractere que fecha a lista (`)` ou `}`). */
  end: number;
  items: string[];
}

/** Lê uma lista separada por vírgula a partir do delimitador de abertura em `open` (`(` ou `{`),
 * respeitando aninhamento de ()/{}/[] e strings. */
function parseList(code: string, open: number): ParsedList | undefined {
  const closer: Record<string, string> = { '(': ')', '{': '}', '[': ']' };
  const stack: string[] = [];
  const items: string[] = [];
  let quote: string | undefined;
  let start = open + 1;
  for (let i = open; i < code.length; i++) {
    const ch = code[i];
    if (quote) {
      if (ch === quote) {
        quote = undefined;
      }
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (closer[ch]) {
      stack.push(closer[ch]);
    } else if (ch === ')' || ch === '}' || ch === ']') {
      if (stack.pop() !== ch) {
        return undefined;
      }
      if (stack.length === 0) {
        items.push(code.slice(start, i).trim());
        return { end: i, items };
      }
    } else if (ch === ',' && stack.length === 1) {
      items.push(code.slice(start, i).trim());
      start = i + 1;
    }
  }
  return undefined;
}

interface Call {
  index: number;
  open: number;
  end: number;
  args: string[];
}

/** Todas as chamadas `nome(` (regex sem o parêntese; case-insensitive) com seus argumentos. */
function findCalls(code: string, name: RegExp): Call[] {
  const calls: Call[] = [];
  const re = new RegExp(`${name.source}\\s*\\(`, 'gi');
  let m: RegExpExecArray | null;
  while ((m = re.exec(code))) {
    const open = m.index + m[0].length - 1;
    const list = parseList(code, open);
    if (list) {
      calls.push({ index: m.index, open, end: list.end, args: list.items });
    }
  }
  return calls;
}

function stringLiteral(arg: string | undefined): string | undefined {
  const m = /^(["'])([\s\S]*)\1$/.exec((arg ?? '').trim());
  return m ? m[2] : undefined;
}

/** Quantidade de elementos de um literal de array `{a, b}`; undefined se não for literal. */
function arrayLiteralSize(arg: string | undefined): number | undefined {
  const a = (arg ?? '').trim();
  if (!a.startsWith('{')) {
    return undefined;
  }
  const list = parseList(a, 0);
  return list ? list.items.filter((x) => x.length > 0).length : undefined;
}

function lineAt(content: string, index: number): number {
  return content.slice(0, index).split('\n').length;
}

/** Trechos de cada função/método (cabeçalho até o próximo cabeçalho). */
function functionBodies(code: string): { start: number; end: number }[] {
  const heads = [...code.matchAll(/^[ \t]*(?:static\s+|user\s+|main\s+)?(?:function|method)\s+[\w.]+/gim)].map((m) => m.index!);
  if (heads.length === 0) {
    return [{ start: 0, end: code.length }];
  }
  return heads.map((start, i) => ({ start, end: heads[i + 1] ?? code.length }));
}

const SMARTX_CALL = /setSmartX\s*\(/i;
const SMARTX_FUNCTION_CALL = /(?<![:\w.])setSmartX\s*\(/gi;

export function lintSmartxSource(filePath: string, content: string): LintFinding[] {
  const code = stripAdvplComments(content);
  const findings: LintFinding[] = [];
  const add = (id: SmartxRuleId, severity: LintSeverity, index: number, message: string, fixable = false): void => {
    findings.push({ id, severity, file: filePath, line: lineAt(code, index), message, fixable });
  };
  const usesSmartx = SMARTX_CALL.test(code);

  // SX01 — legenda com cor fora do de-para e sem cColorPoUi (6º parâmetro/elemento)
  if (usesSmartx) {
    const legendMsg = (cor: string): string =>
      `Cor "${cor}" fora do de-para e sem cColorPoUi (6º) — exceção "Cor inválida para a legenda"; informe "caption-tag-NN"`;
    for (const call of findCalls(code, /:\s*AddLegend/)) {
      const cor = stringLiteral(call.args[1]);
      if (cor !== undefined && !call.args[5] && !isKnownLegendColor(cor)) {
        add('SX01', 'ERROR', call.index, legendMsg(cor));
      }
    }
    const legendVars = new Set(
      findCalls(code, /\bmBrowse/)
        .map((c) => (c.args[10] ?? '').trim())
        .filter((v) => /^[A-Za-z_]\w*$/.test(v))
        .map((v) => v.toUpperCase()),
    );
    for (const call of findCalls(code, /\baAdd/)) {
      const alvo = (call.args[0] ?? '').trim().toUpperCase();
      const item = (call.args[1] ?? '').trim();
      if (!legendVars.has(alvo) || !item.startsWith('{')) {
        continue;
      }
      const elems = parseList(item, 0)?.items ?? [];
      const cor = stringLiteral(elems[1]);
      if (cor !== undefined && !elems[5] && !isKnownLegendColor(cor)) {
        add('SX01', 'ERROR', call.index, legendMsg(cor));
      }
    }
  }

  // SX02 / SX03 — addOnChange: um contexto e um campo por chamada
  for (const call of findCalls(code, /:\s*addOnChange/)) {
    const contexts = arrayLiteralSize(call.args[0]);
    if (contexts !== undefined && contexts > 1) {
      add('SX02', 'WARNING', call.index,
        `addOnChange com ${contexts} contextos — registre {"dataNew"} e {"dataEdit"} em chamadas separadas (senão o trigger não dispara em campo com X3_VALID)`,
        true);
    }
    const fields = arrayLiteralSize(call.args[1]);
    if (fields !== undefined && fields > 1) {
      add('SX03', 'ERROR', call.index, `addOnChange com ${fields} campos — o framework exige exatamente 1 campo por evento`);
    }
  }

  // SX04 — eventos só no Modelo
  const isInterface = /@totvsFrameworkStructureInterface\b/i.test(code);
  for (const call of findCalls(code, /\bsetEvents/)) {
    const before = code.slice(Math.max(0, call.index - 40), call.index);
    if (isInterface || /oInterface\s*:\s*$/i.test(before)) {
      add('SX04', 'ERROR', call.index, 'setEvents na Interface — eventos só no Modelo (addTriggers/addValidators/addInitializers/addEvents)');
    }
  }

  // SX05 / SX06 — proteção hasSmartX() e include fwmbrowse.ch
  const firstSmartx = code.search(SMARTX_CALL);
  if (firstSmartx >= 0 && !/hasSmartX\s*\(/i.test(code)) {
    add('SX05', 'WARNING', firstSmartx, 'setSmartX sem If hasSmartX() — ambiente sem os requisitos quebra a abertura');
  }
  const firstUse = code.search(/(?:has|set)SmartX\s*\(/i);
  if (firstUse >= 0 && !/#\s*include\s*["']fwmbrowse\.ch["']/i.test(code)) {
    add('SX06', 'WARNING', firstUse, 'hasSmartX/setSmartX sem #include "fwmbrowse.ch" (use a versão atual dos includes de framework)', true);
  }

  // SX07 / SX08 — filtros no browse convertido
  if (usesSmartx) {
    for (const call of findCalls(code, /\b(?:SetFilterDefault|AddFilterSmartX)/)) {
      const filtro = stringLiteral(call.args[0]);
      if (filtro !== undefined && filtro.trim() !== '' && !filtro.trim().startsWith('@')) {
        add('SX07', 'WARNING', call.index, `Filtro "${filtro.trim().slice(0, 40)}" sem @ — Smart X só aceita SQL com @ no início`);
      }
    }
    for (const call of findCalls(code, /\bDbSetFilter/)) {
      add('SX08', 'WARNING', call.index, 'DbSetFilter é ignorado no browse Smart X — converta para filtro SQL (SetFilterDefault("@ ..."))');
    }
  }

  // SX09 — addValidators substitui o X3_VALID
  for (const call of findCalls(code, /:\s*addValidators/)) {
    add('SX09', 'INFO', call.index, 'addValidators substitui o X3_VALID do campo — para só complementar use addTriggers');
  }

  // SX10 — BuildAdvplAction encadeada sem setHasResponse(.T.)
  for (const m of code.matchAll(/(\w+)\s*:=\s*[\w.]*BuildAdvplAction\s*\(\s*\)\s*:\s*new\s*\(/gi)) {
    const v = m[1];
    const hasAction = new RegExp(`\\b${v}\\s*:\\s*setAction\\s*\\(`, 'i').test(code);
    const hasResponse = new RegExp(`\\b${v}\\s*:\\s*setHasResponse\\s*\\(\\s*\\.T\\.\\s*\\)`, 'i').test(code);
    if (hasAction && !hasResponse) {
      add('SX10', 'WARNING', m.index!, `${v}: BuildAdvplAction com setAction e sem setHasResponse(.T.) — a ação seguinte não recebe a resposta`);
    }
  }

  // SX11 — setSmartX() função fora da função que chama o mBrowse
  for (const body of functionBodies(code)) {
    const trecho = code.slice(body.start, body.end);
    if (/\bmBrowse\s*\(/i.test(trecho)) {
      continue;
    }
    for (const m of trecho.matchAll(SMARTX_FUNCTION_CALL)) {
      add('SX11', 'ERROR', body.start + m.index!, 'setSmartX() precisa estar na mesma função que chama o mBrowse — fora dela gera exceção');
    }
  }

  return findings.sort((a, b) => a.line - b.line || a.id.localeCompare(b.id));
}

export interface SmartxFixResult {
  content: string;
  appliedFixIds: SmartxRuleId[];
}

/** Aplica os fixes seguros: SX02 (desdobra contextos de addOnChange em uma linha cada) e SX06 (inclui fwmbrowse.ch). */
export function applySmartxFixes(content: string): SmartxFixResult {
  const applied: SmartxRuleId[] = [];
  const eol = content.includes('\r\n') ? '\r\n' : '\n';
  let text = content;

  // SX02 — só chamadas que ocupam uma linha inteira (mesmo comprimento no código sem comentários)
  const code = stripAdvplComments(text);
  const calls = findCalls(code, /:\s*addOnChange/).filter((c) => (arrayLiteralSize(c.args[0]) ?? 0) > 1);
  for (const call of calls.reverse()) {
    const lineStart = code.lastIndexOf('\n', call.index) + 1;
    const nl = code.indexOf('\n', call.end);
    const lineEnd = nl === -1 ? code.length : nl;
    const prefix = text.slice(lineStart, call.index);
    const tail = text.slice(call.end + 1, lineEnd);
    if (text.slice(call.index, call.end + 1).includes('\n') || tail.replace(/\r$/, '').trim() !== '') {
      continue;
    }
    const contexts = parseList(call.args[0], 0)!.items.filter((x) => x.length > 0);
    const head = text.slice(call.index, call.open + 1);
    const resto = call.args.slice(1).join(', ');
    const indent = /^\s*/.exec(prefix)![0];
    const lines = contexts.map((ctx, i) => `${i === 0 ? prefix : indent + prefix.trimStart()}${head}{${ctx}}, ${resto})`);
    text = text.slice(0, lineStart) + lines.join(eol) + tail + text.slice(lineEnd);
    if (!applied.includes('SX02')) {
      applied.push('SX02');
    }
  }

  // SX06 — include depois do último #include
  const findings = lintSmartxSource('', text);
  if (findings.some((f) => f.id === 'SX06')) {
    const includes = [...text.matchAll(/^[ \t]*#\s*include\b.*$/gim)];
    const linha = `#include "fwmbrowse.ch"`;
    if (includes.length > 0) {
      const last = includes[includes.length - 1];
      const pos = last.index! + last[0].replace(/\r$/, '').length;
      text = text.slice(0, pos) + eol + linha + text.slice(pos);
    } else {
      text = linha + eol + text;
    }
    applied.push('SX06');
  }

  return { content: text, appliedFixIds: applied.sort() as SmartxRuleId[] };
}
