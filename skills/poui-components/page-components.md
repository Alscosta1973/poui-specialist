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
  action?: Function;
  advancedAction?: Function;
  placeholder?: string;
  width?: number;
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
  p-title="Pedidos"
  [p-actions]="pageActions"
  [p-filter]="filterSettings">
  <po-table ...></po-table>
</po-page-list>
```

---

## po-page-edit

Layout padrão para telas de cadastro e edição. Contém título, botões Salvar/Cancelar e slot para formulário.

> **Import correto:** `PoPageModule` — não existe `PoPageEditModule` nem `PoPageEditActions` na biblioteca.

### Key Inputs

| Input | Type | Description |
|-------|------|-------------|
| `p-title` | `string` | Título da página |
| `p-breadcrumb` | `PoBreadcrumb` | Trilha de navegação |
| `p-disable-submit` | `boolean` | Desabilita os botões Salvar e Salvar e Novo |
| `p-literals` | `PoPageEditLiterals` | Customiza rótulos dos botões |
| `p-subtitle` | `string` | Subtítulo do header |

### Key Outputs (eventos — não `p-actions`)

| Output | Description |
|--------|-------------|
| `(p-save)` | Disparado ao clicar em "Salvar" — exibe o botão somente quando este evento está vinculado |
| `(p-cancel)` | Disparado ao clicar em "Cancelar" — exibe o botão somente quando este evento está vinculado |
| `(p-save-new)` | Disparado ao clicar em "Salvar e Novo" — exibe o botão somente quando este evento está vinculado |

> Os botões só são exibidos quando o respectivo output está vinculado no template.

### Usage Example

```typescript
// Não há PoPageEditActions — use eventos diretamente
import { PoPageModule } from '@po-ui/ng-components';

// Em @Component imports: [PoPageModule]

save(): void { /* ... */ }
goBack(): void { this.router.navigate(['..'], { relativeTo: this.route }); }
```

```html
<po-page-edit
  p-title="Novo Pedido"
  [p-disable-submit]="loading()"
  (p-save)="save()"
  (p-cancel)="goBack()">
  <form [formGroup]="form">
    <!-- campos aqui -->
  </form>
</po-page-edit>
```

---

## po-page-detail

Layout para telas de visualização (somente leitura).

> **Import correto:** `PoPageModule` — não existe `PoPageDetailModule` nem `PoPageDetailActions` na biblioteca.

### Key Inputs

| Input | Type | Description |
|-------|------|-------------|
| `p-title` | `string` | Título da página |
| `p-breadcrumb` | `PoBreadcrumb` | Trilha de navegação |
| `p-literals` | `PoPageDetailLiterals` | Customiza rótulos dos botões |
| `p-subtitle` | `string` | Subtítulo do header |

### Key Outputs (eventos — não `p-actions`)

| Output | Description |
|--------|-------------|
| `(p-edit)` | Disparado ao clicar em "Editar" — exibe o botão somente quando vinculado |
| `(p-remove)` | Disparado ao clicar em "Remover" — exibe o botão somente quando vinculado |
| `(p-back)` | Disparado ao clicar em "Voltar" — exibe o botão somente quando vinculado |

### Usage Example

```typescript
import { PoPageModule } from '@po-ui/ng-components';
// em @Component imports: [PoPageModule]
```

```html
<po-page-detail
  p-title="Pedido: João Silva"
  [p-breadcrumb]="breadcrumb"
  (p-edit)="navigateToEdit()"
  (p-remove)="confirmDelete()"
  (p-back)="goBack()">
  <!-- po-dynamic-view ou po-info -->
</po-page-detail>
```
