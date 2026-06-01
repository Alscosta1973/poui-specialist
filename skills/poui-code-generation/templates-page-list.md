# Template: page-list

Generates a standalone `po-page-list` component with `po-table`, server-side pagination, quick search, and PO-UI actions.

> **Icon rule:** Always use `po-icon-*` names (e.g., `po-icon-edit`, `po-icon-delete`, `po-icon-plus`).
> Never use `an an-*` — those are from a different icon library.

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
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  PoPageListModule,
  PoTableModule,
  PoTableColumn,
  PoTableAction,
  PoPageAction,
  PoPageFilter,
  PoNotificationService,
} from '@po-ui/ng-components';
import { {{ServiceClass}} } from '../{{serviceFile}}';
import { {{ModelInterface}} } from '../models/{{modelFile}}.model';

@Component({
  selector: '{{selector}}',
  standalone: true,
  imports: [PoPageListModule, PoTableModule],
  templateUrl: './{{kebab-name}}.component.html',
  styleUrl: './{{kebab-name}}.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class {{ComponentClass}} implements OnInit {
  private readonly service = inject({{ServiceClass}});
  private readonly router = inject(Router);
  private readonly notification = inject(PoNotificationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly title = '{{ComponentClass}}';
  readonly items = signal<{{ModelInterface}}[]>([]);
  readonly loading = signal(false);
  readonly hasNext = signal(false);

  private currentPage = 1;
  private readonly pageSize = 10;
  private lastSearch = '';

  // TODO: define columns matching {{ModelInterface}} fields.
  // Use type:'label' + labels:[{value,color,label}] for status fields.
  readonly columns: PoTableColumn[] = [
    // Example:
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
      action: (row: {{ModelInterface}}) => this.router.navigate([row['id']]),
    },
    {
      label: 'Excluir',
      icon: 'po-icon-delete',
      type: 'danger',
      action: (row: {{ModelInterface}}) => this.delete(row),
    },
  ];

  readonly pageActions: PoPageAction[] = [
    {
      label: 'Novo',
      icon: 'po-icon-plus',
      action: () => this.router.navigate(['novo']),
    },
  ];

  readonly filterSettings: PoPageFilter = {
    placeholder: 'Buscar...',
    action: (q: string) => this.onQuickSearch(q),
  };

  ngOnInit(): void {
    this.load();
  }

  onQuickSearch(q: string): void {
    this.currentPage = 1;
    this.lastSearch = q;
    this.load(q);
  }

  onShowMore(): void {
    this.currentPage++;
    this.service
      .getAll({ page: this.currentPage, pageSize: this.pageSize, q: this.lastSearch })
      .pipe(takeUntilDestroyed(this.destroyRef))
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

  private delete(row: {{ModelInterface}}): void {
    this.service.delete(row['id']).subscribe({
      next: () => {
        this.notification.success('Registro excluído com sucesso.');
        this.items.update((prev) => prev.filter((r) => r['id'] !== row['id']));
      },
      error: () => this.notification.error('Erro ao excluir registro.'),
    });
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
// Add component-specific styles here
```

## models/{{modelFile}}.model.ts

```typescript
export interface {{ModelInterface}} {
  // TODO: add fields matching the Protheus REST response
}
```
