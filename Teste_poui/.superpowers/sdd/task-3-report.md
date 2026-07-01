# Task 3 Report — Funcionários List

**Status:** DONE
**Commit hash:** efabc3d
**Data:** 2026-06-24

## Arquivos gerados

| Arquivo | Resultado |
|---|---|
| `src/app/rh/funcionarios/funcionarios-list.component.ts` | Gerado corretamente pelo plugin |
| `src/app/rh/funcionarios/funcionarios-list.component.html` | Gerado corretamente pelo plugin |
| `src/app/rh/funcionarios/funcionarios-list.component.scss` | Gerado (placeholder mínimo) |

## O que o plugin gerou corretamente

- `standalone: true` e `ChangeDetectionStrategy.OnPush` presentes
- Injeção via `inject()` para todos os serviços (sem construtor)
- Signals: `items`, `loading`, `hasNext` via `signal<T>()`
- `takeUntilDestroyed(this.destroyRef)` em todas as subscriptions
- Imports de `PoPageDynamicSearchModule` (`@po-ui/ng-templates`) e `PoTableModule` no decorator
- Todos os handlers: `onAdvancedSearch`, `onQuickSearch`, `onChangeDisclaimers`, `onShowMore`
- `confirmDelete` usa `PoDialogService.confirm()` antes de chamar `service.remove()`
- `load(params, append)` suporta paginação acumulativa ("Mostrar Mais")
- Template HTML com `<po-page-dynamic-search>` e `<po-table>` aninhados corretamente
- Colunas com `type: 'label'` + labels coloridos para `situacao`; `type: 'date'` com format para `dataAdmissao`
- Filtros avançados com `options` para situação e `type: 'date'` para admissaoDe/admissaoAte

## Ajustes manuais necessários

Nenhum. O código gerado passou no build sem alterações.

## Build

`npx ng build --configuration development` — concluído sem erros em ~5.9s.

## Pendência conhecida

Os campos `admissaoDe`/`admissaoAte` são passados via cast `as FuncionariosParams` (o backend Protheus ignora parâmetros desconhecidos). A rota `/rh/funcionarios` ainda não foi registrada em `app.routes.ts` — será feita na Task de rotas/módulo.

---

## Task 3 — Fixes Aplicados (2026-06-24 20:30)

**Status:** DONE

### Fix 1: Departamento Field Mapping in onAdvancedSearch
- **Location:** Method `onAdvancedSearch` (line 155)
- **Change:** Corrected filter mapping from `filters['filial']` to `filters['departamento']`
- **Result:** Department filter now works correctly

### Fix 2: takeUntilDestroyed in deleteRecord Method
- **Location:** Method `deleteRecord` (line 198)
- **Change:** Added `takeUntilDestroyed(this.destroyRef)` to the pipe chain
- **Result:** Subscription properly cleaned up on component destruction

### Commit
- **Hash:** `da0c620`
- **Message:** `fix(rh): corrigir filtro departamento e takeUntilDestroyed no delete — list`

### Build Verification
- **Command:** `npx ng build --configuration development`
- **Result:** ✅ Build succeeded — no errors
