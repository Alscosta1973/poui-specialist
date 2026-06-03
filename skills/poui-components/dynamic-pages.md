# PO-UI Dynamic Pages — @po-ui/ng-templates

Os componentes `PoPageDynamic*` do pacote `@po-ui/ng-templates` geram telas completas
automaticamente a partir de uma URL de API REST e uma configuração de campos —
sem precisar implementar lógica de listagem, paginação, busca, exclusão ou navegação.

```bash
npm install @po-ui/ng-templates
```

---

## PoPageDynamicTableComponent

**Seletor:** `po-page-dynamic-table`

Gera automaticamente: listagem paginada, busca rápida, busca avançada com disclaimers,
seleção de itens, ações por linha (editar/excluir), e breadcrumb.

### Key Inputs

| Input | Type | Description |
|-------|------|-------------|
| `p-service-api` | `string` | URL base da API REST (ex: `/rest/api/custom/v1/clientes`) |
| `p-fields` | `PoPageDynamicTableField[]` | Definição de colunas e filtros |
| `p-actions` | `PoPageDynamicTableActions` | Ações de nova, editar, remover, detalhe |
| `p-title` | `string` | Título da página |
| `p-breadcrumb` | `PoBreadcrumb` | Trilha de navegação |
| `p-keep-filters` | `boolean` | Mantém filtros ao voltar para a lista |

### PoPageDynamicTableField

```typescript
interface PoPageDynamicTableField {
  property: string;          // nome do campo no objeto de resposta
  label?: string;            // rótulo na coluna
  type?: 'string' | 'number' | 'currency' | 'date' | 'dateTime' | 'boolean' | 'label';
  width?: string;            // ex: '10%'
  visible?: boolean;         // mostra/oculta a coluna (default true)
  filter?: boolean;          // aparece na busca avançada (default false)
  key?: boolean;             // indica chave primária — usada nas rotas de detalhe/edição
  duplicate?: boolean;       // inclui na busca rápida (full-text)
  divider?: string;          // agrupador de seção na busca avançada
  gridColumns?: number;      // largura na busca avançada (1-12)
  labels?: PoTableColumnLabel[];  // para type: 'label'
}
```

### PoPageDynamicTableActions

```typescript
interface PoPageDynamicTableActions {
  new?:    string | boolean;  // rota para novo (ex: 'novo') ou false para ocultar
  edit?:   string | boolean;  // rota para edição (ex: ':id/editar') ou false
  remove?: boolean;           // habilita exclusão via DELETE na API
  detail?: string | boolean;  // rota para detalhe (ex: ':id/detalhe') ou false
}
```

### Contrato de API esperado

O `PoPageDynamicTableComponent` chama a API no seguinte formato:

```
GET /rest/api/custom/v1/<entidade>?page=1&pageSize=10&fields=campo1,campo2&search=termo
Response: { "items": [...], "hasNext": true }

DELETE /rest/api/custom/v1/<entidade>/{key}
Response: 204 No Content
```

### Exemplo completo

```typescript
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { PoBreadcrumb } from '@po-ui/ng-components';
import {
  PoPageDynamicTableModule,
  PoPageDynamicTableActions,
  PoPageDynamicTableField,
} from '@po-ui/ng-templates';

@Component({
  standalone: true,
  imports: [PoPageDynamicTableModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <po-page-dynamic-table
      p-title="Clientes"
      p-service-api="/rest/api/custom/v1/clientes"
      [p-breadcrumb]="breadcrumb"
      [p-fields]="fields"
      [p-actions]="actions"
      [p-keep-filters]="true">
    </po-page-dynamic-table>
  `,
})
export class ClientesListComponent {
  readonly breadcrumb: PoBreadcrumb = {
    items: [{ label: 'Financeiro', link: '/financeiro' }, { label: 'Clientes' }],
  };

