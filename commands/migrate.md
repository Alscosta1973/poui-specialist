---
description: Migrate an existing Angular component from NgModule to standalone + OnPush + signals — analyzes the component and produces the migrated version
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, PowerShell, Skill
argument-hint: "<component-file-path> [--dry-run]"
---

**IMPORTANT:** Always respond in the same language the user is writing in. If the user writes in Portuguese, respond in Portuguese.

## Passo 0 — Verificação de licença

Invocar a skill `poui-specialist:poui-license-check` antes de qualquer outra ação.
Se a skill retornar `status: expirado` ou `status: revogado`, encerrar imediatamente.

---

# /poui-specialist:migrate

Analisa um componente Angular legado (NgModule-based) e produz a versão migrada para **standalone + OnPush + signals**.

## Exemplos

```bash
# Migrar um componente específico
/poui-specialist:migrate src/app/financeiro/titulos/titulos.component.ts

# Apenas mostrar o que seria migrado (sem escrever arquivos)
/poui-specialist:migrate src/app/financeiro/titulos/titulos.component.ts --dry-run
```

---

## Passo 1 — Ler o componente

Ler o arquivo `.ts` fornecido. Se não existir: encerrar com erro.

Se o arquivo já for standalone (`standalone: true`): informar que não precisa de migração e encerrar.

---

## Passo 2 — Analisar e mapear mudanças

Para cada item abaixo, registrar o que precisa mudar:

| Item | Legado | Standalone + OnPush |
|------|--------|---------------------|
| Declaração | `@NgModule declarations: [X]` | remover do módulo; adicionar `standalone: true` |
| Change Detection | ausente ou `Default` | `changeDetection: ChangeDetectionStrategy.OnPush` |
| Estado local | `public x = valor` | `readonly x = signal(valor)` |
| Inputs | `@Input() x: T` | `readonly x = input<T>()` |
| Outputs | `@EventEmitter` | `readonly x = output<T>()` |
| Imports no template | via NgModule | listar imports explícitos em `imports: [...]` |
| `*ngIf` / `*ngFor` | diretivas estruturais | `@if` / `@for` (Angular 17+) |
| `ngOnInit` com chamada HTTP | `this.x = valor` | `this.x.set(valor)` |
| `ChangeDetectorRef.detectChanges()` | inject via construtor | `inject(ChangeDetectorRef)` |

---

## Passo 3 — Apresentar plano

Antes de escrever qualquer arquivo, listar:

```
Migrações identificadas em titulos.component.ts:

✓ Adicionar standalone: true
✓ Adicionar ChangeDetectionStrategy.OnPush  
✓ Migrar 3 propriedades @Input() para input()
✓ Migrar 2 @Output() EventEmitter para output()
✓ Migrar 4 variáveis de estado para signal()
✓ Substituir *ngIf (2 ocorrências) por @if
✓ Adicionar imports: [PoTableModule, PoPageModule, PoButtonModule]
✓ Adicionar ngAfterViewInit com detectChanges() (Quirk #1)

Arquivo afetado: src/app/financeiro/titulos/titulos.component.ts
Módulo a atualizar: src/app/financeiro/financeiro.module.ts (remover da declarations)

Prosseguir? (s/n)
```

Se `--dry-run`: encerrar após este passo sem escrever nada.

---

## Passo 4 — Aplicar migrações

### 4.1 — Atualizar o decorator `@Component`

```typescript
@Component({
  selector: '...',
  standalone: true,                                    // ← adicionar
  changeDetection: ChangeDetectionStrategy.OnPush,    // ← adicionar
  imports: [/* listar imports explícitos */],          // ← adicionar
  templateUrl: '...',
  styleUrl: '...',
})
```

### 4.2 — Migrar propriedades de estado

```typescript
// Antes
public loading = false;
public items: Pedido[] = [];

// Depois
readonly loading = signal(false);
readonly items   = signal<Pedido[]>([]);
```

### 4.3 — Migrar @Input() para input()

```typescript
// Antes
@Input() titulo: string = '';

// Depois
readonly titulo = input<string>('');
```

### 4.4 — Migrar @Output() para output()

```typescript
// Antes
@Output() salvo = new EventEmitter<Pedido>();
this.salvo.emit(pedido);

// Depois
readonly salvo = output<Pedido>();
this.salvo.emit(pedido);
```

### 4.5 — Atualizar atribuições para .set() / .update()

```typescript
// Antes
this.loading = true;
this.items = res.items;

// Depois
this.loading.set(true);
this.items.set(res.items);
```

### 4.6 — Migrar *ngIf → @if e *ngFor → @for no template HTML

```html
<!-- Antes -->
<div *ngIf="loading">Carregando...</div>
<tr *ngFor="let item of items">

<!-- Depois -->
@if (loading()) {
  <div>Carregando...</div>
}
@for (item of items(); track item.id) {
  <tr>
}
```

### 4.7 — Adicionar ngAfterViewInit (Quirk #1)

Se o componente usa `po-page-*`, adicionar obrigatoriamente:

```typescript
import { AfterViewInit, ChangeDetectorRef, inject } from '@angular/core';

private readonly cdr = inject(ChangeDetectorRef);

ngAfterViewInit(): void {
  setTimeout(() => this.cdr.detectChanges());
}
```

### 4.8 — Remover do NgModule

Ler o arquivo de módulo (`*.module.ts`) e remover o componente de `declarations`.

---

## Passo 5 — Confirmar

Exibir lista de arquivos escritos com caminho absoluto.
Sugerir: `ng build` para verificar compilação.
