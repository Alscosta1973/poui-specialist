# PO-UI Quirks — Família: po-table

Comportamentos específicos do componente `po-table`: seleção, scroll, altura, navegação por teclado,
layout de painéis e colunas. Carregar quando gerando `page-list`, `page-dynamic-search`, `master-detail`,
`stacked-browse`, `two-panel-browse`, `action-list` ou `dashboard`.

| # | Sintoma | Fix resumido |
|---|---|---|
| 3 | Scroll horizontal em painéis lado a lado | Override checkbox col para 41px via `::ng-deep`; recalcular soma de `p-width` |
| 5 | Scrollbar da página aparece | `tableHeight = computed(() => _winH() - OFFSET)` signal |
| 6 | Seleção nunca acumula | `p-selected-rows` não existe — usar `(p-selected)` / `(p-unselected)` |
| 7 | Coluna checkbox congela todas as colunas | Comportamento esperado; usar `[p-selectable-entire-line]="false"` em browses |
| 8 | `$selected: false` síncrono ignorado | Adiar substituição do array para `setTimeout(0)` |
| 9 | Sem navegação por teclado nativa | Padrão 3+2 partes: `cursorIndex` signal + `@HostListener` + `_scrollRowIntoView` |
| 10 | Dois browses empilhados, navegação independente | Signal `activeBrowse` + handler `Tab` roteia setas para o browse correto |
| 11 | `width` em PoTableDetail causa TS2353 | Remover `width` das colunas de detail — somente `property`, `label`, `type`, `format` |
| 16 | Colunas numéricas alinhadas à esquerda | Usar `type: 'number'` ou `type: 'currency'` com `format` adequado |

---

## 3. po-table horizontal scroll in side-by-side panels

**Symptom:** When two `po-table` components are placed side by side (flex:1 each),
each table generates a horizontal scrollbar even though the specified `p-width` values
seem reasonable.

**Root cause:** po-table adds an internal selectable-column (`po-table-column-selectable`)
of **56px** that is NOT represented in `PoTableColumn[]`. This hidden 56px pushes the table
wider than its container.

**Fix (two steps):**

**Step 1 — Reduzir a coluna checkbox interna via `::ng-deep`:**
```scss
.browse-panel {
  ::ng-deep .po-table-column-selectable {
    width: 41px !important;
    min-width: 41px !important;
    max-width: 41px !important;
  }
}
```

**Step 2 — Calcular `p-width` para que soma + checkbox = largura do painel:**
```
panel_width = (viewport - sidebar - page_padding - inter_panel_gap) / 2
data_budget = panel_width - 41px (checkbox após override)

Típico em 1366px:
  (1366 - 280 - 32 - 4) / 2 = ~520px por painel
  data_budget = 520 - 41 = 479px
```

**Step 3 — Usar `gap: 4px` (não 8px) entre painéis** para maximizar espaço de colunas.

**Referência de largura de coluna (fonte 11px, padding 8px por lado):**
| Conteúdo | Exemplo | Mínimo |
|---|---|---|
| Data | "10/01/2025" | 84px |
| Moeda | "3.200,00" | 68px |
| Código 5 chars | "NF001" | 50px |
| Código 6 chars | "PED001" | 58px |
| Status dot | ● | 28px |
| 3 dígitos | "001" | 36px |

---

## 5. Dynamic table height (no page scroll)

**Pattern:** Use a `computed` signal que reage a resize para manter o `po-table` preenchendo o
viewport sem scrollbar na página.

```typescript
import { AfterViewInit, HostListener, computed, signal } from '@angular/core';

private readonly _winH = signal(window.innerHeight);

// OFFSET = soma de todos os elementos de altura fixa fora da tabela:
//   PO shell (toolbar + page title + content padding): ~232px
//   Filtros/botões do componente: ~80px
//   Barra de título do browse: ~30px
//   Rodapé/totais: ~50px
//   Total típico: ~424px
readonly tableHeight = computed(() => Math.max(200, this._winH() - 424));

ngAfterViewInit(): void { this._winH.set(window.innerHeight); }

@HostListener('window:resize')
onResize(): void { this._winH.set(window.innerHeight); }
```

```html
<po-table [p-height]="tableHeight()" ...></po-table>
```

