---
description: Analyze Angular PO-UI components for known quirks and anti-patterns, and Protheus sources (.prw/.tlpp) for Smart X rules SX01–SX11 — reports findings and optionally auto-fixes them
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, PowerShell, Skill
argument-hint: "<path> [--fix] [--dry-run]"
---

**IMPORTANT:** Always respond in the same language the user is writing in. If the user writes in Portuguese, respond in Portuguese.

# /poui-specialist:lint

Analisa componentes Angular PO-UI para os 19 quirks e anti-padrões conhecidos e, quando houver fontes
Protheus (`.prw`/`.prx`/`.tlpp`) no caminho, as regras Smart X SX01–SX11.
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

Listar todos os `.component.ts` e `.component.html` sob o caminho fornecido, mais o componente raiz do
Angular 21 (`app.ts` / `app.html`, o shell) e o `styles` global (`src/styles.scss` ou `src/styles.css`,
procurado a partir do caminho fornecido).

Listar também os fontes Protheus `.prw`, `.prx` e `.tlpp` sob o caminho (seção "Fontes Protheus" abaixo).

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
| L07 | ERROR | Ausência de `loading.set(false)` no callback `error:` **e** ausência de `.pipe(finalize(() => loading.set(false)), ...)` antes do `.subscribe(` — `finalize()` já garante o reset em sucesso e erro, então não é uma falha real quando presente | sim |

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
| H08 | WARNING | `po-combo` ligado a valor (`ngModel` / `[(ngModel)]` / `formControlName` / `[formControl]`) sem `p-remove-initial-filter` — ao abrir, a lista vem filtrada pelo valor atual e mostra só a opção escolhida (Quirk #19) | sim |
| H09 | WARNING | `po-menu` fora do padrão visual TOTVS: falta `[p-collapsed]="true"`, `[p-automatic-toggle]="true"` (abre ao passar o mouse) ou `p-logo` (TOTVS ou do cliente) — ver `skills/poui-patterns/padrao-totvs.md` | não |

---

### Verificações no `styles` global

| ID | Severidade | Verificação | Fix automático |
|----|-----------|-------------|----------------|
| S01 | WARNING | `styles.scss` fora do padrão visual TOTVS: `@import` de fonte (ex.: Open Sans), `font-family` que não seja `var(--font-family…)`, ou override de `--font-size-*` / `--font-family*` / `--target-size-*` (ignora comentários) — os apps TOTVS usam a fonte NunitoSans e os tamanhos do tema | não (revisar: pode haver motivo do cliente) |

> No shell raiz (`app.ts`), L06/L07 não se aplicam: os `subscribe` de lá são de eventos do router e do
> usuário logado, sem loading de tela.

### Fontes Protheus (.prw/.tlpp) — Smart X

Regras de `skills/smartx/smartx-rules.md` (fonte única — a extensão VS Code aplica as mesmas). Ignorar
comentários (`//`, `/* */`). "Fonte com Smart X" = chama `setSmartX` (função ou método).

| ID | Severidade | Verificação | Fix automático |
|----|-----------|-------------|----------------|
| SX01 | ERROR | Fonte com Smart X: legenda (`AddLegend` ou item do array de legendas do `mBrowse`) com cor literal fora do de-para de `skills/smartx/smartx-browse-migration.md` §2 e sem `cColorPoUi` (6º) | não (cor é decisão de negócio — sugerir a `caption-tag-NN` mais próxima) |
| SX02 | WARNING | `addOnChange` com mais de um contexto (`{"dataNew","dataEdit"}`) — trigger não dispara em campo com X3_VALID | sim (desdobra em uma chamada por contexto) |
| SX03 | ERROR | `addOnChange` com mais de um campo no 2º array | não |
| SX04 | ERROR | `setEvents(` na Interface — eventos só no Modelo | não |
| SX05 | WARNING | `setSmartX` sem `hasSmartX()` no fonte | não |
| SX06 | WARNING | `hasSmartX`/`setSmartX` sem `#include "fwmbrowse.ch"` | sim |
| SX07 | WARNING | Fonte com Smart X: `SetFilterDefault`/`AddFilterSmartX` com literal sem `@` | não |
| SX08 | WARNING | Fonte com Smart X: `DbSetFilter` (ignorado na nova visão) | não |
| SX09 | INFO | `addValidators(` substitui o X3_VALID do campo | não |
| SX10 | WARNING | `BuildAdvplAction` com `setAction(` e sem `setHasResponse(.T.)` | não |
| SX11 | ERROR | `setSmartX(` como função numa função que não chama `mBrowse(` | não |

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

SMART X (2):
  protheus/ZA0BRW.prw:12         [SX01] Cor "BR_LARANJA" fora do de-para sem cColorPoUi — exceção "Cor inválida para a legenda"
  protheus/ZA0CAD.model.tlpp:48  [SX02] addOnChange com 2 contextos — registre {"dataNew"} e {"dataEdit"} separados

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

### H08 — po-combo abre filtrado pelo valor atual

Só nos `po-combo` com ligação de valor; respeitar um `[p-remove-initial-filter]="false"` explícito
(não avisar). Combo sem ligação de valor começa vazio — não avisar.

```html
<!-- Antes -->  <po-combo name="statusSel" [p-options]="statusOptions" [ngModel]="statusSel">
<!-- Depois --> <po-combo [p-remove-initial-filter]="true" name="statusSel" [p-options]="statusOptions" [ngModel]="statusSel">
```

### SX02 — um contexto por addOnChange

```advpl
// Antes
oEvents:addOnChange({"dataNew", "dataEdit"}, {"ZA0_CEP"}, oAct:getAction())
// Depois
oEvents:addOnChange({"dataNew"},  {"ZA0_CEP"}, oAct:getAction())
oEvents:addOnChange({"dataEdit"}, {"ZA0_CEP"}, oAct:getAction())
```

### SX06 — incluir fwmbrowse.ch

```advpl
#include "protheus.ch"
#include "fwmbrowse.ch"   // adicionado logo após o último #include existente
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
