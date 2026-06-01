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
import { ProdutosService } from './produtos.service';
import { Produto } from './models/produto.model';

@Component({
  selector: 'app-produtos',
  standalone: true,
  imports: [
    PoPageDynamicSearchModule,
    PoTableModule,
    PoModalModule,
    PoDynamicModule,
    PoToolbarModule,
  ],
  templateUrl: './produtos.component.html',
  styleUrl: './produtos.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProdutosComponent implements OnInit {
  @ViewChild(PoModalComponent)       private poModal!: PoModalComponent;
  @ViewChild(PoDynamicFormComponent) private dynamicForm!: PoDynamicFormComponent;

  private readonly service = inject(ProdutosService);
  private readonly notification = inject(PoNotificationService);
  private readonly dialog = inject(PoDialogService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  readonly title = 'Cadastro de Produtos';
  readonly items = signal<Produto[]>([]);
  readonly loading = signal(false);
  readonly hasNext = signal(false);

  private currentPage = 1;
  private readonly pageSize = 20;
  private activeFilters = '';
  private isEdit = false;
  private editCodigo = '';

  formValues: Partial<Produto> = {};

  readonly columns: PoTableColumn[] = [
    { property: 'codigo',   label: 'Código',        width: '20%' },
    { property: 'descricao', label: 'Descrição',    width: '40%' },
    { property: 'tipo',     label: 'Tipo',          width: '15%' },
    { property: 'unidade',  label: 'Unidade',       width: '10%' },
    { property: 'armazem',  label: 'Armazém',       width: '15%' },
  ];

  readonly fields: PoDynamicFormField[] = [
    {
      property: 'codigo',
      label: 'Código do Produto',
      required: true,
      maxLength: 30,
      gridColumns: 12,
    },
    {
      property: 'descricao',
      label: 'Descrição do Produto',
      required: true,
      gridColumns: 12,
    },
    {
      property: 'tipo',
      label: 'Tipo',
      gridColumns: 6,
      options: [
        { value: 'PA', label: 'PA - Produto Acabado' },
        { value: 'PI', label: 'PI - Produto Intermediário' },
        { value: 'MP', label: 'MP - Matéria Prima' },
        { value: 'KT', label: 'KT - Kit' },
        { value: 'EM', label: 'EM - Embalagem' },
      ],
    },
    {
      property: 'unidade',
      label: 'Unidade',
      maxLength: 2,
      gridColumns: 6,
    },
    {
      property: 'armazem',
      label: 'Armazém',
      maxLength: 2,
      gridColumns: 6,
    },
  ];

  readonly advancedFilters: PoPageDynamicSearchFilters[] = [
    { property: 'codigo',   label: 'Código',    gridColumns: 6 },
    { property: 'descricao', label: 'Descrição', gridColumns: 6 },
    {
      property: 'tipo',
      label: 'Tipo',
      gridColumns: 6,
      options: [
        { value: 'PA', label: 'PA' },
        { value: 'PI', label: 'PI' },
        { value: 'MP', label: 'MP' },
        { value: 'KT', label: 'KT' },
        { value: 'EM', label: 'EM' },
      ],
    },
  ];

  readonly pageActions: PoPageAction[] = [
    { label: 'Incluir', action: () => this.openModal() },
  ];

  readonly tableActions: PoTableAction[] = [
    {
      label: 'Editar',
      icon: 'po-icon-edit',
      action: (row: Produto) => this.openModal(row),
    },
    {
      label: 'Excluir',
      icon: 'po-icon-delete',
      type: 'danger',
      action: (row: Produto) => this.confirmDelete(row),
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
    this.activeFilters = term ? `codigo=${term}` : '';
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
        error: () => this.notification.error('Erro ao carregar mais produtos.'),
      });
  }

  private openModal(row?: Produto): void {
    if (row) {
      this.isEdit = true;
      this.editCodigo = row.codigo;
      this.formValues = { ...row };
    } else {
      this.isEdit = false;
      this.editCodigo = '';
      this.formValues = {};
    }
    this.cdr.markForCheck();
    this.poModal.open();
  }

  private save(): void {
    const data = this.dynamicForm.value as Partial<Produto>;
    const request$ = this.isEdit
      ? this.service.update(this.editCodigo, data)
      : this.service.create(data);

    request$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notification.success(
            this.isEdit ? 'Produto alterado com sucesso.' : 'Produto cadastrado com sucesso.'
          );
          this.poModal.close();
          this.currentPage = 1;
          this.load();
        },
        error: (err) => this.notification.error(this.parseProtheusError(err)),
      });
  }

  private confirmDelete(row: Produto): void {
    this.dialog.confirm({
      title: 'Excluir Produto',
      message: `Deseja excluir o produto "${row.descricao}"?`,
      confirm: () => this.delete(row),
    });
  }

  private delete(row: Produto): void {
    this.loading.set(true);
    this.service.delete(row.codigo)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => {
          this.notification.success(`Produto "${row.descricao}" excluído com sucesso.`);
          this.items.update((prev) => prev.filter((p) => p.codigo !== row.codigo));
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
        error: () => this.notification.error('Erro ao carregar produtos.'),
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
