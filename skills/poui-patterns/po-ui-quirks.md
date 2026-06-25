# PO-UI Known Quirks and Fixes

Documented behavior differences, internal implementation details, and CSS overrides
discovered through production use of PO-UI with Protheus. Apply these fixes proactively
when generating or reviewing code.

## Quick Reference — 14 Known Quirks

| # | Component / API | Symptom | Fix |
|---|---|---|---|
| 1 | po-page-content | **Content invisible on load in OnPush + sync data** | `ngAfterViewInit() { setTimeout(() => this.cdr.detectChanges()); }` |
| 14 | po-page-\* / any PO-UI @Input | **Signal value not reflected — template shows `[object Object]`** | PO-UI @Inputs are NOT signal-aware: use `breadcrumb()` not `breadcrumb` |
| 2 | po-input | Buttons 8px below field edge | `margin-bottom: 8px` on the button container |
| 3 | po-table | Horizontal scroll in side-by-side panels | Override checkbox col to 41px via `::ng-deep`; recalculate `p-width` sum |
| 4 | po-input | `NG8002` on `p-max-length` | Use `p-maxlength` (no hyphen between `max` and `length`) |
| 5 | po-table | Page-level scrollbar appears | `tableHeight = computed(() => _winH() - OFFSET)` signal |
| 6 | po-table | Selection never accumulates | `p-selected-rows` does not exist — use `(p-selected)` / `(p-unselected)` events |
| 7 | po-table | Checkbox col freezes all columns | Expected PO-UI behavior; set `[p-selectable-entire-line]="false"` for browse screens |
| 8 | po-table | Synchronous `$selected: false` ignored | Defer items array replacement to `setTimeout(0)` |
| 9 | po-table | No built-in keyboard row navigation | 3-part pattern: `cursorIndex` signal + `@HostListener` + `_scrollRowIntoView` |
| 10 | po-table (dual) | Two stacked tables, independent arrow-key nav | `activeBrowse` signal + `Tab` handler routes arrow keys to correct browse |
| 11 | PoTableDetail | TS2353: `width` not in type | Remove `width` from detail columns — only `property`, `label`, `type`, `format` valid |
| 12 | po-table | **Invisible on first load in OnPush component** | Always set `[p-height]` — without it, opacity is set via async `setTimeout` and OnPush never re-renders |
| 13 | po-dynamic-form | **`(p-value-change)` silently does nothing** | Output doesn't exist — use `(p-form)="fn($event)"` + subscribe `form.valueChanges` |

---

## 1. po-page-* content blank on load (OnPush + ng-content) — UPDATED 2026-06-25

**Symptom:** Navigating via menu click renders the page shell (title, breadcrumb, action
buttons) but ALL projected content is invisible — fields, table, filters. Clicking anywhere
inside the page makes everything appear instantly.

**Root cause (two layers):**

1. `PoPageContentComponent` sets `contentOpacity = 0` on creation and restores it to `1`
   inside a `setTimeout` in its own `ngAfterViewInit`. With **OnPush**, if no CD cycle runs
   after that setTimeout fires, the opacity change is never applied to the DOM.

2. Broader: `po-page-edit`, `po-page-detail`, and `po-page-list` project content via
   `ng-content`. Their child PO-UI field components (`po-input`, `po-select`, etc.) also
   use OnPush internally. Without a post-init CD cycle, these children never render their
   visual content (labels, borders, options).

**Why `markForCheck()` in `ngOnInit` is NOT enough:** `markForCheck()` schedules a check
for the _next_ CD cycle triggered by Angular's zone. In a route-activated component where
no zone event fires after init (no HTTP call, no timer, no user interaction), that cycle
never arrives. The fields are in the DOM but visually blank until a click event.

