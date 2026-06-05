# PO-UI Table Components

## po-table

### Key Inputs

| Input | Type | Description |
|-------|------|-------------|
| `p-columns` | `PoTableColumn[]` | Column definitions |
| `p-items` | `any[]` | Row data |
| `p-loading` | `boolean` | Shows loading overlay |
| `p-actions` | `PoTableAction[]` | Row-level actions |
| `p-selectable` | `boolean` | Enables row checkboxes |
| `p-single-select` | `boolean` | Only one row selectable at a time |
| `p-show-more-disabled` | `boolean` | Disables "Show more" button |
| `p-sort` | `boolean` | Enables column sorting |
| `p-striped` | `boolean` | Alternate row colors |
| `p-hide-columns-manager` | `boolean` | Hides column visibility manager |

### Key Outputs

| Output | Type | Description |
|--------|------|-------------|
| `(p-show-more)` | `void` | Fired when user clicks "Mostrar mais" |
| `(p-selected-rows)` | `any[]` | Emits selected rows array |
| `(p-sort-by)` | `PoTableColumnSort` | Emits sort column and direction |

---

## PoTableColumn

```typescript
interface PoTableColumn {
  property: string;
  label: string;
  width?: string;
  type?: 'string' | 'number' | 'currency' | 'date' | 'dateTime'
       | 'time' | 'boolean' | 'subtitle' | 'detail' | 'link'
       | 'icon' | 'label' | 'tag';
  format?: string;
  sortable?: boolean;
  visible?: boolean;
  noWrap?: boolean;
  labels?: PoTableColumnLabel[];
  detail?: PoTableDetail;
}
```

### Column Type Examples

```typescript
readonly columns: PoTableColumn[] = [
  { property: 'codigo',  label: 'Código',  width: '10%', sortable: true },
  { property: 'nome',    label: 'Nome',    sortable: true },
  { property: 'valor',   label: 'Valor',   type: 'currency', format: 'BRL', width: '12%' },
  { property: 'emissao', label: 'Emissão', type: 'date', format: 'dd/MM/yyyy', width: '12%' },
  { property: 'ativo',   label: 'Ativo',   type: 'boolean', width: '8%' },
  {
    property: 'status',
    label: 'Status',
    type: 'label',
    labels: [
      { value: 'A', label: 'Ativo',   color: 'color-10', textColor: '#fff' },
      { value: 'I', label: 'Inativo', color: 'color-07', textColor: '#fff' },
    ],
  },
];
```

---

## PoTableAction

```typescript
interface PoTableAction {
  label: string;
  action: (row: any) => void;
  icon?: string;
  disabled?: boolean | ((row: any) => boolean);
  separator?: boolean;
  type?: 'danger' | 'default';
  visible?: boolean | ((row: any) => boolean);
}
```

### Example

```typescript
readonly tableActions: PoTableAction[] = [
  {
    label: 'Editar',
    icon: 'po-icon-edit',
    action: (row) => this.router.navigate([row.codigo]),
  },
  {
    label: 'Excluir',
    icon: 'po-icon-delete',
    type: 'danger',
    separator: true,
    action: (row) => this.delete(row),
    disabled: (row) => !row.podeExcluir,
  },
];
```

---

## Server-Side Pagination Pattern

```typescript
readonly items = signal<Cliente[]>([]);
readonly hasNext = signal(false);
readonly loading = signal(false);
private currentPage = 1;
private readonly pageSize = 10;

load(q?: string): void {
  this.loading.set(true);
  this.service.getAll({ page: this.currentPage, pageSize: this.pageSize, q })
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe({
      next: (res) => {
        this.items.set(res.items);
        this.hasNext.set(res.hasNext);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
}

onShowMore(): void {
  this.currentPage++;
  this.service.getAll({ page: this.currentPage, pageSize: this.pageSize })
    .subscribe((res) => {
      this.items.update(prev => [...prev, ...res.items]);
      this.hasNext.set(res.hasNext);
    });
}
```

```html
<po-table
  [p-columns]="columns"
  [p-items]="items()"
  [p-loading]="loading()"
  [p-actions]="tableActions"
  [p-show-more-disabled]="!hasNext()"
  (p-show-more)="onShowMore()">
</po-table>
```
