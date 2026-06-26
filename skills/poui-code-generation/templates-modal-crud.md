# Template: modal-crud

Lista + modal de inclusão/edição em um único componente para entidades simples (até ~10 campos); usa `po-page-dynamic-search` + `po-modal` + `po-dynamic-form` + `PoDialogService`. Use `page-edit` para formulários complexos com seções, muitos campos ou dados aninhados.

## {{kebab-name}}.component.ts

```typescript
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
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
export class {{ComponentClass}} implements OnInit, AfterViewInit {
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

  // Pré-popula o po-dynamic-form ao abrir modal de edição.
  // NÃO usar signal — causaria re-init do form a cada keystroke (Quirk #15).
  // Save lê this.dynamicForm.value (via @ViewChild), não this.formValues.
  formValues: Partial<{{ModelInterface}}> = {};

  // TODO: defina as colunas correspondentes aos campos de {{ModelInterface}}
  readonly columns: PoTableColumn[] = [
    // Exemplo:
    // { property: 'codigo',    label: 'Código',    width: '10%' },
    // { property: 'descricao', label: 'Descrição' },
    // { property: 'tipo',      label: 'Tipo',      width: '10%' },
  ];

  // TODO: defina os campos do formulário para o modal de inclusão/edição
  // gridColumns: 6 = meia largura, 12 = largura total no formulário do modal
  readonly fields: PoDynamicFormField[] = [
    // { property: 'codigo',    label: 'Código',     required: true, maxLength: 6,  gridColumns: 6 },
    // { property: 'descricao', label: 'Descrição',  required: true, maxLength: 40, gridColumns: 12 },
    // { property: 'tipo', label: 'Tipo', gridColumns: 6,
    //   options: [{ value: 'PA', label: 'PA' }, { value: 'PI', label: 'PI' }] },
  ];

  // TODO: defina os filtros de busca avançada (exibidos na barra lateral de filtros)
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

  ngAfterViewInit(): void {
    setTimeout(() => this.cdr.detectChanges());
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
    // Dispara detecção de mudanças antes de abrir para que o formulário receba os valores atualizados
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
// Adicione estilos específicos do componente aqui
```