  readonly fields: PoPageDynamicTableField[] = [
    { property: 'codigo',  label: 'Código',  key: true,       width: '8%' },
    { property: 'loja',    label: 'Loja',    key: true,       width: '6%', visible: false },
    { property: 'nome',    label: 'Nome',    duplicate: true, filter: true },
    { property: 'cnpj',    label: 'CNPJ',   filter: true,    width: '16%' },
    { property: 'cidade',  label: 'Cidade', filter: true,    width: '14%' },
    { property: 'estado',  label: 'UF',     filter: true,    width: '6%' },
    {
      property: 'ativo',
      label:    'Status',
      type:     'label',
      width:    '10%',
      labels: [
        { value: 'S', label: 'Ativo',   color: 'color-11' },
        { value: 'N', label: 'Inativo', color: 'color-07' },
      ],
    },
  ];

  readonly actions: PoPageDynamicTableActions = {
    new:    'novo',
    edit:   ':id/editar',
    detail: ':id/detalhe',
    remove: true,
  };
}
```

---

## PoPageDynamicSearchComponent

**Seletor:** `po-page-dynamic-search`  
**Pacote:** `@po-ui/ng-templates`

Barra de busca com suporte a filtro rápido e busca avançada com disclaimers.
**Já usado no template `modal-crud` do plugin.** Referência aqui para uso standalone
com `po-table` manual.

### Key Inputs

| Input | Type | Description |
|-------|------|-------------|
| `p-filters` | `PoPageDynamicSearchFilters[]` | Campos da busca avançada |
| `p-title` | `string` | Título da página |
| `p-actions` | `PoPageAction[]` | Botões de ação no cabeçalho |
| `p-keep-filters` | `boolean` | Mantém disclaimers ao pesquisar de novo |
| `p-quick-search-only` | `boolean` | Oculta o link de busca avançada |

### Key Outputs

| Output | Payload | Description |
|--------|---------|-------------|
| `(p-quick-search)` | `string` | Termo digitado na busca rápida |
| `(p-advanced-search)` | `object` | Objeto com os filtros da busca avançada |
| `(p-change-disclaimers)` | `PoDisclaimerGroup` | Disclaimers removidos pelo usuário |

### PoPageDynamicSearchFilters

```typescript
interface PoPageDynamicSearchFilters {
  property: string;
  label?: string;
  type?: 'string' | 'number' | 'boolean' | 'date';
  options?: Array<{ label: string; value: any }>;  // campo vira select na busca avançada
  optionsService?: string;    // URL para carregar options dinamicamente
  gridColumns?: number;       // largura no formulário de busca avançada (1-12)
  initValue?: any;            // valor inicial do filtro
}
```

---

## PoPageDynamicEditComponent

**Seletor:** `po-page-dynamic-edit`  
**Pacote:** `@po-ui/ng-templates`

Gera automaticamente um formulário de inclusão/alteração conectado à API,
com navegação de breadcrumb e ações de Salvar/Cancelar.

### Key Inputs

| Input | Type | Description |
|-------|------|-------------|
| `p-service-api` | `string` | URL base da API REST |
| `p-fields` | `PoDynamicFormField[]` | Campos do formulário (ver `dynamic-form-fields.md`) |
| `p-title` | `string` | Título da página |
| `p-breadcrumb` | `PoBreadcrumb` | Trilha de navegação |
| `p-auto-router` | `boolean` | Navega automaticamente após salvar (default `true`) |

### Contrato de API esperado

```
GET  /rest/api/custom/v1/<entidade>/{key}   ← carrega para edição quando :id na rota
     Response 200: objeto completo

POST /rest/api/custom/v1/<entidade>
     Body: { campo: valor, ... }
     Response 201: objeto criado

PUT  /rest/api/custom/v1/<entidade>/{key}
     Body: { campo: valor, ... }
     Response 200: objeto atualizado
```

### Exemplo

```typescript
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { PoBreadcrumb, PoDynamicFormField } from '@po-ui/ng-components';
import { PoPageDynamicEditModule } from '@po-ui/ng-templates';

