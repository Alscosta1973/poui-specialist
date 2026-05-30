# Template: page-list

Generates a standalone `po-page-list` component with `po-table`, server-side pagination, and quick search.

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
  private readonly destroyRef = inject(DestroyRef);

  readonly title = '{{ComponentClass}}';
  readonly items = signal<{{ModelInterface}}[]>([]);
  readonly loading = signal(false);
  readonly hasNext = signal(false);

  private currentPage = 1;
  private readonly pageSize = 10;
  private lastSearch = '';

  // TODO: add columns matching {{ModelInterface}} fields
  readonly columns: PoTableColumn[] = [];

  readonly tableActions: PoTableAction[] = [
    {
      label: 'Editar',
      icon: 'po-icon-edit',
      action: (row: {{ModelInterface}}) => this.router.navigate([row['id']]),
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
      .subscribe((res) => {
        this.items.update((prev) => [...prev, ...res.items]);
        this.hasNext.set(res.hasNext);
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
        error: () => this.loading.set(false),
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