**Para two-panel-browse com barra contextual condicional:**
```typescript
readonly browseHeight = computed(() =>
  Math.max(180, this._winH() - (this.selectedRow() ? 460 : 424))
);
```

---

## 6. po-table selection: no `p-selected-rows` output

**Symptom:** No TypeScript error but the selection never fires / rows never accumulate.

**Root cause:** `p-selected-rows` não é um output de `po-table`. Os outputs corretos são eventos por linha.

```html
<!-- ✓ Correct -->
<po-table
  [p-selectable]="true"
  (p-selected)="onSelect($event)"
  (p-unselected)="onUnselect($event)"
  (p-all-selected)="onAllSelected($event)"
  (p-all-unselected)="selectedRows.set([])">
</po-table>

<!-- ✗ Wrong — p-selected-rows does not exist -->
<po-table [p-selected-rows]="selectedRows" ...></po-table>
```

**Implementação acumuladora:**
```typescript
readonly selectedRows = signal<any[]>([]);
onSelect(row: any): void   { this.selectedRows.update(rows => [...rows, row]); }
onUnselect(row: any): void { this.selectedRows.update(rows => rows.filter(r => r !== row)); }
```

---

## 7. po-table frozen columns and `[p-selectable-entire-line]`

Quando `[p-selectable]="true"` é usado, po-table adiciona uma coluna checkbox que faz todas as
colunas ficarem "frozen" (`po-frozen-column`). Este é o comportamento esperado.

Para restringir a seleção somente ao checkbox (não ao clicar em qualquer parte da linha):
```html
<po-table
  [p-selectable]="true"
  [p-selectable-entire-line]="false"
  ...>
</po-table>
```

Essencial em telas de two-panel-browse onde seleção acidental ao ler dados seria disruptiva.

---

## 8. po-table: programmatic `$selected: false` does not cancel a just-committed selection

**Symptom:** Quando `(p-selected)` dispara e você quer rejeitar a seleção, definir `$selected: false`
de forma síncrona não tem efeito. A linha permanece visualmente selecionada.

**Root cause:** po-table adiciona a linha ao seu `selectedRows` interno **antes** de despachar o evento
`(p-selected)`. Qualquer mudança síncrona em `$selected: false` é processada no mesmo ciclo de CD —
mas o estado interno do po-table já tem a linha, então a desincronia persiste.

**Fix: adiar a substituição do array para `setTimeout(0)`:**

```typescript
// ✗ Wrong — $selected: false é ignorado; po-table já commitou a seleção
onSelectRec(item: SomeModel): void {
  if (!isValid(item)) {
    this.items.update(rows => rows.map(r =>
      r.id === item.id ? { ...r, $selected: false } : r
    ));
    return; // linha permanece selecionada!
  }
}

// ✓ Correct — substituição diferida força po-table a reinicializar seleção
private rejectSelection(itemId: string): void {
  setTimeout(() => {
    this.items.update(rows => rows.map(r => ({
      ...r,
      $selected: r.id === this.confirmedItem()?.id,
    })));
    this.cdr.markForCheck();
  }, 0);
}
```

**Nota:** O `setTimeout(0)` causa um flash visual de ~1 frame onde a linha parece selecionada antes de
reverter. Imperceptível na prática mas inevitável com a API atual de `(p-selected)`.

---

## 9. po-table: keyboard row navigation (ArrowUp / ArrowDown)

**Context:** po-table não tem navegação por teclado nativa. Usuários Protheus esperam navegação com
setas (igual ao grid nativo). Implementação em 5 partes:

### Part 1 — State
```typescript
readonly cursorIndex = signal<number>(0);
```

### Part 2 — Keyboard listener + cursor movement
```typescript
@HostListener('window:keydown', ['$event'])
onKeyDown(event: KeyboardEvent): void {
  const tag = (event.target as HTMLElement)?.tagName?.toLowerCase();
  if (tag === 'input' || tag === 'textarea') return;

  if      (event.key === 'ArrowDown') { event.preventDefault(); this._moverCursor(1);  }
  else if (event.key === 'ArrowUp')   { event.preventDefault(); this._moverCursor(-1); }
  else return;

  setTimeout(() => this._highlightActiveRow(), 0);
}

private _moverCursor(delta: number): void {
  const items   = this.items();
  if (!items.length) return;
  const current = this.cursorIndex();
  const next    = current < 0 ? 0 : Math.max(0, Math.min(items.length - 1, current + delta));
  if (next === current && current >= 0) return;
  this.cursorIndex.set(next);
  this._onRowActivated(items[next]);
}
```

