# Wave 2 — PO-UI Advanced Components Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preencher os gaps de média prioridade do plugin poui-specialist — PoPageDynamic (ng-templates), PoDynamicFormField completo, po-upload, PoLookupFilterService, e template de geração de tela dinâmica.

**Architecture:** Adições puras — 3 arquivos novos + 2 edições cirúrgicas + 2 índices atualizados. Nenhum arquivo existente é reescrito. O template de geração usa PoPageDynamicTableComponent como substituto mais produtivo do page-list manual quando o backend segue o contrato REST do plugin.

**Tech Stack:** Markdown (plugin templates), Angular 17+ TypeScript, `@po-ui/ng-components`, `@po-ui/ng-templates`

---

## Mapa de arquivos

| Arquivo | Ação | Responsabilidade |
|---------|------|-----------------|
| `skills/poui-components/dynamic-pages.md` | Criar | PoPageDynamic* do @po-ui/ng-templates — inputs, service contract, exemplos |
| `skills/poui-components/dynamic-form-fields.md` | Criar | PoDynamicFormField completo + PoDynamicViewField — todos os campos e tipos |
| `skills/poui-code-generation/templates-page-dynamic.md` | Criar | Template: tela completa usando PoPageDynamicTableComponent + service |
| `skills/poui-components/form-fields.md` | Editar | Adicionar po-upload + PoLookupFilterService completo |
| `skills/poui-components/SKILL.md` | Editar | Adicionar referências aos 2 novos arquivos |
| `skills/poui-code-generation/SKILL.md` | Editar | Adicionar template page-dynamic na tabela |

---

## Task 1: Criar `dynamic-pages.md`

**Files:**
- Create: `skills/poui-components/dynamic-pages.md`

- [ ] **Criar o arquivo com o conteúdo completo:**

```markdown
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
  divider?: string;          // agrupador na busca avançada
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
import { PoPageDynamicTableModule } from '@po-ui/ng-templates';
import {
  PoBreadcrumb,
  PoPageDynamicTableActions,
  PoPageDynamicTableField,
} from '@po-ui/ng-templates';

@Component({
  standalone: true,
  imports: [PoPageDynamicTableModule],
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
    { property: 'codigo',     label: 'Código',  key: true,  width: '8%' },
    { property: 'loja',       label: 'Loja',    key: true,  width: '6%',  visible: false },
    { property: 'nome',       label: 'Nome',    duplicate: true, filter: true },
    { property: 'cnpj',       label: 'CNPJ',    filter: true,   width: '16%' },
    { property: 'cidade',     label: 'Cidade',  filter: true,   width: '14%' },
    { property: 'estado',     label: 'UF',      filter: true,   width: '6%' },
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

Barra de busca com suporte a filtro rápido e busca avançada com disclaimers.
**Já usado no template `modal-crud` do plugin.** Referência aqui para uso standalone.

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
  options?: any[];           // para campos select na busca avançada
  optionsService?: string;   // URL para carregar options dinamicamente
  gridColumns?: number;
  initValue?: any;           // valor inicial do filtro
}
```

---

## PoPageDynamicEditComponent

**Seletor:** `po-page-dynamic-edit`

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
POST /rest/api/custom/v1/<entidade>
Body: { campo: valor, ... }
Response 201: objeto criado

PUT /rest/api/custom/v1/<entidade>/{key}
Body: { campo: valor, ... }
Response 200: objeto atualizado

GET /rest/api/custom/v1/<entidade>/{key}  ← carrega para edição quando :id está na rota
Response 200: objeto
```

### Exemplo

```typescript
import { PoPageDynamicEditModule } from '@po-ui/ng-templates';
import { PoDynamicFormField } from '@po-ui/ng-components';

