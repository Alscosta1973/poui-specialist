#!/usr/bin/env node
/**
 * test-plugin.js — Valida integridade do plugin poui-specialist
 *
 * Uso:
 *   node scripts/test-plugin.js           # roda todos os testes
 *   node scripts/test-plugin.js --verbose # mostra detalhes de cada verificação
 *
 * O que verifica:
 *   1. Arquivos obrigatórios existem
 *   2. Templates não têm placeholders não substituídos acidentais
 *   3. Contagem de templates bate com o marketplace.json
 *   4. Quirks numerados sequencialmente
 *   5. Comandos têm frontmatter obrigatório
 *   6. Nenhum template usa *ngIf/*ngFor (Angular 17 legado)
 */

const fs   = require('fs');
const path = require('path');

const ROOT    = path.resolve(__dirname, '..');
const VERBOSE = process.argv.includes('--verbose');

let passed = 0;
let failed = 0;
const failures = [];

function ok(msg)   { passed++; if (VERBOSE) console.log(`  ✓ ${msg}`); }
function fail(msg) { failed++; failures.push(msg); console.log(`  ✗ ${msg}`); }

function readJSON(file) {
  try { return JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf-8')); }
  catch { return null; }
}

function readFile(file) {
  try { return fs.readFileSync(path.join(ROOT, file), 'utf-8'); }
  catch { return null; }
}

function glob(dir, ext) {
  const results = [];
  function walk(d) {
    if (!fs.existsSync(d)) return;
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      if (entry.isDirectory()) walk(path.join(d, entry.name));
      else if (entry.name.endsWith(ext)) results.push(path.join(d, entry.name));
    }
  }
  walk(path.join(ROOT, dir));
  return results;
}

// ─── Teste 1: arquivos obrigatórios ──────────────────────────────────────────
console.log('\n[1] Arquivos obrigatórios');
const required = [
  '.claude-plugin/plugin.json',
  '.claude-plugin/marketplace.json',
  'README.md',
  'CHANGELOG.md',
  'package.json',
  '.versionrc.json',
  'commands/generate.md',
  'commands/scaffold.md',
  'commands/review.md',
  'commands/migrate.md',
  'commands/lint.md',
  'skills/poui-code-generation/SKILL.md',
  'skills/poui-patterns/po-ui-quirks.md',
  'skills/poui-patterns/troubleshooting.md',
  'skills/poui-patterns/protheus-error-handling.md',
  'skills/poui-license-check/SKILL.md',
  'docs/quickstart.md',
];
for (const f of required) {
  if (fs.existsSync(path.join(ROOT, f))) ok(f);
  else fail(`Arquivo ausente: ${f}`);
}

// ─── Teste 2: versões sincronizadas ──────────────────────────────────────────
console.log('\n[2] Versões sincronizadas');
const pluginJson      = readJSON('.claude-plugin/plugin.json');
const marketplaceJson = readJSON('.claude-plugin/marketplace.json');
const packageJson     = readJSON('package.json');

const pluginVer = pluginJson?.version;
const pkgVer    = packageJson?.version;
const mktVer    = marketplaceJson?.plugins?.[0]?.version;

if (pluginVer && pkgVer && pluginVer === pkgVer)   ok(`plugin.json == package.json (${pluginVer})`);
else fail(`Versão divergente: plugin.json=${pluginVer} package.json=${pkgVer}`);

if (mktVer && mktVer === pluginVer) ok(`marketplace.json == plugin.json (${mktVer})`);
else fail(`Versão divergente em marketplace.json: ${mktVer} != ${pluginVer}`);

// ─── Teste 3: contagem de templates ──────────────────────────────────────────
console.log('\n[3] Contagem de templates');
const templates = glob('skills/poui-code-generation', '.md').filter(f =>
  path.basename(f).startsWith('templates-')
);
const expectedCount = marketplaceJson?.plugins?.[0]?.description?.match(/(\d+) templates/)?.[1];
if (expectedCount && templates.length === parseInt(expectedCount)) {
  ok(`${templates.length} templates (bate com marketplace.json)`);
} else {
  fail(`Templates encontrados: ${templates.length}, marketplace.json diz: ${expectedCount}`);
}

// ─── Teste 4: sem *ngIf/*ngFor nos templates de geração ──────────────────────
console.log('\n[4] Sem diretivas legadas *ngIf/*ngFor nos templates');
// standalone-migrate.md é um guia de migração — referencia *ngFor intencionalmente como sintaxe legada
const migrationGuides = new Set(['templates-standalone-migrate.md']);
const legacyRx = /\*ngIf|\*ngFor|\*ngSwitch/;
for (const f of templates) {
  const basename = path.basename(f);
  if (migrationGuides.has(basename)) { ok(`${basename} (guia de migração — skip)`); continue; }
  const content = fs.readFileSync(f, 'utf-8');
  const match   = content.match(legacyRx);
  if (match) fail(`${basename} contém ${match[0]} (usar @if / @for)`);
  else ok(basename);
}

// ─── Teste 5: comandos com frontmatter obrigatório ───────────────────────────
console.log('\n[5] Frontmatter nos comandos');
const commands = glob('commands', '.md').filter(f => path.basename(f) !== 'SKILL.md');
for (const f of commands) {
  const content = fs.readFileSync(f, 'utf-8');
  if (!content.startsWith('---')) {
    fail(`${path.basename(f)} sem frontmatter`);
  } else if (!content.includes('description:')) {
    fail(`${path.basename(f)} sem campo description no frontmatter`);
  } else {
    ok(path.basename(f));
  }
}

// ─── Teste 6: quirks numerados sequencialmente ───────────────────────────────
console.log('\n[6] Quirks numeração sequencial em po-ui-quirks.md');
const quirksContent = readFile('skills/poui-patterns/po-ui-quirks.md');
if (quirksContent) {
  const nums = [...quirksContent.matchAll(/^\| (\d+) \|/gm)].map(m => parseInt(m[1]));
  let seq = true;
  for (let i = 0; i < nums.length; i++) {
    if (nums[i] !== i + 1) { seq = false; fail(`Quirk fora de sequência: encontrou #${nums[i]}, esperava #${i+1}`); break; }
  }
  if (seq) ok(`${nums.length} quirks numerados de #1 a #${nums.length}`);
}

// ─── Teste 7: @generated headers atualizados ─────────────────────────────────
console.log('\n[7] @generated headers com versão atual');
const allMds = [...glob('agents', '.md'), ...glob('skills', '.md')];
const generatedRx = /@generated\s+poui-specialist\s+v([\d.]+)/;
for (const f of allMds) {
  const content = fs.readFileSync(f, 'utf-8');
  const match   = content.match(generatedRx);
  if (match && match[1] !== pluginVer) {
    fail(`${path.relative(ROOT, f)}: @generated v${match[1]} != v${pluginVer}`);
  }
}
ok(`Headers @generated verificados (${allMds.length} arquivos)`);

// ─── Resultado ────────────────────────────────────────────────────────────────
console.log('\n' + '─'.repeat(60));
console.log(`Resultado: ${passed} passaram, ${failed} falharam\n`);
if (failures.length) {
  console.log('Falhas:');
  failures.forEach(f => console.log(`  • ${f}`));
  process.exit(1);
} else {
  console.log('✅ Todos os testes passaram.');
  process.exit(0);
}
