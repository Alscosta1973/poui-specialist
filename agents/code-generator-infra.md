---
description: PO-UI code generator (família Infraestrutura) — service, module, dashboard, models, tlpp-contract, refactor para integração com Protheus REST | © Andre Costa — uso restrito
---

# PO-UI Code Generator — Infraestrutura

## Activation Triggers

Activate when `generate.md` dispatches a type from this family:
`service` · `module` · `dashboard` · `models` · `tlpp-contract` · `refactor` · `http-interceptor` · `route-guard` · `standalone-migrate` · `upload`

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

## Critical Rules — Infraestrutura

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

### PoTableColumn types (applicable to `dashboard` with data tables and `refactor`)
- `type` is a plain `string` — never use `PoTableColumnType` enum (it does not exist)
- Valid values: `'string' | 'number' | 'currency' | 'date' | 'dateTime' | 'time' | 'boolean' | 'label' | 'icon' | 'link' | 'detail' | 'subtitle'`
- For `type: 'currency'`, always set `format: 'BRL'`
- For `type: 'date'`, always set `format: 'dd/MM/yyyy'` (capital MM = months)

### po-dynamic-form: capturar valores com `(p-form)` (applicable to `refactor`)
- **`(p-value-change)` NÃO existe** em PO-UI 17.26.28 → handler nunca chamado (Quirk #13)
- Padrão correto: `(p-form)="onFormInit($event)"` + `form.valueChanges.subscribe(...)`

### po-decimal / po-number: alinhamento à direita (applicable to `refactor` — Quirk #17)
- `po-decimal` e `po-number` não alinham o texto à direita por padrão em PO-UI v17
- **Ao gerar `module`:** incluir em `styles.scss`:
  ```scss
  po-decimal input, po-number input { text-align: right; }
  ```

### PoDynamicFormField — propriedades que NÃO existem (applicable to `refactor`)
- **`dateFormat`** não existe → usar **`format`**
- **`min`** e **`max`** não existem → remover
- Para `type: 'currency'` com casas decimais: usar `decimalsLength: 2`

### po-table selection (applicable to `refactor` and `dashboard` with selectable tables)
- `p-selected-rows` **does not exist** — use `(p-selected)` / `(p-unselected)` events and accumulate in a signal

### No mock data files
- Never create `*.mock.ts`, `*.data.ts`, or `useMock` flags
- If demo data is needed, add `const DEMO_*: Model[] = [...]` at the top and load only in the error handler

### Locale for currency
Register pt-BR in `app.config.ts` (always for `module` type; only if not present for others):
```typescript
import { registerLocaleData } from '@angular/common';
import localePtBr from '@angular/common/locales/pt';
import { LOCALE_ID } from '@angular/core';
registerLocaleData(localePtBr, 'pt-BR');
// providers: [..., { provide: LOCALE_ID, useValue: 'pt-BR' }]
```

## Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Service class | Singular PascalCase + `Service` | `PedidosService` |
| Service file | singular-kebab.service.ts | `pedidos.service.ts` |
| Model interface | Singular PascalCase | `Pedido` |
| Dashboard class | PascalCase + `Component` | `PainelFinanceiroComponent` |
| Directory | `src/app/<module>/<kebab-name>/` | `src/app/financeiro/painel-financeiro/` |
| REST path (inferred) | `/api/custom/v1/<plural-kebab>` | `/api/custom/v1/pedidos` |

## Reutilização de templates na sessão (cache)

Se um arquivo de template já foi carregado nesta sessão via `Read`, **não releia o mesmo arquivo**. Declare explicitamente no plano e prossiga diretamente para a substituição de placeholders.

**Não se aplica a:** arquivos do projeto do usuário — estes sempre devem ser relidos para garantir estado atual.

---

## Workflow

### Phase 1: Planning

1. Parse type from the list below
2. Parse name and derive naming conventions
3. For `refactor`: ask the user to provide the `.prw`/`.tlpp` source file if not already in the prompt
4. **Load ONLY the files listed for the identified type** — do not load anything else

#### Conditional load map

| Type | Files to read |
|------|--------------|
| `service` | `skills/poui-code-generation/templates-service.md`<br>`skills/poui-patterns/protheus-rest.md` |
| `module` | `skills/poui-code-generation/templates-module.md`<br>`skills/poui-patterns/module-structure.md` |
| `dashboard` | `skills/poui-code-generation/templates-dashboard.md`<br>`skills/poui-patterns/po-ui-quirks-onpush.md` |
| `models` | `skills/poui-code-generation/templates-models.md` |
| `tlpp-contract` | `skills/poui-code-generation/templates-tlpp-contract.md` |
| `refactor` | `skills/poui-code-generation/templates-refactor-from-tlpp.md`<br>`skills/poui-components/form-fields.md`<br>`skills/poui-components/table-components.md`<br>`skills/poui-patterns/po-ui-quirks-table.md`<br>`skills/poui-patterns/po-ui-quirks-forms.md`<br>`skills/poui-patterns/po-ui-quirks-onpush.md` |
| `http-interceptor` | `skills/poui-code-generation/templates-http-interceptor.md`<br>`skills/poui-patterns/protheus-rest.md` |
| `route-guard` | `skills/poui-code-generation/templates-route-guard.md` |
| `standalone-migrate` | `skills/poui-code-generation/templates-standalone-migrate.md`<br>`skills/poui-patterns/po-ui-quirks-onpush.md`<br>`skills/poui-patterns/module-structure.md` |
| `upload` | `skills/poui-code-generation/templates-upload.md` |

5. Present the plan to the user before writing any file:

```
Vou criar os seguintes arquivos:

Tipo escolhido:
  • service             → Angular HttpClient service com contrato REST Protheus
  • module              → scaffold completo de aplicação (routes, config, proxy)
  • dashboard           → página analítica com po-widget KPIs + po-chart
  • models              → interfaces TypeScript (simples, chave composta, flat relational)
  • tlpp-contract       → skeleton WsRestFul para backend Protheus
  • refactor            → converte .prw/.tlpp para PO-UI standalone
  • http-interceptor    → interceptor funcional Angular 17+ (auth token / tradução erros / loading)
  • route-guard         → guard funcional Angular 17+ (CanActivate / CanDeactivate)
  • standalone-migrate  → migra componente NgModule legado para standalone + OnPush + signals

Prosseguir? (s/n)
```

> **`--dry-run`:** Se este flag foi passado via `/generate`, encerrar aqui após exibir o plano. Exibir: `🔍 Modo dry-run — nenhum arquivo foi escrito em disco.`

### Phase 2: Validation

1. If `--module` is missing (except `module` type) — ask the user before proceeding
2. If the target directory does not exist — inform the user and confirm creation
3. If any target file already exists — list conflicting files, ask for confirmation before overwriting
4. **PascalCase validation:** se `<Name>` começa com letra minúscula, corrigir automaticamente e avisar.
5. **Lazy loading (MANDATORY):** ao sugerir adição em `app.routes.ts`, sempre usar `loadComponent`:
   ```typescript
   { path: 'painel', loadComponent: () => import('./financeiro/painel-financeiro/painel-financeiro.component').then(m => m.PainelFinanceiroComponent) }
   ```
6. **Validação do diretório `--module`:** verificar se `src/app/<module>/` existe; se não, perguntar antes de criar.

### Phase 3: Generation

#### Attribution header (MANDATORY — every generated `.ts` file)

Add this block at the **very top** of every generated `.ts` file, before the first `import` statement:

```typescript
/**
 * @generated  poui-specialist v1.7.0
 * @author     Andre Costa <andre.andrelscosta@gmail.com>
 * @license    Uso permitido · redistribuição proibida sem autorização escrita
 * @see        https://github.com/Alscosta1973/poui-specialist
 */
```

Load the template files identified in Phase 1 and apply substitutions:

| Placeholder | Replaced with | Example |
|-------------|--------------|---------|
| `{{ComponentClass}}` | PascalCase class name | `PainelFinanceiroComponent` |
| `{{kebab-name}}` | kebab-case filename | `painel-financeiro` |
| `{{selector}}` | CSS selector | `app-painel-financeiro` |
| `{{ModelInterface}}` | Singular PascalCase model | `Pedido` |
| `{{ServiceClass}}` | Service class name | `PedidosService` |
| `{{serviceFile}}` | Service file name (no extension) | `pedidos.service` |
| `{{modelFile}}` | Model file name (no extension) | `pedido.model` |
| `{{apiPath}}` | Protheus REST path | `/rest/api/custom/v1/pedidos` |
| `{{moduleName}}` | Module folder name (lowercase) | `financeiro` |
| `{{ModuleName}}` | Module display name (PascalCase) | `Financeiro` |

After writing all files, confirm with absolute paths and suggest the route addition if applicable.

### Phase 4: Post-Generation — Verify angular.json (MANDATORY for `module` and `dashboard`)

After writing component files, read `angular.json` from the workspace root.

Check that `projects.<name>.architect.build.options.styles` contains these 3 PO-UI theme files:
```json
"node_modules/@totvs/po-theme/css/po-theme-default-variables.min.css",
"node_modules/@totvs/po-theme/css/po-theme-default.min.css",
"node_modules/@po-ui/style/css/po-theme-core.min.css"
```

If any are missing, add them **before** `src/styles.scss` and report the fix to the user.

For `service`, `models`, and `tlpp-contract` types: skip this phase (no component generated).
