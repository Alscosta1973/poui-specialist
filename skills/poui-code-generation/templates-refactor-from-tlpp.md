---
name: refactor-from-tlpp
description: Analyze an existing ADVPL/TLPP source (.prw/.tlpp) and produce an assertive PO-UI generation prompt — no open-ended brainstorming, one confirmation before code generation
---

# Refactor TLPP → PO-UI

Use when the user provides an existing `.prw` or `.tlpp` file and wants an Angular/PO-UI equivalent.

**Goal:** read the source once, extract everything, confirm once, generate.

---

## Step 1 — Read the source

Read every file provided (`.prw`, `.tlpp`, or both). Do not ask questions yet.

Extract the following into a structured analysis (internal only — never dump raw extraction at the user):

### 1.1 Domain
- Routine name (e.g. `ORTA012`)
- Main table(s) accessed (e.g. `ZB1`, `ZB4`)
- Business description (1 sentence from `/*/{Protheus.doc}` or inferred)

### 1.2 Browse columns
Look for: `aCampos` array, `FWFormStruct`, `BeginSQL … SELECT`, `FWBrwColumn`, `GetSX3Cache` calls.

For each column record: `{ field, type, label, align, width }`.
Computed/temp fields (prefix `TT_`) are columns too — note them.

### 1.3 Actions
Look for: `MenuDef` / `ADD OPTION`, toolbar buttons, `FWDialogModal:AddButton`, public methods of the main class.

For each action record: `{ label, trigger, description }`.

### 1.4 Status / color coding
Look for: `#Define` constants with status values, `AddLegend`, `TBitmap` color arrays, `ZB1_TXOK`-style fields.

Map each status code → `{ value, label, color }`.

### 1.5 Summary / totals panels
Look for: `_InicRdp`, `aRodapes`, `montaVendas`, `montaMarcados`, footer `FwLayer` with `AddWindow`.

For each panel record: `{ panel, label, fields[] }`.
Note if totals are per-status and if there is a "selected/marked" accumulator.

### 1.6 Business rules
Look for: mandatory observations before marking, confirmation dialogs, lock sequences, validation parameters (`GetMV`), cascade logic (parcelas/NSU).

List each rule in one line.

### 1.7 Interactions
Look for: `FWMarkBrowse` / `AddMarkColumns` (mark/unmark), `bLDblClick`, `bHeaderClick`, modal dialogs, drawer-like panels, F-key bindings.

---

## Step 2 — Choose the PO-UI pattern

Map the source to exactly one primary pattern:

| Source characteristic | PO-UI pattern |
|-----------------------|---------------|
| Browse + mark/unmark + status legend | `page-list` + checkboxes + drawer |
| Simple browse + inline add/edit (≤10 fields) | `modal-crud` |
| Complex form navigated via route | `page-edit` |
| Aggregation only, no row editing | `dashboard` |
| Browse + advanced filter (SX1 perguntas) | `page-dynamic-search` |

If summary panels exist → add summary cards strip below the table (not a separate page).
If mark/unmark exists → drawer for details + observation, not inline.

---

## Step 3 — Present the plan (one message)

Format:

```
## Análise: <RoutineName> → PO-UI

**Domínio:** <description>
**Tabela principal:** <TABLE>
**Padrão escolhido:** <pattern> — <reason in one sentence>

### Colunas (<n>)
| Campo | Tipo | Label | Alinhamento |
|-------|------|-------|-------------|
| ...   |      |       |             |

### Ações
- **<Label>** — <description>

### Status
| Valor | Label | Cor |
|-------|-------|-----|
| ...   |       |     |

### Cards de totais
- <panel>: <fields>

### Regras de negócio
- <rule>

### Arquivos que serão gerados
src/app/<module>/<kebab>/
├── <kebab>.component.ts
├── <kebab>.component.html
├── <kebab>.component.scss
├── <kebab>.service.ts
└── <kebab>.model.ts

Confirmar geração? (s/n)
```

Wait for a single yes/no. Do not ask follow-up questions unless a critical piece is ambiguous (e.g. the module folder name).

---

## Step 4 — Generate

On confirmation, invoke the `poui-code-generation` skill (load SKILL.md + relevant template) and apply the extracted values as substitutions.

**Key substitution additions** beyond the standard placeholders:

| Placeholder | Source |
|-------------|--------|
| `{{columns}}` | Extracted column array → `po-table-column[]` |
| `{{actions}}` | Extracted actions → `po-page-action[]` |
| `{{statusOptions}}` | Status map → chip filter + legend |
| `{{summaryCards}}` | Totals panels → summary strip component |
| `{{drawerFields}}` | Browse fields → drawer detail block |
| `{{businessRules}}` | Rules → comments + validation code |

Generate **mock data** matching the extracted model shape so the screen renders without a real API.

---

## Token discipline

- Never show the raw extraction to the user — only the formatted plan.
- Never run visual companion (browser/screenshots) during this flow. Reserve for post-generation validation only if the user asks.
- One `Read` per file — do not re-read files already in context.
- If two files are provided (`.prw` + `.tlpp`), read both in parallel.
