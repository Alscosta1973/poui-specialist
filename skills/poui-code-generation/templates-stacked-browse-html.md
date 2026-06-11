# Template: stacked-browse — HTML, SCSS, model

> Sub-file of `templates-stacked-browse.md`. Load this file when generating `.component.html`, `.component.scss`, or the model interface.
> Load `templates-stacked-browse-ts.md` for `.component.ts`.

---

## {{kebab-name}}.component.html

```html
<po-page-default p-title="{{PageTitle}}">

  <!-- Filtros ─────────────────────────────────────────────────────────── -->
  <div class="filtros-bar">
    <po-input
      name="campo1"
      p-label="Campo 1"
      p-placeholder=""
      [(ngModel)]="filtros.campo1"
      class="filtro-campo">
    </po-input>
    <po-input
      name="campo2"
      p-label="Campo 2"
      p-placeholder=""
      [(ngModel)]="filtros.campo2"
      class="filtro-campo">
    </po-input>
    <po-datepicker
      name="dataDE"
      p-label="Data De"
      [(ngModel)]="filtros.dataDE"
      class="filtro-campo filtro-data">
    </po-datepicker>
    <po-datepicker
      name="dataATE"
      p-label="Data Até"
      [(ngModel)]="filtros.dataATE"
      class="filtro-campo filtro-data">
    </po-datepicker>
    <po-button
      p-label="Buscar"
      p-kind="primary"
      p-icon="po-icon-search"
      (p-click)="buscar()"
      class="btn-buscar">
    </po-button>
  </div>

  <!-- Browse Master ────────────────────────────────────────────────────── -->
  <div class="browse-cabecalho" [class.browse-cabecalho-ativo]="activeBrowse() === 'master'">
    <span class="browse-titulo">{{MasterTitle}}</span>
    <div class="browse-direita">
      <span class="browse-count" *ngIf="items().length > 0">
        {{ items().length }} registro(s) &nbsp;·&nbsp; Tab para alternar browse &nbsp;·&nbsp; ↑↓ para navegar
      </span>
      <span class="link-remover-filtro"
            [class.link-remover-filtro--ativo]="isFiltrado()"
            (click)="isFiltrado() && removerFiltro()">✕ Remover Filtro</span>
    </div>
  </div>
  <div class="master-browse" [class.browse-ativo]="activeBrowse() === 'master'" (click)="onMasterClick()">
    <po-table
      [p-columns]="colunasMaster"
      [p-items]="items()"
      [p-selectable]="true"
      [p-selectable-entire-line]="true"
      [p-hide-columns-manager]="true"
      [p-height]="masterHeight()"
      (p-selected)="onMasterSelecionado($event)"
      (p-unselected)="onMasterDeselecionado($event)">
    </po-table>
  </div>

  <!-- Browse Detail ────────────────────────────────────────────────────── -->
  <div class="browse-cabecalho browse-cabecalho-detail" [class.browse-cabecalho-ativo]="activeBrowse() === 'detail'">
    <span class="browse-titulo">{{ tituloDetail() }}</span>
    <span class="browse-count" *ngIf="detailItems().length > 0">{{ detailItems().length }} item(ns)</span>
  </div>
  <div class="detail-browse" [class.browse-ativo]="activeBrowse() === 'detail'" (click)="onDetailClick()">
    <po-table
      [p-columns]="colunasDetail"
      [p-items]="detailItems()"
      [p-selectable]="true"
      [p-hide-columns-manager]="true"
      [p-height]="detailHeight()"
      (p-selected)="onItemSelecionado($event)"
      (p-unselected)="onItemDeselecionado($event)"
      (p-all-selected)="onTodosItensSelecionados()"
      (p-all-unselected)="onTodosItensDeselecionados()">
    </po-table>
  </div>

  <!-- Rodapé ───────────────────────────────────────────────────────────── -->
  <div class="rodape-bar">
    <span class="rodape-info">
      <strong>{{ qtdSelecionados() }}</strong> item(ns) &nbsp;·&nbsp;
      Total:&nbsp;<strong class="rodape-total">R$&nbsp;{{ fmtVal(totalSelecionado()) }}</strong>
    </span>
    <po-button
      p-label="Confirmar"
      p-kind="primary"
      p-icon="po-icon-ok"
      [p-disabled]="!podeConfirmar()"
      (p-click)="confirmar()">
    </po-button>
  </div>

</po-page-default>
```

---

## {{kebab-name}}.component.scss

