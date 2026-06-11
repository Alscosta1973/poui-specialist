# Token Optimization — poui-specialist Skill Files — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce tokens consumed per typical code-generation session by 35-45% by compressing prose in medium files, adding Quick Reference headers to large reference files, and splitting the two largest templates into per-artifact sub-files.

**Architecture:** Three sequential waves — Wave 1 compresses in-place (no structural change, lowest risk), Wave 2 adds Quick Reference tables at the top of large reference files (additive, no removal), Wave 3 splits two template files and updates SKILL.md references. Each wave is independently testable and committable.

**Tech Stack:** Markdown, Angular 17+, PO-UI (poui-specialist plugin). No build step — changes are to documentation/template files only.

---

## Compression Rules Reference

These three rules are applied in every Wave 1 task. Read them once here; tasks below reference them by name only.

### Rule 1 — Remove ❌ Wrong code blocks

Remove code blocks whose only purpose is to show incorrect code. **Exception:** keep wrong blocks where the wrong symbol/API name *is* the information (the reader must know the wrong name to recognise it in existing code).

```
REMOVE — wrong block is redundant when surrounding prose already explains the error:
// ✗ Wrong — $selected: false is ignored
onSelectRec(item: SomeModel): void {
  ...items.update(rows => rows.map(r => ({ ...r, $selected: false }))); // 8 lines wasted
}

KEEP — the wrong name is the documentation:
<!-- ✗ Wrong — p-selected-rows does not exist -->
<po-table [p-selected-rows]="selectedRows" ...></po-table>
```

### Rule 2 — Root cause in 1-2 lines

Shorten multi-sentence Root cause paragraphs to one dense sentence. Preserve all technical specifics: px values, method names, API names, timing values.

```
BEFORE (3 sentences):
Root cause: po-input renders a wrapper that includes an invisible 8px space below
the visible input field, reserved for validation error messages. flex-end aligns to
the bottom of this wrapper (including the invisible 8px), not to the bottom of the
visible field.

AFTER (1 sentence):
Root cause: po-input wrapper reserves 8px below the visible field for error messages;
flex-end aligns to wrapper bottom, not visible input bottom.
```

### Rule 3 — Strip explanatory inline comments

Remove comments that restate what the surrounding code and text already express. Preserve comments that contain non-obvious values, timing constraints, or workaround reasons.

```
REMOVE — restates what the variable name says:
margin-bottom: 8px;   // ← cancels po-input's internal 8px error-space

KEEP — non-obvious timing constraint:
// Use setTimeout(..., 50) — NOT 0ms. At 0ms the DOM is not yet updated

KEEP — non-obvious workaround reason:
// Walks up from the row to find the first truly scrollable ancestor.
// Does NOT depend on any PO-UI internal class name — works across all versions.
```

---

## Wave 1 — In-place Compression (12 files, no structural change)

### Task 1: Compress poui-patterns prose files

**Files:**
- Modify: `skills/poui-patterns/reactive-forms.md` (382 → ~270 lines target)
- Modify: `skills/poui-patterns/module-structure.md` (295 → ~210 lines target)

- [ ] **Step 1: Apply compression rules to reactive-forms.md**

  Read the file. Apply the three rules:
  - Rule 1: Remove any `// ✗ Wrong` or `<!-- ✗ Wrong -->` blocks where the wrong code is redundant with the surrounding prose explanation.
  - Rule 2: Shorten Root cause / explanation paragraphs to 1-2 sentences each. The file has multiple `FormGroup` + validator examples with verbose introductory paragraphs.
  - Rule 3: Remove inline comments that explain what the code already says (e.g., `// creates a FormGroup` next to `this.fb.group({...})`). Preserve all comments on `validators`, `asyncValidators`, and timing.

  Target: eliminate ~100 lines while keeping all code blocks intact.

