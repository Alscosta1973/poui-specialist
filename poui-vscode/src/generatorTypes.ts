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
];

export function getGeneratorType(id: string): GeneratorType | undefined {
  return GENERATOR_TYPES.find((type) => type.id === id);
}
