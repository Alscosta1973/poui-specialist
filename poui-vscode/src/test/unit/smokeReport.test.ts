import * as assert from 'node:assert';
import * as path from 'node:path';
import {
  analyzeSmoke,
  SmokeEvent,
  buildSmokeConfig,
  missingSmokeSettings,
  buildSmokeGitignoreAdditions,
  SMOKE_OUT_DIR,
} from '../../smokeReport';

const APP = 'rca-poui';
const passos = (falha?: string, erro = 'falhou'): SmokeEvent[] =>
  ['webapp', 'login', 'sessao', 'menu', 'app']
    .slice(0, falha ? ['webapp', 'login', 'sessao', 'menu', 'app'].indexOf(falha) + 1 : 5)
    .map((name, i) => ({ t: i * 1000, type: 'step', name, ok: name !== falha, ...(name === falha ? { error: erro } : {}) }));
const nivel = (fs: ReturnType<typeof analyzeSmoke>, l: string) => fs.filter((f) => f.level === l);

describe('analyzeSmoke', () => {
  it('reports success when the app frame opened and the API answered 2xx', () => {
    const eventos: SmokeEvent[] = [
      ...passos(),
      { t: 14357, type: 'app-frame', url: 'http://h:1237/app-root/rca-poui_env_x/index.html' },
      { t: 15872, type: 'api', method: 'GET', url: 'http://h:1237/app-root/rca/regras', status: 200 },
    ];
    const fs = analyzeSmoke(eventos, APP);
    assert.strictEqual(nivel(fs, 'error').length + nivel(fs, 'warn').length, 0, JSON.stringify(fs));
    assert.ok(nivel(fs, 'ok').some((f) => /abriu em 14,4 s/.test(f.message)));
    assert.ok(nivel(fs, 'ok').some((f) => /GET .*rca\/regras.*200/.test(f.message)));
  });

  it('turns a failed login into an error with a credentials hint', () => {
    const fs = analyzeSmoke(passos('login', 'login recusado ou sem resposta (usuário/senha?)'), APP);
    const e = nivel(fs, 'error');
    assert.strictEqual(e.length, 1);
    assert.match(e[0].message, /login/i);
    assert.match(e[0].hint ?? '', /senha/);
  });

  it('points to the doctor when the app is stuck in "Verificando atualizações..."', () => {
    const fs = analyzeSmoke(passos('app', 'preso em "Verificando atualizações..."'), APP);
    const e = nivel(fs, 'error')[0];
    assert.match(e.message, /Verificando/);
    assert.match(e.hint ?? '', /Diagnosticar|doctor/);
  });

  it('hints at menuSearch/menuItem when the routine is not found in the menu', () => {
    const e = nivel(analyzeSmoke(passos('menu'), APP), 'error')[0];
    assert.match(e.hint ?? '', /menuSearch|menuItem/);
  });

  it('warns about API calls with HTTP errors and explains 401', () => {
    const fs = analyzeSmoke(
      [
        ...passos(),
        { t: 1, type: 'app-frame', url: 'http://h/app-root/rca-poui_env_x/' },
        { t: 2, type: 'api', method: 'GET', url: 'http://h/app-root/rca/regras', status: 401 },
        { t: 3, type: 'api', method: 'POST', url: 'http://h/app-root/rca/regras', status: 500 },
      ],
      APP,
    );
    const avisos = nivel(fs, 'warn');
    assert.ok(avisos.some((a) => /401/.test(a.message) && /sess[aã]o|usu[aá]rio/i.test(a.hint ?? '')));
    assert.ok(avisos.some((a) => /500/.test(a.message)));
  });

  it('informs when no API call was observed', () => {
    const fs = analyzeSmoke([...passos(), { t: 1, type: 'app-frame', url: 'http://h/app-root/rca-poui_env_x/' }], APP);
    assert.ok(nivel(fs, 'info').some((f) => /nenhuma chamada/i.test(f.message)));
  });

  it('only counts console errors coming from the app frame (WebApp noise is ignored)', () => {
    const fs = analyzeSmoke(
      [
        ...passos(),
        { t: 1, type: 'app-frame', url: 'http://h/app-root/rca-poui_env_x/' },
        { t: 2, type: 'api', method: 'GET', url: 'http://h/app-root/rca/regras', status: 200 },
        { t: 3, type: 'console-error', text: 'error on loadFont Arial', frame: 'http://h:8021/webapp/resources/js/webapp.js' },
        { t: 4, type: 'console-error', text: 'TypeError: x is undefined', frame: 'http://h/app-root/rca-poui_env_x/main-ABC.js' },
        { t: 5, type: 'page-error', text: 'Uncaught boom' },
      ],
      APP,
    );
    const avisos = nivel(fs, 'warn');
    assert.ok(avisos.some((a) => a.message.includes('TypeError')));
    assert.ok(!avisos.some((a) => a.message.includes('loadFont')));
    assert.ok(avisos.some((a) => a.message.includes('Uncaught boom')));
  });

  it('reports failed requests to app-root', () => {
    const fs = analyzeSmoke(
      [
        ...passos(),
        { t: 1, type: 'app-frame', url: 'http://h/app-root/rca-poui_env_x/' },
        { t: 2, type: 'request-failed', url: 'http://h/app-root/rca-poui_env_x/main.js', error: 'net::ERR_EMPTY_RESPONSE' },
      ],
      APP,
    );
    assert.ok(nivel(fs, 'warn').some((a) => /ERR_EMPTY_RESPONSE/.test(a.message)));
  });
});

