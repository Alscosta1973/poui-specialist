export interface GeneratorType {
  id: string;
  label: string;
  description: string;
  /** Nome do grupo usado como separador visual no QuickPick. */
  family: 'Lista/Browse' | 'Formulários' | 'Infraestrutura';
  referenceFiles: string[];
  /** Falso apenas para tipos com destino fixo (ex: auth-login sempre em src/app/auth/). */
  requiresModule: boolean;
  /** Usado no lugar do módulo perguntado ao usuário quando requiresModule é falso. */
  fixedModule?: string;
  /** Verdadeiro só para `refactor` — pede um arquivo `.prw`/`.tlpp` fonte via showOpenDialog. */
  requiresSourceFile?: boolean;
}

export const GENERATOR_TYPES: GeneratorType[] = [
  // Lista/Browse (Fase 1) — agente code-generator-list.md
  {
    id: 'page-list',
    label: 'Page List',
    description: 'Lista simples com busca rápida apenas',
    family: 'Lista/Browse',
    referenceFiles: ['code-generator-list.md', 'templates-page-list.md', 'templates-service.md', 'table-components.md', 'po-ui-quirks-table.md', 'po-ui-quirks-onpush.md'],
    requiresModule: true,
  },
  {
    id: 'page-dynamic-search',
    label: 'Page Dynamic Search',
    description: 'Lista + busca avançada + disclaimers — padrão Protheus',
    family: 'Lista/Browse',
    referenceFiles: [
      'code-generator-list.md',
      'templates-page-dynamic-search.md',
      'templates-service.md',
      'table-components.md',
      'form-fields.md',
      'po-ui-quirks-table.md',
      'po-ui-quirks-onpush.md',
    ],
    requiresModule: true,
  },
  {
    id: 'stacked-browse',
    label: 'Stacked Browse',
    description: 'Dois po-table empilhados com navegação por teclado ArrowUp/Down e Tab',
    family: 'Lista/Browse',
    referenceFiles: [
      'code-generator-list.md',
      'templates-stacked-browse.md',
      'templates-stacked-browse-ts.md',
      'templates-stacked-browse-html.md',
      'templates-service.md',
      'po-ui-quirks-table.md',
      'po-ui-quirks-onpush.md',
    ],
    requiresModule: true,
  },
  {
    id: 'two-panel-browse',
    label: 'Two Panel Browse',
    description: 'Dois po-table lado a lado para conciliação/matching',
    family: 'Lista/Browse',
    referenceFiles: [
      'code-generator-list.md',
      'templates-two-panel-browse.md',
      'templates-two-panel-browse-ts.md',
      'templates-two-panel-browse-html.md',
      'templates-service.md',
      'po-ui-quirks-table.md',
      'po-ui-quirks-onpush.md',
    ],
    requiresModule: true,
  },
  {
    id: 'action-list',
    label: 'Action List',
    description: 'Lista com N ações procedurais Protheus + modais de confirmação',
    family: 'Lista/Browse',
    referenceFiles: ['code-generator-list.md', 'templates-action-list.md', 'templates-service.md', 'table-components.md', 'po-ui-quirks-table.md', 'po-ui-quirks-onpush.md'],
    requiresModule: true,
  },
  {
    id: 'master-detail',
    label: 'Master Detail',
    description: 'Lista com linhas filho expansíveis (pedido/itens, NF/itens)',
    family: 'Lista/Browse',
    referenceFiles: ['code-generator-list.md', 'templates-master-detail.md', 'templates-service.md', 'table-components.md', 'po-ui-quirks-table.md', 'po-ui-quirks-onpush.md'],
    requiresModule: true,
  },
  {
    id: 'page-dynamic',
    label: 'Page Dynamic',
    description: 'Zero-boilerplate via PoPageDynamicTableComponent',
    family: 'Lista/Browse',
    referenceFiles: ['code-generator-list.md', 'templates-page-dynamic.md', 'dynamic-pages.md', 'po-ui-quirks-onpush.md'],
    requiresModule: true,
  },
  {
    id: 'infinite-scroll',
    label: 'Infinite Scroll',
    description: 'Lista com carregamento automático ao rolar (IntersectionObserver)',
    family: 'Lista/Browse',
    referenceFiles: ['code-generator-list.md', 'templates-infinite-scroll.md', 'templates-service.md', 'po-ui-quirks-onpush.md'],
    requiresModule: true,
  },
  {
    id: 'po-tree',
    label: 'Po Tree',
    description: 'Navegação hierárquica com po-tree-view (flat-to-tree pré-carregado ou lazy loading por nó)',
    family: 'Lista/Browse',
    referenceFiles: ['code-generator-list.md', 'templates-tree.md', 'templates-service.md', 'navigation-components.md'],
    requiresModule: true,
  },
  // Formulários (Fase 2) — agente code-generator-forms.md
  {
    id: 'page-edit',
    label: 'Page Edit',
    description: 'Formulário com muitos campos, navega via rota',
    family: 'Formulários',
    referenceFiles: ['code-generator-forms.md', 'templates-page-edit.md', 'templates-service.md', 'form-fields.md', 'dynamic-form-fields.md'],
    requiresModule: true,
  },
  {
    id: 'page-detail',
    label: 'Page Detail',
    description: 'Detalhe somente leitura, rota :id/detalhe',
    family: 'Formulários',
    referenceFiles: ['code-generator-forms.md', 'templates-page-detail.md', 'templates-service.md', 'modal-dialog.md'],
    requiresModule: true,
  },
  {
    id: 'modal-crud',
    label: 'Modal CRUD',
    description: 'Lista + modal add/edit num único componente (até ~10 campos)',
    family: 'Formulários',
    referenceFiles: ['code-generator-forms.md', 'templates-modal-crud.md', 'templates-service.md', 'form-fields.md', 'modal-dialog.md'],
    requiresModule: true,
  },
  {
    id: 'stepper-form',
    label: 'Stepper Form',
    description: 'Wizard multi-etapas com po-stepper (3+ seções distintas)',
    family: 'Formulários',
    referenceFiles: ['code-generator-forms.md', 'templates-stepper-form.md', 'templates-service.md', 'form-fields.md', 'dynamic-form-fields.md'],
    requiresModule: true,
  },
  // Infraestrutura (Fase 2) — agente code-generator-infra.md
  {
    id: 'service',
    label: 'Service',
    description: 'Angular service consumindo REST Protheus (sem componente)',
    family: 'Infraestrutura',
    referenceFiles: ['code-generator-infra.md', 'templates-service.md', 'protheus-rest.md'],
    requiresModule: true,
  },
  {
    id: 'dashboard',
    label: 'Dashboard',
    description: 'Página analítica com po-widget + po-chart',
    family: 'Infraestrutura',
    referenceFiles: ['code-generator-infra.md', 'templates-dashboard.md', 'po-ui-quirks-onpush.md'],
    requiresModule: true,
  },
  {
    id: 'tlpp-contract',
    label: 'TLPP Contract',
    description: 'Skeleton WsRestFul para backend Protheus (sem componente Angular)',
    family: 'Infraestrutura',
    referenceFiles: ['code-generator-infra.md', 'templates-tlpp-contract.md'],
    requiresModule: true,
  },
  {
    id: 'auth-login',
    label: 'Auth Login',
    description: 'po-page-login + AuthService + authGuard + tokenInterceptor — sempre em src/app/auth/',
    family: 'Infraestrutura',
    referenceFiles: ['code-generator-infra.md', 'templates-auth-login.md'],
    requiresModule: false,
    fixedModule: 'auth',
  },
  {
    id: 'module',
    label: 'Module',
    description: 'Scaffold completo de aplicação (routes, config, proxy, package.json) — usa o próprio nome como módulo',
    family: 'Infraestrutura',
    referenceFiles: ['code-generator-infra.md', 'templates-module.md', 'module-structure.md', 'po-ui-patterns-i18n.md'],
    requiresModule: false,
  },
  {
    id: 'models',
    label: 'Models',
    description: 'Interfaces TypeScript: simples, chave composta, flat relational (padrão Protheus)',
    family: 'Infraestrutura',
    referenceFiles: ['code-generator-infra.md', 'templates-models.md'],
    requiresModule: true,
  },
  {
    id: 'refactor',
    label: 'Refactor',
    description: 'Converte .prw/.tlpp existente para PO-UI standalone',
    family: 'Infraestrutura',
    referenceFiles: [
      'code-generator-infra.md',
      'templates-refactor-from-tlpp.md',
      'form-fields.md',
      'table-components.md',
      'po-ui-quirks-table.md',
      'po-ui-quirks-forms.md',
      'po-ui-quirks-onpush.md',
    ],
    requiresModule: true,
    requiresSourceFile: true,
  },
  {
    id: 'http-interceptor',
    label: 'Http Interceptor',
    description: 'Interceptor funcional — auth token Protheus, tradução de erros Latin-1, loading overlay',
    family: 'Infraestrutura',
    referenceFiles: ['code-generator-infra.md', 'templates-http-interceptor.md', 'protheus-rest.md'],
    requiresModule: true,
  },
  {
    id: 'route-guard',
    label: 'Route Guard',
    description: 'Guard funcional — CanActivate (auth/permissão Protheus) e CanDeactivate (alterações não salvas)',
    family: 'Infraestrutura',
    referenceFiles: ['code-generator-infra.md', 'templates-route-guard.md'],
    requiresModule: true,
  },
  {
    id: 'standalone-migrate',
    label: 'Standalone Migrate',
    description: 'Migra componente legado NgModule para standalone + OnPush + signals + inject()',
    family: 'Infraestrutura',
    referenceFiles: ['code-generator-infra.md', 'templates-standalone-migrate.md', 'po-ui-quirks-onpush.md', 'module-structure.md'],
    requiresModule: true,
  },
  {
    id: 'upload',
    label: 'Upload',
    description: 'Upload de arquivos com po-upload (único auto-upload, múltiplo + tabela, ou embutido em form)',
    family: 'Infraestrutura',
    referenceFiles: ['code-generator-infra.md', 'templates-upload.md'],
    requiresModule: true,
  },
];

export function getGeneratorType(id: string): GeneratorType | undefined {
  return GENERATOR_TYPES.find((type) => type.id === id);
}
