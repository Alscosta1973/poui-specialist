# Template: page-list

Gera um componente standalone `po-page-list` com `po-table`, paginação server-side, pesquisa rápida, confirmação via `PoDialogService` para exclusão e `finalize()` para estado de carregamento.

> **Regra de ícones:** Sempre use nomes `po-icon-*` (ex: `po-icon-edit`, `po-icon-delete`, `po-icon-plus`).
> Nunca use `an an-*` — esses são de uma biblioteca de ícones diferente.

> **Dica:** Para busca avançada com filtros/disclaimers, use `page-dynamic-search` em vez deste.
>
> **Debounce:** `filterSettings.action` dispara apenas no Enter/clique — não a cada tecla. Se o projeto exigir busca em tempo real (por digitação), consulte `skills/poui-patterns/po-ui-patterns-search.md` para o padrão `Subject + debounceTime + switchMap`.

## {{kebab-name}}.component.ts

```typescript
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs/operators';
import {
  PoDialogService,
  PoNotificationService,
  PoPageModule,
  PoTableModule,
  PoTableColumn,
  PoTableAction,
  PoPageAction,
  PoPageFilter,
} from '@po-ui/ng-components';
import { {{ServiceClass}} } from '../{{serviceFile}}';
import { {{ModelInterface}} } from '../models/{{modelFile}}.model';

@Component({
  selector: '{{selector}}',
  standalone: true,
  imports: [PoPageModule, PoTableModule],
  templateUrl: './{{kebab-name}}.component.html',
  styleUrl: './{{kebab-name}}.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class {{ComponentClass}} implements OnInit, AfterViewInit {
  private readonly service = inject({{ServiceClass}});
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly notification = inject(PoNotificationService);
  private readonly dialog = inject(PoDialogService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly title = '{{ComponentClass}}';
  readonly items = signal<{{ModelInterface}}[]>([]);
  readonly loading = signal(false);
  readonly hasNext = signal(false);

  private currentPage = 1;
  private readonly pageSize = 10;
  private lastSearch = '';

  // TODO: defina as colunas correspondentes aos campos de {{ModelInterface}}.
  // Use type:'label' + labels:[{value,color,label}] para campos de status.
  readonly columns: PoTableColumn[] = [
    // Exemplo:
    // { property: 'codigo',  label: 'Código',   width: '8%' },
    // { property: 'nome',    label: 'Nome' },
    // { property: 'situacao', label: 'Situação',
    //   type: 'label',
    //   labels: [
    //     { value: '1', color: 'color-07', label: 'Inativo' },
    //     { value: '2', color: 'color-11', label: 'Ativo'   },
    //   ],
    // },
  ];

  readonly tableActions: PoTableAction[] = [
    {
      label: 'Editar',
      icon: 'po-icon-edit',
      action: (row: {{ModelInterface}}) =>
        this.router.navigate([row['id']], { relativeTo: this.route }),
    },
    {
      label: 'Excluir',
      icon: 'po-icon-delete',
      type: 'danger',
      action: (row: {{ModelInterface}}) => this.confirmDelete(row),
    },
  ];

  readonly pageActions: PoPageAction[] = [
    {
      label: 'Incluir',
      icon: 'po-icon-plus',
      action: () => this.router.navigate(['novo'], { relativeTo: this.route }),
    },
  ];

  readonly filterSettings: PoPageFilter = {
    placeholder: 'Buscar...',
    action: (q: string) => this.onQuickSearch(q),
  };

  ngOnInit(): void {
    this.load();
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.cdr.detectChanges());
  }

  onQuickSearch(q: string): void {
    this.currentPage = 1;
    this.lastSearch = q;
    this.load(q);
  }

  onShowMore(): void {
    this.currentPage++;
    this.loading.set(true);
    this.service
      .getAll({ page: this.currentPage, pageSize: this.pageSize, q: this.lastSearch })
      .pipe(finalize(() => this.loading.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.items.update((prev) => [...prev, ...res.items]);
          this.hasNext.set(res.hasNext);
        },
        error: () => this.notification.error('Erro ao carregar mais registros.'),
      });
  }

  private load(q = ''): void {
    this.loading.set(true);
    this.service
      .getAll({ page: this.currentPage, pageSize: this.pageSize, q })
      .pipe(finalize(() => this.loading.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.items.set(res.items);
          this.hasNext.set(res.hasNext);
        },
        error: () => this.notification.error('Erro ao carregar registros.'),
      });
  }

  private confirmDelete(row: {{ModelInterface}}): void {
    this.dialog.confirm({
      title: 'Excluir registro',
      message: 'Deseja realmente excluir este registro?',
      confirm: () => this.delete(row),
    });
  }

  private delete(row: {{ModelInterface}}): void {
    this.loading.set(true);
    this.service.delete(row['id'])
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => {
          this.notification.success('Registro excluído com sucesso.');
          this.items.update((prev) => prev.filter((r) => r['id'] !== row['id']));
        },
        error: (err) => this.notification.error(this.parseProtheusError(err)),
      });
  }

  private parseProtheusError(err: unknown): string {
    try {
      const errObj = JSON.parse((err as any).error?.errorMessage ?? '{}');
      const decode = (s: string) => new TextDecoder('iso-8859-1').decode(
        Uint8Array.from(s, c => c.charCodeAt(0))
      );
      const msg    = decode(errObj.message ?? '');
      const detail = errObj.detailedMessage ? ` — ${decode(errObj.detailedMessage)}` : '';
      return `Erro ${errObj.code}: ${msg}${detail}`;
    } catch {
      return (err as any).error?.message ?? 'Erro ao processar a requisição.';
    }
  }
}
```

## {{kebab-name}}.component.html

```html
<po-page-list
  [p-title]="title"
  [p-actions]="pageActions"
  [p-filter]="filterSettings">

  <po-table
    [p-columns]="columns"
    [p-items]="items()"
    [p-loading]="loading()"
    [p-actions]="tableActions"
    [p-show-more-disabled]="!hasNext()"
    (p-show-more)="onShowMore()">
  </po-table>

</po-page-list>
```

## {{kebab-name}}.component.scss

```scss
// Adicione estilos específicos do componente aqui
```

## models/{{modelFile}}.model.ts

```typescript
export interface {{ModelInterface}} {
  // TODO: adicione os campos correspondentes à resposta REST do Protheus
}
```
