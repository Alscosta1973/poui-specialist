#!/usr/bin/env node
/**
 * sync-docs.js — sincroniza versão e contadores do plugin com o site de documentação
 *
 * Uso:
 *   node scripts/sync-docs.js           # exibe diff e aplica as mudanças
 *   node scripts/sync-docs.js --dry-run # exibe diff sem escrever nada
 *   node scripts/sync-docs.js --check   # retorna exit 1 se docs estiver desatualizado
 *
 * Fontes (lidos do plugin):
 *   .claude-plugin/plugin.json          → versão
 *   commands/*.md                       → contagem de comandos
 *   agents/code-generator.md + code-reviewer.md → contagem de agentes públicos (2)
 *   skills/poui-code-generation/templates-*.md → contagem de templates
 *   commands/generate.md                → lista de tipos válidos
 *   skills/poui-patterns/po-ui-quirks.md → contagem de quirks
 *
 * Alvos (escritos no site de docs):
 *   ../poui-specialist-docs/app/page.tsx
 *   ../poui-specialist-docs/content/docs/index.mdx
 */

const fs = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');
const CHECK   = process.argv.includes('--check');

const PLUGIN_ROOT = path.resolve(__dirname, '..');
const DOCS_ROOT   = path.resolve(PLUGIN_ROOT, '..', 'poui-specialist-docs');

// ─── Validações iniciais ─────────────────────────────────────────────────────

if (!fs.existsSync(DOCS_ROOT)) {
  console.error(`❌ Diretório de docs não encontrado: ${DOCS_ROOT}`);
  console.error('   Clone o repositório poui-specialist-docs em paralelo ao poui-specialist.');
  process.exit(1);
}

// ─── Leitura de fontes ───────────────────────────────────────────────────────

// Versão
const pluginJson = JSON.parse(fs.readFileSync(path.join(PLUGIN_ROOT, '.claude-plugin', 'plugin.json'), 'utf8'));
const version = pluginJson.version;            // ex: "1.5.1"
const versionTag = `v${version}`;             // ex: "v1.5.1"

// Contagem de comandos (arquivos .md em commands/)
const commandsDir = path.join(PLUGIN_ROOT, 'commands');
const commandCount = fs.readdirSync(commandsDir).filter(f => f.endsWith('.md')).length;

// Contagem de agentes públicos (exclui os especializados -list/-forms/-infra)
const agentsDir = path.join(PLUGIN_ROOT, 'agents');
const publicAgents = fs.readdirSync(agentsDir)
  .filter(f => f.endsWith('.md') && !f.includes('-list') && !f.includes('-forms') && !f.includes('-infra'));
const agentCount = publicAgents.length;

// Contagem de templates
const templatesDir = path.join(PLUGIN_ROOT, 'skills', 'poui-code-generation');
const templateCount = fs.readdirSync(templatesDir).filter(f => f.startsWith('templates-') && f.endsWith('.md')).length;

// Contagem de tipos válidos a partir de generate.md
const generateMd = fs.readFileSync(path.join(PLUGIN_ROOT, 'commands', 'generate.md'), 'utf8');
const typeMatches = generateMd.match(/^\| `([a-z][a-z-]+)` \|/gm) || [];
const typeCount = typeMatches.length;

// Contagem de quirks a partir do índice
const quirksIndexPath = path.join(PLUGIN_ROOT, 'skills', 'poui-patterns', 'po-ui-quirks.md');
const quirksContent = fs.readFileSync(quirksIndexPath, 'utf8');
const quirkLines = quirksContent.match(/^\| \d+ \|/gm) || [];
const quirkCount = quirkLines.length;

// ─── Exibir resumo de fontes ─────────────────────────────────────────────────

console.log('\n📦 Estado do plugin:');
console.log(`   Versão:    ${versionTag}`);
console.log(`   Comandos:  ${commandCount}`);
console.log(`   Agentes:   ${agentCount} públicos`);
console.log(`   Templates: ${templateCount}`);
console.log(`   Tipos:     ${typeCount}`);
console.log(`   Quirks:    ${quirkCount}`);

// ─── Targets ────────────────────────────────────────────────────────────────

