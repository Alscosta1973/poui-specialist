# Template: infinite-scroll

Lista com carregamento automático ao rolar a página usando `IntersectionObserver`.
Alternativa ao botão "Ver mais" (`show-more`) quando a UX pede carregamento silencioso.

---

## Quando usar cada estratégia

| Estratégia | UX | Protheus backend | Quando escolher |
|------------|-----|-----------------|-----------------|
| **show-more** (po-table padrão) | Botão explícito | Offset pagination | Listas com paginação navegável; usuário controla o ritmo |
| **infinite-scroll** (este template) | Auto-load ao rolar | Offset ou cursor | Feeds, logs, listas longas sem necessidade de "ir para página N" |
| **CDK virtual scroll** | Todos os itens "presentes" no DOM virtual | Pré-load completo | Grades de milhares de linhas onde IntersectionObserver não é suficiente |

> **Avoid infinite scroll em:** tabelas de reconciliação/comparação onde o usuário precisa
> saltar entre registros específicos; listas com ações críticas por linha (aprovação individual).

---

## {{kebab-name}}.component.ts

```typescript
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs/operators';
import {
  PoNotificationService,
  PoPageModule,
  PoTableColumn,
  PoTableModule,
  PoToolbarModule,
} from '@po-ui/ng-components';
import { {{ModelInterface}} } from './{{kebab-name}}.model';
import { {{ServiceClass}} } from './{{kebab-name}}.service';

@Component({
  selector: '{{selector}}',
  standalone: true,
  imports: [PoPageModule, PoToolbarModule, PoTableModule],
  templateUrl: './{{kebab-name}}.component.html',
  styleUrl: './{{kebab-name}}.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class {{ComponentClass}} implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('scrollSentinel') private sentinelEl!: ElementRef<HTMLDivElement>;

  private readonly service      = inject({{ServiceClass}});
  private readonly notification = inject(PoNotificationService);
  private readonly destroyRef   = inject(DestroyRef);
  private readonly cdr          = inject(ChangeDetectorRef);

  private intersectionObserver?: IntersectionObserver;
  private currentPage = 1;
  private readonly pageSize = 20;

  readonly items       = signal<{{ModelInterface}}[]>([]);
  readonly loading     = signal(false);     // carregamento inicial (substitui todo o conteúdo)
  readonly loadingMore = signal(false);     // carregamento incremental (ao rolar)
  readonly hasNext     = signal(false);

  readonly columns: PoTableColumn[] = [
    // TODO: definir colunas conforme o modelo
    // { property: 'codigo',    label: 'Código',    width: '10%' },
    // { property: 'descricao', label: 'Descrição' },
  ];

  ngOnInit(): void {
    this.load();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.cdr.detectChanges();
      this.setupObserver();
    });
  }

  ngOnDestroy(): void {
    this.intersectionObserver?.disconnect();
  }

  onQuickSearch(term: string): void {
    // Ao pesquisar, recomeça da página 1
    this.load(term);
  }

  private load(q = ''): void {
    this.currentPage = 1;
    this.loading.set(true);

    this.service
      .getAll({ page: this.currentPage, pageSize: this.pageSize, q })
      .pipe(finalize(() => this.loading.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          this.items.set(res.items);
          this.hasNext.set(res.hasNext);
        },
        error: () => this.notification.error('Erro ao carregar registros.'),
      });
  }

  private loadMore(): void {
    if (this.loadingMore() || !this.hasNext()) return;

    this.currentPage++;
    this.loadingMore.set(true);

    this.service
      .getAll({ page: this.currentPage, pageSize: this.pageSize })
      .pipe(finalize(() => this.loadingMore.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          this.items.update(prev => [...prev, ...res.items]);
          this.hasNext.set(res.hasNext);
        },
        error: () => {
          this.currentPage--;   // rollback para evitar lacuna na sequência de páginas
          this.notification.error('Erro ao carregar mais itens.');
        },
      });
  }

  private setupObserver(): void {
    const sentinel = this.sentinelEl?.nativeElement;
    if (!sentinel) return;

    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          this.loadMore();
        }
      },
      { rootMargin: '150px' },   // dispara 150px ANTES do sentinel entrar na viewport
    );
    this.intersectionObserver.observe(sentinel);
  }
}
```

---

## {{kebab-name}}.component.html

