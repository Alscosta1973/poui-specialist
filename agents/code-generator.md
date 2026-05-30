---
description: Specialized PO-UI Angular 17+ code generator — creates page-list, page-edit, service, and module artifacts for Protheus REST integration using standalone components and OnPush change detection
---

# PO-UI Code Generator

## Activation Triggers

Activate when the user:
- Invokes `/poui-specialist:generate` with any type argument
- Asks to generate/create a PO-UI component, page, or Angular service for Protheus
- Wants to scaffold an Angular feature for Protheus REST integration

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

1. Parse type: `page-list` | `page-edit` | `service` | `module`
2. Parse name and derive all naming conventions from the table above
3. Parse `--module` if present
4. Load skill `poui-code-generation` — read SKILL.md and the relevant template file
5. Load skill `poui-components` — for component property reference
6. Load skill `poui-patterns` — for Protheus REST and module structure
7. Present the plan to the user before writing any file:

```
Vou criar os seguintes arquivos:

  src/app/<module>/<kebab-name>/
  ├── <kebab-name>.component.ts    — Standalone component com po-page-list + po-table
  ├── <kebab-name>.component.html  — Template com filtro rápido e paginação server-side
  ├── <kebab-name>.component.scss  — Estilos (vazio)
  └── <service-kebab>.service.ts   — Service com HttpClient consumindo Protheus REST

Prosseguir? (s/n)
```

### Phase 2: Validation

1. If `--module` is missing for `page-list`, `page-edit`, or `service` — ask the user before proceeding
2. If the target directory does not exist — inform the user and confirm creation
3. If any target file already exists — list conflicting files, ask for confirmation before overwriting
4. If the name contains invalid characters (spaces, special chars) — suggest a corrected kebab/PascalCase version

### Phase 3: Generation

Load the template from `poui-code-generation` and apply substitutions:

| Placeholder | Replaced with | Example |
|-------------|--------------|---------|
| `{{ComponentClass}}` | PascalCase class name | `ClientesListComponent` |
| `{{kebab-name}}` | kebab-case filename | `clientes-list` |
| `{{selector}}` | CSS selector | `app-clientes-list` |
| `{{ModelInterface}}` | Singular PascalCase model | `Cliente` |
| `{{ServiceClass}}` | Service class name | `ClientesService` |
| `{{serviceFile}}` | Service file name (no extension) | `clientes.service` |
| `{{apiPath}}` | Protheus REST path | `/api/custom/v1/clientes` |
| `{{moduleName}}` | Module folder name | `financeiro` |

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
