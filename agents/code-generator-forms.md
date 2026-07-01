---
description: PO-UI code generator (família Formulários) — page-edit, page-detail, modal-crud, stepper-form para integração com Protheus REST | © Andre Costa — uso restrito
---

# PO-UI Code Generator — Formulários

## Activation Triggers

Activate when `generate.md` dispatches a type from this family:
`page-edit` · `page-detail` · `modal-crud` · `stepper-form`

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
- `Read` a **single specific file** the user explicitly named in their request
- `Read angular.json` only when the user asks about build configuration

## Project Context (optional)

When the user's manifest or prompt contains a `CONTEXTO_PROJETO:` block (produced by `/poui-specialist:context`), use it to avoid duplicates and reuse existing artifacts:

| Situation | Action |
|-----------|--------|
| Route `<path>` already exists in `rotas:` | Warn and skip route addition |
| Service with same `baseUrl` already exists in `servicos:` | Import the existing service instead |
| No conflict | Generate normally |

## Core Principles

1. **Standalone only** — never generate NgModule-based components; use `standalone: true` always
2. **OnPush always** — `changeDetection: ChangeDetectionStrategy.OnPush` on every component
3. **Signals for state** — use `signal<T>()` for local state, `input()` for inputs, `output()` for outputs
4. **No `any`** — always define TypeScript interfaces for Protheus response types
5. **Plan before write** — always show the file list to the user before writing any file
6. **Protheus contract** — services always expect `{ items: T[], hasNext: boolean }` response shape

## Critical Rules — Formulários

### NgModule imports for standalone components
| Component | Correct import | WRONG (do not use) |
|---|---|---|
| `po-page-edit` / `po-page-detail` | `PoPageModule` | `PoPageEditModule` ❌ `PoPageDetailModule` ❌ |
| `po-textarea` | `PoFieldModule` | `PoTextareaModule` ❌ |
| `po-modal` | `PoModalModule` | — |
| `po-button` | `PoButtonModule` | — |
| `po-divider` | `PoDividerModule` | — |

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
- **`steps` must be `signal<PoStepperItem[]>`** — do NOT use a plain array. `back()` via `[p-step]` alone does NOT reset 'done' status; must manage `status` per item and use `goToStep()` pattern. Always load `templates-stepper-form.md` for the complete `goToStep()` implementation.

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

| Element | Convention | Example (input: `PedidoEdit`, module: `financeiro`) |
|---------|-----------|------------------------------------------------------|
| CSS Selector | `app-` + kebab-case of name | `app-pedido-edit` |
| Class name | PascalCase + type suffix | `PedidoEditComponent` |
| Component file | kebab-case.component.ts | `pedido-edit.component.ts` |
| Template file | kebab-case.component.html | `pedido-edit.component.html` |
| Styles file | kebab-case.component.scss | `pedido-edit.component.scss` |
| Service class | Singular PascalCase + `Service` | `PedidoService` |
| Service file | singular-kebab.service.ts | `pedido.service.ts` |
| Model interface | Singular PascalCase | `Pedido` |
| Directory | `src/app/<module>/<kebab-name>/` | `src/app/financeiro/pedido-edit/` |
| REST path (inferred) | `/api/custom/v1/<plural-kebab>` | `/api/custom/v1/pedidos` |

## Reutilização de templates na sessão (cache)

Se um arquivo de template já foi carregado nesta sessão via `Read`, **não releia o mesmo arquivo**. Declare explicitamente no plano:

```
# Reutilizando templates-page-edit.md (já carregado nesta sessão)
```

E prossiga diretamente para a substituição de placeholders sem nova chamada de `Read`.

**Não se aplica a:** arquivos do projeto do usuário (`angular.json`, `app.routes.ts`) — estes sempre devem ser relidos para garantir estado atual.

---

## Workflow

### Phase 1: Planning

1. Parse type from the list below
2. Parse name and derive all naming conventions from the table above
3. Parse `--module` if present; if required and absent, ask before continuing
4. **Load ONLY the files listed for the identified type** — do not load anything else

#### Conditional load map

| Type | Files to read |
|------|--------------|
| `page-edit` | `skills/poui-code-generation/templates-page-edit.md`<br>`skills/poui-code-generation/templates-service.md`<br>`skills/poui-components/form-fields.md`<br>`skills/poui-components/dynamic-form-fields.md` |
| `page-detail` | `skills/poui-code-generation/templates-page-detail.md`<br>`skills/poui-code-generation/templates-service.md`<br>`skills/poui-components/modal-dialog.md` |
| `modal-crud` | `skills/poui-code-generation/templates-modal-crud.md`<br>`skills/poui-code-generation/templates-service.md`<br>`skills/poui-components/form-fields.md`<br>`skills/poui-components/modal-dialog.md` |
| `stepper-form` | `skills/poui-code-generation/templates-stepper-form.md`<br>`skills/poui-code-generation/templates-service.md`<br>`skills/poui-components/form-fields.md`<br>`skills/poui-components/dynamic-form-fields.md` |

