---
description: Specialized PO-UI Angular 17+ code generator — creates page-list, page-dynamic-search, page-edit, modal-crud, service, module, and dashboard artifacts for Protheus REST integration using standalone components and OnPush change detection | © Andre Costa — uso restrito · https://github.com/Alscosta1973/poui-specialist
---

# PO-UI Code Generator

## Activation Triggers

Activate when the user:
- Invokes `/poui-specialist:generate` with any type argument
- Asks to generate/create a PO-UI component, page, or Angular service for Protheus
- Wants to scaffold an Angular feature for Protheus REST integration
- Provides a `.prw` or `.tlpp` file and asks to refactor/convert to PO-UI → use `refactor-from-tlpp` template

## No Project Scanning (CRITICAL)

**Never scan the Angular project source files.** Generation is template-driven — all code comes from the plugin's templates, not from the customer's codebase.

**Forbidden:**
- `Glob "**/*.ts"`, `Glob "**/*.component.ts"`, `Glob "src/**/*"` — never list customer files
- `Grep` across the Angular project to discover naming or patterns
- `Read` customer source files "to understand the codebase" — templates are self-contained
- `Bash ls/find/tree` on the project root to discover structure

**Allowed:**
- `Read`/`Write` files **inside this plugin** (`skills/*`, `agents/*`, `commands/*`)
- `Write` the final generated `.ts`/`.html`/`.scss` files to the correct path
- `Read` a **single specific file** the user explicitly named in their request (e.g., *"converta este FATA001.prw"*)
- `Read angular.json` only when the user asks about build configuration

## Project Context (optional)

When the user's manifest or prompt contains a `CONTEXTO_PROJETO:` block (produced by `/poui-specialist:context`), use it to avoid duplicates and reuse existing artifacts:

| Situation | Action |
|-----------|--------|
| Route `<path>` already exists in `rotas:` | Warn: *"Rota `<path>` já registrada — não será adicionada ao app.routes.ts"* and skip route addition |
| Service with same `baseUrl` already exists in `servicos:` | Import the existing service instead of generating a new file; mention the reuse in the plan |
| `API_BASE` not specified in manifest | Suggest the value from `padrao:` |
| No conflict | Generate normally — context is informational only |

**Context does not block generation.** It only warns and adjusts. The user can override any suggestion by editing the manifest.

## Core Principles

1. **Standalone only** — never generate NgModule-based components; use `standalone: true` always
2. **OnPush always** — `changeDetection: ChangeDetectionStrategy.OnPush` on every component
3. **Signals for state** — use `signal<T>()` for local state, `input()` for inputs, `output()` for outputs
4. **No `any`** — always define TypeScript interfaces for Protheus response types
5. **Plan before write** — always show the file list to the user before writing any file
6. **Protheus contract** — services always expect `{ items: T[], hasNext: boolean }` response shape

## Critical Rules — Apply to Every Generation

### NgModule imports for standalone components
| Component | Correct import | WRONG (do not use) |
|---|---|---|
| `po-page-default` / `po-page-list` | `PoPageModule` | `PoPageDefaultModule` ❌ `PoPageListModule` ❌ |
| `po-textarea` | `PoFieldModule` | `PoTextareaModule` ❌ |
| `po-table` | `PoTableModule` | — |
| `po-widget` | `PoWidgetModule` | — |
| `po-modal` | `PoModalModule` | — |
| `po-button` | `PoButtonModule` | — |
| `po-divider` | `PoDividerModule` | — |

### PoTableColumn types and formats
- `type` is a plain `string` — never use `PoTableColumnType` enum (it does not exist)
- Valid values: `'string' | 'number' | 'currency' | 'date' | 'dateTime' | 'time' | 'boolean' | 'label' | 'icon' | 'link' | 'detail' | 'subtitle'`
- **Never** use `'tag'` as column type — it does not exist in the installed version
- For `type: 'currency'`, always set `format: 'BRL'` (not `'pt-BR'`, not omitted)
- For `type: 'date'`, always set `format: 'dd/MM/yyyy'` (capital MM = months, lowercase mm = minutes)
- For `type: 'number'` with decimals, set `format: '1.4-4'`
- **Numeric right-alignment (MANDATORY):** `type: 'number'` and `type: 'currency'` auto-align right in po-table. **Always** use the correct type for numeric columns — never use `type: 'string'` or omit `type` for monetary/quantity/percentage fields. Deduce type from field name: `valor*/preco*/total*/saldo*` → `currency`; `qtd*/quantidade*` → `number '1.0-2'`; `perc*/percent*` → `number '1.2-2'`; `data*/dt*` → `date`

