import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  buildBasicAuthHeader,
  buildProxyConfigJs,
  otherProxyEntries,
  setProxyConfigInAngularJson,
  updateStartScriptProxy,
  buildConnectGitignoreAdditions,
  PROXY_JS_FILE,
  PROXY_SECRET_FILE,
  ProxyJsOptions,
} from '../../protheusProxy';

describe('buildBasicAuthHeader', () => {
  it('base64-encodes user:password with the Basic prefix', () => {
    const header = buildBasicAuthHeader('admin', 'senha123');
    assert.strictEqual(header, `Basic ${Buffer.from('admin:senha123').toString('base64')}`);
  });
});

describe('buildProxyConfigJs', () => {
  interface FakeReq {
    headers: Record<string, string>;
    setHeader(k: string, v: string): void;
    removeHeader(k: string): void;
  }
  const fakeReq = (): FakeReq => {
    const headers: Record<string, string> = { origin: 'http://localhost:4200', authorization: 'Bearer ' };
    return {
      headers,
      setHeader: (k, v) => {
        headers[k.toLowerCase()] = v;
      },
      removeHeader: (k) => {
        delete headers[k.toLowerCase()];
      },
    };
  };
  let dir = '';
  // carrega o proxy.conf.js gerado de verdade (require), com o arquivo de segredo ao lado
  const load = (opts: ProxyJsOptions, secret?: string) => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'poui-proxy-'));
    fs.writeFileSync(path.join(dir, PROXY_JS_FILE), buildProxyConfigJs(opts));
    if (secret !== undefined) {
      fs.writeFileSync(path.join(dir, PROXY_SECRET_FILE), secret + '\r\n');
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require(path.join(dir, PROXY_JS_FILE));
  };
  // aplica pelo caminho do Vite (Angular 17+): configure(proxy) registra o handler de proxyReq
  const viaConfigure = (rest: { configure: (p: unknown) => void }) => {
    let handler: ((r: FakeReq) => void) | undefined;
    rest.configure({
      on: (ev: string, h: (r: FakeReq) => void) => {
        if (ev === 'proxyReq') {
          handler = h;
        }
      },
    });
    const req = fakeReq();
    handler!(req);
    return req.headers;
  };
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  it('targets the Protheus URL and never writes the password into the file', () => {
    const content = buildProxyConfigJs({ protheusUrl: 'http://srv:8080', auth: 'basic', username: 'admin' });
    assert.ok(!content.includes('senha123'));
    const cfg = load({ protheusUrl: 'http://srv:8080', auth: 'basic', username: 'admin' }, 'senha123');
    assert.strictEqual(cfg['/rest'].target, 'http://srv:8080');
    assert.strictEqual(cfg['/rest'].changeOrigin, true);
    assert.strictEqual(cfg['/rest'].secure, false);
  });

  it('basic: overwrites Authorization with user + password from the secret file, removes Origin, sends tenantId', () => {
    const cfg = load({ protheusUrl: 'http://srv:8080', auth: 'basic', username: 'admin', tenantId: '99,01' }, 'senha123');
    const h = viaConfigure(cfg['/rest']);
    assert.strictEqual(h.authorization, buildBasicAuthHeader('admin', 'senha123'));
    assert.strictEqual(h.tenantid, '99,01');
    assert.strictEqual(h.origin, undefined);
  });

  it('webpack path (onProxyReq) applies the same headers', () => {
    const cfg = load({ protheusUrl: 'http://srv:8080', auth: 'bearer' }, 'tok-1');
    const req = fakeReq();
    cfg['/rest'].onProxyReq(req);
    assert.strictEqual(req.headers.authorization, 'Bearer tok-1');
    assert.strictEqual(req.headers.origin, undefined);
    assert.strictEqual(req.headers.tenantid, undefined);
  });

  it('none: keeps the incoming Authorization and still removes Origin', () => {
    const cfg = load({ protheusUrl: 'http://srv:8080', auth: 'none' });
    const h = viaConfigure(cfg['/rest']);
    assert.strictEqual(h.authorization, 'Bearer ');
    assert.strictEqual(h.origin, undefined);
  });

  it('missing secret file: does not invent an Authorization header', () => {
    const cfg = load({ protheusUrl: 'http://srv:8080', auth: 'basic', username: 'admin' });
    const h = viaConfigure(cfg['/rest']);
    assert.strictEqual(h.authorization, 'Bearer ');
  });

  it('escapes values safely and carries over other proxy entries', () => {
    const user = "o'brien\\x\"y";
    const cfg = load(
      { protheusUrl: 'http://srv:8080', auth: 'basic', username: user, otherEntries: { '/outro': { target: 'http://outro:9000' } } },
      's',
    );
    assert.strictEqual(cfg['/outro'].target, 'http://outro:9000');
    const h = viaConfigure(cfg['/rest']);
    assert.strictEqual(h.authorization, buildBasicAuthHeader(user, 's'));
  });
});