@Component({
  standalone: true,
  imports: [PoPageDynamicEditModule],
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
  back?:   string | boolean;  // rota de voltar ou false
  edit?:   string | boolean;  // rota de edição ou false
  remove?: boolean;           // habilita exclusão
}
```

### Exemplo

```typescript
import { PoPageDynamicDetailModule } from '@po-ui/ng-templates';
import { PoDynamicViewField } from '@po-ui/ng-components';

@Component({
  standalone: true,
  imports: [PoPageDynamicDetailModule],
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
    { property: 'codigo', label: 'Código',  gridColumns: 4 },
    { property: 'nome',   label: 'Nome',    gridColumns: 8 },
    { property: 'email',  label: 'E-mail',  gridColumns: 6 },
  ];

  readonly actions: PoPageDynamicDetailActions = {
    back:   true,
    edit:   ':id/editar',
    remove: true,
  };
}
```

---

## PoPageDynamic* vs templates manuais — quando usar qual

| Critério | PoPageDynamic* | Template manual (page-list + page-edit) |
|----------|---------------|----------------------------------------|
| API segue o contrato REST do plugin | ✅ Ideal — zero boilerplate | ✅ Funciona, mais código |
| Lógica de negócio customizada na tela | ⚠️ Limitado | ✅ Controle total |
| Paginação, busca avançada, disclaimers | ✅ Automático | Requer implementação |
| Campos com dependências dinâmicas | ⚠️ Limitado | ✅ Controle total |
| Primeira versão / prototipagem rápida | ✅ Muito rápido | ⚠️ Mais trabalho |
| Chave composta Protheus (código+loja) | ⚠️ Configuração extra | ✅ Direto no service |
```

- [ ] **Verificar criação:**

```powershell
Test-Path "skills\poui-components\dynamic-pages.md"
```

- [ ] **Commit:**

```bash
git add skills/poui-components/dynamic-pages.md
git commit -m "docs(plugin): add dynamic-pages reference — PoPageDynamic* from @po-ui/ng-templates"
```

---

## Task 2: Criar `dynamic-form-fields.md`

**Files:**
- Create: `skills/poui-components/dynamic-form-fields.md`

- [ ] **Criar o arquivo com o conteúdo completo:**

```markdown
# PO-UI Dynamic Form Fields — Interface Completa

Referência completa de `PoDynamicFormField` (usado em `po-dynamic-form` e `PoPageDynamicEdit`)
e `PoDynamicViewField` (usado em `po-dynamic-view` e `PoPageDynamicDetail`).

```typescript
import {
  PoDynamicFormField,
  PoDynamicViewField,
} from '@po-ui/ng-components';
```

---

## PoDynamicFormField — todos os campos

```typescript
interface PoDynamicFormField {
  // ──────────── OBRIGATÓRIO ────────────
  property: string;          // nome da propriedade no objeto de dados

  // ──────────── RÓTULO E LAYOUT ────────────
  label?: string;            // rótulo do campo (default: property em Title Case)
  divider?: string;          // texto de separador de seção acima deste campo
  gridColumns?: number;      // largura desktop: 1-12 (padrão 6)
  gridSmColumns?: number;    // largura mobile/small: 1-12 (padrão 12)
  visible?: boolean;         // exibe/oculta o campo (default true)

  // ──────────── VALIDAÇÃO ────────────
  required?: boolean;        // campo obrigatório — exibe indicador visual *
  optional?: boolean;        // exibe "(Opcional)" mesmo quando não obrigatório
  disabled?: boolean;        // campo somente leitura no estado desabilitado
  minLength?: number;        // mínimo de caracteres (type: 'string')
  maxLength?: number;        // máximo de caracteres (type: 'string')
  min?: number;              // valor mínimo (type: 'number' | 'currency')
  max?: number;              // valor máximo (type: 'number' | 'currency')
  regex?: string;            // padrão regex para validação customizada
  errorMessage?: string;     // mensagem exibida quando regex falha

  // ──────────── TIPO ────────────
  // default: 'string'
  type?: 'boolean'           // exibe po-switch (S/N ou true/false)
       | 'currency'          // po-decimal formatado como moeda
       | 'date'              // po-datepicker
       | 'dateRange'         // po-datepicker com intervalo (início + fim)
       | 'dateTime'          // po-datepicker + campo de hora
       | 'number'            // po-number (inteiro)
       | 'string'            // po-input (padrão)
       | 'time'              // campo de hora (HH:MM)
       | 'cpf'               // po-input com máscara e validação de CPF
       | 'cnpj'              // po-input com máscara e validação de CNPJ
       | 'password'          // po-password (caracteres ocultos)
       | 'email'             // po-input type email + validação
       | 'tel';              // po-input type tel

  // ──────────── OPÇÕES (select / combo / checkbox-group / radio-group) ────────────
  options?: Array<{ label: string; value: any }> | string;
  //   array estático → po-select (quando optionsMulti: false) ou po-checkbox-group (optionsMulti: true)
  //   string (URL) → po-combo com carregamento assíncrono
  fieldLabel?: string;       // propriedade do label nas options (default: 'label')
  fieldValue?: string;       // propriedade do value nas options (default: 'value')
  optionsMulti?: boolean;    // permite seleção múltipla (requer options definido)
  optionsService?: string;   // URL para carregar options via GET; resulta em po-combo
  sort?: boolean;            // ordena options alfabeticamente

  // ──────────── LOOKUP ────────────
  searchService?: string | PoLookupFilter;  // serviço para po-lookup
  columns?: PoLookupColumn[];               // colunas do modal de lookup
  // Quando searchService está definido, o campo vira po-lookup automaticamente

  // ──────────── MÁSCARA ────────────
  mask?: string;             // ex: '(99) 99999-9999', '99/99/9999', '99999-999'
  maskFormatModel?: boolean; // se true, o model armazena sem os chars da máscara

  // ──────────── NÚMERO E MOEDA ────────────
  decimalsLength?: number;   // casas decimais (default: 2 para currency)
  thousandMaxlength?: number;// dígitos máximos antes do ponto decimal

  // ──────────── BOOLEAN ────────────
  booleanTrue?: string;      // label do estado verdadeiro (ex: 'Sim', 'Ativo', 'S')
  booleanFalse?: string;     // label do estado falso (ex: 'Não', 'Inativo', 'N')

  // ──────────── DATA ────────────
  dateFormat?: string;       // formato exibido (ex: 'dd/MM/yyyy')

  // ──────────── TEXTAREA ────────────
  rows?: number;             // número de linhas para textarea (ativa modo textarea)
}
```

---

## Exemplos práticos por tipo

```typescript
readonly fields: PoDynamicFormField[] = [

  // ── Seção: Identificação ──
  {
    property: 'codigo',
    label: 'Código',
    divider: 'Identificação',
    required: true,
    maxLength: 6,
    gridColumns: 4,
  },
  {
    property: 'nome',
    label: 'Nome / Razão Social',
    required: true,
    minLength: 3,
    maxLength: 40,
    gridColumns: 8,
  },

  // ── Campos com máscara nativa ──
  {
    property: 'cnpj',
    label: 'CNPJ',
    type: 'cnpj',          // valida e formata automaticamente
    required: true,
    gridColumns: 5,
  },
  {
    property: 'cpf',
    label: 'CPF',
    type: 'cpf',
    gridColumns: 4,
  },
  {
    property: 'telefone',
    label: 'Telefone',
    mask: '(99) 99999-9999',
    gridColumns: 4,
  },
  {
    property: 'cep',
    label: 'CEP',
    mask: '99999-999',
    gridColumns: 3,
  },

  // ── E-mail com regex ──
  {
    property: 'email',
    label: 'E-mail',
    regex: '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$',
    errorMessage: 'Informe um e-mail válido',
    gridColumns: 8,
  },

  // ── Número e moeda ──
  {
    property: 'quantidade',
    label: 'Quantidade',
    type: 'number',
    min: 0,
    max: 9999,
    gridColumns: 3,
  },
  {
    property: 'valorUnitario',
    label: 'Valor Unitário',
    type: 'currency',
    decimalsLength: 2,
    min: 0,
    gridColumns: 4,
  },

  // ── Data ──
  {
    property: 'dataEmissao',
    label: 'Data de Emissão',
    type: 'date',
    required: true,
    dateFormat: 'dd/MM/yyyy',
    gridColumns: 4,
  },

  // ── Select estático (po-select) ──
  {
    property: 'situacao',
    label: 'Situação',
    divider: 'Status',
    options: [
      { label: 'Ativo',   value: 'S' },
      { label: 'Inativo', value: 'N' },
    ],
    gridColumns: 4,
  },

  // ── Select múltiplo (po-checkbox-group) ──
  {
    property: 'permissoes',
    label: 'Permissões',
    options: [
      { label: 'Incluir',  value: 'I' },
      { label: 'Alterar',  value: 'A' },
      { label: 'Excluir',  value: 'E' },
      { label: 'Consultar', value: 'C' },
    ],
    optionsMulti: true,
    gridColumns: 12,
  },

  // ── Combo com URL (po-combo assíncrono) ──
  {
    property: 'filial',
    label: 'Filial',
    optionsService: '/rest/api/custom/v1/filiais',
    fieldLabel: 'descricao',
    fieldValue: 'codigo',
    gridColumns: 6,
  },

  // ── Boolean (po-switch) ──
  {
    property: 'ativo',
    label: 'Ativo',
    type: 'boolean',
    booleanTrue: 'S',       // valor Protheus para true
    booleanFalse: 'N',      // valor Protheus para false
    gridColumns: 3,
  },

  // ── Textarea ──
  {
    property: 'observacoes',
    label: 'Observações',
    divider: 'Complemento',
    rows: 4,
    maxLength: 500,
    optional: true,
    gridColumns: 12,
  },
];
```

---

## PoDynamicViewField — todos os campos

```typescript
interface PoDynamicViewField {
  // ──────────── OBRIGATÓRIO ────────────
  property: string;          // nome da propriedade no objeto de dados

  // ──────────── RÓTULO E LAYOUT ────────────
  label?: string;            // rótulo do campo
  gridColumns?: number;      // largura: 1-12 (padrão 6)

  // ──────────── TIPO ────────────
  // default: 'string'
  type?: 'string'
       | 'number'
       | 'currency'
       | 'date'
       | 'dateTime'
       | 'boolean'
       | 'link'              // renderiza como <a href>
       | 'subtitle';         // texto menor / secundário

  // ──────────── FORMATAÇÃO ────────────
  format?: string;           // ex: 'dd/MM/yyyy' para date
  concatLinesLimit?: number; // limita linhas (para arrays de string)
  tag?: boolean;             // renderiza valor como po-tag
  color?: string;            // token de cor PO-UI (ex: 'color-10')

  // ──────────── BOOLEAN ────────────
  booleanTrue?: string;      // label para true
  booleanFalse?: string;     // label para false
}
```

### Exemplo de viewFields para tela de detalhe

```typescript
readonly viewFields: PoDynamicViewField[] = [
  { property: 'codigo',      label: 'Código',       gridColumns: 3 },
  { property: 'nome',        label: 'Nome',         gridColumns: 9 },
  { property: 'cnpj',        label: 'CNPJ',         gridColumns: 4 },
  { property: 'email',       label: 'E-mail',       gridColumns: 5, type: 'link' },
  { property: 'dataEmissao', label: 'Emissão',      type: 'date', format: 'dd/MM/yyyy', gridColumns: 3 },
  { property: 'valorTotal',  label: 'Valor Total',  type: 'currency', gridColumns: 3 },
  {
    property: 'ativo',
    label: 'Status',
    type: 'boolean',
    booleanTrue: 'Ativo',
    booleanFalse: 'Inativo',
    tag: true,
    color: 'color-10',
    gridColumns: 3,
  },
];
```
```

- [ ] **Verificar criação:**

```powershell
Test-Path "skills\poui-components\dynamic-form-fields.md"
```

- [ ] **Commit:**

```bash
git add skills/poui-components/dynamic-form-fields.md
git commit -m "docs(plugin): add dynamic-form-fields reference — complete PoDynamicFormField and PoDynamicViewField"
```

---

## Task 3: Criar `templates-page-dynamic.md`

**Files:**
- Create: `skills/poui-code-generation/templates-page-dynamic.md`

- [ ] **Criar o arquivo com o conteúdo completo:**

```markdown
# Template: page-dynamic

Generates a zero-boilerplate CRUD screen using `PoPageDynamicTableComponent` from
`@po-ui/ng-templates` — the fastest way to deliver a working list page when the
Protheus REST API follows the plugin's standard contract.

> **When to use vs `page-list`:**
> Use `page-dynamic` when the API strictly follows the REST contract (items+hasNext, standard params).
> Use `page-list` when you need custom loading logic, computed columns, or business rules in the component.

> **Prerequisite:** `npm install @po-ui/ng-templates`

## {{kebab-name}}.component.ts

```typescript
import {
  Component,
  ChangeDetectionStrategy,
} from '@angular/core';
import {
  PoBreadcrumb,
  PoDynamicFormField,
} from '@po-ui/ng-components';
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
  // key: true  → campo que compõe a chave para rotas de detalhe/edição
  // filter: true → aparece na busca avançada
  // duplicate: true → incluso na busca rápida (full-text)
  readonly fields: PoPageDynamicTableField[] = [
    {
      property: 'codigo',
      label: 'Código',
      key: true,
      width: '10%',
      duplicate: true,
    },
    {
      property: 'nome',
      label: 'Nome',
      duplicate: true,
      filter: true,
    },
    // Example: status field with colored labels
    // {
    //   property: 'ativo',
    //   label: 'Status',
    //   type: 'label',
    //   width: '10%',
    //   labels: [
    //     { value: 'S', label: 'Ativo',   color: 'color-11' },
    //     { value: 'N', label: 'Inativo', color: 'color-07' },
    //   ],
    // },
    // Example: date column
    // {
    //   property: 'dataEmissao',
    //   label: 'Emissão',
    //   type: 'date',
    //   width: '12%',
    //   filter: true,
    //   divider: 'Datas',        // group in advanced search
    //   gridColumns: 4,          // width in advanced search form
    // },
    // Example: currency column
    // {
    //   property: 'valorTotal',
    //   label: 'Valor Total',
    //   type: 'currency',
    //   width: '12%',
    // },
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

## Route configuration

```typescript
// In your feature routes file (e.g., clientes.routes.ts)
export const clientesRoutes: Routes = [
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

The `p-service-api` URL must implement:

```
GET  {{apiPath}}?page=1&pageSize=10&search=termo
     Response: { "items": [...], "hasNext": true }

DELETE {{apiPath}}/{key}
     Response: 204 No Content
```

Both endpoints are generated automatically by `PoPageDynamicTableComponent`.
For the complete REST contract, see `templates-tlpp-contract.md`.

## Composite key (código + loja)

For Protheus entities with composite keys, mark both fields with `key: true`:

```typescript
readonly fields: PoPageDynamicTableField[] = [
  { property: 'codigo', label: 'Código', key: true, width: '10%' },
  { property: 'loja',   label: 'Loja',   key: true, width: '6%', visible: false },
  { property: 'nome',   label: 'Nome',   duplicate: true },
];
```

The component will build the detail/edit routes as `:codigo/:loja/editar`.
The API must accept `DELETE {{apiPath}}/{codigo}/{loja}`.
```

- [ ] **Verificar criação:**

```powershell
Test-Path "skills\poui-code-generation\templates-page-dynamic.md"
```

- [ ] **Commit:**

```bash
git add skills/poui-code-generation/templates-page-dynamic.md
git commit -m "feat(plugin): add page-dynamic template — PoPageDynamicTableComponent zero-boilerplate CRUD"
```

---

## Task 4: Editar `form-fields.md` — adicionar po-upload e PoLookupFilterService

**Files:**
- Modify: `skills/poui-components/form-fields.md` (adicionar ao final do arquivo)

- [ ] **Adicionar ao final do arquivo `form-fields.md`:**

```markdown

---

## po-upload

Componente para envio de arquivos. Suporta upload automático ou manual, múltiplos arquivos,
drag-and-drop e validação de extensão e tamanho.

### Key Inputs

| Input | Type | Description |
|-------|------|-------------|
| `p-url` | `string` | URL de destino do upload (multipart/form-data) |
| `p-allowed-extensions` | `string[]` | Extensões permitidas (ex: `['.pdf', '.jpg', '.png']`) |
| `p-auto-upload` | `boolean` | Inicia upload imediatamente ao selecionar o arquivo |
| `p-drag-drop` | `boolean` | Habilita zona de drag-and-drop |
| `p-multiple` | `boolean` | Permite selecionar múltiplos arquivos |
| `p-max-file-size` | `number` | Tamanho máximo em bytes (ex: `5242880` para 5MB) |
| `p-required` | `boolean` | Campo obrigatório |
| `p-disabled` | `boolean` | Desabilita o componente |
| `p-label` | `string` | Rótulo exibido acima do componente |

### Key Outputs

| Output | Payload | Description |
|--------|---------|-------------|
| `(p-upload)` | `PoUploadFile[]` | Emitido após upload bem-sucedido |
| `(p-success)` | `any` | Resposta HTTP do servidor |
| `(p-error)` | `any` | Erro de upload |
| `(p-change)` | `PoUploadFile[]` | Arquivos selecionados (antes do upload) |

### Exemplos

```typescript
import { PoUploadModule } from '@po-ui/ng-components';
// em imports do @Component: [PoUploadModule]
```

```html
<!-- Upload automático de PDF — máx 10MB -->
<po-upload
  p-label="Anexar NF-e (PDF)"
  p-url="/rest/api/custom/v1/documentos/upload"
  [p-allowed-extensions]="['.pdf']"
  [p-auto-upload]="true"
  [p-max-file-size]="10485760"
  [p-required]="true"
  (p-success)="onUploadSuccess($event)"
  (p-error)="onUploadError($event)">
</po-upload>

<!-- Upload manual com múltiplos arquivos e drag-drop -->
<po-upload
  p-label="Documentos"
  p-url="/rest/api/custom/v1/documentos/upload"
  [p-allowed-extensions]="['.pdf', '.jpg', '.png', '.docx']"
  [p-multiple]="true"
  [p-drag-drop]="true"
  [p-max-file-size]="5242880"
  (p-change)="onFilesSelected($event)"
  (p-upload)="onUploadComplete($event)">
</po-upload>
```

```typescript
onUploadSuccess(response: any): void {
  this.notification.success('Arquivo enviado com sucesso.');
  // response é o body retornado pelo servidor
}

onUploadError(error: any): void {
  this.notification.error('Erro ao enviar arquivo.');
}

onFilesSelected(files: PoUploadFile[]): void {
  // files é o array de arquivos selecionados (antes do upload)
  this.selectedFiles = files;
}
```

> **Integração Protheus:** O endpoint de upload deve aceitar `multipart/form-data`.
> No ADVPL, use `oRequest:GetMultipartBody()` para ler o arquivo enviado.

---

## PoLookupFilterService — implementação completa

O `po-lookup` requer um serviço que implemente a interface `PoLookupFilter`:

### Interface PoLookupFilter

```typescript
import { Observable } from 'rxjs';
import {
  PoLookupColumn,
  PoLookupFilter,
  PoLookupFilteredItemsParams,
  PoLookupResponseApi,
} from '@po-ui/ng-components';
```

```typescript
// A interface que o serviço DEVE implementar:
interface PoLookupFilter {
  getFilteredData(
    params: PoLookupFilteredItemsParams,
    filterParams?: any,
  ): Observable<PoLookupResponseApi>;

  getObjectByValue(
    value: string | number,
    filterParams?: any,
  ): Observable<any>;
}

interface PoLookupFilteredItemsParams {
  filter:    string;   // termo digitado pelo usuário
  page:      number;   // 1-based
  pageSize:  number;   // itens por página (default 10)
}

interface PoLookupResponseApi {
  items:   any[];
  hasNext: boolean;
}
```

### Implementação de exemplo — ClienteLookupService

```typescript
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  PoLookupFilter,
  PoLookupFilteredItemsParams,
  PoLookupResponseApi,
} from '@po-ui/ng-components';

@Injectable({ providedIn: 'root' })
export class ClienteLookupService implements PoLookupFilter {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/rest/api/custom/v1/clientes';

  getFilteredData(
    { filter, page, pageSize }: PoLookupFilteredItemsParams,
  ): Observable<PoLookupResponseApi> {
    const params = new HttpParams()
      .set('page',     page.toString())
      .set('pageSize', pageSize.toString())
      .set('q',        filter ?? '');

    return this.http.get<PoLookupResponseApi>(this.baseUrl, { params });
  }

  getObjectByValue(value: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/${value}`);
  }
}
```

### Uso no template com po-lookup

```typescript
import { inject } from '@angular/core';
import {
  PoLookupColumn,
  PoLookupModule,
} from '@po-ui/ng-components';
import { ClienteLookupService } from './cliente-lookup.service';

// No @Component:
readonly clienteLookupService = inject(ClienteLookupService);

readonly clienteColumns: PoLookupColumn[] = [
  { property: 'codigo', label: 'Código', width: '15%' },
  { property: 'loja',   label: 'Loja',   width: '8%' },
  { property: 'nome',   label: 'Nome' },
  { property: 'cnpj',   label: 'CNPJ',   width: '18%' },
];
```

```html
<po-lookup
  p-label="Cliente"
  p-field-value="codigo"
  p-field-label="nome"
  formControlName="clienteCodigo"
  [p-columns]="clienteColumns"
  [p-filter-service]="clienteLookupService">
</po-lookup>
```

```typescript
import { PoLookupModule } from '@po-ui/ng-components';
// em imports do @Component: [PoLookupModule]
```

### PoLookupFilterService com chave composta (código + loja)

```typescript
@Injectable({ providedIn: 'root' })
export class FornecedorLookupService implements PoLookupFilter {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/rest/api/custom/v1/fornecedores';

  getFilteredData(
    { filter, page, pageSize }: PoLookupFilteredItemsParams,
  ): Observable<PoLookupResponseApi> {
    const params = new HttpParams()
      .set('page',     page.toString())
      .set('pageSize', pageSize.toString())
      .set('q',        filter ?? '');
    return this.http.get<PoLookupResponseApi>(this.baseUrl, { params });
  }

  // Para chave composta, value será 'codigo|loja' — parseie conforme convenção
  getObjectByValue(value: string): Observable<any> {
    const [codigo, loja] = value.split('|');
    return this.http.get(`${this.baseUrl}/${codigo}/${loja}`);
  }
}
```
```

- [ ] **Verificar edição:**

```powershell
Select-String -Path "skills\poui-components\form-fields.md" -Pattern "po-upload" -Quiet
```
Esperado: `True`

- [ ] **Commit:**

```bash
git add skills/poui-components/form-fields.md
git commit -m "docs(plugin): add po-upload and PoLookupFilterService to form-fields reference"
```

---

## Task 5: Editar `poui-components/SKILL.md` — adicionar referências Wave 2

**Files:**
- Modify: `skills/poui-components/SKILL.md`

- [ ] **Adicionar duas linhas ao bloco `## Component Reference Files`:**

Substituir:
```markdown
- **Layout** (po-container, po-accordion, po-list-view): see `layout-components.md`
```

Por:
```markdown
- **Layout** (po-container, po-accordion, po-list-view): see `layout-components.md`
- **Dynamic Pages** (PoPageDynamic* do @po-ui/ng-templates): see `dynamic-pages.md`
- **Dynamic Form & View Fields** (PoDynamicFormField completo, PoDynamicViewField): see `dynamic-form-fields.md`
```

- [ ] **Commit:**

```bash
git add skills/poui-components/SKILL.md
git commit -m "docs(plugin): update poui-components SKILL.md index with Wave 2 references"
```

---

## Task 6: Editar `poui-code-generation/SKILL.md` — adicionar template page-dynamic

**Files:**
- Modify: `skills/poui-code-generation/SKILL.md`

- [ ] **Adicionar `page-dynamic` na tabela `### List pages`:**

Substituir:
```markdown
### List pages

| Template | File | When to use |
|----------|------|-------------|
| **page-list** | `templates-page-list.md` | Simple list with only quick search |
| **page-dynamic-search** | `templates-page-dynamic-search.md` | List with quick search + advanced search + disclaimers (standard Protheus pattern) |
```

Por:
```markdown
### List pages

| Template | File | When to use |
|----------|------|-------------|
| **page-list** | `templates-page-list.md` | Simple list with only quick search |
| **page-dynamic-search** | `templates-page-dynamic-search.md` | List with quick search + advanced search + disclaimers (standard Protheus pattern) |
| **page-dynamic** | `templates-page-dynamic.md` | Zero-boilerplate list using PoPageDynamicTableComponent (API must follow plugin contract) |
```

- [ ] **Commit:**

```bash
git add skills/poui-code-generation/SKILL.md
git commit -m "docs(plugin): register page-dynamic template in SKILL.md index"
```

---

## Task 7: Verificação final

- [ ] **Listar arquivos criados:**

```powershell
Get-ChildItem -Recurse "skills" -Filter "*.md" | Where-Object { $_.Name -match "dynamic" } | Select-Object Name
```

Esperado:
```
dynamic-pages.md
dynamic-form-fields.md
templates-page-dynamic.md
```

- [ ] **Confirmar conteúdo do po-upload em form-fields.md:**

```powershell
Select-String -Path "skills\poui-components\form-fields.md" -Pattern "PoLookupFilter" -Quiet
```
Esperado: `True`

- [ ] **Confirmar 6 commits Wave 2:**

```bash
git log --oneline -8
```

Esperado: 6 commits `docs/feat(plugin): ...` mais recentes.

- [ ] **Status limpo:**

```bash
git status --short | grep -v Teste_poui
```

Esperado: vazio (nenhuma modificação pendente nos arquivos do plugin).