@Component({
  standalone: true,
  imports: [PoPageDynamicEditModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <po-page-dynamic-edit
      p-title="Cliente"
      p-service-api="/rest/api/custom/v1/clientes"
      [p-breadcrumb]="breadcrumb"
      [p-fields]="fields">
    </po-page-dynamic-edit>
  `,
})
export class ClientesEditComponent {
  readonly breadcrumb: PoBreadcrumb = {
    items: [
      { label: 'Financeiro', link: '/financeiro' },
      { label: 'Clientes', link: '/financeiro/clientes' },
      { label: 'Editar' },
    ],
  };

  readonly fields: PoDynamicFormField[] = [
    { property: 'codigo', label: 'Código', required: true, maxLength: 6, gridColumns: 4, key: true },
    { property: 'nome',   label: 'Nome',   required: true, maxLength: 40, gridColumns: 8 },
    { property: 'email',  label: 'E-mail', regex: '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$', gridColumns: 6 },
  ];
}
```

---

## PoPageDynamicDetailComponent

**Seletor:** `po-page-dynamic-detail`  
**Pacote:** `@po-ui/ng-templates`

Gera automaticamente uma tela de detalhe somente leitura conectada à API.

### Key Inputs

| Input | Type | Description |
|-------|------|-------------|
| `p-service-api` | `string` | URL base da API REST |
| `p-fields` | `PoDynamicViewField[]` | Campos exibidos (ver `dynamic-form-fields.md`) |
| `p-title` | `string` | Título da página |
| `p-breadcrumb` | `PoBreadcrumb` | Trilha de navegação |
| `p-actions` | `PoPageDynamicDetailActions` | Ações edit/back/remove |

### PoPageDynamicDetailActions

```typescript
interface PoPageDynamicDetailActions {
  back?:   string | boolean;  // rota de voltar ou false para ocultar
  edit?:   string | boolean;  // rota de edição ou false
  remove?: boolean;           // habilita exclusão via DELETE
}
```

### Exemplo

```typescript
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { PoBreadcrumb, PoDynamicViewField } from '@po-ui/ng-components';
import {
  PoPageDynamicDetailModule,
  PoPageDynamicDetailActions,
} from '@po-ui/ng-templates';

@Component({
  standalone: true,
  imports: [PoPageDynamicDetailModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <po-page-dynamic-detail
      p-title="Detalhe do Cliente"
      p-service-api="/rest/api/custom/v1/clientes"
      [p-breadcrumb]="breadcrumb"
      [p-fields]="fields"
      [p-actions]="actions">
    </po-page-dynamic-detail>
  `,
})
export class ClientesDetailComponent {
  readonly breadcrumb: PoBreadcrumb = {
    items: [
      { label: 'Financeiro', link: '/financeiro' },
      { label: 'Clientes', link: '/financeiro/clientes' },
      { label: 'Detalhe' },
    ],
  };

  readonly fields: PoDynamicViewField[] = [
    { property: 'codigo',      label: 'Código',      gridColumns: 3 },
    { property: 'nome',        label: 'Nome',        gridColumns: 9 },
    { property: 'email',       label: 'E-mail',      gridColumns: 6 },
    { property: 'dataEmissao', label: 'Emissão',     type: 'date', format: 'dd/MM/yyyy', gridColumns: 3 },
    { property: 'ativo',       label: 'Status',      type: 'boolean', booleanTrue: 'Ativo', booleanFalse: 'Inativo', gridColumns: 3 },
  ];

  readonly actions: PoPageDynamicDetailActions = {
    back:   true,
    edit:   ':id/editar',
    remove: true,
  };
}
```

---

## PoPageDynamic* vs templates manuais — quando usar

| Critério | PoPageDynamic* | Template manual (page-list + page-edit) |
|----------|---------------|----------------------------------------|
| API segue o contrato REST do plugin | ✅ Ideal — zero boilerplate | ✅ Funciona, mais código |
| Lógica de negócio customizada na tela | ⚠️ Limitado | ✅ Controle total |
| Paginação, busca avançada, disclaimers | ✅ Automático | Requer implementação |
| Campos com dependências dinâmicas | ⚠️ Limitado | ✅ Controle total |
| Primeira versão / prototipagem rápida | ✅ Muito rápido | ⚠️ Mais trabalho |
| Chave composta Protheus (código + loja) | ⚠️ Requer config extra | ✅ Direto no service |
