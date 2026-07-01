# Padrão: Busca com Debounce + SwitchMap

Guia de quando e como aplicar debounce e cancelamento de requests em componentes PO-UI com Angular 17–21+.

---

## Quando usar debounce

| Cenário | Debounce necessário? | Por quê |
|---------|---------------------|---------|
| `po-page-list` com `filterSettings.action` | **Não** | `action` só dispara no Enter ou clique — não em cada tecla |
| `po-page-dynamic-search` com `(p-quick-search)` | **Não** | Output dispara no Enter; interno à lib |
| `po-input` personalizado com `(ngModelChange)` | **Sim** | Dispara a cada tecla digitada |
| `po-combo` com busca remota via `(p-change)` | **Sim** | Dispara a cada tecla |
| Campo de busca nativo `<input>` com `(input)` | **Sim** | Dispara a cada tecla |
| `po-lookup` com filtro personalizado | **Sim** | Consulta REST em cada tecla |

> **Regra:** se o trigger vem de um Output da lib PO-UI (po-page-list, po-page-dynamic-search), o debounce já está embutido. Se o trigger vem de um `(ngModelChange)` ou evento nativo, adicione debounce.

---

## Padrão — Subject + debounce + switchMap

```typescript
import {
  ChangeDetectionStrategy, ChangeDetectorRef, Component,
  DestroyRef, OnInit, inject, signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, switchMap, debounceTime, distinctUntilChanged } from 'rxjs';
import { PoNotificationService } from '@po-ui/ng-components';
import { MeuService } from './meu.service';
import { MeuModel } from './models/meu.model';

@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  // ...
})
export class MeuComponent implements OnInit {
  private readonly service     = inject(MeuService);
  private readonly notification = inject(PoNotificationService);
  private readonly destroyRef  = inject(DestroyRef);
  private readonly cdr         = inject(ChangeDetectorRef);

  readonly items   = signal<MeuModel[]>([]);
  readonly loading = signal(false);

  // Subject que recebe o texto digitado
  private readonly searchSubject = new Subject<string>();

  ngOnInit(): void {
    // Cancela request anterior quando usuário digita nova query (switchMap)
    // Evita disparar se valor não mudou (distinctUntilChanged)
    // Aguarda 400ms de pausa antes de disparar (debounceTime)
    this.searchSubject.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      switchMap(q => {
        this.loading.set(true);
        return this.service.search(q);
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: res => {
        this.items.set(res.items);
        this.loading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading.set(false);
        this.notification.error('Erro ao buscar registros.');
      },
    });

    // Carga inicial
    this.searchSubject.next('');
  }

  // Chamado por (ngModelChange) ou (input) de qualquer campo de busca
  onSearch(q: string): void {
    this.searchSubject.next(q);
  }
}
```

---

## Por que `switchMap` (não `mergeMap` ou `concatMap`)

| Operador | Comportamento | Usar quando |
|----------|--------------|-------------|
| `switchMap` | Cancela request anterior se novo chegar | **Busca** — só interessa o resultado mais recente |
| `mergeMap` | Executa todos em paralelo | Operações independentes (rare em busca) |
| `concatMap` | Enfileira — aguarda anterior terminar | Operações ordenadas (ex: salvar em sequência) |
| `exhaustMap` | Ignora novos enquanto há um em andamento | Botão de submit (evita duplo clique) |

Para busca, `switchMap` é sempre a escolha correta:
- Usuário digitou "jo", request saiu
- Usuário digitou "joa" antes de resposta anterior chegar
- `switchMap` cancela o request "jo" (AbortController) e envia "joa"
- Apenas 1 request ativo por vez, sempre o mais recente

---

## Padrão para `po-combo` com busca remota

```typescript
// Template: <po-combo [p-options]="comboItems()" (p-change)="onComboSearch($event)">

private readonly comboSearch = new Subject<string>();
readonly comboItems = signal<PoSelectOption[]>([]);

ngOnInit(): void {
  this.comboSearch.pipe(
    debounceTime(300),
    distinctUntilChanged(),
    switchMap(q => this.service.searchCombo(q)),
    takeUntilDestroyed(this.destroyRef),
  ).subscribe(items => {
    this.comboItems.set(items);
    this.cdr.markForCheck();
  });
}

onComboSearch(value: string): void {
  this.comboSearch.next(value ?? '');
}
```

---

## Integração no `po-page-list` (quando busca é em tempo real)

Se o projeto exigir pesquisa em tempo real (ex: ERP com tabela pequenarealtime), substitua o `filterSettings.action` pelo padrão de Subject:

```typescript
// Em vez de:
readonly filterSettings: PoPageFilter = {
  action: (q: string) => this.onQuickSearch(q),  // só no Enter
};

// Para busca em tempo real, use um po-input separado + Subject:
readonly searchQuery = signal('');

private readonly searchSubject = new Subject<string>();

// No template:
// <po-input p-label="Buscar" [ngModel]="searchQuery()"
//           (ngModelChange)="onSearchChange($event)">
// </po-input>

onSearchChange(q: string): void {
  this.searchQuery.set(q);
  this.searchSubject.next(q);
}
```

> **Nota:** `po-page-list` + `filterSettings.action` dispara apenas no Enter — é o padrão recomendado para ERP (evita requests desnecessários enquanto usuário está digitando).

---

## Referências

- Quirk relacionado: nenhum (padrão RxJS padrão)
- Ver também: `skills/poui-patterns/protheus-rest.md` para formato de resposta
- Operadores RxJS: `debounceTime`, `distinctUntilChanged`, `switchMap` (todos de `rxjs`)
