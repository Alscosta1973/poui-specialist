# Template: page-dynamic-search

Gera um componente de lista standalone usando `po-page-dynamic-search` de `@po-ui/ng-templates` — o padrão Protheus para páginas de busca com pesquisa rápida, pesquisa avançada e tags de filtros ativos (disclaimers). Navega para uma página de edição separada.

> **Quando usar vs `page-list`:**
> Use `page-dynamic-search` quando a entidade precisar de **busca avançada com múltiplos campos**. Use `page-list` para listas mais simples com apenas pesquisa rápida.

## {{kebab-name}}.component.ts

```typescript
import {
  Component,
  ChangeDetectionStrategy,
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
  PoPageAction,
  PoTableAction,
  PoTableColumn,
  PoTableModule,
  PoToolbarModule,
} from '@po-ui/ng-components';
import {
  PoPageDynamicSearchModule,
  PoPageDynamicSearchFilters,
} from '@po-ui/ng-templates';
import { {{ServiceClass}} } from '../{{serviceFile}}';
import { {{ModelInterface}} } from '../models/{{modelFile}}.model';

@Component({
  selector: '{{selector}}',
  standalone: true,
  imports: [PoPageDynamicSearchModule, PoTableModule, PoToolbarModule],
  templateUrl: './{{kebab-name}}.component.html',
  styleUrl: './{{kebab-name}}.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class {{ComponentClass}} implements OnInit {
  private readonly service = inject({{ServiceClass}});
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly notification = inject(PoNotificationService);
  private readonly dialog = inject(PoDialogService);
  private readonly destroyRef = inject(DestroyRef);

  readonly title = '{{ComponentClass}}';
  readonly items = signal<{{ModelInterface}}[]>([]);
  readonly loading = signal(false);
  readonly hasNext = signal(false);

  private currentPage = 1;
  private readonly pageSize = 10;
  private activeFilters = '';

  // TODO: defina as colunas; use type:'label' + labels:[{value,color,label}] para campos de status
  readonly columns: PoTableColumn[] = [];

  // TODO: defina os filtros de busca avançada (painel lateral); gridColumns 1-12
  readonly advancedFilters: PoPageDynamicSearchFilters[] = [
    // { property: 'codigo',    label: 'Código',     gridColumns: 6 },
    // { property: 'descricao', label: 'Descrição',  gridColumns: 6 },
    // { property: 'tipo', label: 'Tipo',
    //   options: [{ value: 'PA', label: 'PA' }, { value: 'PI', label: 'PI' }] },
  ];

  readonly pageActions: PoPageAction[] = [
    {
      label: 'Incluir',
      action: () => this.router.navigate(['novo'], { relativeTo: this.route }),
    },
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

  ngOnInit(): void {
    this.load();
  }

  onQuickSearch(term: string): void {
    this.currentPage = 1;
    this.activeFilters = term ? `q=${term}` : '';
    this.load();
  }

  onAdvancedSearch(filters: { [key: string]: string }): void {
    this.currentPage = 1;
    this.activeFilters = Object.entries(filters)
      .filter(([, v]) => v !== null && v !== undefined && v !== '')
      .map(([k, v]) => `${k}=${v}`)
      .join('&');
    this.load();
  }

  onChangeDisclaimers(disclaimers: { property: string; value: string }[]): void {
    this.currentPage = 1;
    this.activeFilters = disclaimers.map((d) => `${d.property}=${d.value}`).join('&');
    this.load();
  }

  onShowMore(): void {
    this.currentPage++;
    this.loading.set(true);
    this.service
      .getAll({ page: this.currentPage, pageSize: this.pageSize, q: this.activeFilters })
      .pipe(finalize(() => this.loading.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.items.update((prev) => [...prev, ...res.items]);
          this.hasNext.set(res.hasNext);
        },
        error: () => this.notification.error('Erro ao carregar mais registros.'),
      });
  }

  private load(): void {
    this.loading.set(true);
    if (this.currentPage === 1) this.items.set([]);
    this.service
      .getAll({ page: this.currentPage, pageSize: this.pageSize, q: this.activeFilters })
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

  private parseProtheusError(err: any): string {
    try {
      const errObj = JSON.parse(err.error?.errorMessage ?? '{}');
      const msg    = decodeURIComponent(escape(errObj.message ?? ''));
      const detail = errObj.detailedMessage
        ? ` — ${decodeURIComponent(escape(errObj.detailedMessage))}`
        : '';
      return `Erro ${errObj.code}: ${msg}${detail}`;
    } catch {
      return err.error?.message ?? 'Erro ao processar a requisição.';
    }
  }
}
```

## {{kebab-name}}.component.html

```html
<po-toolbar p-title="{{ComponentClass}}"></po-toolbar>

<po-page-dynamic-search
  p-title="{{ComponentClass}}"
  [p-actions]="pageActions"
  [p-filters]="advancedFilters"
  (p-quick-search)="onQuickSearch($event)"
  (p-advanced-search)="onAdvancedSearch($event)"
  (p-change-disclaimers)="onChangeDisclaimers($event)">

  <po-table
    [p-columns]="columns"
    [p-items]="items()"
    [p-loading]="loading()"
    [p-actions]="tableActions"
    [p-show-more-disabled]="!hasNext()"
    (p-show-more)="onShowMore()">
  </po-table>

</po-page-dynamic-search>
```

## {{kebab-name}}.component.scss

```scss
// Adicione estilos específicos do componente aqui
```
