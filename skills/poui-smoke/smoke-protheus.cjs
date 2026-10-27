#!/usr/bin/env node
/**
 * smoke-protheus.cjs — abre um app PO-UI pelo menu do Protheus (WebApp) e registra o que aconteceu.
 * Parte do poui-specialist (© Andre Costa). Usado por /poui-specialist:smoke-protheus e pela extensão.
 *
 * Uso (na pasta do projeto Angular, que precisa ter playwright-core ou @playwright/test instalado):
 *   node smoke-protheus.cjs <config.json>
 *
 * config.json:
 *   { "webAppUrl": "http://localhost:8021/webapp/", "program": "SIGAFIN", "environment": "PROTHEUS_LOCAL",
 *     "user": "admin", "passwordFile": "protheus-dev.secret", "menuSearch": "PO-UI",
 *     "menuItem": "Regras e Monitor RCA (PO-UI)", "appName": "rca-poui",
 *     "outDir": "smoke-results", "timeoutSec": 90, "headless": true }
 *
 * A senha é lida de passwordFile (última linha não vazia) e nunca é impressa nem gravada.
 * Saída: <outDir>/smoke-events.json (eventos) e <outDir>/smoke.png. Código de saída 0 = rodou
 * (a análise de sucesso/falha é feita sobre os eventos), 2 = erro de configuração.
 */
const fs = require('fs');
const path = require('path');

function carregarPlaywright() {
  for (const mod of ['playwright-core', '@playwright/test', 'playwright']) {
    try {
      return require(require.resolve(mod, { paths: [process.cwd()] }));
    } catch {
      /* tenta o próximo */
    }
  }
  throw new Error('playwright não encontrado no projeto — rode: npm i -D @playwright/test && npx playwright install chromium');
}

async function abrirNavegador(chromium, headless) {
  // 1) chromium do playwright; 2) Edge/Chrome já instalados no Windows
  for (const opcoes of [{}, { channel: 'msedge' }, { channel: 'chrome' }]) {
    try {
      return await chromium.launch({ headless, ...opcoes });
    } catch {
      /* tenta o próximo */
    }
  }
  throw new Error('nenhum navegador disponível — rode: npx playwright install chromium');
}

