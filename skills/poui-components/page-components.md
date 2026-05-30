# PO-UI Page Components

## po-page-list

Layout padrão para telas de consulta. Contém área de título, actions, filtro rápido e slot para conteúdo (normalmente `po-table`).

### Key Inputs

| Input | Type | Description |
|-------|------|-------------|
| `p-title` | `string` | Título da página |
| `p-actions` | `PoPageAction[]` | Botões de ação no cabeçalho |
| `p-filter` | `PoPageFilter` | Configuração do filtro rápido |
| `p-breadcrumb` | `PoBreadcrumb` | Trilha de navegação |

### PoPageAction

```typescript
interface PoPageAction {
  label: string;
  action?: () => void;
  disabled?: boolean | (() => boolean);
  icon?: string;
  type?: 'danger' | 'default';
  url?: string;
  visible?: boolean | (() => boolean);
}
```

### PoPageFilter

```typescript
interface PoPageFilter {
  placeholder?: string;
  action: (searchValue: string) => void;
  advancedAction?: () => void;
  ngModel?: string;
}
```

### Usage Example

```typescript
readonly pageActions: PoPageAction[] = [
  { label: 'Novo', action: () => this.router.navigate(['novo']), icon: 'po-icon-plus' },
];

readonly filterSettings: PoPageFilter = {
  placeholder: 'Buscar por nome...',
  action: (q) => this.onSearch(q),
};
```

```html
<po-page-list
  p-title="Clientes"
  [p-actions]="pageActions"
  [p-filter]="filterSettings">
  <po-table ...></po-table>
</po-page-list>
```

---

## po-page-edit

Layout padrão para telas de cadastro e edição. Contém título, actions (Salvar / Cancelar) e slot para formulário.

### Key Inputs

| Input | Type | Description |
|-------|------|-------------|
| `p-title` | `string` | Título da página |
| `p-actions` | `PoPageEditActions` | Configuração de Salvar e Cancelar |
| `p-breadcrumb` | `PoBreadcrumb` | Trilha de navegação |
| `p-disable-submit` | `boolean` | Desabilita botão Salvar |

### PoPageEditActions

```typescript
interface PoPageEditActions {
  save?: string | PoPageEditAction;
  saveNew?: string | PoPageEditAction;
  cancel?: string | PoPageEditAction | boolean;
}

interface PoPageEditAction {
  label?: string;
  action?: () => void;
  disabled?: boolean | (() => boolean);
}
```

### Usage Example

```typescript
readonly editActions: PoPageEditActions = {
  save: { label: 'Salvar', action: () => this.save() },
  cancel: { label: 'Cancelar', action: () => this.router.navigate(['..']) },
};
```

```html
<po-page-edit
  p-title="Novo Cliente"
  [p-actions]="editActions"
  [p-disable-submit]="form.invalid">
  <form [formGroup]="form">
    <!-- campos aqui -->
  </form>
</po-page-edit>
```

---

## po-page-detail

Layout para telas de visualização (somente leitura).

### Key Inputs

| Input | Type | Description |
|-------|------|-------------|
| `p-title` | `string` | Título da página |
| `p-actions` | `PoPageDetailActions` | Edit, Remove, Back actions |
| `p-breadcrumb` | `PoBreadcrumb` | Trilha de navegação |

### PoPageDetailActions

```typescript
interface PoPageDetailActions {
  edit?: string | PoPageDetailAction;
  remove?: string | PoPageDetailAction;
  back?: string | PoPageDetailAction | boolean;
}
```

### Usage Example

```html
<po-page-detail
  p-title="Cliente: João Silva"
  [p-actions]="detailActions">
  <!-- po-info fields or po-dynamic-view -->
</po-page-detail>
```
