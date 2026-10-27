// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AngularJson = any;

/** Proxy do `ng serve` gerado pelo connect (substitui o antigo `proxy.conf.json`). */
export const PROXY_JS_FILE = 'proxy.conf.js';
/** Senha (Basic) ou token (Bearer) do Protheus de desenvolvimento — só o valor, fora do git. */
export const PROXY_SECRET_FILE = 'protheus-dev.secret';

/** Header `Authorization: Basic <base64>` — construído inteiramente aqui, em
 * Node puro. **Nunca** passar usuário/senha pro prompt do CLI do Claude: o
 * modo `-p` não-interativo passa o prompt como argumento literal do
 * processo, visível a qualquer processo na máquina que liste processos
 * (Task Manager, WMI, `ps`, etc.) — diferente do plugin original, que roda
 * dentro do chat interativo. */
export function buildBasicAuthHeader(username: string, password: string): string {
  return `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
}

export type ProxyAuth = 'none' | 'basic' | 'bearer';

export interface ProxyJsOptions {
  protheusUrl: string;
  auth: ProxyAuth;
  username?: string;
  /** `empresa,filial` enviado no header `tenantId` (vazio = padrão do REST). */
  tenantId?: string;
  /** Entradas de um `proxy.conf.json` anterior, levadas para o novo arquivo. */
  otherEntries?: Record<string, unknown>;
}

/** Conteúdo do `proxy.conf.js`. A senha/token **não** entra no arquivo: é lida
 * a cada requisição de `protheus-dev.secret`. O `Authorization` é sobrescrito
 * (o ProtheusLibCore manda `Bearer` vazio fora do Protheus) e o `Origin` é
 * removido — sem CORS habilitado, o REST do Protheus responde 401 a requisição
 * com `Origin`, que o navegador manda em todo POST/PUT/DELETE. */
export function buildProxyConfigJs(options: ProxyJsOptions): string {
  const outras = options.otherEntries ?? {};
  const linhasOutras = Object.keys(outras)
    .filter((k) => k !== '/rest')
    .map((k) => `  ${JSON.stringify(k)}: ${JSON.stringify(outras[k])},`);
  return [
    '// Gerado pelo PO-UI Specialist (connect) — proxy do ng serve para o REST do Protheus.',
    `// A senha/token NAO fica aqui: e lida a cada requisicao de ${PROXY_SECRET_FILE} (no .gitignore).`,
    "const fs = require('fs');",
    "const path = require('path');",
    '',
    `const PROTHEUS_URL = ${JSON.stringify(options.protheusUrl)};`,
    `const AUTH = ${JSON.stringify(options.auth)};`,
    `const USUARIO = ${JSON.stringify(options.username ?? '')};`,
    `const TENANT_ID = ${JSON.stringify(options.tenantId ?? '')};`,
    '',
    'function segredo() {',
    `  const arquivo = path.join(__dirname, ${JSON.stringify(PROXY_SECRET_FILE)});`,
    "  return fs.existsSync(arquivo) ? fs.readFileSync(arquivo, 'utf8').replace(/[\\r\\n]/g, '') : '';",
    '}',
    '',
    'function ajustarRequisicao(proxyReq) {',
    '  const valor = segredo();',
    "  if (AUTH === 'basic' && valor) {",
    "    proxyReq.setHeader('Authorization', 'Basic ' + Buffer.from(USUARIO + ':' + valor).toString('base64'));",
    "  } else if (AUTH === 'bearer' && valor) {",
    "    proxyReq.setHeader('Authorization', 'Bearer ' + valor);",
    '  }',
    '  if (TENANT_ID) {',
    "    proxyReq.setHeader('tenantId', TENANT_ID);",
    '  }',
    '  // sem CORS habilitado no REST do Protheus, requisicao com Origin volta 401',
    "  proxyReq.removeHeader('origin');",
    '}',
    '',
    'module.exports = {',
    ...linhasOutras,
    "  '/rest': {",
    '    target: PROTHEUS_URL,',
    '    secure: false,',
    '    changeOrigin: true,',
    "    logLevel: 'info',",
    '    // Angular 17+ (builder application / Vite)',
    "    configure: (proxy) => proxy.on('proxyReq', ajustarRequisicao),",
    '    // builder browser (webpack-dev-server)',
    '    onProxyReq: ajustarRequisicao,',
    '  },',
    '};',
    '',
  ].join('\n');
}

/** Entradas de um `proxy.conf.json` existente, exceto `/rest` (que o connect regenera). */
export function otherProxyEntries(existingJson: string | undefined): Record<string, unknown> {
  if (!existingJson) {
    return {};
  }
  try {
    const parsed = JSON.parse(existingJson) as Record<string, unknown>;
    const { '/rest': _rest, ...outras } = parsed;
    return outras;
  } catch {
    return {};
  }
}

export function setProxyConfigInAngularJson(angularJson: AngularJson, projectName: string, proxyFile: string): AngularJson {
  const fixed = JSON.parse(JSON.stringify(angularJson)) as AngularJson;
  const serve = fixed.projects[projectName].architect.serve;
  serve.options = { ...(serve.options ?? {}), proxyConfig: proxyFile };
  return fixed;
}

/** O scaffold grava `ng serve --proxy-config proxy.conf.json` no `start`, que
 * sobrepõe o `angular.json` — troca para o `proxy.conf.js`. */
export function updateStartScriptProxy(startScript: string | undefined): string | undefined {
  return startScript?.replace(/proxy\.conf\.json\b/g, PROXY_JS_FILE);
}

/** Arquivos de proxy (endereços internos) e o segredo nunca vão ao repositório. */
export function buildConnectGitignoreAdditions(existingGitignoreContent: string): string {
  const existentes = existingGitignoreContent.split(/\r?\n/).map((l) => l.trim());
  const faltando = ['proxy.conf.json', PROXY_JS_FILE, PROXY_SECRET_FILE].filter((f) => !existentes.includes(f));
  if (faltando.length === 0) {
    return '';
  }
  return `\n# Proxy do Protheus — endereços internos e credencial de desenvolvimento\n${faltando.join('\n')}\n`;
}