### Part 3 — DOM highlight + scroll

> **⚠️ Nunca usar `row.scrollIntoView({ block: 'nearest' })`** — não considera o `thead` sticky.
> Usar o cálculo manual abaixo.

```typescript
private _highlightActiveRow(): void {
  document.querySelectorAll('.my-browse-container .row-ativa').forEach(
    el => el.classList.remove('row-ativa')
  );
  const idx = this.cursorIndex();
  if (idx < 0) return;
  const rows = document.querySelectorAll<HTMLElement>('.my-browse-container table tbody tr');
  const row  = rows[idx];
  if (!row) return;
  row.classList.add('row-ativa');
  this._scrollRowIntoView(row);
}

private _scrollRowIntoView(row: HTMLElement): void {
  let container: HTMLElement | null = row.parentElement;
  while (container && container !== document.documentElement) {
    const style = window.getComputedStyle(container);
    if (
      (style.overflowY === 'auto' || style.overflowY === 'scroll') &&
      container.scrollHeight > container.clientHeight
    ) { break; }
    container = container.parentElement;
  }
  if (!container || container === document.documentElement) return;

  const thead  = container.querySelector('thead') as HTMLElement | null;
  const theadH = thead ? thead.offsetHeight : 0;

  const cRect     = container.getBoundingClientRect();
  const rRect     = row.getBoundingClientRect();
  const rowTop    = rRect.top - cRect.top + container.scrollTop;
  const rowBottom = rowTop + row.offsetHeight;

  const visTop = container.scrollTop + theadH;
  const visBot = container.scrollTop + container.clientHeight;

  if (rowTop < visTop) {
    container.scrollTop = Math.max(0, rowTop - theadH);
  } else if (rowBottom > visBot) {
    container.scrollTop = rowBottom - container.clientHeight;
  }
}
```

> Usar `setTimeout(..., 50)` — não 0ms. Em 0ms, o CD do PO-UI não completou e `getBoundingClientRect()` retorna valores stale.

### Part 4 — SCSS
```scss
.my-browse-container ::ng-deep tbody tr.row-ativa td {
  background-color: var(--color-brand-01-lighter, #cce5ff) !important;
}
.my-browse-container ::ng-deep tbody tr td { cursor: pointer; }
```

### Part 5 — Wiring click + init
```typescript
onRowSelected(row: MyModel): void {
  const idx = this.items().findIndex(i => i.id === row.id);
  this.cursorIndex.set(idx);
  this._onRowActivated(row);
  setTimeout(() => this._highlightActiveRow(), 0);
}

ngOnInit(): void {
  this.loadData();
  this.cursorIndex.set(0);
  if (this.items().length) this._onRowActivated(this.items()[0]);
  setTimeout(() => this._highlightActiveRow(), 0);
}
```

---

## 10. Dual-browse keyboard navigation (master → detail)

Quando a tela tem dois `po-table` empilhados onde o master dirige o detail, usar `activeBrowse`
para rotear setas e `Tab` para alternar entre browses.

### State
```typescript
readonly cursorMaster  = signal<number>(0);
readonly cursorDetail  = signal<number>(-1);
readonly activeBrowse  = signal<'master' | 'detail'>('master');
```

### Keyboard handler
```typescript
@HostListener('window:keydown', ['$event'])
onKeyDown(event: KeyboardEvent): void {
  const tag = (event.target as HTMLElement)?.tagName?.toLowerCase();
  if (tag === 'input' || tag === 'textarea') return;

  if (event.key === 'Tab') {
    event.preventDefault();
    this.activeBrowse.set(this.activeBrowse() === 'master' ? 'detail' : 'master');
    if (this.activeBrowse() === 'detail' && this.cursorDetail() < 0 && this.detailItems().length) {
      this.cursorDetail.set(0);
      setTimeout(() => this._highlightDetailRow(), 50);
    }
    return;
  }

  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
  event.preventDefault();
  const delta = event.key === 'ArrowDown' ? 1 : -1;

  if (this.activeBrowse() === 'master') {
    this._moverCursorMaster(delta);
    setTimeout(() => this._highlightMasterRow(), 50);
  } else {
    this._moverCursorDetail(delta);
    setTimeout(() => this._highlightDetailRow(), 50);
  }
}
```