const targets = [
  {
    file: path.join(DOCS_ROOT, 'app', 'page.tsx'),
    label: 'app/page.tsx',
    replacements: [
      // Versão
      {
        pattern: /const PLUGIN_VERSION = 'v[\d.]+';/,
        replacement: `const PLUGIN_VERSION = '${versionTag}';`,
        label: 'PLUGIN_VERSION',
      },
      // Contagem de agentes (número dentro do <span> antes de "Agentes")
      {
        pattern: /(<span className="text-3xl font-bold">\s*)\d+(\s*<\/span>\s*\n\s*<span className="text-sm font-medium">Agentes<\/span>)/,
        replacement: `$1${agentCount}$2`,
        label: 'stat Agentes',
      },
      // Contagem de comandos
      {
        pattern: /(<span className="text-3xl font-bold">\s*)\d+(\s*<\/span>\s*\n\s*<span className="text-sm font-medium">Comandos<\/span>)/,
        replacement: `$1${commandCount}$2`,
        label: 'stat Comandos',
      },
      // Contagem de templates
      {
        pattern: /(<span className="text-3xl font-bold">\s*)\d+(\s*<\/span>\s*\n\s*<span className="text-sm font-medium">Templates<\/span>)/,
        replacement: `$1${templateCount}$2`,
        label: 'stat Templates',
      },
    ],
  },
  {
    file: path.join(DOCS_ROOT, 'content', 'docs', 'index.mdx'),
    label: 'content/docs/index.mdx',
    replacements: [
      // Linha de templates na tabela de estrutura
      {
        pattern: /(\| \*\*Templates\*\* \| )\d+ templates[^|]*/,
        replacement: `$1${templateCount} templates de geração de código `,
        label: 'tabela Templates',
      },
      // "mais X tipos" na lista de features
      {
        pattern: /e mais \d+ tipos/,
        replacement: `e mais ${typeCount - 5} tipos`,
        label: 'contagem de tipos extras',
      },
    ],
  },
  {
    file: path.join(DOCS_ROOT, 'content', 'docs', 'agentes', 'code-generator.mdx'),
    label: 'content/docs/agentes/code-generator.mdx',
    replacements: [
      // Linha "X tipos disponíveis" se existir
      {
        pattern: /\d+ tipos disponíveis/,
        replacement: `${typeCount} tipos disponíveis`,
        label: 'contagem de tipos',
        optional: true,
      },
    ],
  },
];

// ─── Aplicar substituições ───────────────────────────────────────────────────

let totalChanges = 0;
let staleFiles = 0;

for (const target of targets) {
  if (!fs.existsSync(target.file)) {
    console.warn(`\n⚠  Arquivo não encontrado (pulando): ${target.label}`);
    continue;
  }

  const original = fs.readFileSync(target.file, 'utf8');
  let updated = original;
  const fileChanges = [];

  for (const rep of target.replacements) {
    if (!rep.pattern.test(updated)) {
      if (!rep.optional) {
        console.warn(`  ⚠ [${target.label}] Padrão não encontrado: ${rep.label}`);
      }
      continue;
    }

    const before = updated;
    updated = updated.replace(rep.pattern, rep.replacement);

    if (updated !== before) {
      fileChanges.push(rep.label);
    }
  }

  if (updated === original) {
    console.log(`\n✓ ${target.label} — já atualizado`);
    continue;
  }

  staleFiles++;
  totalChanges += fileChanges.length;

  console.log(`\n~ ${target.label} — ${fileChanges.length} mudança(s): ${fileChanges.join(', ')}`);

  if (!DRY_RUN && !CHECK) {
    fs.writeFileSync(target.file, updated, 'utf8');
    console.log(`  ✔ Escrito`);
  } else if (DRY_RUN) {
    console.log(`  (dry-run — não escrito)`);
  }
}

// ─── Resumo ──────────────────────────────────────────────────────────────────

console.log('\n' + '─'.repeat(60));

if (CHECK) {
  if (staleFiles > 0) {
    console.error(`\n❌ Docs desatualizado: ${staleFiles} arquivo(s) com ${totalChanges} campo(s) diferente(s).`);
    console.error('   Execute: node scripts/sync-docs.js\n');
    process.exit(1);
  } else {
    console.log('\n✅ Docs em sincronia com o plugin.\n');
    process.exit(0);
  }
}

if (totalChanges === 0) {
  console.log('\n✅ Docs já estava em sincronia — nenhuma alteração necessária.\n');
} else if (DRY_RUN) {
  console.log(`\n🔍 Dry-run — ${totalChanges} campo(s) em ${staleFiles} arquivo(s) seriam atualizados.\n`);
} else {
  console.log(`\n✅ Sincronização concluída — ${totalChanges} campo(s) atualizados em ${staleFiles} arquivo(s).\n`);
}
