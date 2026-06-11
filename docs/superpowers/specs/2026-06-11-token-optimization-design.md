# Token Optimization — poui-specialist Skill Files

**Date:** 2026-06-11
**Status:** Approved
**Scope:** All skill files in `skills/` and related agents/commands

---

## Problem

The poui-specialist plugin already uses a lazy-loading architecture — SKILL.md files are lean indices (14-194 lines) and detailed content lives in referenced files loaded on demand. However, several referenced files are excessively large when read, consuming 3,000-7,000 tokens each:

| File | Lines | Est. tokens |
|---|---|---|
| `templates-two-panel-browse.md` | 797 | ~7,000 |
| `templates-stacked-browse.md` | 698 | ~6,500 |
| `po-ui-quirks.md` | 599 | ~6,000 |
| `form-fields.md` | 445 | ~4,000 |
| `reactive-forms.md` | 382 | ~3,500 |
| (8 more files 200-335 lines) | ~2,500 avg | ~22,000 total |

A typical code generation session (1 template + 1-2 reference files) currently costs ~15,000-20,000 tokens just for skill content, before any user code is loaded.

**Goal:** Reduce tokens consumed per typical session by 35-45% without losing generation quality or removing any actionable rule.

---

## Architecture

Three intervention tiers based on file size:

```
Tier 1 — LEAVE AS-IS   (<200 lines):  no changes
Tier 2 — COMPRESS      (200-400 lines): in-place prose compression
Tier 3 — RESTRUCTURE   (>400 lines):  split or add dense header
```

---

## Tier 3 — Restructure (files > 400 lines)

### 3A — Template Split: stacked-browse and two-panel-browse

These templates are large because they bundle three complete artifacts (TS component, HTML template, SCSS) in a single file. The model rarely needs all three simultaneously.

**New structure for each:**

```
templates-stacked-browse.md          ← index: use-case, key patterns table, load instructions (30-40 lines)
templates-stacked-browse-ts.md       ← .component.ts only
templates-stacked-browse-html.md     ← .component.html + .component.scss only

templates-two-panel-browse.md        ← same pattern
templates-two-panel-browse-ts.md
templates-two-panel-browse-html.md
```

The index file (`templates-stacked-browse.md`) retains the existing use-case description and key-patterns table, and adds an explicit instruction: *"Load `-ts.md` when generating the TypeScript file. Load `-html.md` when generating the HTML/SCSS file. Load both when generating all artifacts."*

The SKILL.md `## Templates` table entry and the `quick selection guide` text in `poui-code-generation/SKILL.md` must be updated to reference the new index file (no change to the file name itself — the index keeps the original name).

**Expected reduction:** ~797 lines → ~350 lines loaded per generation pass (when only one artifact type is needed). Full load still possible when all artifacts are requested.

### 3B — Dense Header: po-ui-quirks.md and form-fields.md

These files document many independent items (11 quirks, ~15 form field types). The model needs to know all items exist to apply them proactively, but rarely needs the full detail of every item in the same session.

**Pattern:** Add a `## Quick Reference` table at the very top of the file (before all existing content). Each row = one item, with a 1-liner fix description. Existing detailed sections are preserved unchanged below.

**po-ui-quirks.md Quick Reference format:**
```markdown
## Quick Reference — 11 Known Quirks
| # | Component / API | Symptom | Fix (1-liner) |
|---|---|---|---|
| 1 | po-page-content | Invisible on load | Trigger HTTP observable in ngOnInit |
| 2 | po-input | Buttons 8px below field edge | margin-bottom: 8px on button container |
...
```

**form-fields.md Quick Reference format:**
```markdown
## Quick Reference — Form Field Components
| Component | Key inputs | Notes |
|---|---|---|
| po-input | p-label, p-maxlength, p-placeholder | Use p-maxlength (no hyphen) |
...
```

**Expected reduction:** Model reads ~15 lines for the full catalogue, then loads individual sections on demand. Total file size unchanged; effective tokens consumed per session drops by ~70% for full-catalogue reads.

---

## Tier 2 — In-place Compression (files 200-400 lines)

Three rules applied uniformly to all 12 files in this tier:

