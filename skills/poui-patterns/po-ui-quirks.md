# PO-UI Known Quirks and Fixes

Documented behavior differences, internal implementation details, and CSS overrides
discovered through production use of PO-UI with Protheus. Apply these fixes proactively
when generating or reviewing code.

---

## 1. po-page-content blank on load (opacity timing)

**Symptom:** Page renders the title but the content area is invisible on first load.

**Root cause:** `po-page-default` sets `contentOpacity = 0` initially and transitions it to 1
via `setTimeout` in `ngAfterViewInit`. If no HTTP request is made in `ngOnInit`, the
`networkidle` event fires before the `setTimeout` runs, leaving content opacity at 0.

**Fix:** Always trigger at least one observable (e.g., load data) in `ngOnInit`, not in
`ngAfterViewInit` or lazily. A mock service with a small delay (≥500ms) is enough to
give `po-page-default` time to run its `setTimeout`.

```typescript
// ✓ Correct — triggers HTTP in ngOnInit, po-page-content has time to become visible
ngOnInit(): void {
  this.carregar();
}

carregar(): void {
  this.loading.set(true);
  this.service.getAll()
    .pipe(finalize(() => this.loading.set(false)))
    .subscribe({ next: data => this.items.set(data) });
}
```

```typescript
// ✗ Wrong — no HTTP call; page content stays invisible
ngOnInit(): void { }
// data loaded only on button click
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
