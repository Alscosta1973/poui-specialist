// Catálogo de tipos que `poui.generate.component` sabe gerar — descrições
// reaproveitadas de skills/poui-code-generation/SKILL.md (mesma fonte que a
// IA usa pra escolher o template), pra não ter duas cópias divergentes do
// texto. `previewAsset` só existe pros tipos que geram uma tela de verdade
// (arquivo em media/previews/, mesmo estilo dos mockups do site de docs).

export interface CatalogEntry {
  id: string;
  title: string;
  description: string;
  previewAsset?: string;
}

export interface CatalogGroup {
  label: string;
  entries: CatalogEntry[];
}

export const CATALOG: CatalogGroup[] = [
  {
    label: 'Reconciliação / conciliação',
    entries: [
      {
        id: 'two-panel-browse',
        title: 'two-panel-browse',
        description: 'Duas po-table lado a lado; usuário seleciona uma linha de cada e confirma um pareamento (conciliação de cartão, matching de documentos, conciliação bancária).',
        previewAsset: 'templates-two-panel-browse.svg',
      },
    ],
  },
  {
    label: 'Master-detail ERP',
    entries: [
      {
        id: 'stacked-browse',
        title: 'stacked-browse',
        description: 'Duas po-table empilhadas: a de cima (mestre) controla o que aparece na de baixo (detalhe). Navegação por teclado completa. Uso típico: SC5/SC6, pedidos+itens.',
        previewAsset: 'templates-stacked-browse.svg',
      },
    ],
  },
  {
    label: 'Listas',
    entries: [
      {
        id: 'action-list',
        title: 'action-list',
        description: 'Lista com várias ações procedurais independentes do Protheus; cada ação tem modal de confirmação com interpolação de campos e resultado por linha (sucesso parcial).',
        previewAsset: 'templates-action-list.svg',
      },
      {
        id: 'page-list',
        title: 'page-list',
        description: 'Lista simples, só com busca rápida.',
        previewAsset: 'templates-page-list.svg',
      },
      {
        id: 'page-dynamic-search',
        title: 'page-dynamic-search',
        description: 'Lista com busca rápida + busca avançada + disclaimers (padrão Protheus).',
        previewAsset: 'templates-page-dynamic-search.svg',
      },
      {
        id: 'page-dynamic',
        title: 'page-dynamic',
        description: 'Lista zero-boilerplate usando PoPageDynamicTableComponent (API precisa seguir o contrato do plugin).',
        previewAsset: 'templates-page-dynamic.svg',
      },
      {
        id: 'master-detail',
        title: 'master-detail',
        description: 'Lista com linhas filhas expansíveis (itens de pedido, linhas de fatura) via detail do po-table.',
        previewAsset: 'templates-master-detail.svg',
      },
    ],
  },
  {
    label: 'Formulários',
    entries: [
      {
        id: 'page-edit',
        title: 'page-edit',
        description: 'Formulário complexo com muitos campos e seções, navega por rota.',
        previewAsset: 'templates-page-edit.svg',
      },
      {
        id: 'modal-crud',
        title: 'modal-crud',
        description: 'Lista + modal de incluir/editar tudo em um só lugar (entidades mais simples, até ~10 campos).',
        previewAsset: 'templates-modal-crud.svg',
      },
      {
        id: 'page-detail',
        title: 'page-detail',
        description: 'Visualização somente-leitura com po-page-detail + po-dynamic-view, carrega por rota.',
        previewAsset: 'templates-page-detail.svg',
      },
      {
        id: 'stepper-form',
        title: 'stepper-form',
        description: 'Formulário multi-etapas com po-stepper (3+ seções distintas).',
        previewAsset: 'templates-stepper-form.svg',
      },
    ],
  },
  {
    label: 'Outros',
    entries: [
      {
        id: 'auth-login',
        title: 'auth-login',
        description: 'Autenticação: po-page-login + AuthService + authGuard + tokenInterceptor + endpoint TLPP de login.',
        previewAsset: 'templates-auth-login.svg',
      },
      {
        id: 'dashboard',
        title: 'dashboard',
        description: 'Página analítica: KPIs com po-widget + gráficos com po-chart.',
        previewAsset: 'templates-dashboard.svg',
      },
      {
        id: 'service',
        title: 'service',
        description: 'Service Angular consumindo o CRUD REST do Protheus.',
      },
      {
        id: 'module',
        title: 'module',
        description: 'Scaffold de app: config, rotas, shell, package.json, proxy, tsconfig.',
      },
      {
        id: 'models',
        title: 'models',
        description: 'Interfaces TypeScript de model: simples, chave composta, relacional flat.',
      },
      {
        id: 'tlpp-contract',
        title: 'tlpp-contract',
        description: 'Contrato REST de backend: endpoints, paginação (TTALK remainingRecords), formato de erro (legado + TTALK), skeleton WsRestFul e TLPP REST por anotações.',
      },
      {
        id: 'refactor-from-tlpp',
        title: 'refactor-from-tlpp',
        description: 'Analisa um .prw/.tlpp existente → extrai colunas/ações/regras → gera PO-UI direto, sem brainstorming aberto.',
      },
      {
        id: 'http-interceptor',
        title: 'http-interceptor',
        description: 'Interceptors funcionais Angular: token de auth, tradução de erro do Protheus, overlay de loading.',
      },
      {
        id: 'route-guard',
        title: 'route-guard',
        description: 'Guards funcionais Angular: CanActivate (auth/permissão Protheus), CanDeactivate (alterações não salvas).',
      },
      {
        id: 'standalone-migrate',
        title: 'standalone-migrate',
        description: 'Guia de migração: converte componente NgModule pra standalone + OnPush + signals.',
      },
      {
        id: 'exemplo-e2e',
        title: 'exemplo-e2e',
        description: 'Referência ponta-a-ponta completa: componente Angular + service + backend TLPP + proxy + CORS pra uma entidade de exemplo.',
      },
    ],
  },
];

export function findCatalogEntry(id: string): CatalogEntry | undefined {
  for (const group of CATALOG) {
    const entry = group.entries.find((e) => e.id === id);
    if (entry) {
      return entry;
    }
  }
  return undefined;
}
