import { assembleSystemPrompt } from './systemPromptAssembly';

export type EndpointInfo =
  | { kind: 'existing'; path: string }
  | { kind: 'new'; businessRules: string }
  | { kind: 'mvc'; source: string };

export type InterceptorHandling = 'remove' | 'deactivate';

/** `simple` (padrão) = `q` + parâmetros próprios; `odata` = parâmetro `filter` com expressão oData. */
export type FilterStyle = 'simple' | 'odata';

/** Nenhum campo de credencial aqui — de propósito. `proxy.conf.js` e o
 * `protheus-dev.secret` (senha/token, se houver) são escritos diretamente pela extensão antes
 * de qualquer chamada ao CLI; ver protheusProxy.ts. O agente nunca vê a
 * credencial, só o fato de que o proxy já está configurado. */
export interface ConnectParams {
  componentPath: string;
  module: string;
  apiPrefix: string;
  endpoint: EndpointInfo;
  extraActions?: string;
  /** `undefined` quando o diagnóstico prévio (findMockInterceptors) não achou
   * nenhum interceptor de mock pra este componente — nesse caso a instrução
   * de tratamento de interceptor é omitida do prompt, sem pergunta ao usuário. */
  interceptorHandling?: InterceptorHandling;
  /** Ausente = `simple`. */
  filterStyle?: FilterStyle;
}

/** O template do contrato TLPP traz o skeleton do endpoint novo e o helper oData do frontend. */
export function connectReferenceFiles(endpointIsNew: boolean, odata: boolean, mvc = false): string[] {
  const referenceFiles = ['poui-connect-skill.md', 'protheus-rest.md'];
  if (mvc) {
    referenceFiles.push('templates-mvc-rest.md');
  } else if (endpointIsNew || odata) {
    referenceFiles.push('templates-tlpp-contract.md');
  }
  return referenceFiles;
}

export async function buildConnectSystemPrompt(
  assetsDir: string,
  endpointIsNew: boolean,
  odata = false,
  mvc = false,
): Promise<string> {
  return assembleSystemPrompt(connectReferenceFiles(endpointIsNew, odata, mvc), assetsDir);
}

export function buildConnectUserPrompt(params: ConnectParams): string {
  const lines = [
    `Conecte o componente em "${params.componentPath}" (módulo ${params.module}) aos dados reais`,
    'do Protheus, seguindo os Passos 1, 2, 5, 6 e 8 da skill acima (diagnóstico de mocks,',
    'reescrita do service para HTTP real, tratamento do interceptor, atualização do spec).',
    '',
    `Prefixo da API Protheus: ${params.apiPrefix}`,
  ];

  if (params.interceptorHandling) {
    lines.push(
      `Ação de interceptor escolhida pelo usuário: ${
        params.interceptorHandling === 'remove'
          ? 'Opção A — remover o registro do interceptor de mock em app.config.ts'
          : 'Opção B — manter o arquivo do interceptor mas desativá-lo (comentário no topo, para rollback fácil)'
      }.`,
    );
  }

  lines.push(
    '',
    'IMPORTANTE: o proxy (proxy.conf.js + protheus-dev.secret) já foi configurado pela extensão antes',
    'desta chamada — não crie nem edite esses arquivos (nem proxy.conf.json), não leia o protheus-dev.secret',
    'e não pergunte por URL/credenciais do Protheus, elas já foram tratadas fora desta conversa.',
  );

  if (params.endpoint.kind === 'existing') {
    lines.push('', `O endpoint GET já existe no Protheus: ${params.endpoint.path}`);
  } else if (params.endpoint.kind === 'mvc') {
    const source = params.endpoint.source;
    lines.push(
      '',
      `A rotina ${source} já tem MVC: siga a "Variante MVC" do Passo 5 da skill (--mvc ${source}) —`,
      `gere RM_${source}.prw (FWRestModel, /rest/fwmodel) e troque o service pelo ProtheusMvcService,`,
      'conforme templates-mvc-rest.md. Não gere contrato TLPP próprio.',
    );
  } else {
    lines.push(
      '',
      'O endpoint ainda NÃO existe no Protheus — gere o contrato TLPP (Passo 7 da skill) com base',
      'nestas regras de negócio informadas pelo usuário:',
      params.endpoint.businessRules,
    );
  }

  if (params.extraActions) {
    lines.push('', `Ações além do GET informadas pelo usuário: ${params.extraActions}`);
  }

  if (params.filterStyle === 'odata') {
    lines.push(
      '',
      'Filtro da lista escolhido pelo usuário: oData. Siga a "Variante oData" do Passo 5 da skill —',
      'parâmetro `filter` montado com o helper toODataFilter (src/app/core/odata-filter.ts + spec, código',
      'na seção "Filtro oData (opcional)" do templates-tlpp-contract.md); se o endpoint for novo, gere o',
      'GET da lista com FWAdapterBaseV2.',
    );
  }

  lines.push(
    '',
    'Não rode `ng test`/`ng build` — a extensão verifica o build automaticamente depois desta',
    'chamada. Ao final, resuma os arquivos alterados.',
  );

  return lines.join('\n');
}
