# Template: stacked-browse — HTML, SCSS, model

> Sub-arquivo de `templates-stacked-browse.md`. Use este arquivo ao gerar `.component.html`, `.component.scss` ou a interface de modelo.
> Use `templates-stacked-browse-ts.md` para `.component.ts`.

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
    --font-size: 12px cascateia para TODOS os filhos PO-UI via var(--font-size):
    labels, inputs, datepickers e botões encolhem uniformemente.
    O min-height e o padding forçados abaixo compactam ainda mais os inputs.
  */
  --font-size: 12px;

  ::ng-deep .po-input  { min-height: 28px !important; padding-top: 2px !important; padding-bottom: 2px !important; }
  ::ng-deep .po-button { min-height: 28px !important; height: 28px !important; padding: 0 12px !important; }
}

.filtro-campo { width: 130px; }

/*
  po-datepicker tem 44px de padding à direita para o ícone do calendário.
  Em fonte 12px, 170px comporta "dd/MM/yyyy" (10 chars × ~8px + 44px ícone + 6px padding).
  NÃO reduza abaixo de 170px — o último dígito do ano ficará cortado.
*/
.filtro-data { width: 170px; }

/* Alinha a baseline do botão com o campo input (po-input tem 8px de espaço de erro invisível abaixo) */
.btn-buscar  { margin-bottom: 4px; }

/* ── Browse headers ──────────────────────────────────────────────────────── */
/*
  O estado ativo usa border-top-color — NUNCA outline no container do po-table.
  Motivo: outline: 2px solid no .po-table-container desenha nos 4 lados; quando
  o usuário rola o browse, a borda inferior do outline fica visível como
  uma linha flutuante, criando um artefato visual abaixo da tabela.
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
  "✕ Remover Filtro" é sempre vermelho — o estado inativo muda apenas o cursor
  e remove o sublinhado no hover. Isso evita inconsistência visual quando o
  estado do filtro muda.
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
    Suprime TODOS os focos visuais do browser dentro do browse.
    Sem isso, clicar numa linha ou rolar causa um contorno azul no
    elemento po-table-container-overflow — visível como borda ao redor
    da área de scroll e como linha flutuante na borda inferior durante o scroll.
  */
  ::ng-deep *:focus,
  ::ng-deep *:focus-visible {
    outline:    none !important;
    box-shadow: none !important;
  }
}

/* Master: oculta a coluna de checkbox nativa do PO-UI (seleção por linha inteira via p-selectable-entire-line) */
.master-browse {
  ::ng-deep thead th:first-child,
  ::ng-deep tbody td:first-child {
    display:  none !important;
    width:    0    !important;
    padding:  0    !important;
  }
}

/* Detail: linhas não selecionadas permanecem transparentes — somente row-ativa exibe destaque */
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
  dataEmissao:  string;   // ISO 8601 'YYYY-MM-DD' — use _toISO() no componente para comparação no filtro
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

## Calibração do offset de altura

Os computeds `masterHeight` e `detailHeight` usam um offset de 320px. Ajuste se você adicionar/remover elementos fixos:

| Elemento | Altura aprox. |
|---|---|
| PO shell navbar | ~60px |
| Título do po-page-default + padding | ~80px |
| `.filtros-bar` (compacta, fonte 12px) | ~50px |
| `.browse-cabecalho` × 2 | ~30px |
| `.rodape-bar` | ~45px |
| Padding/margem extras | ~55px |
| **Total** | **~320px** |

Distribuição 47% master / 40% detail deixa ~13% como espaço natural de respiro. Aumente o offset em 10-20px se adicionar uma barra de status ou breadcrumb.

---

## Referência de placeholders deste template

| Placeholder | Exemplo |
|---|---|
| `{{MasterModel}}` | `PedidoSC5` |
| `{{DetailModel}}` | `ItemSC6` |
| `{{masterKey}}` | `numPedido` |
| `{{MasterTitle}}` | `Pedidos de Venda (SC5)` |
| `{{DetailTitle}}` | `Itens do Pedido (SC6)` |
| `{{PageTitle}}` | `Geração de NF — Pedidos de Venda` |
