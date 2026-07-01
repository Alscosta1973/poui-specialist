#!/usr/bin/env node
/**
 * bump-version.js — atualiza a versão do plugin em todos os locais atomicamente
 *
 * Uso:
 *   node scripts/bump-version.js patch     → 1.6.0 → 1.6.1
 *   node scripts/bump-version.js minor     → 1.6.0 → 1.7.0
 *   node scripts/bump-version.js major     → 1.6.0 → 2.0.0
 *   node scripts/bump-version.js 1.7.0     → define versão explícita
 *
 * Atualiza:
 *   .claude-plugin/plugin.json        → "version": "X.Y.Z"
 *   .claude-plugin/marketplace.json   → plugins[0].version: "X.Y.Z"
 *   agents/code-generator.md          → @generated poui-specialist vX.Y.Z
 *   agents/code-generator-list.md     → @generated poui-specialist vX.Y.Z
 *   agents/code-generator-forms.md    → @generated poui-specialist vX.Y.Z
 *   agents/code-generator-infra.md    → @generated poui-specialist vX.Y.Z
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, obj) {
  fs.writeFileSync(filePath, JSON.stringify(obj, null, 2) + '\n', 'utf8');
}

function bumpVersion(current, type) {
  const [major, minor, patch] = current.split('.').map(Number);
  switch (type) {
    case 'major': return `${major + 1}.0.0`;
    case 'minor': return `${major}.${minor + 1}.0`;
    case 'patch': return `${major}.${minor}.${patch + 1}`;
    default:
      if (/^\d+\.\d+\.\d+$/.test(type)) return type;
      throw new Error(`Tipo inválido: "${type}". Use major, minor, patch ou X.Y.Z`);
  }
}

const bumpType = process.argv[2];
if (!bumpType) {
  console.error('Uso: node scripts/bump-version.js <major|minor|patch|X.Y.Z>');
  process.exit(1);
}

// Ler versão atual de plugin.json
const pluginJsonPath = path.join(ROOT, '.claude-plugin', 'plugin.json');
const pluginJson = readJson(pluginJsonPath);
const currentVersion = pluginJson.version;

if (!currentVersion) {
  console.error('Versão não encontrada em .claude-plugin/plugin.json');
  process.exit(1);
}

const newVersion = bumpVersion(currentVersion, bumpType);
console.log(`Versão: ${currentVersion} → ${newVersion}`);

// 1. Atualizar plugin.json
pluginJson.version = newVersion;
writeJson(pluginJsonPath, pluginJson);
console.log('  ✓ .claude-plugin/plugin.json');

// 2. Atualizar marketplace.json
const marketplaceJsonPath = path.join(ROOT, '.claude-plugin', 'marketplace.json');
const marketplaceJson = readJson(marketplaceJsonPath);
if (!marketplaceJson.plugins || !marketplaceJson.plugins[0]) {
  console.error('plugins[0] não encontrado em marketplace.json');
  process.exit(1);
}
marketplaceJson.plugins[0].version = newVersion;
writeJson(marketplaceJsonPath, marketplaceJson);
console.log('  ✓ .claude-plugin/marketplace.json');

// 3. Atualizar agents com @generated header
const versionPattern = /(@generated\s+poui-specialist\s+v)[\d.]+/g;
const agentFiles = [
  'agents/code-generator.md',
  'agents/code-generator-list.md',
  'agents/code-generator-forms.md',
  'agents/code-generator-infra.md',
];

for (const rel of agentFiles) {
  const agentPath = path.join(ROOT, rel);
  const agentContent = fs.readFileSync(agentPath, 'utf8');
  const updatedAgent = agentContent.replace(versionPattern, `$1${newVersion}`);
  if (updatedAgent === agentContent) {
    console.warn(`  ⚠ @generated version não encontrado em ${rel}`);
  } else {
    fs.writeFileSync(agentPath, updatedAgent, 'utf8');
    console.log(`  ✓ ${rel}`);
  }
}

const totalFiles = 2 + agentFiles.length;
console.log(`\nVersão ${newVersion} aplicada em ${totalFiles} arquivos.`);
console.log('Próximos passos:');
console.log('  git add .claude-plugin/plugin.json .claude-plugin/marketplace.json ' + agentFiles.join(' '));
console.log(`  git commit -m "chore(release): bump version to ${newVersion}"`);
console.log('  node scripts/sync-docs.js   # atualiza PLUGIN_VERSION no site');