```html
<po-toolbar p-title="{{PageTitle}}"></po-toolbar>

<po-page-list
  p-title="{{PageTitle}}"
  [p-search-placeholder]="'Buscar...'"
  (p-quick-search)="onQuickSearch($event)">

  <!-- Estado: carregamento inicial -->
  @if (loading()) {
    <po-loading-overlay p-text="Carregando..."></po-loading-overlay>
  }

  <!-- Tabela com todos os itens acumulados -->
  @if (!loading()) {
    <po-table
      [p-columns]="columns"
      [p-items]="items()"
      [p-striped]="true"
      [p-hide-select-all]="true"
      [p-show-more-disabled]="true">
    </po-table>

    <!-- Indicador de "carregando mais" -->
    @if (loadingMore()) {
      <div class="po-text-center po-mt-2 po-mb-2" style="color: var(--color-neutral-mid-60);">
        <span class="po-icon po-icon-refresh"></span>
        Carregando mais itens...
      </div>
    }

    <!-- Fim da lista -->
    @if (!hasNext() && items().length > 0) {
      <div class="po-text-center po-mt-2 po-mb-2" style="color: var(--color-neutral-mid-40); font-size: 0.85rem;">
        Todos os {{ items().length }} registros carregados.
      </div>
    }

    <!-- Sentinel — elemento observado pelo IntersectionObserver -->
    <!-- Deve ficar APÓS o último item visível, ANTES do fim do container rolável -->
    <div #scrollSentinel style="height: 1px; visibility: hidden;" aria-hidden="true"></div>
  }

</po-page-list>
```

---

## {{kebab-name}}.component.scss

```scss
// A lista ocupa toda a altura da viewport para que o scroll seja detectável.
// Remover se o scroll vier do body (padrão) e não de um container interno.
:host {
  display: block;
}
```

---

## Notas de implementação

### Por que `rootMargin: '150px'`?
O observer dispara quando o sentinel está **150px abaixo** da borda inferior do viewport — ou seja, o próximo lote é solicitado **antes** do usuário chegar ao final da lista. Ajustar para redes lentas (`200-300px`) ou redes rápidas (`50-80px`).

### `p-show-more-disabled="true"` na po-table
Desabilita o botão "Ver mais" interno da `po-table` — o scroll vai substituí-lo. Sem este atributo, a tabela renderiza o botão mesmo quando `hasNext` não está vinculado a ela.

### Guard duplo em `loadMore()`
```typescript
if (this.loadingMore() || !this.hasNext()) return;
```
Evita chamadas duplas quando o IntersectionObserver dispara múltiplas vezes rapidamente (ex: bounce no iOS).

### Rollback de `currentPage` em caso de erro
```typescript
this.currentPage--;   // rollback
```
Se a request falhar, a próxima rolagem tentará a mesma página novamente, evitando lacuna permanente na sequência.

### `ngOnDestroy` obrigatório
```typescript
ngOnDestroy(): void {
  this.intersectionObserver?.disconnect();
}
```
Sem disconnect, o observer continua observando depois do componente destruído — memory leak e possível chamada a componente destruído.

### IntersectionObserver não é interceptado pelo Angular
O callback do observer executa fora da zona Angular (Zone.js). Em OnPush, `signal.set()` dentro do callback **propaga corretamente** porque signals usam `ChangeDetectionRef.markForCheck()` internamente. Mas se você usar `@Output`/`EventEmitter` ou `ChangeDetectorRef.detectChanges()` diretamente, envolva em `NgZone.run()`:

```typescript
private readonly ngZone = inject(NgZone);

this.intersectionObserver = new IntersectionObserver(
  (entries) => {
    if (entries[0].isIntersecting) {
      this.ngZone.run(() => this.loadMore());
    }
  }
);
```

---

## Variante com cursor pagination

Substituir `currentPage` por `currentCursor` para tabelas com alta taxa de inserção
(ver `skills/poui-patterns/protheus-rest.md` → seção "Cursor Pagination"):

```typescript
private currentCursor: string | null = null;

private loadMore(): void {
  if (this.loadingMore() || !this.hasNext()) return;
  this.loadingMore.set(true);

  this.service
    .getAll({ cursor: this.currentCursor ?? undefined, pageSize: this.pageSize })
    .pipe(finalize(() => this.loadingMore.set(false)), takeUntilDestroyed(this.destroyRef))
    .subscribe({
      next: res => {
        this.items.update(prev => [...prev, ...res.items]);
        this.hasNext.set(res.hasNext);
        this.currentCursor = res.cursor ?? null;
      },
      error: () => this.notification.error('Erro ao carregar mais itens.'),
      // Sem rollback de cursor — cursor permanece o mesmo; próxima tentativa retentará
    });
}

private load(q = ''): void {
  this.currentCursor = null;   // reset cursor ao recarregar
  this.loading.set(true);
  // ...
}
```