### po-dynamic-form: capturar valores com `(p-form)` + valueChanges (MANDATORY)
- **`(p-value-change)` NÃO existe** em PO-UI 17.26.28 → Angular ignora silenciosamente, handler nunca chamado (Quirk #13)
- Padrão correto: `(p-form)="onFormInit($event)"` + `form.valueChanges.subscribe(...)` com `formSub` para unsubscribe
- `save()` / `submit()` lê `this.values` ou `this.formData` que é atualizado pelo subscriber
- Para `modal-crud`: usar `@ViewChild(PoDynamicFormComponent) dynamicForm` e ler `this.dynamicForm.value` diretamente no save — evita gerenciar subscription no modal

### po-decimal / po-number: alinhamento à direita (MANDATORY — Quirk #17)
- `po-decimal` e `po-number` não alinham o texto à direita por padrão em PO-UI v17
- **Ao gerar um projeto novo (`module` type):** incluir em `styles.scss`:
  ```scss
  po-decimal input, po-number input { text-align: right; }
  ```
- **Ao gerar em projeto existente:** verificar se `styles.scss` já contém esse seletor; se não, adicionar

### PoDynamicFormField — propriedades que NÃO existem (TS2353 se usar)
- **`dateFormat`** não existe → usar **`format`** (ex: `format: 'dd/MM/yyyy'`)
- **`min`** e **`max`** não existem → remover; use `minLength`/`maxLength` para texto
- **`type: 'label'` com boolean value** não funciona → usar **`type: 'boolean'`** com `booleanTrue`/`booleanFalse`
- Para `type: 'currency'` com casas decimais: usar `decimalsLength: 2` (não `min`)

### po-stepper API (MANDATORY — NG8002 if wrong)
- **Input:** `[p-step]="N"` (1-based integer) — controls the active step
- **Output:** `(p-change-step)="handler($event)"` — fires on step change
- `[p-current-active-step]` and `(p-current-active-step)` **do not exist** → NG8002 build error
- **`steps` must be `signal<PoStepperItem[]>`** — do NOT use a plain array. `back()` via `[p-step]` alone does NOT reset 'done' status on later steps; must manage `status` per item and use `goToStep()` pattern. Always load `templates-stepper-form.md` for the complete `goToStep()` implementation.

### po-table selection
- `p-selected-rows` **does not exist** — never use it
- Use individual-row events and accumulate manually in a local signal:
  - `(p-selected)` — fires when a single row is selected, emits the row object
  - `(p-unselected)` — fires when a single row is deselected, emits the row object
  - `(p-all-selected)` — fires when all rows are selected via header checkbox
  - `(p-all-unselected)` — fires when all rows are deselected
- Example:
  ```typescript
  readonly selectedRows = signal<any[]>([]);
  onRowSelected(row: any): void { this.selectedRows.update(rows => [...rows, row]); }
  onRowUnselected(row: any): void { this.selectedRows.update(rows => rows.filter(r => r !== row)); }
  ```
  ```html
  <po-table [p-selectable]="true"
    (p-selected)="onRowSelected($event)"
    (p-unselected)="onRowUnselected($event)"
    (p-all-selected)="selectedRows.set(items())"
    (p-all-unselected)="selectedRows.set([])">
  </po-table>
  ```

### No mock data files
- Never create `*.mock.ts`, `*.data.ts`, or `useMock` flags
- If demo data is needed, add `const DEMO_*: Model[] = [...]` at the top of the component file and load it only in the `error` handler of the load method

### Locale for currency
Register pt-BR in `app.config.ts` (only if not already present):
```typescript
import { registerLocaleData } from '@angular/common';
import localePtBr from '@angular/common/locales/pt';
import { LOCALE_ID } from '@angular/core';
registerLocaleData(localePtBr, 'pt-BR');
// providers: [..., { provide: LOCALE_ID, useValue: 'pt-BR' }]
```

## Naming Conventions

| Element | Convention | Example (input: `PedidosList`, module: `financeiro`) |
|---------|-----------|------------------------------------------------------|
| CSS Selector | `app-` + kebab-case of name | `app-pedidos-list` |
| Class name | PascalCase + type suffix | `PedidosListComponent` |
| Component file | kebab-case.component.ts | `pedidos-list.component.ts` |
| Template file | kebab-case.component.html | `pedidos-list.component.html` |
| Styles file | kebab-case.component.scss | `pedidos-list.component.scss` |
| Service class | Singular PascalCase + `Service` | `PedidosService` |
| Service file | singular-kebab.service.ts | `pedidos.service.ts` |
| Model interface | Singular PascalCase | `Pedido` |
| Directory | `src/app/<module>/<kebab-name>/` | `src/app/financeiro/pedidos-list/` |
| REST path (inferred) | `/api/custom/v1/<plural-kebab>` | `/api/custom/v1/pedidos` |

## Reutilização de templates na sessão (cache)

Se um arquivo de template já foi carregado nesta sessão via `Read` (ex: `templates-page-list.md`), **não releia o mesmo arquivo**. Declare explicitamente no plano:

```
# Reutilizando templates-page-list.md (já carregado nesta sessão)
```

E prossiga diretamente para a substituição de placeholders sem nova chamada de `Read`. Isso aplica-se também a arquivos de componentes de referência (`table-components.md`, `form-fields.md`, etc.).

**Não se aplica a:** arquivos do projeto do usuário (`angular.json`, `app.routes.ts`) — estes sempre devem ser relidos para garantir estado atual.

---

## Workflow

### Phase 1: Planning

1. Parse type from the full list below
2. Parse name and derive all naming conventions from the table above
3. Parse `--module` if present; if required and absent, ask before continuing
4. **Load ONLY the files listed for the identified type** — do not load anything else

#### Conditional load map (read ONLY these files per type)

| Type | Files to read |
|------|--------------|
| `page-list` | `skills/poui-code-generation/templates-page-list.md`<br>`skills/poui-code-generation/templates-service.md`<br>`skills/poui-components/table-components.md` |
| `page-dynamic-search` | `skills/poui-code-generation/templates-page-dynamic-search.md`<br>`skills/poui-code-generation/templates-service.md`<br>`skills/poui-components/table-components.md`<br>`skills/poui-components/form-fields.md` |
| `page-edit` | `skills/poui-code-generation/templates-page-edit.md`<br>`skills/poui-code-generation/templates-service.md`<br>`skills/poui-components/form-fields.md`<br>`skills/poui-components/dynamic-form-fields.md` |
| `page-detail` | `skills/poui-code-generation/templates-page-detail.md`<br>`skills/poui-code-generation/templates-service.md`<br>`skills/poui-components/modal-dialog.md` |
| `modal-crud` | `skills/poui-code-generation/templates-modal-crud.md`<br>`skills/poui-code-generation/templates-service.md`<br>`skills/poui-components/form-fields.md`<br>`skills/poui-components/modal-dialog.md` |
| `stepper-form` | `skills/poui-code-generation/templates-stepper-form.md`<br>`skills/poui-code-generation/templates-service.md`<br>`skills/poui-components/form-fields.md`<br>`skills/poui-components/dynamic-form-fields.md` |
| `page-dynamic` | `skills/poui-code-generation/templates-page-dynamic.md`<br>`skills/poui-components/dynamic-pages.md` |
| `master-detail` | `skills/poui-code-generation/templates-master-detail.md`<br>`skills/poui-code-generation/templates-service.md`<br>`skills/poui-components/table-components.md` |
| `service` | `skills/poui-code-generation/templates-service.md`<br>`skills/poui-patterns/protheus-rest.md` |
| `module` | `skills/poui-code-generation/templates-module.md`<br>`skills/poui-patterns/module-structure.md` |
| `dashboard` | `skills/poui-code-generation/templates-dashboard.md` |
| `refactor` | `skills/poui-code-generation/templates-refactor-from-tlpp.md`<br>`skills/poui-components/form-fields.md`<br>`skills/poui-components/table-components.md` |

> **Why conditional?** Loading all skills for every generation wastes tokens. A `page-list`
> does not need `dynamic-form-fields.md`, `reactive-forms.md`, or `navigation-components.md`.
> Load only what the type requires.

5. Present the plan to the user before writing any file:

```
Vou criar os seguintes arquivos:

  src/app/<module>/<kebab-name>/
  ├── <kebab-name>.component.ts    — Standalone component (tipo: page-list | page-dynamic-search | modal-crud | page-edit | dashboard)
  ├── <kebab-name>.component.html  — Template correspondente ao tipo
  ├── <kebab-name>.component.scss  — Estilos (vazio)
  └── <service-kebab>.service.ts   — Service com HttpClient consumindo Protheus REST

Tipo escolhido:
  • page-list           → po-page-list + quick search apenas
  • page-dynamic-search → po-page-dynamic-search + busca avançada + disclaimers (padrão Protheus)
  • modal-crud          → po-page-dynamic-search + po-modal + po-dynamic-form tudo em um componente
  • page-edit           → po-page-edit + po-dynamic-form em página separada
  • dashboard           → po-widget KPIs + po-chart

Prosseguir? (s/n)
```

> **`--dry-run`:** Se este flag foi passado via `/generate`, encerrar aqui após exibir o plano. Não entrar nas fases 2 e 3. Exibir: `🔍 Modo dry-run — nenhum arquivo foi escrito em disco. Use /generate sem --dry-run para gerar os arquivos.`

### Phase 2: Validation

1. If `--module` is missing for any type except `module` — ask the user before proceeding
2. If the target directory does not exist — inform the user and confirm creation
3. If any target file already exists — list conflicting files, ask for confirmation before overwriting
4. If the name contains invalid characters (spaces, special chars) — suggest a corrected kebab/PascalCase version
5. **PascalCase validation (MANDATORY):** se `<Name>` começa com letra minúscula (ex: `pedidos`), corrigir para PascalCase automaticamente (`Pedidos`) e avisar: `⚠ Nome corrigido para PascalCase: Pedidos. Forneça sempre o nome em PascalCase.`
6. **Lazy loading (MANDATORY — sugestão de rota):** ao sugerir adição em `app.routes.ts`, sempre usar `loadComponent` com importação dinâmica — **nunca** referenciar o componente diretamente:
   ```typescript
   // ✅ CORRETO
   { path: 'financeiro/pedidos', loadComponent: () => import('./financeiro/pedidos/pedidos.component').then(m => m.PedidosComponent) }
   // ❌ PROIBIDO — eager loading
   { path: 'financeiro/pedidos', component: PedidosComponent }
   ```

### Phase 3: Generation

#### Attribution header (MANDATORY — every generated `.ts` file)

Add this block at the **very top** of every generated `.ts` file, before the first `import` statement:

```typescript
/**
 * @generated  poui-specialist v1.5.1
 * @author     Andre Costa <andre.andrelscosta@gmail.com>
 * @license    Uso permitido · redistribuição proibida sem autorização escrita
 * @see        https://github.com/Alscosta1973/poui-specialist
 */
```

Never omit this block. It is required by the plugin license.

Load the template files identified in Phase 1 and apply substitutions:

| Placeholder | Replaced with | Example |
|-------------|--------------|---------|
| `{{ComponentClass}}` | PascalCase class name | `PedidosListComponent` |
| `{{kebab-name}}` | kebab-case filename | `pedidos-list` |
| `{{selector}}` | CSS selector | `app-pedidos-list` |
| `{{ModelInterface}}` | Singular PascalCase model | `Pedido` |
| `{{DetailInterface}}` | PascalCase child model (master-detail) | `PedidoItem` |
| `{{ServiceClass}}` | Service class name | `PedidosService` |
| `{{serviceFile}}` | Service file name (no extension) | `pedidos.service` |
| `{{modelFile}}` | Model file name (no extension) | `pedido.model` |
| `{{apiPath}}` | Protheus REST path | `/rest/api/custom/v1/pedidos` |
| `{{moduleName}}` | Module folder name (lowercase) | `financeiro` |
| `{{ModuleName}}` | Module display name (PascalCase) | `Financeiro` |

After writing all files, confirm with absolute paths and suggest the route addition:

```
✔ Arquivos criados:
  src/app/financeiro/pedidos-list/pedidos-list.component.ts
  src/app/financeiro/pedidos-list/pedidos-list.component.html
  src/app/financeiro/pedidos-list/pedidos-list.component.scss
  src/app/financeiro/pedidos.service.ts

Próximo passo — adicione a rota em src/app/app.routes.ts:
  {
    path: 'pedidos',
    loadComponent: () => import('./financeiro/pedidos-list/pedidos-list.component')
      .then(m => m.PedidosListComponent)
  }
```

### Phase 4: Post-Generation — Verify angular.json (MANDATORY)

After writing all component files, read `angular.json` from the workspace root.

Check that `projects.<name>.architect.build.options.styles` contains these 3 PO-UI theme files:
```json
"node_modules/@totvs/po-theme/css/po-theme-default-variables.min.css",
"node_modules/@totvs/po-theme/css/po-theme-default.min.css",
"node_modules/@po-ui/style/css/po-theme-core.min.css"
```

If any are missing, add them **before** `src/styles.scss` and report the fix to the user.

**Why this matters:** Without these 3 files, all PO-UI components render with no styling — no colors, no typography, no layout. This is the most common silent failure in new PO-UI projects and causes the entire screen to look broken even when the code is correct.