describe('otherProxyEntries', () => {
  it('returns every entry but /rest from an existing proxy.conf.json', () => {
    const json = JSON.stringify({ '/rest': { target: 'a' }, '/api': { target: 'b' } });
    assert.deepStrictEqual(otherProxyEntries(json), { '/api': { target: 'b' } });
  });

  it('returns an empty object for missing or invalid content', () => {
    assert.deepStrictEqual(otherProxyEntries(undefined), {});
    assert.deepStrictEqual(otherProxyEntries('{nao e json'), {});
  });
});

describe('setProxyConfigInAngularJson', () => {
  it('points serve.options.proxyConfig to the given file without disturbing angular.json', () => {
    const angularJson = {
      projects: { x: { architect: { serve: { options: { port: 4200, proxyConfig: 'proxy.conf.json' } }, build: { options: {} } } } },
    };
    const fixed = setProxyConfigInAngularJson(angularJson, 'x', PROXY_JS_FILE);
    assert.strictEqual(fixed.projects.x.architect.serve.options.proxyConfig, 'proxy.conf.js');
    assert.strictEqual(fixed.projects.x.architect.serve.options.port, 4200);
    assert.strictEqual(angularJson.projects.x.architect.serve.options.proxyConfig, 'proxy.conf.json');
  });

  it('creates serve.options when missing', () => {
    const fixed = setProxyConfigInAngularJson({ projects: { x: { architect: { serve: {} } } } }, 'x', PROXY_JS_FILE);
    assert.strictEqual(fixed.projects.x.architect.serve.options.proxyConfig, 'proxy.conf.js');
  });
});

describe('updateStartScriptProxy', () => {
  it('switches --proxy-config proxy.conf.json to proxy.conf.js', () => {
    assert.strictEqual(updateStartScriptProxy('ng serve --proxy-config proxy.conf.json'), 'ng serve --proxy-config proxy.conf.js');
  });

  it('leaves scripts without the old proxy untouched', () => {
    assert.strictEqual(updateStartScriptProxy('ng serve'), 'ng serve');
    assert.strictEqual(updateStartScriptProxy(undefined), undefined);
  });
});

describe('buildConnectGitignoreAdditions', () => {
  const linhas = (s: string) => s.split(/\r?\n/);

  it('adds the proxy files and the secret file when not already present', () => {
    const additions = buildConnectGitignoreAdditions('node_modules/\n');
    for (const f of ['proxy.conf.json', 'proxy.conf.js', 'protheus-dev.secret']) {
      assert.ok(linhas(additions).includes(f), f);
    }
  });

  it('adds only what is missing', () => {
    const additions = buildConnectGitignoreAdditions('proxy.conf.json\n');
    assert.ok(!linhas(additions).includes('proxy.conf.json'));
    assert.ok(linhas(additions).includes('protheus-dev.secret'));
  });

  it('returns an empty string when everything is already ignored', () => {
    assert.strictEqual(buildConnectGitignoreAdditions('proxy.conf.json\nproxy.conf.js\nprotheus-dev.secret\n'), '');
  });
});
