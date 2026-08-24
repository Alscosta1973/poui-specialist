export interface ListComponentType {
  id: string;
  label: string;
  description: string;
  referenceFiles: string[];
}

export const LIST_COMPONENT_TYPES: ListComponentType[] = [
  {
    id: 'page-list',
    label: 'Page List',
    description: 'Lista simples com busca rápida apenas',
    referenceFiles: ['code-generator-list.md', 'templates-page-list.md', 'templates-service.md', 'table-components.md', 'po-ui-quirks-table.md', 'po-ui-quirks-onpush.md'],
  },
  {
    id: 'page-dynamic-search',
    label: 'Page Dynamic Search',
    description: 'Lista + busca avançada + disclaimers — padrão Protheus',
    referenceFiles: [
      'code-generator-list.md',
      'templates-page-dynamic-search.md',
      'templates-service.md',
      'table-components.md',
      'form-fields.md',
      'po-ui-quirks-table.md',
      'po-ui-quirks-onpush.md',
    ],
  },
  {
    id: 'stacked-browse',
    label: 'Stacked Browse',
    description: 'Dois po-table empilhados com navegação por teclado ArrowUp/Down e Tab',
    referenceFiles: [
      'code-generator-list.md',
      'templates-stacked-browse.md',
      'templates-stacked-browse-ts.md',
      'templates-stacked-browse-html.md',
      'templates-service.md',
      'po-ui-quirks-table.md',
      'po-ui-quirks-onpush.md',
    ],
  },
  {
    id: 'two-panel-browse',
    label: 'Two Panel Browse',
    description: 'Dois po-table lado a lado para conciliação/matching',
    referenceFiles: [
      'code-generator-list.md',
      'templates-two-panel-browse.md',
      'templates-two-panel-browse-ts.md',
      'templates-two-panel-browse-html.md',
      'templates-service.md',
      'po-ui-quirks-table.md',
      'po-ui-quirks-onpush.md',
    ],
  },
  {
    id: 'action-list',
    label: 'Action List',
    description: 'Lista com N ações procedurais Protheus + modais de confirmação',
    referenceFiles: ['code-generator-list.md', 'templates-action-list.md', 'templates-service.md', 'table-components.md', 'po-ui-quirks-table.md', 'po-ui-quirks-onpush.md'],
  },
  {
    id: 'master-detail',
    label: 'Master Detail',
    description: 'Lista com linhas filho expansíveis (pedido/itens, NF/itens)',
    referenceFiles: ['code-generator-list.md', 'templates-master-detail.md', 'templates-service.md', 'table-components.md', 'po-ui-quirks-table.md', 'po-ui-quirks-onpush.md'],
  },
];

export function getListComponentType(id: string): ListComponentType | undefined {
  return LIST_COMPONENT_TYPES.find((type) => type.id === id);
}
