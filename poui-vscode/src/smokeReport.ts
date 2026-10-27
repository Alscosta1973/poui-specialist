import * as path from 'node:path';
import { DoctorFinding } from './appDoctor';

/** Evento gravado pelo smoke-protheus.cjs (skills/poui-smoke) em smoke-events.json. */
export interface SmokeEvent {
  t: number;
  type: 'step' | 'app-frame' | 'api' | 'console-error' | 'page-error' | 'request-failed';
  name?: string;
  ok?: boolean;
  error?: string;
  url?: string;
  method?: string;
  status?: number;
  text?: string;
  frame?: string;
}

const DICA_ETAPA: Record<string, string> = {
  webapp: 'Confira a URL da WebApp (poui.smoke.webAppUrl), o programa inicial e o ambiente, e se o serviço do AppServer está no ar.',
  login: 'Confira o usuário (poui.smoke.user) e a senha no arquivo poui.smoke.passwordFile; usuário bloqueado ou sem licença também recusa.',
  sessao: 'A tela de sessão (grupo/filial/data base) ou um aviso pós-login não foi concluída — rode com headless=false para ver.',
  menu: 'A rotina não foi encontrada: ajuste poui.smoke.menuSearch (texto da pesquisa) e poui.smoke.menuItem (texto exato do item).',
  app: 'Rode "PO-UI: Diagnosticar App no Protheus" (doctor) — pacote sem a pasta do app na raiz ou extração antiga em app-root.',
};

const segundos = (ms: number) => `${(ms / 1000).toFixed(1).replace('.', ',')} s`;

/** Interpreta os eventos do smoke: etapas, abertura do app, chamadas de API e erros do app. */
export function analyzeSmoke(events: SmokeEvent[], appName: string): DoctorFinding[] {
  const achados: DoctorFinding[] = [];

  const falha = events.find((e) => e.type === 'step' && e.ok === false);
  if (falha) {
    achados.push({
      level: 'error',
      message: `Falhou na etapa "${falha.name}": ${falha.error ?? 'erro desconhecido'}.`,
      hint: DICA_ETAPA[falha.name ?? ''],
    });
  }

  const frame = events.find((e) => e.type === 'app-frame');
  if (frame) {
    achados.push({ level: 'ok', message: `O app abriu em ${segundos(frame.t)} (${frame.url}).` });
  }

  const apis = events.filter((e) => e.type === 'api');
  for (const a of apis.filter((x) => (x.status ?? 0) < 400)) {
    achados.push({ level: 'ok', message: `${a.method} ${a.url} → ${a.status}` });
  }
  for (const a of apis.filter((x) => (x.status ?? 0) >= 400)) {
    achados.push({
      level: 'warn',
      message: `${a.method} ${a.url} → ${a.status}`,
      hint:
        a.status === 401
          ? 'A chamada saiu sem sessão válida: o usuário logado não tem acesso à rota ou a sessão do FwCallApp expirou.'
          : a.status === 404
            ? 'Rota não encontrada: confira o prefixo da API no app e se o fonte REST está compilado no RPO.'
            : 'Veja o console.log do AppServer para o erro da API.',
    });
  }
  if (frame && apis.length === 0) {
    achados.push({
      level: 'info',
      message: 'Nenhuma chamada de API observada depois que o app abriu.',
      hint: 'Normal se a tela inicial não busca dados; senão, confira se o app usa o ProtheusLibCore (base REST do FwCallApp).',
    });
  }

  const doApp = `/app-root/${appName}_env_`;
  for (const e of events.filter((x) => x.type === 'console-error' && (x.frame ?? '').includes(doApp)).slice(0, 5)) {
    achados.push({ level: 'warn', message: `Erro no console do app: ${e.text}` });
  }
  for (const e of events.filter((x) => x.type === 'page-error').slice(0, 5)) {
    achados.push({ level: 'warn', message: `Erro não tratado na página: ${e.text}` });
  }
  for (const e of events.filter((x) => x.type === 'request-failed').slice(0, 5)) {
    achados.push({ level: 'warn', message: `Requisição falhou: ${e.url} (${e.error})` });
  }
  return achados;
}

/** Pasta (no projeto) com smoke-events.json e smoke.png — fica no .gitignore. */
export const SMOKE_OUT_DIR = 'smoke-results';

/** Settings `poui.smoke.*` do comando "Smoke no Protheus". */
export interface SmokeSettings {
  webAppUrl: string;
  program: string;
  environment: string;
  user: string;
  passwordFile: string;
  menuSearch: string;
  menuItem: string;
}

const OBRIGATORIOS: (keyof SmokeSettings)[] = ['webAppUrl', 'program', 'environment', 'user', 'passwordFile', 'menuSearch'];

export function missingSmokeSettings(settings: SmokeSettings): (keyof SmokeSettings)[] {
  return OBRIGATORIOS.filter((k) => !(settings[k] ?? '').trim());
}

/** Config lido pelo smoke-protheus.cjs (caminhos absolutos; a senha nunca entra aqui, só o arquivo). */
export function buildSmokeConfig(settings: SmokeSettings, workspaceRoot: string, appName: string) {
  return {
    webAppUrl: settings.webAppUrl.trim(),
    program: settings.program.trim(),
    environment: settings.environment.trim(),
    user: settings.user.trim(),
    passwordFile: path.resolve(workspaceRoot, settings.passwordFile.trim()),
    menuSearch: settings.menuSearch.trim(),
    menuItem: settings.menuItem.trim() || undefined,
    appName,
    outDir: path.join(workspaceRoot, SMOKE_OUT_DIR),
    timeoutSec: 90,
  };
}

/** `smoke-results/` e o arquivo de senha (quando relativo ao projeto) nunca vão ao repositório. */
export function buildSmokeGitignoreAdditions(existingGitignoreContent: string, passwordFileInWorkspace: string | undefined): string {
  const existentes = existingGitignoreContent.split(/\r?\n/).map((l) => l.trim());
  const faltando = [`${SMOKE_OUT_DIR}/`, ...(passwordFileInWorkspace ? [passwordFileInWorkspace] : [])].filter(
    (f) => !existentes.includes(f),
  );
  return faltando.length ? `\n# Smoke no Protheus — resultados e senha local\n${faltando.join('\n')}\n` : '';
}