- [ ] **Step 2: Apply compression rules to module-structure.md**

  Read the file. Apply the three rules:
  - Rule 2 is the primary lever here — the file has explanatory paragraphs before each code block (folder structure, `app.config.ts`, `app.routes.ts`). Shorten each to 1 sentence max.
  - Rule 3: Remove comments like `// standard Angular standalone bootstrap` or `// required for HTTP` that restate import names.
  - Keep: `// NgModule vs Standalone — qual usar?` section header text (it's a decision guide, not a code comment).

  Target: eliminate ~80 lines.

- [ ] **Step 3: Verify line count reductions**

  ```bash
  wc -l skills/poui-patterns/reactive-forms.md skills/poui-patterns/module-structure.md
  ```
  Expected: both files shorter than before. If any file grew, recheck for accidentally duplicated sections.

- [ ] **Step 4: Commit**

  ```bash
  git add skills/poui-patterns/reactive-forms.md skills/poui-patterns/module-structure.md
  git commit -m "perf(skills): compress prose in reactive-forms and module-structure"
  ```

---

### Task 2: Compress poui-components files (part 1)

**Files:**
- Modify: `skills/poui-components/dynamic-form-fields.md` (329 → ~230 lines target)
- Modify: `skills/poui-components/dynamic-pages.md` (335 → ~235 lines target)
- Modify: `skills/poui-components/navigation-components.md` (295 → ~210 lines target)
- Modify: `skills/poui-components/feedback-components.md` (214 → ~155 lines target)

- [ ] **Step 1: Apply compression rules to dynamic-form-fields.md**

  Read the file. Primary lever is Rule 2 — component reference files have a Pattern: "Description paragraph + code block" repeated for each component. Shorten each description to 1 sentence. Apply Rule 3 to strip comments that restate input names already visible in the template.

- [ ] **Step 2: Apply compression rules to dynamic-pages.md**

  Same pattern as dynamic-form-fields.md. Focus on:
  - Rule 2: Shorten multi-sentence intro paragraphs for each `po-dynamic-*` component variant.
  - Rule 3: Strip `// po-dynamic-form in edit mode` style comments when the surrounding heading already says it.

- [ ] **Step 3: Apply compression rules to navigation-components.md**

  Read the file. Apply:
  - Rule 2: Shorten usage descriptions for `po-menu`, `po-breadcrumb`, `po-toolbar`, `po-stepper` variants.
  - Rule 3: Remove comments restating what the component selector name already communicates.

- [ ] **Step 4: Apply compression rules to feedback-components.md**

  Read the file. Apply all three rules. This file covers `po-notification`, `po-loading`, `po-modal`, `po-progress-bar` variants. Focus on Rule 2 for usage paragraphs.

- [ ] **Step 5: Verify line count reductions**

  ```bash
  wc -l skills/poui-components/dynamic-form-fields.md \
         skills/poui-components/dynamic-pages.md \
         skills/poui-components/navigation-components.md \
         skills/poui-components/feedback-components.md
  ```
  Expected: all four files shorter than original line counts listed above.

- [ ] **Step 6: Commit**

  ```bash
  git add skills/poui-components/dynamic-form-fields.md \
          skills/poui-components/dynamic-pages.md \
          skills/poui-components/navigation-components.md \
          skills/poui-components/feedback-components.md
  git commit -m "perf(skills): compress prose in dynamic-form-fields, dynamic-pages, navigation, feedback"
  ```

---

### Task 3: Compress template files (part 1)

**Files:**
- Modify: `skills/poui-code-generation/templates-master-detail.md` (332 → ~250 lines target)
- Modify: `skills/poui-code-generation/templates-stepper-form.md` (324 → ~240 lines target)
- Modify: `skills/poui-code-generation/templates-modal-crud.md` (305 → ~225 lines target)

- [ ] **Step 1: Apply compression rules to templates-master-detail.md**

  Read the file. Template files are mostly code blocks (can't compress those). Focus on:
  - Rule 2: Shorten any prose paragraphs between code sections.
  - Rule 3: Remove inline comments that explain what a variable name already says (e.g., `// master items`, `// detail columns`). Keep comments on `PoTableDetail` restrictions and timing values.
  - Rule 1: Remove any wrong-code examples that are redundant with prose.

- [ ] **Step 2: Apply compression rules to templates-stepper-form.md**

  Same approach. Focus on:
  - Rule 3: Strip step-description comments inside `po-stepper` HTML (e.g., `<!-- Step 1 — basic data -->` when the `p-label` already says it).
  - Rule 2: Shorten stepper-pattern explanation paragraphs to 1 sentence each.

- [ ] **Step 3: Apply compression rules to templates-modal-crud.md**

  Same approach. This template has the most mixed TS/HTML/modal pattern. Focus on:
  - Rule 3: Remove comments that restate HTML attribute names (e.g., `// opens the modal`, `// closes the modal`).
  - Rule 2: Shorten the "when to use this template" prose to 1 sentence (the SKILL.md already has the decision guide).

- [ ] **Step 4: Verify line count reductions**

  ```bash
  wc -l skills/poui-code-generation/templates-master-detail.md \
         skills/poui-code-generation/templates-stepper-form.md \
         skills/poui-code-generation/templates-modal-crud.md
  ```
  Expected: all three shorter than original counts.

- [ ] **Step 5: Commit**

  ```bash
  git add skills/poui-code-generation/templates-master-detail.md \
          skills/poui-code-generation/templates-stepper-form.md \
          skills/poui-code-generation/templates-modal-crud.md
  git commit -m "perf(skills): compress prose in master-detail, stepper-form, modal-crud templates"
  ```

---

### Task 4: Compress template files (part 2)

**Files:**
- Modify: `skills/poui-code-generation/templates-page-edit.md` (248 → ~185 lines target)
- Modify: `skills/poui-code-generation/templates-page-detail.md` (223 → ~165 lines target)
- Modify: `skills/poui-code-generation/templates-page-dynamic-search.md` (218 → ~160 lines target)

- [ ] **Step 1: Apply compression rules to templates-page-edit.md**

  Read the file. Apply all three rules. Rule 3 is the primary lever for all three files — form template HTML has many explanatory comments.

- [ ] **Step 2: Apply compression rules to templates-page-detail.md**

  Read the file. Apply all three rules. This file uses `po-dynamic-view` — keep comments on field type mappings (they are non-obvious). Remove comments that describe what `po-page-detail` action buttons do when the button label already says it.

- [ ] **Step 3: Apply compression rules to templates-page-dynamic-search.md**

  Read the file. Apply all three rules. Focus on Rule 3: the dynamic search template has many inline comments describing the Protheus disclaimer block. Shorten to one comment per block section, not one per line.

- [ ] **Step 4: Verify line count reductions**

  ```bash
  wc -l skills/poui-code-generation/templates-page-edit.md \
         skills/poui-code-generation/templates-page-detail.md \
         skills/poui-code-generation/templates-page-dynamic-search.md
  ```

- [ ] **Step 5: Commit**

  ```bash
  git add skills/poui-code-generation/templates-page-edit.md \
          skills/poui-code-generation/templates-page-detail.md \
          skills/poui-code-generation/templates-page-dynamic-search.md
  git commit -m "perf(skills): compress prose in page-edit, page-detail, page-dynamic-search templates"
  ```

---

## Wave 2 — Dense Header (2 files, additive — no content removed)

### Task 5: Add Quick Reference to po-ui-quirks.md

**Files:**
- Modify: `skills/poui-patterns/po-ui-quirks.md` (599 lines — content unchanged, 15 lines added at top)

- [ ] **Step 1: Prepend Quick Reference table**

  Open `skills/poui-patterns/po-ui-quirks.md`. Insert the following block **after line 6** (after the intro paragraph, before the first `---` separator):

  ```markdown
  ## Quick Reference — 11 Known Quirks

  | # | Component / API | Symptom | Fix |
  |---|---|---|---|
  | 1 | po-page-content | Content invisible on load | Trigger HTTP observable in `ngOnInit`, not `ngAfterViewInit` |
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

  ---
  ```

  The existing content starting at line 7 (`## 1. po-page-content...`) remains completely unchanged.

- [ ] **Step 2: Verify structure is correct**

  ```bash
  head -25 skills/poui-patterns/po-ui-quirks.md
  ```
  Expected: frontmatter (lines 1-6), then Quick Reference table, then `---`, then `## 1. po-page-content...`

- [ ] **Step 3: Verify line count increased by ~15**

  ```bash
  wc -l skills/poui-patterns/po-ui-quirks.md
  ```
  Expected: ~614 lines (original 599 + 15 for the table).

- [ ] **Step 4: Commit**

  ```bash
  git add skills/poui-patterns/po-ui-quirks.md
  git commit -m "perf(skills): add Quick Reference table to po-ui-quirks"
  ```

---

### Task 6: Add Quick Reference to form-fields.md

**Files:**
- Modify: `skills/poui-components/form-fields.md` (445 lines — content unchanged, ~18 lines added at top)

- [ ] **Step 1: Prepend Quick Reference table**

  Open `skills/poui-components/form-fields.md`. Insert the following block after the opening frontmatter / title line, before the first section:

  ```markdown
  ## Quick Reference — Form Field Components

  | Component | Key inputs | Critical notes |
  |---|---|---|
  | `po-input` | `p-label`, `p-maxlength`, `p-placeholder` | Use `p-maxlength` — not `p-max-length` (causes NG8002) |
  | `po-number` | `p-label`, `p-min`, `p-max`, `p-step` | Set `p-min`/`p-max` for business rule enforcement |
  | `po-decimal` | `p-label`, `p-decimals-length` | Default 2 decimal places |
  | `po-select` | `p-label`, `p-options`, `p-required` | Options: `PoSelectOption[]` — `{ label, value }` |
  | `po-combo` | `p-label`, `p-options`, `p-filter-service` | Use filter service for server-side search |
  | `po-lookup` | `p-label`, `p-filter-service`, `p-columns`, `p-field-value`, `p-field-label` | Requires `PoLookupFilterService` implementation |
  | `po-datepicker` | `p-label`, `p-min-date`, `p-max-date`, `p-format` | Default format `dd/MM/yyyy` |
  | `po-switch` | `p-label`, `p-true-value`, `p-false-value` | Boolean by default |
  | `po-checkbox-group` | `p-label`, `p-checkboxes` | Options: `PoCheckboxGroupItem[]` |
  | `po-radio-group` | `p-label`, `p-options` | Options: `PoRadioGroupOption[]` |
  | `po-multiselect` | `p-label`, `p-options`, `p-filter-mode` | Returns `string[]` |
  | `po-textarea` | `p-label`, `p-rows`, `p-maxlength` | Import `PoFieldModule`, **not** `PoTextareaModule` |
  | `po-upload` | `p-url`, `p-multiple`, `p-auto-upload` | Returns `PoUploadFile[]` |

  ---
  ```

- [ ] **Step 2: Verify structure is correct**

  ```bash
  head -25 skills/poui-components/form-fields.md
  ```
  Expected: title/frontmatter, then Quick Reference table, then `---`, then `## Common Inputs (all fields)`.

- [ ] **Step 3: Verify line count**

  ```bash
  wc -l skills/poui-components/form-fields.md
  ```
  Expected: ~463 lines (original 445 + ~18 for the table).

- [ ] **Step 4: Commit**

  ```bash
  git add skills/poui-components/form-fields.md
  git commit -m "perf(skills): add Quick Reference table to form-fields"
  ```

---

## Wave 3 — Template Split (2 templates → 6 files + SKILL.md update)

### Task 7: Split stacked-browse template

**Files:**
- Modify: `skills/poui-code-generation/templates-stacked-browse.md` (698 → ~35 lines — becomes index)
- Create: `skills/poui-code-generation/templates-stacked-browse-ts.md` (~375 lines — TS only)
- Create: `skills/poui-code-generation/templates-stacked-browse-html.md` (~305 lines — HTML + SCSS + model + calibration + placeholders)

The split point is the `## {{kebab-name}}.component.html` heading. Everything from `## {{kebab-name}}.component.ts` up to (but not including) that heading goes to `-ts.md`; everything from `## {{kebab-name}}.component.html` to end of file goes to `-html.md`.

- [ ] **Step 1: Create templates-stacked-browse-ts.md**

  Create `skills/poui-code-generation/templates-stacked-browse-ts.md` with the content of the current `templates-stacked-browse.md` starting from the `## {{kebab-name}}.component.ts` heading and ending just before the `## {{kebab-name}}.component.html` heading.

  Add this frontmatter at the very top (before the `## {{kebab-name}}.component.ts` heading):
  ```markdown
  # Template: stacked-browse — TypeScript component

  > Sub-file of `templates-stacked-browse.md`. Load this file when generating `.component.ts`.
  > Load `templates-stacked-browse-html.md` for `.component.html` and `.component.scss`.

  ---
  ```

- [ ] **Step 2: Create templates-stacked-browse-html.md**

  Create `skills/poui-code-generation/templates-stacked-browse-html.md` with the content of the current `templates-stacked-browse.md` starting from the `## {{kebab-name}}.component.html` heading to end of file (includes SCSS, model interfaces, height offset calibration, and placeholder reference).

  Add this frontmatter at the very top:
  ```markdown
  # Template: stacked-browse — HTML, SCSS, model

  > Sub-file of `templates-stacked-browse.md`. Load this file when generating `.component.html`, `.component.scss`, or the model interface.
  > Load `templates-stacked-browse-ts.md` for `.component.ts`.

  ---
  ```

- [ ] **Step 3: Rewrite templates-stacked-browse.md as index**

  Replace the entire content of `templates-stacked-browse.md` with the following (lines 1–30 of the original file, which contain use-case description and key-patterns table, plus load instructions):

  ```markdown
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
  ```

- [ ] **Step 4: Verify file sizes**

  ```bash
  wc -l skills/poui-code-generation/templates-stacked-browse.md \
         skills/poui-code-generation/templates-stacked-browse-ts.md \
         skills/poui-code-generation/templates-stacked-browse-html.md
  ```
  Expected: index ~35 lines, `-ts.md` ~375 lines, `-html.md` ~305 lines. Sum should equal approximately original 698 + ~17 (added frontmatter lines).

- [ ] **Step 5: Commit**

  ```bash
  git add skills/poui-code-generation/templates-stacked-browse.md \
          skills/poui-code-generation/templates-stacked-browse-ts.md \
          skills/poui-code-generation/templates-stacked-browse-html.md
  git commit -m "perf(skills): split stacked-browse template into index + ts + html sub-files"
  ```

---

### Task 8: Split two-panel-browse template

**Files:**
- Modify: `skills/poui-code-generation/templates-two-panel-browse.md` (797 → ~35 lines — becomes index)
- Create: `skills/poui-code-generation/templates-two-panel-browse-ts.md` (~355 lines — TS only)
- Create: `skills/poui-code-generation/templates-two-panel-browse-html.md` (~425 lines — HTML + SCSS + column calculation + model)

The split point is the `## {{kebab-name}}.component.html` heading. Everything from `## {{kebab-name}}.component.ts` up to (but not including) that heading goes to `-ts.md`; everything from `## {{kebab-name}}.component.html` to end of file goes to `-html.md`.

- [ ] **Step 1: Create templates-two-panel-browse-ts.md**

  Create `skills/poui-code-generation/templates-two-panel-browse-ts.md` with the content of the current `templates-two-panel-browse.md` starting from the `## {{kebab-name}}.component.ts` heading and ending just before the `## {{kebab-name}}.component.html` heading.

  Add this frontmatter at the very top:
  ```markdown
  # Template: two-panel-browse — TypeScript component

  > Sub-file of `templates-two-panel-browse.md`. Load this file when generating `.component.ts`.
  > Load `templates-two-panel-browse-html.md` for `.component.html` and `.component.scss`.

  ---
  ```

- [ ] **Step 2: Create templates-two-panel-browse-html.md**

  Create `skills/poui-code-generation/templates-two-panel-browse-html.md` with the content of the current `templates-two-panel-browse.md` starting from the `## {{kebab-name}}.component.html` heading to end of file (includes SCSS, `## Horizontal scroll prevention — column width calculation` table, and model interfaces).

  Add this frontmatter at the very top:
  ```markdown
  # Template: two-panel-browse — HTML, SCSS, model

  > Sub-file of `templates-two-panel-browse.md`. Load this file when generating `.component.html`, `.component.scss`, or model interfaces.
  > Load `templates-two-panel-browse-ts.md` for `.component.ts`.

  ---
  ```

- [ ] **Step 3: Rewrite templates-two-panel-browse.md as index**

  Read lines 1–29 of the current file (use-case description and key-patterns table). Replace the entire file with that content plus load instructions:

  ```markdown
  # Template: two-panel-browse

  Generates a **side-by-side reconciliation screen** with two independent `po-table` panels.
  The user selects one row from the left panel and one from the right, then confirms a
  pairing action (card reconciliation, document matching, A/R conciliation).

  > Use `stacked-browse` for vertically stacked master-detail tables with keyboard navigation.
  > Use `master-detail` for inline expandable rows inside a single table.

  ---

  ## Key patterns

  [Keep the existing Key patterns table from lines 13-29 of the original file verbatim]

  ---

  ## How to load sub-files

  | What you are generating | File to load |
  |---|---|
  | `.component.ts` only | `templates-two-panel-browse-ts.md` |
  | `.component.html` + `.component.scss` only | `templates-two-panel-browse-html.md` |
  | Column width calculation | `templates-two-panel-browse-html.md` (contains width reference table) |
  | Model interfaces | `templates-two-panel-browse-html.md` (contains model section) |
  | All artifacts | Load both sub-files |
  ```

  **Important:** Copy the `## Key patterns` table verbatim from the original file — do not paraphrase. The table has 10 rows covering: dynamic height, horizontal scroll prevention, single-select per browse, cross-browse validation, button alignment with po-input, checkbox column width, keyboard navigation, scroll sync, focus ring suppression, and active panel indicator.

- [ ] **Step 4: Verify file sizes**

  ```bash
  wc -l skills/poui-code-generation/templates-two-panel-browse.md \
         skills/poui-code-generation/templates-two-panel-browse-ts.md \
         skills/poui-code-generation/templates-two-panel-browse-html.md
  ```
  Expected: index ~35 lines, `-ts.md` ~355 lines, `-html.md` ~425 lines. Sum ~original 797 + ~17 (added frontmatter).

- [ ] **Step 5: Commit**

  ```bash
  git add skills/poui-code-generation/templates-two-panel-browse.md \
          skills/poui-code-generation/templates-two-panel-browse-ts.md \
          skills/poui-code-generation/templates-two-panel-browse-html.md
  git commit -m "perf(skills): split two-panel-browse template into index + ts + html sub-files"
  ```

---

### Task 9: Update SKILL.md to reference split files

**Files:**
- Modify: `skills/poui-code-generation/SKILL.md` (194 lines — update 2 table entries)

The `## Templates` table in SKILL.md has entries for `stacked-browse` and `two-panel-browse`. Their `File` column must be updated to reflect the new index file and the existence of sub-files.

- [ ] **Step 1: Update stacked-browse entry in SKILL.md**

  Find the stacked-browse row in the `### ERP master-detail / dual-browse pages` table:

  Current:
  ```markdown
  | **stacked-browse** | `templates-stacked-browse.md` | Two vertically stacked po-tables... |
  ```

  Replace the `File` cell value with:
  ```markdown
  | **stacked-browse** | `templates-stacked-browse.md` (index) + `-ts.md` + `-html.md` | Two vertically stacked po-tables... |
  ```

  The description text in the third column remains unchanged.

- [ ] **Step 2: Update two-panel-browse entry in SKILL.md**

  Find the two-panel-browse row in the `### Reconciliation / matching pages` table:

  Current:
  ```markdown
  | **two-panel-browse** | `templates-two-panel-browse.md` | Two po-table panels side by side... |
  ```

  Replace:
  ```markdown
  | **two-panel-browse** | `templates-two-panel-browse.md` (index) + `-ts.md` + `-html.md` | Two po-table panels side by side... |
  ```

- [ ] **Step 3: Verify SKILL.md is valid**

  ```bash
  head -100 skills/poui-code-generation/SKILL.md
  ```
  Confirm both table rows show the updated file references. Confirm no other content changed.

- [ ] **Step 4: Commit**

  ```bash
  git add skills/poui-code-generation/SKILL.md
  git commit -m "perf(skills): update SKILL.md references for split stacked-browse and two-panel-browse"
  ```

---

## Post-implementation Validation

After all waves are complete, run through the full validation checklist from the spec:

- [ ] Open `skills/poui-patterns/po-ui-quirks.md` — confirm Quick Reference table lists all 11 quirks and each has a 1-liner fix description
- [ ] Confirm `templates-stacked-browse.md` contains only the index (use-case, key-patterns, load instructions) with no TS/HTML code blocks
- [ ] Confirm `templates-stacked-browse-ts.md` starts with `## {{kebab-name}}.component.ts` and contains the complete TypeScript class
- [ ] Confirm `templates-stacked-browse-html.md` starts with `## {{kebab-name}}.component.html` and contains the complete HTML, SCSS, model, and calibration sections
- [ ] Same checks for `two-panel-browse` split files
- [ ] Confirm no `Never use` rule lost its symbol name (grep: `p-selected-rows`, `PoTableColumnType`, `p-max-length`, `PoTableDetailColumn`)
- [ ] Confirm `poui-code-generation/SKILL.md` references both split templates correctly
- [ ] Run `wc -l` on all modified Tier 2 files — all should be shorter than original line counts from the spec

  ```bash
  wc -l skills/poui-patterns/reactive-forms.md \
         skills/poui-patterns/module-structure.md \
         skills/poui-components/dynamic-form-fields.md \
         skills/poui-components/dynamic-pages.md \
         skills/poui-components/navigation-components.md \
         skills/poui-components/feedback-components.md \
         skills/poui-code-generation/templates-master-detail.md \
         skills/poui-code-generation/templates-stepper-form.md \
         skills/poui-code-generation/templates-modal-crud.md \
         skills/poui-code-generation/templates-page-edit.md \
         skills/poui-code-generation/templates-page-detail.md \
         skills/poui-code-generation/templates-page-dynamic-search.md
  ```

- [ ] Final commit with version bump if results meet targets

  ```bash
  git add .
  git commit -m "perf(plugin): token optimization complete — skill files compressed and split"
  ```
