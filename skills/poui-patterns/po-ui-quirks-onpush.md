# PO-UI Quirks — Família: OnPush / Change Detection

Comportamentos relacionados a `ChangeDetectionStrategy.OnPush`, sinais e ciclo de detecção de mudanças.
Carregar quando gerando componentes que usam `po-page-*`, `po-table` ou `po-chart` em modo OnPush.

| # | Componente | Sintoma | Fix resumido |
|---|---|---|---|
| 1 | po-page-content | Conteúdo invisível no load (OnPush + ng-content) | `ngAfterViewInit` + `setTimeout(() => cdr.detectChanges())` |
| 12 | po-table | Tabela invisível no primeiro load em OnPush | Sempre definir `[p-height]` — sem ele, opacity é async e OnPush não re-renderiza |
| 14 | PO-UI @Input() | Signal não é desembrulhada → `[object Object]` | Chamar sempre com `()`: `[p-items]="items()"` não `[p-items]="items"` |

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

## 12. po-table invisible on first load in OnPush components (MANDATORY `[p-height]`)

**Symptom:** `po-table` renders correctly in the DOM but is invisible when the page is first
navigated to. It only becomes visible after the user moves the mouse or triggers any event.
The bug is most noticeable when the table is inside an `@if` block.

**Root cause (verified against PO-UI source):**

`po-table` initialises `tableOpacity = 0`. Two paths to `setTableOpacity(1)`:

| Path | Triggered by | Timing |
|---|---|---|
| `verifyCalculateHeightTableContainer()` → `setTableOpacity(1)` | `[p-height]` definido | **Síncrono** — mesmo CD cycle |
| `debounceResize()` → `setTimeout(() => setTableOpacity(1))` | sem `[p-height]` | **Assíncrono** — após o CD cycle |

Com `OnPush`, o componente já está "clean" após o primeiro CD cycle. Quando o `setTimeout` assíncrono
dispara, Angular não re-checa o componente, então a tabela fica invisível.

**Fix: sempre definir `[p-height]` em todo `po-table` em componentes OnPush.**

```html
<!-- ✗ Wrong — invisible on first load in OnPush; opacity set asynchronously -->
<po-table [p-columns]="cols" [p-items]="items()"></po-table>

<!-- ✓ Correct — opacity set synchronously via verifyCalculateHeightTableContainer -->
<po-table [p-columns]="cols" [p-items]="items()" [p-height]="340"></po-table>
```

Para altura dinâmica (preenche o viewport), usar `computed` signal (ver Quirk #5 em `po-ui-quirks-table.md`):
```html
<po-table [p-columns]="cols" [p-items]="items()" [p-height]="tableHeight()"></po-table>
```

**Regra:** Todo `po-table` em componente `OnPush` DEVE ter `[p-height]`. Sem exceções.

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
their own lifecycle hooks — they receive the Signal function object itself if `()` was omitted.

**Fix:** Always call signals explicitly when binding to PO-UI `@Input()`:

```html
<!-- ✓ CORRECT — passes the resolved value -->
<po-page-edit [p-breadcrumb]="breadcrumb()">
<po-page-list [p-actions]="pageActions()">
<po-table    [p-items]="items()">
```

**Applies to:** ALL PO-UI component `@Input()` bindings when the source is a `signal<T>()` or
`computed<T>()`. Angular built-in bindings (`*ngIf`, `[class]`, `@for`) DO auto-unwrap and do NOT need `()`.

**Plugin rule:** Every template binding to a PO-UI component must use `signal()` with explicit `()`.
Reviewer must flag any `[p-X]="signalProp"` without `()` as Critical.
