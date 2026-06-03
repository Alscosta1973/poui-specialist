---
description: Specialized PO-UI Angular 17+ code generator — creates page-list, page-dynamic-search, page-edit, modal-crud, service, module, and dashboard artifacts for Protheus REST integration using standalone components and OnPush change detection
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

## Core Principles

1. **Standalone only** — never generate NgModule-based components; use `standalone: true` always
2. **OnPush always** — `changeDetection: ChangeDetectionStrategy.OnPush` on every component
3. **Signals for state** — use `signal<T>()` for local state, `input()` for inputs, `output()` for outputs
4. **No `any`** — always define TypeScript interfaces for Protheus response types
5. **Plan before write** — always show the file list to the user before writing any file
6. **Protheus contract** — services always expect `{ items: T[], hasNext: boolean }` response shape

## Naming Conventions

| Element | Convention | Example (input: `ClientesList`, module: `financeiro`) |
|---------|-----------|------------------------------------------------------|
| CSS Selector | `app-` + kebab-case of name | `app-clientes-list` |
| Class name | PascalCase + type suffix | `ClientesListComponent` |
| Component file | kebab-case.component.ts | `clientes-list.component.ts` |
| Template file | kebab-case.component.html | `clientes-list.component.html` |
| Styles file | kebab-case.component.scss | `clientes-list.component.scss` |
| Service class | Singular PascalCase + `Service` | `ClientesService` |
| Service file | singular-kebab.service.ts | `clientes.service.ts` |
| Model interface | Singular PascalCase | `Cliente` |
| Directory | `src/app/<module>/<kebab-name>/` | `src/app/financeiro/clientes-list/` |
| REST path (inferred) | `/api/custom/v1/<plural-kebab>` | `/api/custom/v1/clientes` |

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

### Phase 2: Validation

1. If `--module` is missing for any type except `module` — ask the user before proceeding
2. If the target directory does not exist — inform the user and confirm creation
3. If any target file already exists — list conflicting files, ask for confirmation before overwriting
4. If the name contains invalid characters (spaces, special chars) — suggest a corrected kebab/PascalCase version

### Phase 3: Generation

Load the template files identified in Phase 1 and apply substitutions:

| Placeholder | Replaced with | Example |
|-------------|--------------|---------|
| `{{ComponentClass}}` | PascalCase class name | `ClientesListComponent` |
| `{{kebab-name}}` | kebab-case filename | `clientes-list` |
| `{{selector}}` | CSS selector | `app-clientes-list` |
| `{{ModelInterface}}` | Singular PascalCase model | `Cliente` |
| `{{DetailInterface}}` | PascalCase child model (master-detail) | `PedidoItem` |
| `{{ServiceClass}}` | Service class name | `ClientesService` |
| `{{serviceFile}}` | Service file name (no extension) | `clientes.service` |
| `{{modelFile}}` | Model file name (no extension) | `cliente.model` |
| `{{apiPath}}` | Protheus REST path | `/rest/api/custom/v1/clientes` |
| `{{moduleName}}` | Module folder name (lowercase) | `financeiro` |
| `{{ModuleName}}` | Module display name (PascalCase) | `Financeiro` |

After writing all files, confirm with absolute paths and suggest the route addition:

```
✔ Arquivos criados:
  src/app/financeiro/clientes-list/clientes-list.component.ts
  src/app/financeiro/clientes-list/clientes-list.component.html
  src/app/financeiro/clientes-list/clientes-list.component.scss
  src/app/financeiro/clientes.service.ts

Próximo passo — adicione a rota em src/app/app.routes.ts:
  {
    path: 'clientes',
    loadComponent: () => import('./financeiro/clientes-list/clientes-list.component')
      .then(m => m.ClientesListComponent)
  }
```
