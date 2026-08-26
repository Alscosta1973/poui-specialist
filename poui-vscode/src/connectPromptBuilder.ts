import { assembleSystemPrompt } from './systemPromptAssembly';

export type EndpointInfo =
  | { kind: 'existing'; path: string }
  | { kind: 'new'; businessRules: string };

export type InterceptorHandling = 'remove' | 'deactivate';

/** Nenhum campo de credencial aqui — de propósito. `proxy.conf.json` (com
 * usuário/senha/token, se houver) é escrito diretamente pela extensão antes
 * de qualquer chamada ao CLI; ver protheusProxy.ts. O agente nunca vê a
 * credencial, só o fato de que o proxy já está configurado. */
export interface ConnectParams {
  componentPath: string;
  module: string;
  apiPrefix: string;
  endpoint: EndpointInfo;
  extraActions?: string;
  interceptorHandling: InterceptorHandling;
}

export async function buildConnectSystemPrompt(assetsDir: string, endpointIsNew: boolean): Promise<string> {
  const referenceFiles = ['poui-connect-skill.md', 'protheus-rest.md'];
  if (endpointIsNew) {
    referenceFiles.push('templates-tlpp-contract.md');
  }
  return assembleSystemPrompt(referenceFiles, assetsDir);
}

export function buildConnectUserPrompt(params: ConnectParams): string {
  const lines = [
    `Conecte o componente em "${params.componentPath}" (módulo ${params.module}) aos dados reais`,
    'do Protheus, seguindo os Passos 1, 2, 5, 6 e 8 da skill acima (diagnóstico de mocks,',
    'reescrita do service para HTTP real, tratamento do interceptor, atualização do spec).',
    '',
    `Prefixo da API Protheus: ${params.apiPrefix}`,
    `Ação de interceptor escolhida pelo usuário: ${
      params.interceptorHandling === 'remove'
        ? 'Opção A — remover o registro do interceptor de mock em app.config.ts'
        : 'Opção B — manter o arquivo do interceptor mas desativá-lo (comentário no topo, para rollback fácil)'
    }.`,
    '',
    'IMPORTANTE: proxy.conf.json já foi configurado pela extensão antes desta chamada — não crie',
    'nem edite esse arquivo, e não pergunte por URL/credenciais do Protheus, elas já foram',
    'tratadas fora desta conversa.',
  ];

  if (params.endpoint.kind === 'existing') {
    lines.push('', `O endpoint GET já existe no Protheus: ${params.endpoint.path}`);
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

  lines.push(
    '',
    'Não rode `ng test`/`ng build` — a extensão verifica o build automaticamente depois desta',
    'chamada. Ao final, resuma os arquivos alterados.',
  );

  return lines.join('\n');
}