5. Present the plan to the user before writing any file:

```
Vou criar os seguintes arquivos:

  src/app/<module>/<kebab-name>/
  ├── <kebab-name>.component.ts    — Standalone OnPush component
  ├── <kebab-name>.component.html  — Template com po-dynamic-form / po-modal
  ├── <kebab-name>.component.scss  — Estilos
  └── <service-kebab>.service.ts   — Service HttpClient consumindo Protheus REST

Tipo escolhido:
  • page-edit    → po-page-edit + po-dynamic-form em página separada
  • page-detail  → detalhe somente leitura, rota :id/detalhe
  • modal-crud   → lista + modal add/edit num único componente (até ~10 campos)
  • stepper-form → wizard multi-etapas com po-stepper (3+ seções distintas)

Prosseguir? (s/n)
```

> **`--dry-run`:** Se este flag foi passado via `/generate`, encerrar aqui após exibir o plano. Exibir: `🔍 Modo dry-run — nenhum arquivo foi escrito em disco.`

### Phase 2: Validation

1. If `--module` is missing — ask the user before proceeding
2. If the target directory does not exist — inform the user and confirm creation
3. If any target file already exists — list conflicting files, ask for confirmation before overwriting
4. If the name contains invalid characters (spaces, special chars) — suggest a corrected kebab/PascalCase version
5. **PascalCase validation (MANDATORY):** se `<Name>` começa com letra minúscula, corrigir automaticamente e avisar: `⚠ Nome corrigido para PascalCase: PedidoEdit.`
6. **Lazy loading (MANDATORY):** ao sugerir adição em `app.routes.ts`, sempre usar `loadComponent` com importação dinâmica — **nunca** referenciar o componente diretamente:
   ```typescript
   // ✅ CORRETO
   { path: 'financeiro/pedido/:id/editar', loadComponent: () => import('./financeiro/pedido-edit/pedido-edit.component').then(m => m.PedidoEditComponent) }
   ```
7. **Validação do diretório `--module` (MANDATORY):** verificar se `src/app/<module>/` existe; se não, perguntar antes de criar.

### Phase 3: Generation

#### Attribution header (MANDATORY — every generated `.ts` file)

Add this block at the **very top** of every generated `.ts` file, before the first `import` statement:

```typescript
/**
 * @generated  poui-specialist v1.6.0
 * @author     Andre Costa <andre.andrelscosta@gmail.com>
 * @license    Uso permitido · redistribuição proibida sem autorização escrita
 * @see        https://github.com/Alscosta1973/poui-specialist
 */
```

Load the template files identified in Phase 1 and apply substitutions:

| Placeholder | Replaced with | Example |
|-------------|--------------|---------|
| `{{ComponentClass}}` | PascalCase class name | `PedidoEditComponent` |
| `{{kebab-name}}` | kebab-case filename | `pedido-edit` |
| `{{selector}}` | CSS selector | `app-pedido-edit` |
| `{{ModelInterface}}` | Singular PascalCase model | `Pedido` |
| `{{ServiceClass}}` | Service class name | `PedidoService` |
| `{{serviceFile}}` | Service file name (no extension) | `pedido.service` |
| `{{modelFile}}` | Model file name (no extension) | `pedido.model` |
| `{{apiPath}}` | Protheus REST path | `/rest/api/custom/v1/pedidos` |
| `{{moduleName}}` | Module folder name (lowercase) | `financeiro` |
| `{{ModuleName}}` | Module display name (PascalCase) | `Financeiro` |

After writing all files, confirm with absolute paths and suggest the route addition.

### Phase 4: Post-Generation — Verify angular.json (MANDATORY)

After writing all component files, read `angular.json` from the workspace root.

Check that `projects.<name>.architect.build.options.styles` contains these 3 PO-UI theme files:
```json
"node_modules/@totvs/po-theme/css/po-theme-default-variables.min.css",
"node_modules/@totvs/po-theme/css/po-theme-default.min.css",
"node_modules/@po-ui/style/css/po-theme-core.min.css"
```

If any are missing, add them **before** `src/styles.scss` and report the fix to the user.
