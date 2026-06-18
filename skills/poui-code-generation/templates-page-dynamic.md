# Template: page-dynamic

Gera uma tela de lista CRUD sem boilerplate usando `PoPageDynamicTableComponent` de
`@po-ui/ng-templates` — o caminho mais rápido para uma página de lista funcional quando a
API REST do Protheus segue o contrato padrão do plugin.

> **Quando usar vs `page-list`:**
> - `page-dynamic` → API segue o contrato padrão, sem necessidade de lógica de carregamento customizada.
>   Paginação, busca, filtros avançados, disclaimers e exclusão automáticos.
> - `page-list` → Lógica de negócio customizada no componente, colunas computadas ou API que
>   diverge do contrato padrão.

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

  // TODO: defina as colunas e filtros de busca correspondentes aos campos de {{ModelInterface}}.
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
    // Exemplo: campo de status com labels coloridos
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

    // Exemplo: coluna de data com busca avançada
    // {
    //   property:    'dataEmissao',
    //   label:       'Emissão',
    //   type:        'date',
    //   width:       '12%',
    //   filter:      true,
    //   divider:     'Datas',        // group header in advanced search form
    //   gridColumns: 4,              // width in advanced search form (1-12)
    // },

    // Exemplo: coluna de moeda
    // {
    //   property: 'valorTotal',
    //   label:    'Valor Total',
    //   type:     'currency',
    //   width:    '12%',
    // },

    // Exemplo: chave composta — loja oculta na tabela mas faz parte da rota
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
// Adicione estilos específicos do componente aqui
```

## Configuração de rota

```typescript
// No arquivo de rotas da sua feature (ex: pedidos.routes.ts)
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

`PoPageDynamicTableComponent` chama a API automaticamente — nenhum código de service é necessário no componente:

```
GET  {{apiPath}}?page=1&pageSize=10&search=termo&fields=codigo,nome
     Response 200: { "items": [...], "hasNext": true }

DELETE {{apiPath}}/{key}
     Response 204: No Content
```

Ambos os endpoints seguem o contrato REST Protheus padrão do plugin.
Consulte `templates-tlpp-contract.md` para o esqueleto do backend ADVPL/TLPP.

## Complemento: página de edição com PoPageDynamicEdit

Combine este template com `PoPageDynamicEditComponent` para um CRUD completamente automático com
zero boilerplate tanto na lista quanto na edição:

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

  // TODO: defina os campos — para referência completa consulte dynamic-form-fields.md
  readonly fields: PoDynamicFormField[] = [
    { property: 'codigo', label: 'Código', required: true, maxLength: 6, gridColumns: 4, key: true },
    { property: 'nome',   label: 'Nome',   required: true, maxLength: 40, gridColumns: 8 },
  ];
}
```

## Chave composta (código + loja)

Para entidades Protheus com chaves compostas, marque ambos os campos com `key: true`.
O componente constrói as rotas como `:codigo/:loja/editar` automaticamente:

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

O endpoint DELETE do backend deve aceitar ambos os segmentos da chave:
```
DELETE {{apiPath}}/{codigo}/{loja}   → 204 No Content
```