```scss
:host {
  display:   block;
  font-size: 12px;
}

/* ── Filtros ─────────────────────────────────────────────────────────────── */
.filtros-bar {
  display:     flex;
  align-items: flex-end;
  gap:         10px;
  flex-wrap:   wrap;
  padding:     0 0 4px;

  /*
    --font-size: 12px cascades to ALL PO-UI children via var(--font-size):
    labels, inputs, datepickers, and buttons all shrink uniformly.
    The forced min-height and padding below further compact the inputs.
  */
  --font-size: 12px;

  ::ng-deep .po-input  { min-height: 28px !important; padding-top: 2px !important; padding-bottom: 2px !important; }
  ::ng-deep .po-button { min-height: 28px !important; height: 28px !important; padding: 0 12px !important; }
}

.filtro-campo { width: 130px; }

/*
  po-datepicker has 44px right padding for the calendar icon.
  At 12px font, 170px fits "dd/MM/yyyy" (10 chars × ~8px + 44px icon + 6px padding).
  Do NOT go below 170px — the rightmost year digit gets clipped.
*/
.filtro-data { width: 170px; }

/* Aligns button baseline with the input field (po-input has 8px invisible error space below) */
.btn-buscar  { margin-bottom: 4px; }

/* ── Browse headers ──────────────────────────────────────────────────────── */
/*
  Active state uses border-top-color — NOT outline on the po-table container.
  Reason: outline: 2px solid on .po-table-container draws on all 4 sides; when
  the user scrolls the browse the bottom edge of the outline becomes visible as
  a floating line, creating a visual artifact below the table.
*/
.browse-cabecalho {
  display:         flex;
  align-items:     center;
  justify-content: space-between;
  padding:         3px 4px;
  border-top:      2px solid var(--color-neutral-light-10, #e0e0e0);
  margin-top:      3px;
  transition:      border-top-color 0.1s;
}

.browse-cabecalho-ativo {
  border-top-color: var(--color-action-default, #0079c3) !important;
}

.browse-cabecalho-detail { margin-top: 4px; }

.browse-titulo {
  font-size:   0.82rem;
  font-weight: 600;
  color:       var(--color-neutral-dark-70, #4a4a4a);
}

.browse-direita {
  display:     flex;
  align-items: center;
  gap:         10px;
}

.browse-count {
  font-size: 0.75rem;
  color:     var(--color-neutral-dark-40, #999);
}

/*
  "✕ Remover Filtro" is always red — the disabled state changes only the cursor
  and removes the hover underline. This avoids visual inconsistency when the
  filter state changes.
*/
.link-remover-filtro {
  font-size:   0.72rem;
  color:       var(--color-feedback-negative-base, #c9372c);
  cursor:      default;
  user-select: none;

  &--ativo {
    cursor: pointer;
    &:hover { text-decoration: underline; }
  }
}

/* ── Browse containers ───────────────────────────────────────────────────── */
.master-browse,
.detail-browse {
  ::ng-deep tbody td {
    padding-top:    4px !important;
    padding-bottom: 4px !important;
  }

  ::ng-deep .po-table-body-ellipsis,
  ::ng-deep .po-table-header-ellipsis { font-size: 11px; }

  ::ng-deep .row-ativa td { background-color: #dbeafe !important; }
  ::ng-deep tbody tr td   { cursor: pointer; }

  /*
    Suppress ALL browser focus rings inside the browse.
    Without this, clicking a row or scrolling causes a blue outline to appear
    on the po-table-container-overflow element — visible as a border around
    the scroll area and as a floating line at the bottom edge during scroll.
  */
  ::ng-deep *:focus,
  ::ng-deep *:focus-visible {
    outline:    none !important;
    box-shadow: none !important;
  }
}

/* Master: hide PO-UI's built-in checkbox column (single-row navigation via p-selectable-entire-line) */
.master-browse {
  ::ng-deep thead th:first-child,
  ::ng-deep tbody td:first-child {
    display:  none !important;
    width:    0    !important;
    padding:  0    !important;
  }
}

/* Detail: unselected rows must stay transparent — only row-ativa shows highlight */
.detail-browse {
  ::ng-deep tbody tr:not(.row-ativa) td {
    background-color: transparent !important;
  }
}

/* ── Rodapé ──────────────────────────────────────────────────────────────── */
.rodape-bar {
  display:         flex;
  align-items:     center;
  justify-content: space-between;
  padding:         5px 4px 0;
  margin-top:      4px;
  border-top:      2px solid var(--color-neutral-light-10, #e0e0e0);
}

.rodape-info  { font-size: 0.82rem; color: var(--color-neutral-dark-70, #4a4a4a); }
.rodape-total { color: var(--color-feedback-positive-dark, #1a7a5f); }
```

---

## models/{{modelFile}}.model.ts

```typescript
export interface {{MasterModel}} {
  {{masterKey}}: string;
  descricao:    string;
  dataEmissao:  string;   // ISO 8601 'YYYY-MM-DD' — use _toISO() in component for filter comparison
  valor:        number;
  status:       'A' | 'F' | 'C';
}

export interface {{DetailModel}} {
  item:      string;
  produto:   string;
  descricao: string;
  qtd:       number;
  valor:     number;
}
```

---

## Height offset calibration

The `masterHeight` and `detailHeight` computeds use a 320px offset. Adjust if you add/remove fixed elements:

| Element | Approximate height |
|---|---|
| PO shell navbar | ~60px |
| po-page-default title + padding | ~80px |
| `.filtros-bar` (compact, 12px font) | ~50px |
| `.browse-cabecalho` × 2 | ~30px |
| `.rodape-bar` | ~45px |
| Extra padding/margin | ~55px |
| **Total** | **~320px** |

Distribution 47% master / 40% detail leaves ~13% as natural breathing room. Increase the offset by 10-20px if you add a status bar or breadcrumb.

---

## Placeholder reference for this template

| Placeholder | Example |
|---|---|
| `{{MasterModel}}` | `PedidoSC5` |
| `{{DetailModel}}` | `ItemSC6` |
| `{{masterKey}}` | `numPedido` |
| `{{MasterTitle}}` | `Pedidos de Venda (SC5)` |
| `{{DetailTitle}}` | `Itens do Pedido (SC6)` |
| `{{PageTitle}}` | `Geração de NF — Pedidos de Venda` |
