# Template: modal-crud

Generates an all-in-one component combining list + add/edit in a modal dialog — the standard Protheus PO-UI pattern for simpler entities (no separate edit page/route needed).

Uses: `po-page-dynamic-search` + `po-modal` + `po-dynamic-form` + `PoDialogService`.

> **When to use vs `page-edit`:**
> Use `modal-crud` for entities with **up to ~10 fields** that don't justify a full separate page.
> Use `page-edit` for complex forms with sections, many fields, or nested data.

## {{kebab-name}}.component.ts

```typescript
import {
  Component,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  DestroyRef,
  OnInit,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs/operators';
import {
  PoDynamicFormComponent,
  PoDynamicFormField,
  PoDynamicModule,
  PoDialogService,
  PoModalAction,
  PoModalComponent,
  PoModalModule,
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
  imports: [
    PoPageDynamicSearchModule,
    PoTableModule,
    PoModalModule,
    PoDynamicModule,
    PoToolbarModule,
  ],
  templateUrl: './{{kebab-name}}.component.html',
  styleUrl: './{{kebab-name}}.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class {{ComponentClass}} implements OnInit {
  @ViewChild(PoModalComponent)       private poModal!: PoModalComponent;
  @ViewChild(PoDynamicFormComponent) private dynamicForm!: PoDynamicFormComponent;

  private readonly service = inject({{ServiceClass}});
  private readonly notification = inject(PoNotificationService);
  private readonly dialog = inject(PoDialogService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  readonly title = '{{ComponentClass}}';
  readonly items = signal<{{ModelInterface}}[]>([]);
  readonly loading = signal(false);
  readonly hasNext = signal(false);

  private currentPage = 1;
  private readonly pageSize = 10;
  private activeFilters = '';
  private isEdit = false;
  private editId = '';

  // Bound to po-dynamic-form via [(p-value)]
  formValues: Partial<{{ModelInterface}}> = {};

  // TODO: define columns matching {{ModelInterface}} fields
  readonly columns: PoTableColumn[] = [
    // Example:
    // { property: 'codigo',    label: 'Código',    width: '10%' },
    // { property: 'descricao', label: 'Descrição' },
    // { property: 'tipo',      label: 'Tipo',      width: '10%' },
  ];

  // TODO: define form fields for add/edit modal
  // gridColumns: 6 = half width, 12 = full width in the modal form
  readonly fields: PoDynamicFormField[] = [
    // { property: 'codigo',    label: 'Código',     required: true, maxLength: 6,  gridColumns: 6 },
    // { property: 'descricao', label: 'Descrição',  required: true, maxLength: 40, gridColumns: 12 },
    // { property: 'tipo', label: 'Tipo', gridColumns: 6,
    //   options: [{ value: 'PA', label: 'PA' }, { value: 'PI', label: 'PI' }] },
  ];

  // TODO: define advanced search filters (shown in filter sidebar)
  readonly advancedFilters: PoPageDynamicSearchFilters[] = [
    // { property: 'codigo',    label: 'Código',    gridColumns: 6 },
    // { property: 'descricao', label: 'Descrição', gridColumns: 6 },
  ];

  readonly pageActions: PoPageAction[] = [
    { label: 'Incluir', action: () => this.openModal() },
  ];

  readonly tableActions: PoTableAction[] = [
    {
      label: 'Editar',
      icon: 'po-icon-edit',
      action: (row: {{ModelInterface}}) => this.openModal(row),
    },
    {
      label: 'Excluir',
      icon: 'po-icon-delete',
      type: 'danger',
      action: (row: {{ModelInterface}}) => this.confirmDelete(row),
    },
  ];

  readonly confirmarModal: PoModalAction = {
    label: 'Salvar',
    action: () => this.save(),
  };

  readonly cancelarModal: PoModalAction = {
    label: 'Cancelar',
    action: () => this.poModal.close(),
  };

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

  private openModal(row?: {{ModelInterface}}): void {
    if (row) {
      this.isEdit = true;
      this.editId = (row as any)['id'] ?? '';
      this.formValues = { ...row };
    } else {
      this.isEdit = false;
      this.editId = '';
      this.formValues = {};
    }
    // Trigger change detection before opening so form receives updated values
    this.cdr.markForCheck();
    this.poModal.open();
  }

  private save(): void {
    const data = this.dynamicForm.value as Partial<{{ModelInterface}}>;
    const request$ = this.isEdit
      ? this.service.update(this.editId, data)
      : this.service.create(data);

    request$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notification.success(
            this.isEdit ? 'Registro alterado com sucesso.' : 'Registro incluído com sucesso.'
          );
          this.poModal.close();
          this.currentPage = 1;
          this.load();
        },
        error: (err) => this.notification.error(this.parseProtheusError(err)),
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
    this.service.delete((row as any)['id'])
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => {
          this.notification.success('Registro excluído com sucesso.');
          this.items.update((prev) => prev.filter((r) => (r as any)['id'] !== (row as any)['id']));
        },
        error: (err) => this.notification.error(this.parseProtheusError(err)),
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

<po-modal
  p-title="Manutenção de {{ModelInterface}}"
  [p-primary-action]="confirmarModal"
  [p-secondary-action]="cancelarModal">

  <po-dynamic-form
    [p-fields]="fields"
    [(p-value)]="formValues">
  </po-dynamic-form>

</po-modal>
```

## {{kebab-name}}.component.scss

```scss
// Add component-specific styles here
```
