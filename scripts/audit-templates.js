#!/usr/bin/env node
/**
 * audit-templates.js — valida os arquivos de template do poui-specialist
 *
 * Uso:
 *   node scripts/audit-templates.js           # audita todos os templates
 *   node scripts/audit-templates.js --strict  # falha com exit code 1 em qualquer aviso
 *
 * Regras verificadas:
 *   R1  Todo template deve ter título "# Template:" OU frontmatter YAML com "name:"
 *   R2  Todo template de componente deve ter ao menos um placeholder {{...}}
 *   R3  Templates com "export class" devem ter {{ComponentClass}} ou {{ServiceClass}}
 *   R4  Nenhum template deve conter nomes hard-coded do projeto de teste
 *   R5  Templates de componente devem ter {{kebab-name}}
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TEMPLATES_DIR = path.join(ROOT, 'skills', 'poui-code-generation');
const STRICT = process.argv.includes('--strict');

// Nomes hard-coded proibidos (do projeto de teste — não devem aparecer em templates genéricos)
const FORBIDDEN_NAMES = [
  'PedidoCompra', 'DivergenciasCartao', 'ConciliacaoCartao',
  'IndicadoresRh', 'ProcessamentoFolha', 'AprovacaoPedido',
  'Funcionarios', 'pedido-compra', 'divergencias-cartao',
  'conciliacao-cartao', 'indicadores-rh', 'processamento-folha',
];

// Templates onde {{ComponentClass}} não é obrigatório (têm classe própria ou são parciais HTML)
const CLASS_EXCEPTIONS = new Set([
  'templates-service.md',         // usa {{ServiceClass}}
  'templates-models.md',          // usa {{ModelInterface}}
  'templates-tlpp-contract.md',   // TLPP — sem Angular component
  'templates-refactor-from-tlpp.md', // instruções, não template fixo
  'templates-stacked-browse.md',  // arquivo de visão geral — delega para -ts.md e -html.md
  'templates-stacked-browse-html.md', // HTML parcial
  'templates-two-panel-browse.md',    // arquivo de visão geral
  'templates-two-panel-browse-html.md', // HTML parcial
]);

// Templates que legitimamente não têm placeholders {{...}} (overview, TLPP, ou estilo <tag>)
const NO_PLACEHOLDER_EXPECTED = new Set([
  'templates-models.md',          // usa notação de exemplo sem {{}} — tipagem TypeScript inline
  'templates-tlpp-contract.md',   // usa <entidade> estilo TLPP (angle brackets)
  'templates-stacked-browse.md',  // overview que referencia -ts.md e -html.md
  'templates-two-panel-browse.md',// overview que referencia -ts.md e -html.md
]);

// Templates que têm frontmatter YAML ao invés de título "# Template:" (legítimo)
const FRONTMATTER_TITLE = new Set([
  'templates-refactor-from-tlpp.md', // tem "name:" em frontmatter YAML
]);

// ─── Utilitários ────────────────────────────────────────────────────────────

let errors = 0;
let warnings = 0;
let passed = 0;

function fail(file, rule, msg) {
  console.error(`  ✗ [${rule}] ${msg}`);
  errors++;
}

function warn(file, rule, msg) {
  if (STRICT) {
    console.error(`  ✗ [${rule}] ${msg}`);
    errors++;
  } else {
    console.warn(`  ⚠ [${rule}] ${msg}`);
    warnings++;
  }
}

function ok(msg) {
  console.log(`  ✓ ${msg}`);
  passed++;
}

// ─── Leitura de templates ────────────────────────────────────────────────────

const templateFiles = fs.readdirSync(TEMPLATES_DIR)
  .filter(f => f.startsWith('templates-') && f.endsWith('.md'))
  .sort();

if (templateFiles.length === 0) {
  console.error(`ERRO: Nenhum template encontrado em ${TEMPLATES_DIR}`);
  process.exit(1);
}

console.log(`\n📋 Auditando ${templateFiles.length} templates em skills/poui-code-generation/\n`);

// ─── Auditoria por arquivo ───────────────────────────────────────────────────

for (const file of templateFiles) {
  const filePath = path.join(TEMPLATES_DIR, file);
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  console.log(`\n${file}`);

  // R1 — Título "# Template:" nas primeiras 3 linhas OU frontmatter YAML com "name:"
  const hasMdTitle = lines.slice(0, 3).some(l => l.startsWith('# Template:') || l.startsWith('# PO-UI') || l.startsWith('# Template '));
  const hasFrontmatterName = FRONTMATTER_TITLE.has(file) && lines.slice(0, 6).some(l => l.startsWith('name:'));
  if (!hasMdTitle && !hasFrontmatterName) {
    fail(file, 'R1', `Sem título "# Template:" nas primeiras 3 linhas (e sem frontmatter "name:")`);
  } else {
    ok('Título presente');
  }

  // R2 — Ao menos um placeholder {{...}} (exceto templates de overview/TLPP)
  const placeholders = content.match(/\{\{[^}]+\}\}/g) || [];
  if (placeholders.length === 0 && !NO_PLACEHOLDER_EXPECTED.has(file)) {
    fail(file, 'R2', 'Nenhum placeholder {{...}} encontrado');
  } else if (NO_PLACEHOLDER_EXPECTED.has(file)) {
    ok('Arquivo overview/TLPP — placeholder {{}} não obrigatório');
  } else {
    const unique = [...new Set(placeholders)].slice(0, 5).join(', ');
    ok(`${placeholders.length} placeholder(s): ${unique}${placeholders.length > 5 ? '…' : ''}`);
  }

  // R3 — "export class" → deve ter {{ComponentClass}} ou {{ServiceClass}}
  if (content.includes('export class') && !CLASS_EXCEPTIONS.has(file)) {
    const hasCompClass = content.includes('{{ComponentClass}}');
    const hasSvcClass = content.includes('{{ServiceClass}}');
    if (!hasCompClass && !hasSvcClass) {
      fail(file, 'R3', '"export class" presente mas sem {{ComponentClass}} nem {{ServiceClass}}');
    } else {
      ok(`Classe placeholder: ${hasCompClass ? '{{ComponentClass}}' : '{{ServiceClass}}'}`);
    }
  }

  // R4 — Sem nomes hard-coded do projeto de teste
  const found = FORBIDDEN_NAMES.filter(name => content.includes(name));
  if (found.length > 0) {
    warn(file, 'R4', `Nome(s) hard-coded do projeto de teste: ${found.join(', ')}`);
  } else {
    ok('Sem nomes hard-coded do projeto de teste');
  }

  // R5 — Templates de componente devem ter {{kebab-name}}
  if (!CLASS_EXCEPTIONS.has(file) && !file.includes('-html.md')) {
    if (!content.includes('{{kebab-name}}')) {
      warn(file, 'R5', 'Sem {{kebab-name}} — arquivo de componente geralmente precisa deste placeholder');
    } else {
      ok('{{kebab-name}} presente');
    }
  }

  // Nota: O header "@generated poui-specialist" é injetado pelo code-generator.md (Phase 3)
  // em tempo de geração, não faz parte dos templates em si. Não auditado aqui.
}

// ─── Resumo ──────────────────────────────────────────────────────────────────

console.log('\n' + '─'.repeat(60));
console.log(`\nResultado: ${passed} OK  |  ${warnings} avisos  |  ${errors} erros\n`);

if (errors > 0) {
  console.error(`❌ Auditoria falhou com ${errors} erro(s).`);
  process.exit(1);
} else if (warnings > 0) {
  console.warn(`⚠  Auditoria passou com ${warnings} aviso(s).${STRICT ? ' (modo --strict: isso seria um erro)' : ''}`);
  process.exit(0);
} else {
  console.log('✅ Todos os templates passaram na auditoria.');
  process.exit(0);
}