describe('buildSmokeConfig / missingSmokeSettings', () => {
  const base = {
    webAppUrl: 'http://localhost:8021/webapp/',
    program: 'SIGAFIN',
    environment: 'PROTHEUS_LOCAL',
    user: 'admin',
    passwordFile: 'protheus-dev.secret',
    menuSearch: 'PO-UI',
    menuItem: '',
  };

  it('lists the settings that still need an answer (menuItem is optional)', () => {
    assert.deepStrictEqual(missingSmokeSettings({ ...base, user: '', menuSearch: ' ' }), ['user', 'menuSearch']);
    assert.deepStrictEqual(missingSmokeSettings(base), []);
  });

  it('resolves the password file and the output folder against the workspace', () => {
    const cfg = buildSmokeConfig(base, path.join('C:', 'proj'), 'rca-poui');
    assert.strictEqual(cfg.passwordFile, path.join('C:', 'proj', 'protheus-dev.secret'));
    assert.strictEqual(cfg.outDir, path.join('C:', 'proj', SMOKE_OUT_DIR));
    assert.strictEqual(cfg.appName, 'rca-poui');
    assert.strictEqual(cfg.menuItem, undefined);
    assert.strictEqual(cfg.timeoutSec, 90);
  });

  it('keeps an absolute password file as is', () => {
    const abs = path.resolve('/segredos/psw.txt');
    assert.strictEqual(buildSmokeConfig({ ...base, passwordFile: abs }, '/proj', 'x').passwordFile, abs);
  });
});

describe('buildSmokeGitignoreAdditions', () => {
  it('ignores the results folder and a password file inside the workspace', () => {
    const add = buildSmokeGitignoreAdditions('node_modules/\n', 'meu.secret');
    assert.ok(add.split(/\r?\n/).includes('smoke-results/'));
    assert.ok(add.split(/\r?\n/).includes('meu.secret'));
  });

  it('adds nothing that is already ignored and skips password files outside the workspace', () => {
    assert.strictEqual(buildSmokeGitignoreAdditions('smoke-results/\nmeu.secret\n', 'meu.secret'), '');
    assert.strictEqual(buildSmokeGitignoreAdditions('smoke-results/\n', undefined), '');
  });
});