### Template — wrappers com indicador de browse ativo
```html
<div class="master-browse" [class.browse-ativo]="activeBrowse() === 'master'" (click)="onMasterClick()">
  <po-table [p-columns]="masterCols" [p-items]="masterItems()" [p-selectable]="true"
    [p-selectable-entire-line]="true" [p-hide-columns-manager]="true" [p-height]="masterHeight()"
    (p-selected)="onMasterRowSelected($event)">
  </po-table>
</div>

<div class="detail-browse" [class.browse-ativo]="activeBrowse() === 'detail'" (click)="onDetailClick()">
  <po-table [p-columns]="detailCols" [p-items]="detailItems()" [p-selectable]="true"
    [p-hide-columns-manager]="true" [p-height]="detailHeight()"
    (p-selected)="onDetailRowSelected($event)">
  </po-table>
</div>
```

### SCSS — compact rows + active-browse outline
```scss
.master-browse, .detail-browse {
  ::ng-deep tbody td             { padding-top: 4px !important; padding-bottom: 4px !important; }
  ::ng-deep .row-ativa td        { background-color: #dbeafe !important; }
  ::ng-deep tbody tr td          { cursor: pointer; }
}

.browse-ativo ::ng-deep .po-table-container {
  outline: 2px solid var(--color-action-default, #0079c3);
  outline-offset: -2px;
}

.master-browse {
  ::ng-deep thead th:first-child,
  ::ng-deep tbody td:first-child { display: none !important; width: 0 !important; padding: 0 !important; }
}
```

---

## 11. PoTableDetail — `width` property not supported (TS2353)

**Symptom:** `TS2353: Object literal may only specify known properties, and 'width' does not exist in type 'PoTableDetailColumn'`.

**Root cause:** `PoTableDetail.columns` usa o tipo interno `PoTableDetailColumn`, subconjunto de
`PoTableColumn` que **não inclui `width`**. `width` só é válido em colunas master.

**Fix:** Remover `width` das colunas de detail. Somente `property`, `label`, `type` e `format` são suportados.

```typescript
// ✗ WRONG — causes TS2353
{ property: 'quantidade', label: 'Qtde', type: 'number', width: '8%' }

// ✓ RIGHT — no width on detail columns
{ property: 'quantidade', label: 'Qtde', type: 'number', format: '1.4-4' }
```

---

## 16. po-table: colunas numéricas/monetárias devem usar type correto (descoberto 2026-06-26)

**Symptom:** Valores numéricos aparecem alinhados à esquerda, sem formatação de milhar ou decimais.

**Root cause:** Colunas sem `type` específico são renderizadas como `string` — sem alinhamento nem formatação automática.

**Fix:** Sempre definir `type: 'number'` ou `type: 'currency'` em colunas numéricas.

```typescript
// ✗ ERRADO — alinha à esquerda, sem formatação
{ property: 'valorTotal', label: 'Valor Total' }

// ✓ CORRETO
{ property: 'valorTotal', label: 'Valor Total', type: 'currency', format: 'BRL' }
{ property: 'quantidade', label: 'Qtde',        type: 'number',   format: '1.0-2' }
{ property: 'percentual', label: '%',            type: 'number',   format: '1.2-2' }
```

**Regras de tipo por padrão de nome de campo:**

| Padrão | type | format |
|---|---|---|
| `valor*`, `preco*`, `total*`, `saldo*`, `desconto*`, `taxa*` | `currency` | `'BRL'` |
| `qtd*`, `quantidade*`, `qtde*` | `number` | `'1.0-2'` |
| `perc*`, `percent*`, `porcent*` | `number` | `'1.2-2'` |
| `data*`, `dt*` | `date` | `'dd/MM/yyyy'` |

Campos de código alfanumérico (ex: `'001'`, `'NF001'`) → **não** usar `type: 'number'`.
