# Template: page-dynamic

Generates a zero-boilerplate CRUD list screen using `PoPageDynamicTableComponent` from
`@po-ui/ng-templates` — the fastest path to a working list page when the Protheus
REST API follows the plugin's standard contract.

> **When to use vs `page-list`:**
> - `page-dynamic` → API follows the standard contract, no custom loading logic needed.
>   Automatic pagination, search, advanced filters, disclaimers, and delete.
> - `page-list` → Custom business logic in the component, computed columns, or API that
>   deviates from the standard contract.

> **Prerequisite:** `npm install @po-ui/ng-templates`

## {{kebab-name}}.component.ts

```typescript
import {
  Component,
  ChangeDetectionStrategy,
} from '@angular/core';
import { PoBreadcrumb } from '@po-ui/ng-components';
import {
  PoPageDynamicTableModule,
  PoPageDynamicTableActions,
  PoPageDynamicTableField,
} from '@po-ui/ng-templates';

@Component({
  selector: '{{selector}}',
  standalone: true,
  imports: [PoPageDynamicTableModule],
  templateUrl: './{{kebab-name}}.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class {{ComponentClass}} {
  readonly serviceApi = '{{apiPath}}';

  readonly breadcrumb: PoBreadcrumb = {
    items: [
      { label: '{{ModuleName}}', link: '/{{moduleName}}' },
      { label: '{{ModelInterface}}' },
    ],
  };

  // TODO: define columns and search filters matching {{ModelInterface}} fields.
  //
  // key: true       → campo que compõe a chave para rotas de detalhe/edição
  // filter: true    → aparece no formulário de busca avançada
  // duplicate: true → incluso na busca rápida (full-text)
  // visible: false  → oculta da tabela mas mantém disponível para rotas (ex: 'loja' em chave composta)
  readonly fields: PoPageDynamicTableField[] = [
    {
      property:  'codigo',
      label:     'Código',
      key:       true,
      width:     '10%',
      duplicate: true,
    },
    {
      property:  'nome',
      label:     'Nome',
      duplicate: true,
      filter:    true,
    },
    // Example: status field with colored labels
    // {
    //   property: 'ativo',
    //   label:    'Status',
    //   type:     'label',
    //   width:    '10%',
    //   labels: [
    //     { value: 'S', label: 'Ativo',   color: 'color-11' },
    //     { value: 'N', label: 'Inativo', color: 'color-07' },
    //   ],
    // },

    // Example: date column with advanced search
    // {
    //   property:    'dataEmissao',
    //   label:       'Emissão',
    //   type:        'date',
    //   width:       '12%',
    //   filter:      true,
    //   divider:     'Datas',        // group header in advanced search form
    //   gridColumns: 4,              // width in advanced search form (1-12)
    // },

    // Example: currency column
    // {
    //   property: 'valorTotal',
    //   label:    'Valor Total',
    //   type:     'currency',
    //   width:    '12%',
    // },

    // Example: composite key — loja hidden in table but part of route
    // { property: 'loja', label: 'Loja', key: true, visible: false },
  ];

  readonly actions: PoPageDynamicTableActions = {
    new:    'novo',
    edit:   ':id/editar',
    detail: ':id/detalhe',
    remove: true,
  };
}
```

## {{kebab-name}}.component.html

```html
<po-page-dynamic-table
  p-title="{{ModelInterface}}"
  [p-service-api]="serviceApi"
  [p-breadcrumb]="breadcrumb"
  [p-fields]="fields"
  [p-actions]="actions"
  [p-keep-filters]="true">
</po-page-dynamic-table>
```

## {{kebab-name}}.component.scss

```scss
// Add component-specific styles here
```

## Route configuration

```typescript
// In your feature routes file (e.g., clientes.routes.ts)
import { Routes } from '@angular/router';

export const {{moduleName}}Routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./{{kebab-name}}/{{kebab-name}}.component')
        .then(m => m.{{ComponentClass}}),
  },
  {
    path: 'novo',
    loadComponent: () =>
      import('./{{kebab-name-edit}}/{{kebab-name-edit}}.component')
        .then(m => m.{{ComponentClassEdit}}),
  },
  {
    path: ':id/editar',
    loadComponent: () =>
      import('./{{kebab-name-edit}}/{{kebab-name-edit}}.component')
        .then(m => m.{{ComponentClassEdit}}),
  },
  {
    path: ':id/detalhe',
    loadComponent: () =>
      import('./{{kebab-name-detail}}/{{kebab-name-detail}}.component')
        .then(m => m.{{ComponentClassDetail}}),
  },
];
```

## API contract required

`PoPageDynamicTableComponent` calls the API automatically — no service code needed in the component:

```
GET  {{apiPath}}?page=1&pageSize=10&search=termo&fields=codigo,nome
     Response 200: { "items": [...], "hasNext": true }

DELETE {{apiPath}}/{key}
     Response 204: No Content
```

Both endpoints follow the plugin's standard Protheus REST contract.
See `templates-tlpp-contract.md` for the ADVPL/TLPP backend skeleton.

## Companion: edit page with PoPageDynamicEdit

Pair this template with `PoPageDynamicEditComponent` for a fully automatic CRUD with
zero boilerplate in both list and edit:

```typescript
// {{kebab-name-edit}}.component.ts
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { PoBreadcrumb, PoDynamicFormField } from '@po-ui/ng-components';
import { PoPageDynamicEditModule } from '@po-ui/ng-templates';

@Component({
  standalone: true,
  imports: [PoPageDynamicEditModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <po-page-dynamic-edit
      p-title="{{ModelInterface}}"
      p-service-api="{{apiPath}}"
      [p-breadcrumb]="breadcrumb"
      [p-fields]="fields">
    </po-page-dynamic-edit>
  `,
})
export class {{ComponentClassEdit}} {
  readonly breadcrumb: PoBreadcrumb = {
    items: [
      { label: '{{ModuleName}}', link: '/{{moduleName}}' },
      { label: '{{ModelInterface}}', link: '../' },
      { label: 'Editar' },
    ],
  };

  // TODO: define fields — for complete reference see dynamic-form-fields.md
  readonly fields: PoDynamicFormField[] = [
    { property: 'codigo', label: 'Código', required: true, maxLength: 6, gridColumns: 4, key: true },
    { property: 'nome',   label: 'Nome',   required: true, maxLength: 40, gridColumns: 8 },
  ];
}
```

## Composite key (código + loja)

For Protheus entities with composite keys, mark both fields with `key: true`.
The component builds routes as `:codigo/:loja/editar` automatically:

```typescript
readonly fields: PoPageDynamicTableField[] = [
  { property: 'codigo', label: 'Código', key: true,  width: '10%', duplicate: true },
  { property: 'loja',   label: 'Loja',   key: true,  width: '6%',  visible: false },
  { property: 'nome',   label: 'Nome',   duplicate: true, filter: true },
];

readonly actions: PoPageDynamicTableActions = {
  new:    'novo',
  edit:   ':codigo/:loja/editar',
  detail: ':codigo/:loja/detalhe',
  remove: true,
};
```

The backend DELETE endpoint must accept both key segments:
```
DELETE {{apiPath}}/{codigo}/{loja}   → 204 No Content
```
