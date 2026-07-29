#!/usr/bin/env node
/**
 * renew-license.js — renova a licença beta do poui-specialist nos 3 lugares onde ela é lida
 *
 * Uso:
 *   node scripts/renew-license.js                  → renova por +90 dias a partir de hoje
 *   node scripts/renew-license.js --days=30         → renova por +30 dias
 *   node scripts/renew-license.js --date=2027-01-01 → define data explícita
 *   node scripts/renew-license.js --dry-run         → mostra o que faria, sem alterar nada
 *   node scripts/renew-license.js --no-gist         → pula a atualização do gist remoto
 *   node scripts/renew-license.js --no-cache        → pula a atualização do cache local instalado
 *
 * Atualiza:
 *   skills/poui-license-check/SKILL.md              → fonte versionada (git)
 *   gist ace66c8661a912f3877c47ca8e7259be           → kill-switch remoto (requer `gh` autenticado)
 *   ~/.claude/plugins/cache/.../SKILL.md             → cópia instalada, lida em runtime pelo Claude Code
 *
 * Não commita nem dá push automaticamente — isso fica a critério de quem roda o script.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SKILL_RELPATH = path.join('skills', 'poui-license-check', 'SKILL.md');
const SKILL_PATH = path.join(ROOT, SKILL_RELPATH);
const GIST_ID = 'ace66c8661a912f3877c47ca8e7259be';
const GIST_FILENAME = 'poui-license.json';
const PLUGIN_KEY = 'poui-specialist@poui-specialist-marketplace';

function parseArgs(argv) {
  const args = { days: 90 };
  for (const arg of argv) {
    if (arg.startsWith('--days=')) args.days = Number(arg.slice('--days='.length));
    else if (arg.startsWith('--date=')) args.date = arg.slice('--date='.length);
    else if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--no-gist') args.noGist = true;
    else if (arg === '--no-cache') args.noCache = true;
    else {
      console.error(`Argumento desconhecido: ${arg}`);
      process.exit(1);
    }
  }
  return args;
}

function computeNewDate(args) {
  if (args.date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(args.date)) {
      throw new Error(`Data inválida: "${args.date}" (use AAAA-MM-DD)`);
    }
    return args.date;
  }
  if (!Number.isFinite(args.days) || args.days <= 0) {
    throw new Error(`--days precisa ser um número positivo (recebido: ${args.days})`);
  }
  const d = new Date();
  d.setDate(d.getDate() + args.days);
  return d.toISOString().slice(0, 10);
}

function toBrDate(isoDate) {
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
}

function findCurrentDate(content) {
  const match = content.match(/Data de expira[çc][ãa]o: `(\d{4}-\d{2}-\d{2})`/);
  if (!match) throw new Error('Não encontrei "Data de expiração: `AAAA-MM-DD`" no SKILL.md');
  return match[1];
}

function patchSkillContent(content, oldIso, newIso) {
  const oldBr = toBrDate(oldIso);
  const newBr = toBrDate(newIso);
  let patched = content.split('`' + oldIso + '`').join('`' + newIso + '`');
  patched = patched.split(`até ${oldBr}.`).join(`até ${newBr}.`);
  return patched;
}

function patchSkillFile(filePath, oldIso, newIso, { dryRun }) {
  if (!fs.existsSync(filePath)) return 'missing';
  const before = fs.readFileSync(filePath, 'utf8');
  const after = patchSkillContent(before, oldIso, newIso);
  if (after === before) return 'unchanged';
  if (!dryRun) fs.writeFileSync(filePath, after, 'utf8');
  return 'patched';
}

function updateGist(newIso, { dryRun }) {
  if (dryRun) {
    console.log(`[DRY-RUN] gh gist edit ${GIST_ID} → expires="${newIso}"`);
    return true;
  }
  const tmpFile = path.join(os.tmpdir(), `poui-license-${Date.now()}.json`);
  const payload = JSON.stringify({ plugin: 'poui-specialist', expires: newIso, active: true });
  fs.writeFileSync(tmpFile, payload + '\n', 'utf8');
  try {
    execFileSync('gh', ['gist', 'edit', GIST_ID, '--filename', GIST_FILENAME, tmpFile], { stdio: 'inherit' });
    return true;
  } catch (err) {
    console.warn(`AVISO: falha ao atualizar o gist via "gh" CLI: ${err.message}`);
    console.warn(`        Atualize manualmente: gh gist edit ${GIST_ID} --filename ${GIST_FILENAME} <arquivo.json>`);
    return false;
  } finally {
    if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
  }
}

function findInstalledCachePath() {
  const installedJsonPath = path.join(os.homedir(), '.claude', 'plugins', 'installed_plugins.json');
  if (!fs.existsSync(installedJsonPath)) return null;
  const data = JSON.parse(fs.readFileSync(installedJsonPath, 'utf8'));
  const entries = data.plugins && data.plugins[PLUGIN_KEY];
  if (!entries || !entries.length) return null;
  return path.join(entries[0].installPath, SKILL_RELPATH);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const sourceContent = fs.readFileSync(SKILL_PATH, 'utf8');
  const oldIso = findCurrentDate(sourceContent);
  const newIso = computeNewDate(args);

  if (new Date(newIso) <= new Date(oldIso)) {
    console.warn(`AVISO: nova data (${newIso}) não é posterior à atual (${oldIso}). Prosseguindo mesmo assim.`);
  }

  console.log(`${args.dryRun ? '[DRY-RUN] ' : ''}Renovando licença: ${oldIso} → ${newIso}\n`);

  const sourceResult = patchSkillFile(SKILL_PATH, oldIso, newIso, args);
  console.log(`[fonte]  ${SKILL_RELPATH} → ${sourceResult}`);

  if (!args.noGist) {
    const gistOk = updateGist(newIso, args);
    console.log(`[gist]   ${GIST_ID} → ${gistOk ? 'ok' : 'FALHOU'}`);
  } else {
    console.log('[gist]   pulado (--no-gist)');
  }

  if (!args.noCache) {
    const cachePath = findInstalledCachePath();
    if (cachePath) {
      const cacheResult = patchSkillFile(cachePath, oldIso, newIso, args);
      console.log(`[cache]  ${cachePath} → ${cacheResult}`);
    } else {
      console.log('[cache]  não encontrado (installed_plugins.json ausente ou plugin não instalado) — pulado');
    }
  } else {
    console.log('[cache]  pulado (--no-cache)');
  }

  if (!args.dryRun) {
    console.log('\nPróximo passo manual (o script não commita nem dá push):');
    console.log(`  git add ${SKILL_RELPATH}`);
    console.log(`  git commit -m "chore(license): extend beta license expiration to ${newIso}"`);
    console.log('  git push origin master');
  }
}

main();
