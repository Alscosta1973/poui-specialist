# PO-UI Table Template Directives

Diretivas de template para personalização visual avançada do `po-table` —
permitem substituir o conteúdo padrão de células, cabeçalhos e linhas inteiras.

---

## [p-table-cell-template]

Substitui o conteúdo renderizado em células de uma coluna específica.
A coluna deve ter `type: 'cellTemplate'` na sua definição.

### Uso

```typescript
import { PoTableModule, PoTableColumn } from '@po-ui/ng-components';

readonly columns: PoTableColumn[] = [
  { property: 'status',     label: 'Status',   type: 'cellTemplate', width: '15%' },
  { property: 'descricao',  label: 'Descrição', width: '55%' },
  { property: 'valor',      label: 'Valor',     type: 'currency', format: 'BRL', width: '15%' },
  { property: 'acoes',      label: 'Ações',     type: 'cellTemplate', width: '15%' },
];
```

```html
<po-table [p-columns]="columns" [p-items]="items()" [p-height]="400">

  <!-- Template para a coluna 'status' -->
  <ng-template p-table-cell-template let-row let-column="column" let-value="value">
    @if (column.property === 'status') {
      <po-tag
        [p-value]="statusLabel(row.status)"
        [p-kind]="statusKind(row.status)">
      </po-tag>
    }
    @if (column.property === 'acoes') {
      <po-button
        p-icon="po-icon-edit"
        p-kind="tertiary"
        p-size="small"
        (p-click)="edit(row)">
      </po-button>
    }
  </ng-template>

</po-table>
```

```typescript
statusLabel(status: string): string {
  return { A: 'Ativo', I: 'Inativo', P: 'Pendente' }[status] ?? status;
}

statusKind(status: string): string {
  return { A: 'success', I: 'danger', P: 'warning' }[status] ?? 'neutral';
}
```

> **Variáveis disponíveis no template:**
> - `let-row` → objeto da linha completa
> - `let-column="column"` → definição da coluna (`PoTableColumn`)
> - `let-value="value"` → valor da propriedade da célula

---

## [p-table-column-template]

Substitui o cabeçalho HTML de uma coluna. Útil para adicionar ícones, tooltips ou
controles de ordenação customizados no cabeçalho.
A coluna deve ter `type: 'columnTemplate'` na sua definição.

### Uso

```typescript
readonly columns: PoTableColumn[] = [
  { property: 'selecionado', label: '',        type: 'columnTemplate', width: '5%' },
  { property: 'codigo',      label: 'Código',  width: '15%' },
  { property: 'descricao',   label: 'Nome',    width: '80%' },
];
```

```html
<po-table [p-columns]="columns" [p-items]="items()">

  <!-- Cabeçalho customizado — checkbox de seleção all -->
  <ng-template p-table-column-template let-column>
    @if (column.property === 'selecionado') {
      <input
        type="checkbox"
        [checked]="allSelected()"
        (change)="toggleAll($event)">
    } @else {
      {{ column.label }}
    }
  </ng-template>

</po-table>
```

---

## [p-table-row-template]

Substitui a **linha inteira** por um template customizado — útil para layouts
de linha que não cabem em células padrão (ex: card-style, master-detail visual).

### Uso

```typescript
readonly columns: PoTableColumn[] = [
  { property: 'descricao', label: 'Produto' },
  { property: 'qtd',       label: 'Qty',    type: 'number' },
  { property: 'total',     label: 'Total',  type: 'currency', format: 'BRL' },
];
```

```html
<po-table [p-columns]="columns" [p-items]="items()" [p-height]="400">

  <!-- Linha customizada com layout multi-coluna próprio -->
  <ng-template p-table-row-template let-row let-index="index">
    <td [attr.colspan]="columns.length" class="po-p-2">
      <div class="po-row po-align-items-center">
        <div class="po-md-1 po-font-text-small po-color-08">{{ index + 1 }}</div>
        <div class="po-md-7">
          <div class="po-font-text-bold">{{ row.descricao }}</div>
          <div class="po-font-text-small po-color-08">{{ row.referencia }}</div>
        </div>
        <div class="po-md-2 po-text-right">Qty: {{ row.qtd }}</div>
        <div class="po-md-2 po-text-right">{{ row.total | currency:'BRL':'symbol':'1.2-2' }}</div>
      </div>
    </td>
  </ng-template>

</po-table>
```

> **Nota:** Ao usar `p-table-row-template`, certifique-se de que o `colspan`
> cobre todas as colunas definidas para evitar quebra de layout no cabeçalho.

---

## Combinando templates

É possível usar `p-table-cell-template` e `p-table-row-template` no mesmo
`po-table` para tratar casos específicos com templates de célula e deixar
o restante das linhas com o layout padrão.

```html
<po-table [p-columns]="columns" [p-items]="items()">
  <ng-template p-table-cell-template let-row let-column="column">
    @if (column.property === 'status') {
      <po-tag [p-value]="row.status" [p-kind]="kindFor(row.status)"></po-tag>
    }
  </ng-template>
</po-table>
```
