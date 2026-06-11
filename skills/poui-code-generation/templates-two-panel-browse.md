# Template: two-panel-browse

Generates a **side-by-side reconciliation screen** with two independent `po-table` panels.
The user selects one row from the left panel and one from the right, then confirms a
pairing action (card reconciliation, document matching, A/R conciliation).

Use cases: card reconciliation, accounts payable/receivable matching, document pairing.

> **Before using this template**, read the column-width rule in `templates-two-panel-browse-html.md` (Horizontal scroll prevention section). Failing to calculate widths will cause horizontal scroll on both browse panels.
> Use `stacked-browse` for vertically stacked master-detail tables with keyboard navigation.
> Use `master-detail` for inline expandable rows inside a single table.

---

## Key patterns

| Pattern | Implementation |
|---|---|
| Dynamic height (no page scroll) | `browseHeight = computed(() => Math.max(180, winH() - OFFSET))` |
| No horizontal scroll | Sum of all `p-width` values (including checkbox 41px) must equal panel width |
| Single-select per browse | On `(p-selected)`, clear previous selection via `items.update(...)` |
| Cross-browse validation | Left must be selected before right; validate in `(p-selected)` of right browse |
| Button alignment with po-input | `.header-botoes { margin-bottom: 8px }` — cancels po-input's internal 8px error-space |
| Checkbox column width | Override with `::ng-deep .po-table-column-selectable { width: 41px !important }` |
| Keyboard navigation | `@HostListener('window:keydown')` routes ArrowUp/Down to active panel; Tab switches panel |
| Scroll sync | `_scrollRowIntoView()` walks DOM for real scrollable ancestor; callers use `setTimeout(..., 50)` |
| Focus ring suppression | `::ng-deep *:focus, *:focus-visible { outline: none }` — prevents scroll artifact at browse edge |
| Active panel indicator | `border-top-color` on `.browse-titulo` — never `outline` on po-table-container |

---

## How to load sub-files

| What you are generating | File to load |
|---|---|
| `.component.ts` only | `templates-two-panel-browse-ts.md` |
| `.component.html` + `.component.scss` only | `templates-two-panel-browse-html.md` |
| Column width calculation | `templates-two-panel-browse-html.md` (contains width reference table) |
| Model interfaces | `templates-two-panel-browse-html.md` (contains model section) |
| All artifacts | Load both sub-files |
