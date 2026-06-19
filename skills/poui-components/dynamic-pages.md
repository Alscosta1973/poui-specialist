# PO-UI Dynamic Pages — @po-ui/ng-templates

`PoPageDynamic*` gera telas completas a partir de URL REST + config de campos. Pacote: `@po-ui/ng-templates`.

**Inputs comuns:** `p-service-api` (URL base REST), `p-title`, `p-breadcrumb`.

---

## PoPageDynamicTableComponent

**Seletor:** `po-page-dynamic-table`

| Input | Type | Description |
|-------|------|-------------|
| `p-fields` | `PoPageDynamicTableField[]` | Colunas e filtros |
| `p-actions` | `PoPageDynamicTableActions` | Ações nova/editar/remover/detalhe |
| `p-keep-filters` | `boolean` | Mantém filtros ao voltar |

```typescript
interface PoPageDynamicTableField {
  property: string;
  label?: string;
  type?: 'string' | 'number' | 'currency' | 'date' | 'dateTime' | 'boolean' | 'label';
  width?: string;            // ex: '10%'
  visible?: boolean;         // default true
  filter?: boolean;          // aparece na busca avançada
  key?: boolean;             // chave primária — usada nas rotas de detalhe/edição
  duplicate?: boolean;       // inclui na busca rápida (full-text)
  divider?: string;          // agrupador na busca avançada
  gridColumns?: number;      // 1-12
  labels?: PoTableColumnLabel[];  // para type: 'label'
}

interface PoPageDynamicTableActions {
  new?:    string | boolean;  // rota para novo (ex: 'novo') ou false para ocultar
  edit?:   string | boolean;  // ex: ':id/editar'
  remove?: boolean;
  detail?: string | boolean;  // ex: ':id/detalhe'
}
```

**API:** `GET ?page=1&pageSize=10&fields=...&search=termo` → `{ "items": [...], "hasNext": true }` | `DELETE /{key}` → 204

**Exemplo:**
```typescript
// imports: PoPageDynamicTableModule de @po-ui/ng-templates
// template: <po-page-dynamic-table p-title="Pedidos" p-service-api="/rest/api/custom/v1/pedidos"
//           [p-breadcrumb]="breadcrumb" [p-fields]="fields" [p-actions]="actions" [p-keep-filters]="true">

readonly fields: PoPageDynamicTableField[] = [
  { property: 'codigo', label: 'Código', key: true,       width: '8%' },
  { property: 'loja',   label: 'Loja',   key: true,       width: '6%', visible: false },
  { property: 'nome',   label: 'Nome',   duplicate: true, filter: true },
  { property: 'cnpj',   label: 'CNPJ',  filter: true,    width: '16%' },
  {
    property: 'ativo', label: 'Status', type: 'label', width: '10%',
    labels: [
      { value: 'S', label: 'Ativo',   color: 'color-11' },
      { value: 'N', label: 'Inativo', color: 'color-07' },
    ],
  },
];

readonly actions: PoPageDynamicTableActions = {
  new: 'novo', edit: ':id/editar', detail: ':id/detalhe', remove: true,
};
```

---

## PoPageDynamicSearchComponent

**Seletor:** `po-page-dynamic-search`

Busca rápida + avançada com disclaimers. Já usado no template `modal-crud`; use standalone com `po-table` manual.

| Input | Type | Description |
|-------|------|-------------|
| `p-filters` | `PoPageDynamicSearchFilters[]` | Campos da busca avançada |
| `p-actions` | `PoPageAction[]` | Botões no cabeçalho |
| `p-keep-filters` | `boolean` | Mantém disclaimers ao pesquisar novamente |
| `p-quick-search-only` | `boolean` | Oculta busca avançada |

| Output | Payload | Description |
|--------|---------|-------------|
| `(p-quick-search)` | `string` | Termo na busca rápida |
| `(p-advanced-search)` | `object` | Filtros da busca avançada |
| `(p-change-disclaimers)` | `PoDisclaimerGroup` | Disclaimers removidos |

```typescript
interface PoPageDynamicSearchFilters {
  property: string;
  label?: string;
  type?: 'string' | 'number' | 'boolean' | 'date';
  options?: Array<{ label: string; value: any }>;  // campo vira select na busca avançada
  optionsService?: string;    // URL para carregar options dinamicamente
  gridColumns?: number;       // 1-12
  initValue?: any;
}
```

---

## PoPageDynamicEditComponent

**Seletor:** `po-page-dynamic-edit`

Formulário de inclusão/alteração com Salvar/Cancelar automáticos.

| Input | Type | Description |
|-------|------|-------------|
| `p-fields` | `PoDynamicFormField[]` | Campos do formulário (ver `dynamic-form-fields.md`) |
| `p-auto-router` | `boolean` | Navega automaticamente após salvar (default `true`) |

**API:** `GET /{key}` → 200 | `POST /` → 201 | `PUT /{key}` → 200

**Exemplo:**
```typescript
// imports: PoPageDynamicEditModule de @po-ui/ng-templates
// template: <po-page-dynamic-edit p-title="Pedido" p-service-api="..." [p-breadcrumb]="breadcrumb" [p-fields]="fields">

readonly fields: PoDynamicFormField[] = [
  { property: 'codigo', label: 'Código', required: true, maxLength: 6, gridColumns: 4, key: true },
  { property: 'nome',   label: 'Nome',   required: true, maxLength: 40, gridColumns: 8 },
  { property: 'email',  label: 'E-mail', regex: '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$', gridColumns: 6 },
];
```

---

## PoPageDynamicDetailComponent

**Seletor:** `po-page-dynamic-detail`

Tela de detalhe somente leitura gerada a partir da API.

| Input | Type | Description |
|-------|------|-------------|
| `p-fields` | `PoDynamicViewField[]` | Campos exibidos (ver `dynamic-form-fields.md`) |
| `p-actions` | `PoPageDynamicDetailActions` | Ações edit/back/remove |

```typescript
interface PoPageDynamicDetailActions {
  back?:   string | boolean;
  edit?:   string | boolean;
  remove?: boolean;
}
```

**Exemplo:**
```typescript
// imports: PoPageDynamicDetailModule de @po-ui/ng-templates
// template: <po-page-dynamic-detail p-service-api="..." [p-breadcrumb]="breadcrumb" [p-fields]="fields" [p-actions]="actions">

readonly fields: PoDynamicViewField[] = [
  { property: 'codigo',      label: 'Código',  gridColumns: 3 },
  { property: 'nome',        label: 'Nome',    gridColumns: 9 },
  { property: 'dataEmissao', label: 'Emissão', type: 'date', format: 'dd/MM/yyyy', gridColumns: 3 },
  { property: 'ativo',       label: 'Status',  type: 'boolean', booleanTrue: 'Ativo', booleanFalse: 'Inativo', gridColumns: 3 },
];

readonly actions: PoPageDynamicDetailActions = {
  back: true, edit: ':id/editar', remove: true,
};
```

---

## PoPageDynamic* vs templates manuais — quando usar

| Critério | PoPageDynamic* | Template manual |
|----------|---------------|-----------------|
| API segue o contrato REST do plugin | ✅ Zero boilerplate | ✅ Mais código |
| Lógica de negócio customizada | ⚠️ Limitado | ✅ Controle total |
| Paginação, busca avançada, disclaimers | ✅ Automático | Requer implementação |
| Campos com dependências dinâmicas | ⚠️ Limitado | ✅ Controle total |
| Prototipagem rápida | ✅ Muito rápido | ⚠️ Mais trabalho |
| Chave composta Protheus (código + loja) | ⚠️ Requer config extra | ✅ Direto no service |
