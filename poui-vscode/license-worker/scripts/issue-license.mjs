#!/usr/bin/env node
// license-worker/scripts/issue-license.mjs
//
// Emite ou renova uma chave de licença paga sem editar JSON à mão no KV.
//
// Uso:
//   node scripts/issue-license.mjs --new --email cliente@empresa.com --plan mensal
//   node scripts/issue-license.mjs --renew POUI-XXXX-XXXX-XXXX --plan anual
//
// computeRenewedExpiresAt abaixo é uma cópia deliberada da função de mesmo
// nome em src/licenseLogic.ts — este script roda direto com `node`, sem
// passo de build, então importar do TypeScript exigiria um loader (ts-node
// ESM) só pra uma função de 3 linhas. Se a regra de renovação mudar,
// atualize os dois lugares (o teste de licenseLogic.test.ts pega qualquer
// regressão no comportamento "de verdade", usado pelo Worker; este é só um
// script local, supervisionado por humano a cada execução).

import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const PLAN_DAYS = { mensal: 30, trimestral: 90, anual: 365 };

function parseArgs(argv) {
  const args = { mode: null, email: null, plan: null, key: null };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--new') {
      args.mode = 'new';
    } else if (arg === '--renew') {
      args.mode = 'renew';
      args.key = argv[++i];
    } else if (arg === '--email') {
      args.email = argv[++i];
    } else if (arg === '--plan') {
      args.plan = argv[++i];
    }
  }
  return args;
}

function generateKey() {
  const block = () => randomBytes(3).toString('hex').toUpperCase().slice(0, 4);
  return `POUI-${block()}-${block()}-${block()}`;
}

function computeRenewedExpiresAt(currentExpiresAt, planDays, nowIso) {
  const base = currentExpiresAt > nowIso ? currentExpiresAt : nowIso;
  const baseMs = new Date(base).getTime();
  return new Date(baseMs + planDays * 24 * 60 * 60 * 1000).toISOString();
}

function kvPut(key, value) {
  const tempPath = join(tmpdir(), `poui-license-${Date.now()}.json`);
  writeFileSync(tempPath, JSON.stringify(value), 'utf8');
  try {
    execFileSync(
      'npx',
      ['wrangler', 'kv', 'key', 'put', key, '--path', tempPath, '--binding=LICENSES', '--remote'],
      { stdio: 'inherit', shell: true },
    );
  } finally {
    unlinkSync(tempPath);
  }
}

function kvGet(key) {
  const raw = execFileSync(
    'npx',
    ['wrangler', 'kv', 'key', 'get', key, '--binding=LICENSES', '--remote'],
    { encoding: 'utf8', shell: true },
  );
  return JSON.parse(raw);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const now = new Date().toISOString();

  if (!args.plan || !(args.plan in PLAN_DAYS)) {
    console.error(`--plan é obrigatório e precisa ser um de: ${Object.keys(PLAN_DAYS).join(', ')}`);
    process.exit(1);
  }
  const planDays = PLAN_DAYS[args.plan];

  if (args.mode === 'new') {
    if (!args.email) {
      console.error('--email é obrigatório com --new');
      process.exit(1);
    }
    const key = generateKey();
    const expiresAt = new Date(new Date(now).getTime() + planDays * 24 * 60 * 60 * 1000).toISOString();
    const record = {
      email: args.email,
      status: 'active',
      createdAt: now,
      boundMachineHash: null,
      expiresAt,
      notifiedExpiredAt: null,
    };
    kvPut(`license:${key}`, record);
    console.log(`Chave criada: ${key}`);
    console.log(`Expira em: ${expiresAt}`);
    return;
  }

  if (args.mode === 'renew') {
    if (!args.key) {
      console.error('--renew precisa da chave como argumento seguinte (ex: --renew POUI-XXXX-XXXX-XXXX)');
      process.exit(1);
    }
    const record = kvGet(`license:${args.key}`);
    const newExpiresAt = computeRenewedExpiresAt(record.expiresAt, planDays, now);
    record.expiresAt = newExpiresAt;
    record.notifiedExpiredAt = null;
    kvPut(`license:${args.key}`, record);
    console.log(`Chave renovada: ${args.key}`);
    console.log(`Novo vencimento: ${newExpiresAt}`);
    return;
  }

  console.error('Uso:');
  console.error('  node scripts/issue-license.mjs --new --email <email> --plan <mensal|trimestral|anual>');
  console.error('  node scripts/issue-license.mjs --renew <chave> --plan <mensal|trimestral|anual>');
  process.exit(1);
}

main();