**Why `detectChanges()` in `ngAfterViewInit` works:** `detectChanges()` is synchronous and
runs immediately, forcing a full re-render of the component subtree right after all child
lifecycle hooks have completed (including `po-page-content`'s own `ngAfterViewInit`).
Wrapping it in `setTimeout` pushes it to the next macro-task, after `po-page-content`'s
own `setTimeout(opacity=1)` has already queued — ensuring correct ordering.

**Affects:** Every OnPush component using `po-page-list`, `po-page-edit`, `po-page-detail`,
`po-page-dynamic-search`, or `po-page-default`. Components making HTTP calls are
"accidentally" safe _only when the response arrives before the user first sees blank_,
which is not guaranteed on slow connections.

**Fix — mandatory for every OnPush component using `po-page-*` (already in all plugin templates):**

```typescript
import { AfterViewInit, ChangeDetectorRef, inject } from '@angular/core';

export class MyComponent implements OnInit, AfterViewInit {
  private readonly cdr = inject(ChangeDetectorRef);

  ngAfterViewInit(): void {
    // detectChanges() forces synchronous re-render after all child lifecycle hooks.
    // setTimeout() ensures ordering after po-page-content's own setTimeout(opacity=1).
    setTimeout(() => this.cdr.detectChanges());
  }
}
```

```typescript
// ✗ Breaks in "novo" mode (no HTTP call, no signal change → no CD cycle)
ngOnInit(): void {
  if (mat) { this.isEdit.set(true); this.loadData(mat); }
  // else: nothing happens → blank page until click
}

// ✓ Works universally
ngAfterViewInit(): void {
  setTimeout(() => this.cdr.detectChanges()); // safe even when HTTP is also in flight
}
```

---

## 2. po-input bottom padding misaligns buttons (8px offset)

**Symptom:** Buttons placed in the same flex row as `po-input` fields appear 8px lower
than the visible input field edge, even with `align-items: flex-end` on the container.

**Root cause:** `po-input` renders a wrapper that includes an invisible 8px space below
the visible input field, reserved for validation error messages. `flex-end` aligns to the
bottom of this wrapper (including the invisible 8px), not to the bottom of the visible field.

**Fix:** Add `margin-bottom: 8px` to the button element or its container to push it up
by the same 8px, aligning it with the visible input bottom edge.

```scss
// ✓ Correct
.header-botoes {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
  margin-bottom: 8px;   // ← cancels po-input's internal 8px error-space
}

.header-filtros {
  display: flex;
  align-items: flex-end;
  gap: 8px;

  po-button { margin-bottom: 8px; }  // ← same fix for buttons inside the filtros row
}
```

**Measurement verification (Playwright):**
```javascript
// All three values must be equal
const input  = document.querySelector('.header-filtros input').getBoundingClientRect();
const btnCar = document.querySelector('.header-filtros po-button button').getBoundingClientRect();
const btnAct = document.querySelector('.header-botoes button').getBoundingClientRect();
// input.top === btnCar.top === btnAct.top  →  diff must be 0
```

---

## 3. po-table horizontal scroll in side-by-side panels

**Symptom:** When two `po-table` components are placed side by side (flex:1 each),
each table generates a horizontal scrollbar even though the specified `p-width` values
seem reasonable.

**Root cause:** po-table adds an internal selectable-column (`po-table-column-selectable`)
of **56px** that is NOT represented in `PoTableColumn[]`. This hidden 56px is added on
top of the sum of all `p-width` values, pushing the table wider than its container.

**Fix (two steps):**

**Step 1 — Reduce the internal checkbox column via `::ng-deep`:**
```scss
.browse-panel {
  ::ng-deep .po-table-column-selectable {
    width: 41px !important;
    min-width: 41px !important;
    max-width: 41px !important;
  }
}
```

**Step 2 — Calculate `p-width` values so that their sum + checkbox = panel width:**
```
panel_width = (viewport - sidebar - page_padding - inter_panel_gap) / 2
data_budget = panel_width - 41px (checkbox after override)

Typical at 1366px viewport:
  (1366 - 280 - 32 - 4) / 2 = ~520px per panel
  data_budget = 520 - 41 = 479px
```

**Step 3 — Use gap: 4px (not 8px) between panels** to maximize panel width:
```scss
.div-browses {
  display: flex;
  gap: 4px;   // not 8px — each px saved goes to column space
}
```

**Column width reference at 11px font (8px cell padding per side):**
| Content | Example | Minimum width |
|---|---|---|
| Date | "10/01/2025" | 84px |
| Currency | "3.200,00" | 68px |
| Short code 5 chars | "NF001" | 50px |
| Medium code 6 chars | "PED001" | 58px |
| Status dot | ● | 28px |
| 3-digit number | "001" | 36px |

---

## 4. po-table `p-maxlength` binding name

**Symptom:** Angular compilation error: `NG8002: Can't bind to 'p-max-length' since it isn't a known property of 'po-input'`.

**Root cause:** The correct Angular input alias is `p-maxlength` (no hyphen between `max` and `length`).

```html
<!-- ✓ Correct -->
<po-input [p-maxlength]="3" ...></po-input>

<!-- ✗ Wrong — causes NG8002 -->
<po-input [p-max-length]="3" ...></po-input>
```

---

## 5. Dynamic table height (no page scroll)

**Pattern:** Use a `computed` signal that reacts to window resize to keep the `po-table`
height filling the viewport without a page-level scrollbar.

```typescript
import { AfterViewInit, HostListener, computed, signal } from '@angular/core';

// In component class:
private readonly _winH = signal(window.innerHeight);

// OFFSET = sum of all fixed-height elements outside the table:
//   PO shell (toolbar + page title + content padding): ~232px
//   Component-specific header (filters, buttons): ~80px
//   Browse title bar: ~30px
//   Legend bar: ~32px
//   Totals footer: ~50px
//   Total example: ~424px
readonly tableHeight = computed(() => Math.max(200, this._winH() - 424));

ngAfterViewInit(): void {
  this._winH.set(window.innerHeight);
}

@HostListener('window:resize')
onResize(): void {
  this._winH.set(window.innerHeight);
}
```

```html
<po-table [p-height]="tableHeight()" ...></po-table>
```

**For two-panel browses with a conditional contextual bar:**
```typescript
// Increase offset by contextual bar height (~36px) when it's visible
readonly browseHeight = computed(() =>
  Math.max(180, this._winH() - (this.selectedRow() ? 460 : 424))
);
```

**Calibration:** After implementing, verify with Playwright:
```javascript
const scrollH = await page.evaluate(() => document.documentElement.scrollHeight);
const innerH  = 768; // your test viewport height
// scrollH must equal innerH (no page scroll)
```

---

## 6. po-table selection: no `p-selected-rows` output

**Symptom:** No TypeScript error but the selection never fires / rows never accumulate.

**Root cause:** `p-selected-rows` is not an output of `po-table`. The correct outputs for
row selection are individual-row events, not a batch-selection array.

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

---

## 7. po-table frozen columns and `[p-selectable-entire-line]`

When `[p-selectable]="true"` is used, po-table adds a checkbox column that makes every
column frozen (`po-frozen-column` class on all `<th>` elements). This is expected behavior.

To restrict selection to the checkbox only (not clicking anywhere on the row):
```html
<po-table
  [p-selectable]="true"
  [p-selectable-entire-line]="false"
  ...>
</po-table>
```

This is essential for two-panel browse screens where accidental row selection
while reading data would be disruptive.

---

## 8. po-table: programmatic `$selected: false` does not cancel a just-committed selection

**Symptom:** When `(p-selected)` fires and you want to reject the selection (e.g., guard
validation failed), setting `$selected: false` on the item synchronously has no effect.
The row stays visually selected, and clicking it again fires `(p-selected)` instead of
`(p-unselected)`, so the warning message fires a second time.

**Root cause:** po-table adds the row to its internal `selectedRows` array **before**
dispatching the `(p-selected)` event. Any synchronous `$selected: false` change on the
items signal is processed in the same change-detection cycle — but po-table's internal
state already has the row, so the visual state stays selected even though the data says
`$selected: false`. This desync causes a second `(p-selected)` on the next click instead
of `(p-unselected)`.

**Fix:** Defer the items array replacement to `setTimeout(0)`. This lets the current
event cycle complete, then replaces the items array in the next microtask. po-table's
`ngOnChanges` receives the new array and reinitializes its selection from `$selected`,
correctly showing the row as unselected.

```typescript
// ✗ Wrong — $selected: false is ignored; po-table already committed the selection
onSelectRec(item: SomeModel): void {
  if (!this.isValidSelection(item)) {
    this.notification.warning('Cannot select this row.');
    this.items.update(rows => rows.map(r =>
      r.id === item.id ? { ...r, $selected: false } : r
    ));
    this.cdr.markForCheck();
    return;
  }
}

// ✓ Correct — deferred replacement forces po-table to reinitialize selection
private rejectSelection(itemId: string): void {
  setTimeout(() => {
    // Rebuild the array restoring only the previously confirmed selection
    this.items.update(rows => rows.map(r => ({
      ...r,
      $selected: r.id === this.confirmedItem()?.id,
    })));
    this.cdr.markForCheck();
  }, 0);
}

onSelectRec(item: SomeModel): void {
  if (!this.isValidSelection(item)) {
    this.notification.warning('Cannot select this row.');
    this.rejectSelection(item.id);
    return;
  }
}
```

**Note:** The `setTimeout(0)` causes a ~1-frame visual flash where the row appears
selected before reverting. This is imperceptible in practice but unavoidable with the
current PO-UI `(p-selected)` API.

---

## 9. po-table: keyboard row navigation (ArrowUp / ArrowDown)

**Context:** po-table has no built-in keyboard navigation. Protheus users expect arrow-key
navigation between rows (like the native Protheus grid). When a browse acts as a master
that loads detail data on row change, this is especially important.

**Pattern — three-part implementation:**

### Part 1 — State
```typescript
readonly cursorIndex = signal<number>(0);
```

### Part 2 — Keyboard listener + cursor movement
```typescript
@HostListener('window:keydown', ['$event'])
onKeyDown(event: KeyboardEvent): void {
  // Do not capture arrows while user is typing in inputs
  const tag = (event.target as HTMLElement)?.tagName?.toLowerCase();
  if (tag === 'input' || tag === 'textarea') return;

  if      (event.key === 'ArrowDown') { event.preventDefault(); this._moverCursor(1);  }
  else if (event.key === 'ArrowUp')   { event.preventDefault(); this._moverCursor(-1); }
  else return;

  // Re-apply highlight after PO-UI may reset the DOM
  setTimeout(() => this._highlightActiveRow(), 0);
}

private _moverCursor(delta: number): void {
  const items   = this.items();           // replace with your items signal
  if (!items.length) return;
  const current = this.cursorIndex();
  const next    = current < 0 ? 0 : Math.max(0, Math.min(items.length - 1, current + delta));
  if (next === current && current >= 0) return;
  this.cursorIndex.set(next);
  this._onRowActivated(items[next]);      // replace with your row-activation method
}
```

### Part 3 — DOM highlight + scroll (manual, because CSS `:focus` does not reach table rows)

> **⚠️ Never use `row.scrollIntoView({ block: 'nearest' })`** — it does not account for the
> sticky `thead`. When navigating to row 0 (or any row near the top), the row becomes hidden
> behind the fixed header. Use the manual scroll calculation below instead.

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

// Walks up the DOM from the active row to find the real scrollable ancestor.
// Does NOT depend on any PO-UI internal class name — works across all versions.
//
// Two critical rules:
// 1. Use setTimeout(..., 50) — NOT 0ms. At 0ms the DOM is not yet updated
//    by PO-UI's change detection, so getBoundingClientRect() returns stale values
//    and the scroll calculation is wrong.
// 2. Never use scrollIntoView({ block: 'nearest' }): it does not discount the
//    sticky thead, so row 0 ends up hidden behind the fixed header.
private _scrollRowIntoView(row: HTMLElement): void {
  // Walk up from the row to find the first truly scrollable ancestor
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

### Part 4 — SCSS
```scss
/* Wrapper around the po-table (e.g. <div class="my-browse-container">) */
.my-browse-container ::ng-deep tbody tr.row-ativa td {
  background-color: var(--color-brand-01-lighter, #cce5ff) !important;
}

.my-browse-container ::ng-deep tbody tr td {
  cursor: pointer;
}
```

### Part 5 — Wiring click + init
```typescript
// In the (p-selected) handler:
onRowSelected(row: MyModel): void {
  const idx = this.items().findIndex(i => i.id === row.id);
  this.cursorIndex.set(idx);
  this._onRowActivated(row);
  setTimeout(() => this._highlightActiveRow(), 0);
}

// In ngOnInit — auto-select first row:
ngOnInit(): void {
  this.loadData();   // sets items signal
  this.cursorIndex.set(0);
  if (this.items().length) this._onRowActivated(this.items()[0]);
  setTimeout(() => this._highlightActiveRow(), 0);
}
```

**Important notes:**
- Use `setTimeout(..., 50)` — NOT `0ms`. At 0ms, PO-UI's change detection has not completed and `getBoundingClientRect()` returns stale values. 50ms matches the pattern used in production Divergências screens.
- The `input/textarea` guard prevents arrow keys from triggering navigation while the user types in filter fields.
- Works for standard `po-table` (all rows are `<tr>` inside a single `<tbody>`). For tables with `p-detail` (expandable rows), each item renders as its own `<tbody>` — use `querySelectorAll(':scope > tbody')` on the `<table>` element instead.
- To hide PO-UI's checkbox column when using `p-selectable` purely for click events:
```scss
.my-browse-container ::ng-deep thead th:first-child,
.my-browse-container ::ng-deep tbody td:first-child {
  display: none !important;
  width: 0 !important;
  padding: 0 !important;
}
```

---

## 10. Dual-browse keyboard navigation (master → detail)

When a screen has **two stacked po-table components** where the top one (master) drives the bottom one (detail), both need independent keyboard navigation. Use `activeBrowse` to route arrow keys, **Tab** to switch between browses.

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

### Click handlers — switching browse focus
```typescript
onMasterClick(): void { this.activeBrowse.set('master'); }

onDetailClick(): void {
  this.activeBrowse.set('detail');
  if (this.cursorDetail() < 0 && this.detailItems().length) {
    this.cursorDetail.set(0);
    setTimeout(() => this._highlightDetailRow(), 50);
  }
}
```

### Reset detail cursor when master changes row
```typescript
onMasterRowSelected(row: MasterModel): void {
  const idx = this.masterItems().findIndex(i => i.id === row.id);
  this.cursorMaster.set(idx);
  this.cursorDetail.set(-1);       // ← reset detail on every master change
  this.activeBrowse.set('master');
  this.loadDetailItems(row.id);
  setTimeout(() => this._highlightMasterRow(), 50);
}
```

### Template — wrappers with click and active-browse indicator
```html
<!-- MASTER browse -->
<div class="master-browse" [class.browse-ativo]="activeBrowse() === 'master'" (click)="onMasterClick()">
  <po-table [p-columns]="masterCols" [p-items]="masterItems()" [p-selectable]="true"
    [p-selectable-entire-line]="true" [p-hide-columns-manager]="true" [p-height]="masterHeight()"
    (p-selected)="onMasterRowSelected($event)">
  </po-table>
</div>

<!-- DETAIL browse -->
<div class="detail-browse" [class.browse-ativo]="activeBrowse() === 'detail'" (click)="onDetailClick()">
  <po-table [p-columns]="detailCols" [p-items]="detailItems()" [p-selectable]="true"
    [p-hide-columns-manager]="true" [p-height]="detailHeight()"
    (p-selected)="onDetailRowSelected($event)">
  </po-table>
</div>
```

### SCSS — compact rows + active-browse outline + row highlight (same for both)
```scss
:host { display: block; font-size: 12px; }

.master-browse, .detail-browse {
  ::ng-deep tbody td             { padding-top: 4px !important; padding-bottom: 4px !important; }
  ::ng-deep .po-table-body-ellipsis   { font-size: 11px; }
  ::ng-deep .po-table-header-ellipsis { font-size: 11px; }
  ::ng-deep .row-ativa td        { background-color: #dbeafe !important; }
  ::ng-deep tbody tr td          { cursor: pointer; }
}

/* Blue outline shows which browse receives keyboard input */
.browse-ativo ::ng-deep .po-table-container {
  outline: 2px solid var(--color-action-default, #0079c3);
  outline-offset: -2px;
}

/* Master: hide PO-UI checkbox when using p-selectable for click-only */
.master-browse {
  ::ng-deep thead th:first-child,
  ::ng-deep tbody td:first-child { display: none !important; width: 0 !important; padding: 0 !important; }
}
```

### Hint in the browse header
Show a hint so the user knows how to switch and navigate:
```html
<span class="browse-count">Tab para alternar browse &nbsp;·&nbsp; ↑↓ para navegar</span>
```

---

## 11. PoTableDetail — `width` property not supported (TS2353)

**Symptom:** TypeScript compiler throws `TS2353: Object literal may only specify known properties, and 'width' does not exist in type 'PoTableDetailColumn'` when defining columns inside `buildDetailConfig()`.

**Root cause:** `PoTableDetail.columns` uses the internal type `PoTableDetailColumn`, which is a subset of `PoTableColumn` and does **not** include `width`. The `width` property is only valid on master columns (`PoTableColumn[]`), not on detail columns.

**Fix:** Remove all `width` properties from detail columns. Only `property`, `label`, `type`, and `format` are supported.

```typescript
// WRONG — causes TS2353
private buildDetailConfig(): PoTableDetail {
  return {
    columns: [
      { property: 'quantidade', label: 'Qtde', type: 'number', width: '8%' }, // ❌ TS2353
    ],
  };
}

// RIGHT — no width on detail columns
private buildDetailConfig(): PoTableDetail {
  return {
    columns: [
      { property: 'quantidade', label: 'Qtde', type: 'number', format: '1.4-4' }, // ✓
    ],
  };
}
```

---

## 12. po-table invisible on first load in OnPush components (MANDATORY `[p-height]`)

**Symptom:** `po-table` renders correctly in the DOM but is invisible when the page is first
navigated to. It only becomes visible after the user moves the mouse or triggers any event.
The bug is most noticeable when the table is inside an `@if` block.

**Root cause (verified against PO-UI source):**

`po-table` initialises `tableOpacity = 0`. There are two paths to `setTableOpacity(1)`:

| Path | Triggered by | Timing |
|---|---|---|
| `verifyCalculateHeightTableContainer()` → `calculateHeightTableContainer()` → `setTableOpacity(1)` | `[p-height]` is set | **Synchronous** — runs inside `ngDoCheck`, same CD cycle |
| `debounceResize()` → `setTimeout(() => setTableOpacity(1))` | `offsetWidth > 0` detected in `ngDoCheck` without `[p-height]` | **Asynchronous** — `setTimeout` fires after current CD cycle |

With `ChangeDetectionStrategy.OnPush`, the host component is already marked "clean" after the
first CD cycle. When the async `setTimeout` fires and calls `setTableOpacity(1)`, Angular does
not re-check the OnPush component, so the table stays invisible until a future event (mouse
move, click) triggers the next CD cycle.

**Fix: always set `[p-height]` on every `po-table` in OnPush components.**

```html
<!-- ✗ Wrong — invisible on first load in OnPush; opacity set asynchronously -->
<po-table [p-columns]="cols" [p-items]="items()"></po-table>

<!-- ✓ Correct — opacity set synchronously in ngDoCheck via verifyCalculateHeightTableContainer -->
<po-table [p-columns]="cols" [p-items]="items()" [p-height]="340"></po-table>
```

For dynamic height (fills viewport), use a `computed` signal (see Quirk 5):
```html
<po-table [p-columns]="cols" [p-items]="items()" [p-height]="tableHeight()"></po-table>
```

**Rule:** Every `po-table` generated in a `ChangeDetectionStrategy.OnPush` component MUST
have `[p-height]` set. No exceptions. A table inside an `@if` block is especially vulnerable.

---

## 13. po-dynamic-form: `(p-value-change)` does not exist

**Symptom:** Binding `(p-value-change)="myHandler($event)"` on `po-dynamic-form` compiles
without errors but the handler is never called, regardless of what the user types.

**Root cause (verified against PO-UI source):**

`PoDynamicFormBaseComponent` declares only one `@Output`:
```typescript
outputs: { formOutput: "p-form" }
```

There is no `p-value-change` output. Angular silently ignores unknown event bindings on
custom elements, so there is no compilation error and no runtime warning — the handler
simply never fires.

**Fix: use `(p-form)` to receive the `NgForm` instance, then subscribe to `form.valueChanges`.**

```typescript
import { OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';

export class MyComponent implements OnDestroy {
  headerValues: Record<string, unknown> = { adm: '46', band: 'VISA', txFixa: 1.5 };

  private formSub: Subscription | null = null;
  private _lastTx = 1.5;   // track last value to avoid recalculating on every other-field change

  // (p-form) fires once after NgForm is initialised (inside a setTimeout in PO-UI source)
  onFormInit(form: any): void {
    if (!form?.valueChanges) return;
    this.formSub?.unsubscribe();
    this.formSub = form.valueChanges.subscribe((val: Record<string, unknown>) => {
      this.headerValues = { ...val };            // keep all fields in sync
      const tx = Number(val['myNumberField'] ?? 0);
      if (tx > 0 && tx !== this._lastTx) {
        this._lastTx = tx;
        this.doSomethingWhenFieldChanges(tx);    // e.g. recalculate a derived signal
      }
    });
  }

  ngOnDestroy(): void {
    this.formSub?.unsubscribe();
  }
}
```

```html
<!-- ✗ Wrong — (p-value-change) does not exist; handler is never called -->
<po-dynamic-form [p-fields]="fields" [p-value]="vals" (p-value-change)="onChange($event)">
</po-dynamic-form>

<!-- ✓ Correct — (p-form) is the only reactive output; subscribe to form.valueChanges -->
<po-dynamic-form [p-fields]="fields" [p-value]="headerValues" (p-form)="onFormInit($event)">
</po-dynamic-form>
```

**Notes:**
- `form.valueChanges` fires on **every keystroke** for `po-decimal` / `po-number` fields
  (via `ControlValueAccessor.onChange` in `onInput`), and on **blur** for text fields.
- `[(p-value)]` two-way binding silently fails for the same reason — there is no
  `p-value-change` output for Angular to wire the write-back. Use `[p-value]` (one-way)
  for initialisation and update `headerValues` manually inside `onFormInit`.
- The `NgForm` instance is emitted inside a `setTimeout` in PO-UI's source, so `onFormInit`
  will always be called asynchronously, after the first CD cycle completes.
```

---

## 14. PO-UI @Input() does not auto-unwrap Angular signals (discovered 2026-06-25)

**Symptom:** Binding a `computed<T>()` signal directly to a PO-UI `@Input()` causes the
component to render `[object Object]` or crash with `Cannot read properties of undefined`.

```html
<!-- ✗ WRONG — passes the Signal function object, not its value -->
<po-page-edit [p-breadcrumb]="breadcrumb">
```

**Root cause:** Angular's signal auto-unwrapping only works in **Angular-owned template
contexts** (built-in directives, Angular's own components with the same signal runtime).
PO-UI components read `@Input()` values imperatively via `this.breadcrumb.items` inside
their own lifecycle hooks — they receive whatever value was passed in, including the Signal
function object itself if `()` was omitted.

**Fix:** Always call signals explicitly when binding to PO-UI `@Input()`:

```html
<!-- ✓ CORRECT — passes the resolved PoBreadcrumb value -->
<po-page-edit [p-breadcrumb]="breadcrumb()">
<po-page-list [p-actions]="pageActions()">
<po-table    [p-items]="items()">
```

**Applies to:** ALL PO-UI component `@Input()` bindings when the source value is a
`signal<T>()` or `computed<T>()`. Angular built-in bindings (`*ngIf`, `[class]`, `@for`,
etc.) do auto-unwrap and do NOT need the `()`.

**Plugin rule (already enforced in all templates):** Every template binding to a PO-UI
component must use `signal()` with explicit `()`. Reviewer must flag any `[p-X]="signalProp"`
without `()` as a Critical finding.