async function main() {
  const cfgPath = process.argv[2];
  if (!cfgPath) {
    console.error('uso: node smoke-protheus.cjs <config.json>');
    process.exit(2);
  }
  const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
  for (const k of ['webAppUrl', 'program', 'environment', 'user', 'passwordFile', 'menuSearch', 'appName']) {
    if (!cfg[k]) {
      console.error(`config sem "${k}"`);
      process.exit(2);
    }
  }
  const base = path.dirname(path.resolve(cfgPath));
  const arqSenha = path.resolve(base, cfg.passwordFile);
  if (!fs.existsSync(arqSenha)) {
    console.error(`arquivo de senha não encontrado: ${cfg.passwordFile}`);
    process.exit(2);
  }
  const senha = fs.readFileSync(arqSenha, 'utf8').split(/\r?\n/).filter((l) => l.trim()).pop().trim();
  const outDir = path.resolve(base, cfg.outDir || 'smoke-results');
  fs.mkdirSync(outDir, { recursive: true });
  const limite = (cfg.timeoutSec || 90) * 1000;

  const eventos = [];
  const t0 = Date.now();
  const ev = (type, data) => eventos.push({ t: Date.now() - t0, type, ...data });
  const gravar = () => fs.writeFileSync(path.join(outDir, 'smoke-events.json'), JSON.stringify({ appName: cfg.appName, events: eventos }, null, 2));

  const { chromium } = carregarPlaywright();
  const browser = await abrirNavegador(chromium, cfg.headless !== false);
  const page = await (await browser.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  const appFrame = `/app-root/${cfg.appName}_env_`;

  page.on('console', (m) => {
    if (m.type() === 'error') ev('console-error', { text: m.text().slice(0, 300), frame: (m.location() || {}).url || '' });
  });
  page.on('pageerror', (e) => ev('page-error', { text: e.message.slice(0, 300) }));
  page.on('framenavigated', (f) => {
    if (f.url().includes(appFrame)) ev('app-frame', { url: f.url().split('?')[0] });
  });
  page.on('requestfailed', (r) => {
    if (r.url().includes('/app-root/')) ev('request-failed', { url: r.url().split('?')[0].slice(0, 200), error: (r.failure() || {}).errorText });
  });
  page.on('response', (r) => {
    const u = r.url();
    const m = u.match(/\/app-root\/([^/?#]+)(\/[^?#]*)?/);
    // chamada de API do app: /app-root/<rota> fora das pastas *_env_* (arquivos estáticos)
    if (m && !m[1].includes('_env_') && r.request().resourceType() !== 'document') {
      ev('api', { method: r.request().method(), url: u.split('?')[0].slice(0, 200), status: r.status() });
    }
  });

  const etapa = async (nome, fn) => {
    try {
      await fn();
      ev('step', { name: nome, ok: true });
      return true;
    } catch (e) {
      ev('step', { name: nome, ok: false, error: String(e.message || e).split('\n')[0].slice(0, 300) });
      return false;
    }
  };
  const frameTface = () => page.frames().find((f) => /protheuslib-tface/.test(f.url()));
  const esperar = async (cond, ms) => {
    const fim = Date.now() + ms;
    while (Date.now() < fim) {
      if (await cond()) return true;
      await page.waitForTimeout(1000);
    }
    return false;
  };

  try {
    let ok = await etapa('webapp', async () => {
      await page.goto(cfg.webAppUrl, { waitUntil: 'networkidle', timeout: 60000 });
      await page.locator('#selectStartProg input').fill(cfg.program, { timeout: 30000 });
      await page.locator('#selectEnv input').fill(cfg.environment);
      await page.locator('wa-button[part="btn-ok"] button').click();
    });
    ok = ok && (await etapa('login', async () => {
      const achou = await esperar(async () => {
        const f = frameTface();
        return !!f && (await f.locator('input[name="password"]').count().catch(() => 0)) > 0;
      }, 60000);
      if (!achou) throw new Error('tela de login não apareceu');
      const f = frameTface();
      await f.locator('input[name="login"]').fill(cfg.user);
      await f.locator('input[name="password"]').fill(senha);
      await f.locator('po-button button', { hasText: 'Entrar' }).first().click();
      const passou = await esperar(async () => /session-settings/.test((frameTface() || { url: () => '' }).url()) ||
        (await page.locator('input[placeholder="Pesquisar"]').count()) > 0, 30000);
      if (!passou) throw new Error('login recusado ou sem resposta (usuário/senha?)');
    }));
    ok = ok && (await etapa('sessao', async () => {
      const f = frameTface();
      if (f && /session-settings/.test(f.url())) {
        await f.locator('po-button[name="submmit"] button').click();
      }
      // avisos pós-login (Confirmar / Fechar) até o campo de pesquisa do menu aparecer
      const menu = await esperar(async () => {
        if ((await page.locator('input[placeholder="Pesquisar"]').count()) > 0) return true;
        for (const t of ['Confirmar', 'Fechar']) {
          const b = page.getByText(t, { exact: true });
          if (await b.count()) {
            await b.last().click().catch(() => {});
            break;
          }
        }
        return false;
      }, 90000);
      if (!menu) throw new Error('menu do módulo não apareceu');
    }));
    ok = ok && (await etapa('menu', async () => {
      const busca = page.locator('input[placeholder="Pesquisar"]');
      await busca.fill(cfg.menuSearch);
      // Enter não pesquisa: o botão da lupa fica logo após o campo
      const lupa = page.locator('wa-text-input[placeholder="Pesquisar"] + button');
      if (await lupa.count()) {
        await lupa.first().click();
      } else {
        const bb = await busca.boundingBox();
        await page.mouse.click(bb.x + bb.width + 10, bb.y + bb.height / 2);
      }
      await page.waitForTimeout(3000);
      if (cfg.menuItem && !(await esperar(async () => page.frames().some((f) => f.url().includes(appFrame)), 5000))) {
        await page.getByText(cfg.menuItem, { exact: true }).first().click({ timeout: 15000 });
      }
    }));
    if (ok) {
      await etapa('app', async () => {
        const abriu = await esperar(async () => eventos.some((e) => e.type === 'app-frame'), limite);
        if (!abriu) {
          const preso = (await page.getByText('Verificando atualizações...').count()) > 0;
          throw new Error(preso ? 'preso em "Verificando atualizações..."' : 'o frame do app não abriu');
        }
        await page.waitForTimeout(8000); // deixa as primeiras chamadas de API acontecerem
      });
    }
  } finally {
    await page.screenshot({ path: path.join(outDir, 'smoke.png') }).catch(() => {});
    gravar();
    await browser.close().catch(() => {});
  }
  console.log(`smoke-protheus: ${eventos.length} eventos em ${path.join(outDir, 'smoke-events.json')}`);
}

main().catch((e) => {
  console.error(String(e.message || e));
  process.exit(2);
});
