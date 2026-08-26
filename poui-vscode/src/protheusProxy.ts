// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AngularJson = any;

/** Header `Authorization: Basic <base64>` — construído inteiramente aqui, em
 * Node puro. **Nunca** passar usuário/senha pro prompt do CLI do Claude: o
 * modo `-p` não-interativo passa o prompt como argumento literal do
 * processo, visível a qualquer processo na máquina que liste processos
 * (Task Manager, WMI, `ps`, etc.) — diferente do plugin original, que roda
 * dentro do chat interativo. */
export function buildBasicAuthHeader(username: string, password: string): string {
  return `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
}

export interface ProxyTarget {
  target: string;
  secure: boolean;
  changeOrigin: boolean;
  logLevel: string;
  headers?: { Authorization: string };
}

export function buildProxyConfig(protheusUrl: string, authorizationHeader?: string): { '/rest': ProxyTarget } {
  const target: ProxyTarget = {
    target: protheusUrl,
    secure: false,
    changeOrigin: true,
    logLevel: 'info',
  };
  if (authorizationHeader) {
    target.headers = { Authorization: authorizationHeader };
  }
  return { '/rest': target };
}

/** Funde a entrada `/rest` num `proxy.conf.json` já existente (se houver),
 * preservando outras entradas — ou usa a nova configuração como o arquivo
 * inteiro se não havia nada antes. */
export function mergeProxyConfig(existingContent: string | undefined, newRestConfig: { '/rest': ProxyTarget }): string {
  const existing = existingContent ? JSON.parse(existingContent) : {};
  const merged = { ...existing, ...newRestConfig };
  return JSON.stringify(merged, null, 2) + '\n';
}

export function needsProxyConfigInAngularJson(angularJson: AngularJson, projectName: string): boolean {
  const options = angularJson?.projects?.[projectName]?.architect?.serve?.options ?? {};
  return !options.proxyConfig;
}

export function addProxyConfigToAngularJson(angularJson: AngularJson, projectName: string): AngularJson {
  const fixed = JSON.parse(JSON.stringify(angularJson)) as AngularJson;
  fixed.projects[projectName].architect.serve.options.proxyConfig = 'proxy.conf.json';
  return fixed;
}

/** `proxy.conf.json` pode conter usuário/senha/token — nunca deve ir ao
 * repositório. */
export function buildConnectGitignoreAdditions(existingGitignoreContent: string): string {
  if (existingGitignoreContent.includes('proxy.conf.json')) {
    return '';
  }
  return '\n# Proxy — pode conter endereços/credenciais de servidores internos\nproxy.conf.json\n';
}
