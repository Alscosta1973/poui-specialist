# Template: stacked-browse

Generates a master-detail screen with **two stacked po-table components**:
- Top browse (master): user navigates rows with ArrowUp/Down; selecting a row loads its items in the detail browse below.
- Bottom browse (detail): shows items of the selected master row; supports multi-select via checkboxes.
- Tab key switches keyboard focus between the two browses.
- Compact filter bar with "Remover Filtro" always visible in the master header.

Use cases: SC5/SC6 (orders + items), invoice lines, stock entries, any ERP master-detail where both levels need independent keyboard navigation.

> Use `two-panel-browse` for side-by-side reconciliation/matching.
> Use `master-detail` for inline expandable rows (no separate detail browse needed).

---

## Key patterns

| Pattern | Implementation |
|---|---|
| Active browse indicator | `border-top-color` on `.browse-cabecalho` — never `outline` (outline creates a scroll artifact at the bottom edge of the browse) |
| Keyboard navigation | `@HostListener('window:keydown')` routes ArrowUp/Down to active browse; Tab switches browse |
| Scroll sync | `_scrollRowIntoView()` walks DOM to find real scrollable ancestor; callers use `setTimeout(..., 50)` NOT 0ms |
| No page scroll | `masterHeight` + `detailHeight` computed signals using `_winH() - OFFSET` |
| Focus ring suppression | `::ng-deep *:focus, ::ng-deep *:focus-visible { outline: none }` inside each browse container |
| Compact filter bar | `--font-size: 12px` CSS variable on `.filtros-bar` cascades to all PO-UI children |
| Remover Filtro | Always rendered + always red; cursor and underline-hover only when `isFiltrado()` is true |
| Demo data | `const DEMO_*` at top of component file; loaded in `error` callback of service call |

---

## How to load sub-files

| What you are generating | File to load |
|---|---|
| `.component.ts` only | `templates-stacked-browse-ts.md` |
| `.component.html` + `.component.scss` only | `templates-stacked-browse-html.md` |
| Model interfaces | `templates-stacked-browse-html.md` (contains model section) |
| All artifacts | Load both sub-files |
