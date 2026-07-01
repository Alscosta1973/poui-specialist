---
description: Analyze Angular PO-UI components for known quirks and anti-patterns — reports findings and optionally auto-fixes them
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, PowerShell, Skill
argument-hint: "<path> [--fix] [--dry-run]"
---

**IMPORTANT:** Always respond in the same language the user is writing in. If the user writes in Portuguese, respond in Portuguese.

# /poui-specialist:lint

Analisa componentes Angular PO-UI para os 18 quirks e anti-padrões conhecidos.
Com `--fix`, corrige automaticamente os problemas que têm fix seguro.

## Exemplos

```bash
# Apenas reportar problemas (sem alterar arquivos)
/poui-specialist:lint src/app/financeiro

# Reportar e corrigir automaticamente
/poui-specialist:lint src/app/financeiro --fix

# Ver o que seria corrigido sem alterar nada
/poui-specialist:lint src/app/financeiro --fix --dry-run
```

---

## Passo 1 — Descobrir arquivos

Listar todos os `.component.ts` e `.component.html` sob o caminho fornecido.

Se nenhum arquivo encontrado: informar e encerrar.

---

## Passo 2 — Executar verificações

Para cada componente encontrado, verificar:

### Verificações em `.component.ts`

| ID | Severidade | Verificação | Fix automático |
|----|-----------|-------------|---------------|
| L01 | ERROR | `ChangeDetectionStrategy.OnPush` ausente | sim |
| L02 | ERROR | Componente com `po-page-*` sem `ngAfterViewInit` + `detectChanges` (Quirk #1) | sim |
| L03 | WARNING | Estado local com `public x =` em vez de `signal()` | não (risco de quebra) |
| L04 | WARNING | `@Input()` em vez de `input()` | não (risco de quebra) |
| L05 | ERROR | `inject()` não usado — construtor com muitos parâmetros (Angular 17+ best practice) | não |
| L06 | WARNING | `subscribe()` sem callback `error:` — loading pode travar | sim (adiciona error: stub) |
| L07 | ERROR | Ausência de `loading.set(false)` no callback `error:` | sim |

### Verificações em `.component.html`

| ID | Severidade | Verificação | Fix automático |
|----|-----------|-------------|---------------|
| H01 | INFO | `*ngIf` em vez de `@if` (Angular 17+ Control Flow) | sim |
| H02 | INFO | `*ngFor` em vez de `@for` (Angular 17+ Control Flow) | sim |
| H03 | WARNING | `@for` sem `track` expression — impacto em performance | sim (track $index) |
| H04 | ERROR | `p-selected-rows` em `po-table` (não existe) (Quirk #6) | sim (remove atributo) |
| H05 | WARNING | `po-table` sem `[p-height]` em componente OnPush (Quirk #12) | não |
| H06 | WARNING | `p-max-length` em vez de `p-maxlength` (Quirk #4) | sim |
| H07 | ERROR | `(p-value-change)` em `po-dynamic-form` (não existe) (Quirk #13) | não (complexo) |

---

## Passo 3 — Apresentar relatório

```
/poui-specialist:lint — src/app/financeiro

Arquivos analisados: 8 componentes, 8 templates

ERRORS (3):
  titulos-list.component.ts:12   [L01] ChangeDetectionStrategy.OnPush ausente
  titulos-list.component.ts:34   [L02] po-page-list sem ngAfterViewInit + detectChanges (Quirk #1)
  titulos-list.component.html:23 [H04] p-selected-rows não existe em po-table (Quirk #6)

WARNINGS (4):
  pedidos-list.component.ts:45   [L06] subscribe() sem callback error:
  pedidos-list.component.html:12 [H01] *ngIf → @if disponível (Angular 17+)
  pedidos-list.component.html:28 [H01] *ngIf → @if disponível (Angular 17+)
  pedidos-edit.component.html:67 [H06] p-max-length → p-maxlength (Quirk #4)

INFO (2):
  dashboard.component.html:15    [H03] @for sem track expression

Total: 3 erros, 4 avisos, 2 infos

Para corrigir automaticamente os problemas com fix disponível:
  /poui-specialist:lint src/app/financeiro --fix
```

---

## Passo 4 — Aplicar fixes (somente com `--fix`)

Para cada problema com "Fix automático = sim":

### L01 — Adicionar OnPush

```typescript
// Antes
@Component({ selector: '...' })

// Depois
@Component({
  selector: '...',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
```

### L02 — Adicionar ngAfterViewInit

```typescript
import { AfterViewInit, ChangeDetectorRef, inject } from '@angular/core';

private readonly cdr = inject(ChangeDetectorRef);

ngAfterViewInit(): void {
  setTimeout(() => this.cdr.detectChanges());
}
```

### L07 — Adicionar loading.set(false) no error callback

```typescript
// Antes
error: () => { /* nada */ }

// Depois
error: () => { this.loading.set(false); }
```

### H01 — *ngIf → @if

```html
<!-- Antes --> <div *ngIf="cond">
<!-- Depois --> @if (cond) { <div> }
```

### H02 — *ngFor → @for

```html
<!-- Antes --> <tr *ngFor="let x of items">
<!-- Depois --> @for (x of items(); track x.id) { <tr> }
```

### H03 — @for sem track

```html
<!-- Antes --> @for (x of items()) {
<!-- Depois --> @for (x of items(); track $index) {
```

### H04 — Remover p-selected-rows

```html
<!-- Remove o atributo completamente; adicionar comentário explicando alternativa -->
<!-- Usar (p-selected) / (p-unselected) para acumular seleção manualmente -->
```

### H06 — p-max-length → p-maxlength

```html
<!-- Antes --> <po-input p-max-length="100">
<!-- Depois --> <po-input p-maxlength="100">
```

---

## Passo 5 — Resumo dos fixes aplicados

```
Fixes aplicados em src/app/financeiro:

✓ titulos-list.component.ts   — OnPush adicionado (L01)
✓ titulos-list.component.ts   — ngAfterViewInit adicionado (L02)
✓ titulos-list.component.html — p-selected-rows removido (H04)
✓ pedidos-list.component.html — *ngIf → @if (H01, 2 ocorrências)
✓ pedidos-edit.component.html — p-maxlength corrigido (H06)

Não corrigidos automaticamente (requerem análise manual):
⚠ pedidos-list.component.ts:45 [L06] — adicione callback error: no subscribe
⚠ dashboard.component.html:15  [H03] — adicione track expression no @for

Execute ng build para verificar compilação.
```