### Rule 1 — Remove ❌ Wrong code blocks
Keep only the correct code example. The surrounding text already explains what to avoid; the wrong block duplicates information.

- **Exception:** Keep the wrong block if the wrong symbol/API name is the primary information (e.g., `<!-- ✗ Wrong — p-selected-rows does not exist -->`). In this case the wrong code block IS the documentation; remove only the surrounding prose explanation if redundant.

### Rule 2 — Root cause in 1-2 lines
Convert multi-paragraph root cause explanations to a single concise sentence. Preserve all technical specifics (px values, method names, API names).

Before:
> Root cause: po-table adds an internal selectable-column (po-table-column-selectable) of 56px that is NOT represented in PoTableColumn[]. This hidden 56px is added on top of the sum of all p-width values, pushing the table wider than its container.

After:
> Root cause: checkbox column `po-table-column-selectable` adds 56px not counted in `PoTableColumn[]` definitions.

### Rule 3 — Strip explanatory inline comments
Remove comments that restate what the code already expresses through naming. Keep comments that contain non-obvious values (px offsets, timing delays, workaround reasons).

Keep: `// Use setTimeout(..., 50) — NOT 0ms. At 0ms the DOM is not yet updated`
Remove: `// ← cancels po-input's internal 8px error-space`

---

## Files in Scope by Wave

### Wave 1 — Tier 2 Compression (12 files, no structural change)

| File | Lines |
|---|---|
| `reactive-forms.md` | 382 |
| `dynamic-form-fields.md` | 329 |
| `dynamic-pages.md` | 335 |
| `templates-master-detail.md` | 332 |
| `templates-stepper-form.md` | 324 |
| `templates-modal-crud.md` | 305 |
| `navigation-components.md` | 295 |
| `module-structure.md` | 295 |
| `templates-page-edit.md` | 248 |
| `templates-page-detail.md` | 223 |
| `templates-page-dynamic-search.md` | 218 |
| `feedback-components.md` | 214 |

### Wave 2 — Dense Header (2 files, additive change)

| File | Action |
|---|---|
| `po-ui-quirks.md` | Add Quick Reference table at top |
| `form-fields.md` | Add Quick Reference table at top |

### Wave 3 — Template Split (2 templates → 6 files, + SKILL.md update)

| Action | Files |
|---|---|
| Split `templates-stacked-browse.md` | → index + `-ts.md` + `-html.md` |
| Split `templates-two-panel-browse.md` | → index + `-ts.md` + `-html.md` |
| Update SKILL.md | `poui-code-generation/SKILL.md` — add load instructions to both template entries |

---

## Preservation Rules — What NOT to Change

1. **All correct code blocks are preserved verbatim** — no TypeScript, HTML, or SCSS is rewritten.
2. **All numeric values are preserved** — px offsets, setTimeout delays, viewport calculations.
3. **All `⚠️` and `Never use` warnings are preserved as-is.**
4. **Critical Rules section in `poui-code-generation/SKILL.md` is not touched.**
5. **Attribution headers (`@generated poui-specialist`) in templates are not touched.**
6. **All SKILL.md index files are not touched** (already lean).
7. **Tier 1 files (<200 lines) are not touched.**

---

## Validation Checklist (run after each wave)

- [ ] Model can identify which quirk applies by reading only the Quick Reference in `po-ui-quirks.md`
- [ ] Model can generate a complete `stacked-browse` by loading index + `-ts.md` + `-html.md` in sequence
- [ ] No `Never use X` rule lost any symbol name (e.g., `p-selected-rows`, `PoTableColumnType`, `tag`)
- [ ] All Tier 2 files still contain the complete, correct code for each pattern
- [ ] Wave 3: `poui-code-generation/SKILL.md` correctly references the new split files
- [ ] All existing tests / browser verification still pass after changes

---

## Expected Outcomes

| Metric | Before | After (estimated) |
|---|---|---|
| Tokens for typical generation session | ~15,000-20,000 | ~8,000-12,000 |
| Largest single file loaded | ~7,000 tokens | ~3,500 tokens (TS only) |
| po-ui-quirks.md full read | ~6,000 tokens | ~200 tokens (Quick Reference only) |
| Total skill content (all files) | ~27,000 tokens | ~15,000-17,000 tokens |
