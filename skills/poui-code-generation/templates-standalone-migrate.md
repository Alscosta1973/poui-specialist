# Template: NgModule → Standalone Migration

Use this template when the user has a legacy Angular component using NgModule patterns
and wants to convert it to a modern Angular 17+ standalone component.

---

## Placeholders

| Placeholder | Description | Example |
|-------------|-------------|---------|
| `{{ComponentClass}}` | Existing class name (unchanged) | `PedidosListComponent` |
| `{{kebab-name}}` | File name (unchanged) | `pedidos-list` |
| `{{moduleName}}` | Feature folder | `financeiro` |

---

## Migration Checklist

Before generating, read the existing `.component.ts` and identify:

1. **NgModule** — which module declared this component? (needed to find all imports)
2. **Imports used in template** — `*ngFor`, `[routerLink]`, `async` pipe, PO-UI components
3. **Injected services** — constructor params → convert to `inject()`
4. **@Input/@Output** — count and types → convert to `input<T>()`/`output<T>()`
5. **Lifecycle hooks** — which interfaces are implemented
6. **`ChangeDetectionStrategy`** — add `OnPush` if missing

---

## Transformation Map

| NgModule pattern | Standalone equivalent |
|------------------|----------------------|
| `@NgModule({ declarations: [Comp] })` | Remove — standalone component self-declares |
| `imports: [CommonModule]` in NgModule | `imports: [NgIf, NgFor, AsyncPipe]` in `@Component` |
| `imports: [RouterModule]` | `imports: [RouterLink, RouterOutlet]` |
| `constructor(private svc: MyService)` | `private svc = inject(MyService);` |
| `@Input() value: T` | `readonly value = input<T>();` |
| `@Output() change = new EventEmitter<T>()` | `readonly change = output<T>();` |
| `@HostListener(...)` | Keep as-is (compatible) |
| `ngOnDestroy + takeUntil(destroy$)` | `takeUntilDestroyed(inject(DestroyRef))` |
| `markForCheck()` manually | Keep when needed; add `ngAfterViewInit` + `setTimeout(() => cdr.detectChanges())` for po-page-* |

---

## Before (NgModule component)

```typescript
// ANTES — padrão legado NgModule
import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { {{ComponentClass}}Service } from '../{{kebab-name}}.service';

@Component({
  selector: 'app-{{kebab-name}}',
  templateUrl: './{{kebab-name}}.component.html',
  styleUrls: ['./{{kebab-name}}.component.scss'],
  // sem changeDetection (Default)
})
export class {{ComponentClass}} implements OnInit, OnDestroy {
  @Input() titulo: string = '';
  @Output() acaoExecutada = new EventEmitter<string>();

  items: any[] = [];
  loading = false;

  private destroy$ = new Subject<void>();

  constructor(private service: {{ComponentClass}}Service) {}

  ngOnInit(): void { this.load(); }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  private load(): void {
    this.loading = true;
    this.service.getAll().pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => { this.items = res.items; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }
}
```

---

## After (Standalone Angular 17+ component)

```typescript
/**
 * @generated  poui-specialist v1.12.1
 * @author     Andre Costa <andre.andrelscosta@gmail.com>
 * @license    Uso permitido · redistribuição proibida sem autorização escrita
 * @see        https://github.com/Alscosta1973/poui-specialist
 */
import {
  Component,
  ChangeDetectionStrategy,
  DestroyRef,
  OnInit,
  AfterViewInit,
  ChangeDetectorRef,
  inject,
  signal,
  input,
  output,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PoPageModule, PoTableModule, PoNotificationService } from '@po-ui/ng-components';
import { {{ComponentClass}}Service } from '../{{kebab-name}}.service';
import { ItemModel } from '../models/item.model'; // ajustar conforme modelo real

@Component({
  selector: 'app-{{kebab-name}}',
  standalone: true,
  imports: [PoPageModule, PoTableModule], // ajustar para imports reais do template
  templateUrl: './{{kebab-name}}.component.html',
  styleUrl: './{{kebab-name}}.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class {{ComponentClass}} implements OnInit, AfterViewInit {
  // Serviços via inject()
  private readonly service      = inject({{ComponentClass}}Service);
  private readonly notification = inject(PoNotificationService);
  private readonly destroyRef   = inject(DestroyRef);
  private readonly cdr          = inject(ChangeDetectorRef);

  // Signals para estado local
  readonly items   = signal<ItemModel[]>([]);
  readonly loading = signal(false);
  readonly hasNext = signal(false);

  // Inputs como signals (Angular 17+)
  readonly titulo = input<string>('');

  // Outputs como signals (Angular 17+)
  readonly acaoExecutada = output<string>();

  ngOnInit(): void { this.load(); }

  // Obrigatório para po-page-* com OnPush — sem isso a tela fica em branco ao navegar
  ngAfterViewInit(): void { setTimeout(() => this.cdr.detectChanges()); }

  private load(): void {
    this.loading.set(true);
    this.service.getAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.items.set(res.items);
          this.hasNext.set(res.hasNext);
          this.loading.set(false);
        },
        error: () => {
          this.notification.error('Erro ao carregar registros.');
          this.loading.set(false);
        },
      });
  }
}
```

---

## NgModule Cleanup

After converting the component to standalone, update the NgModule that previously declared it:

```typescript
// ANTES
@NgModule({
  declarations: [{{ComponentClass}}],          // ← remover
  imports: [CommonModule, RouterModule],
  exports: [{{ComponentClass}}],               // ← remover
})
export class FinanceiroModule {}

// DEPOIS (se o módulo ainda é necessário para outros componentes)
@NgModule({
  imports: [{{ComponentClass}}],               // ← migrar para imports se exportado
})
export class FinanceiroModule {}

// Se o módulo só existia para declarar este componente — pode deletar o módulo inteiro
// e migrar todas as rotas para loadComponent lazy routes.
```

---

## Route Update

```typescript
// ANTES — componente em NgModule
{ path: '{{kebab-name}}', component: {{ComponentClass}} }

// DEPOIS — lazy loadComponent standalone
{
  path: '{{kebab-name}}',
  loadComponent: () =>
    import('./{{moduleName}}/{{kebab-name}}/{{kebab-name}}.component')
      .then(m => m.{{ComponentClass}}),
}
```

---

## Common Pitfalls

| Problema | Causa | Fix |
|----------|-------|-----|
| Tela em branco após migração | Faltou `ngAfterViewInit` + `setTimeout(() => cdr.detectChanges())` | Adicionar lifecycle hook |
| `NG0304: 'po-table' is not a known element` | `PoTableModule` não está em `imports: []` do componente | Adicionar ao array `imports` no `@Component` |
| `input()` retorna `Signal<T>`, template recebe `T` | Template usava `titulo` mas agora precisa de `titulo()` | Atualizar template: `{{ titulo() }}` |
| `output()` não emite | Código usava `.emit()` — output signal usa `.emit()` também | Compatível: `this.acaoExecutada.emit(valor)` |
