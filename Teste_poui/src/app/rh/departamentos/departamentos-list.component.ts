/**
 * @generated  poui-specialist v1.3
 * @author     Andre Costa <andre.andrelscosta@gmail.com>
 * @license    Uso permitido · redistribuição proibida sem autorização escrita
 * @see        https://github.com/Alscosta1973/poui-specialist
 */
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
} from '@po-ui/ng-components';
import {
  PoPageDynamicSearchFilters,
  PoPageDynamicSearchModule,
} from '@po-ui/ng-templates';
import { DepartamentosService } from './departamentos.service';
import { Departamento } from './departamento.model';

@Component({
  selector: 'app-departamentos-list',
  standalone: true,
  imports: [
    PoPageDynamicSearchModule,
    PoTableModule,
    PoModalModule,
    PoDynamicModule,
  ],
  templateUrl: './departamentos-list.component.html',
  styleUrl: './departamentos-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DepartamentosListComponent implements OnInit, AfterViewInit {
  @ViewChild(PoModalComponent)       private poModal!: PoModalComponent;
  @ViewChild(PoDynamicFormComponent) private dynamicForm!: PoDynamicFormComponent;

  private readonly service      = inject(DepartamentosService);
  private readonly notification = inject(PoNotificationService);
  private readonly dialog       = inject(PoDialogService);
  private readonly cdr          = inject(ChangeDetectorRef);
  private readonly destroyRef   = inject(DestroyRef);

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  readonly items      = signal<Departamento[]>([]);
  readonly loading    = signal(false);
  readonly hasNext    = signal(false);
  // Signal com a definição de campos do modal — atualizado em openModal()
  // para alternar o disabled do codDepto entre inclusão e edição (Quirk #14)
  readonly formFields = signal<PoDynamicFormField[]>([]);

  // Propriedade simples (não signal) para two-way binding com [(p-value)]
  // do po-dynamic-form. Valor lido em save() via this.dynamicForm.value.
  formValues: Partial<Departamento> = {};

  private currentPage            = 1;
  private readonly pageSize      = 10;
  private currentFilters: Record<string, string> = {};
  private isEdit                 = false;
  private editId                 = '';

  // ---------------------------------------------------------------------------
  // Table columns
  // ---------------------------------------------------------------------------

  readonly columns: PoTableColumn[] = [
    { property: 'codDepto',    label: 'Código',  width: '12%' },
    { property: 'nomeDepto',   label: 'Nome' },
    { property: 'gestorDepto', label: 'Gestor',  width: '22%' },
    {
      property: 'ativo',
      label: 'Ativo',
      width: '8%',
      type: 'boolean',
    },
  ];

  // ---------------------------------------------------------------------------
  // Advanced search filters
  // ---------------------------------------------------------------------------

  readonly advancedFilters: PoPageDynamicSearchFilters[] = [
    { property: 'nomeDepto', label: 'Nome',  gridColumns: 6 },
    {
      property: 'ativo',
      label: 'Ativo',
      gridColumns: 6,
      options: [
        { label: 'Sim', value: 'true'  },
        { label: 'Não', value: 'false' },
      ],
    },
  ];

  // ---------------------------------------------------------------------------
  // Page / table actions
  // ---------------------------------------------------------------------------

  readonly pageActions: PoPageAction[] = [
    { label: 'Incluir', icon: 'po-icon-plus', action: () => this.openModal() },
  ];

  readonly tableActions: PoTableAction[] = [
    {
      label: 'Editar',
      icon: 'po-icon-edit',
      action: (row: Departamento) => this.openModal(row),
    },
    {
      label: 'Excluir',
      icon: 'po-icon-delete',
      type: 'danger',
      action: (row: Departamento) => this.confirmDelete(row),
    },
  ];

  // ---------------------------------------------------------------------------
  // Modal actions
  // ---------------------------------------------------------------------------

  readonly confirmarModal: PoModalAction = {
    label: 'Salvar',
    action: () => this.save(),
  };

  readonly cancelarModal: PoModalAction = {
    label: 'Cancelar',
    action: () => this.poModal.close(),
  };

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  ngOnInit(): void {
    this.load();
  }

  // Quirk #4: ngAfterViewInit + setTimeout garante que o po-page-*
  // projete o ng-content corretamente no modo OnPush.
  ngAfterViewInit(): void {
    setTimeout(() => this.cdr.detectChanges());
  }

  // ---------------------------------------------------------------------------
  // Search handlers
  // ---------------------------------------------------------------------------

  onQuickSearch(term: string): void {
    this.currentPage    = 1;
    this.currentFilters = term ? { q: term } : {};
    this.load();
  }

  onAdvancedSearch(filters: { [key: string]: string }): void {
    this.currentPage = 1;
    this.currentFilters = Object.fromEntries(
      Object.entries(filters).filter(([, v]) => v !== null && v !== undefined && v !== ''),
    );
    this.load();
  }

  onChangeDisclaimers(disclaimers: { property: string; value: string }[]): void {
    this.currentPage    = 1;
    this.currentFilters = Object.fromEntries(
      disclaimers.map((d) => [d.property, d.value]),
    );
    this.load();
  }

  onShowMore(): void {
    this.currentPage++;
    this.load(true);
  }

  // ---------------------------------------------------------------------------
  // Modal
  // ---------------------------------------------------------------------------

  private openModal(row?: Departamento): void {
    if (row) {
      this.isEdit     = true;
      this.editId     = row.codDepto;
      this.formValues = { ...row };
      // No modo edição: codDepto é somente leitura (chave primária)
      this.formFields.set([
        { property: 'codDepto',    label: 'Código',  disabled: true,  gridColumns: 6  },
        { property: 'nomeDepto',   label: 'Nome',    required: true,  maxLength: 40,  gridColumns: 12 },
        { property: 'gestorDepto', label: 'Gestor',  gridColumns: 12 },
        { property: 'ativo',       label: 'Ativo',   type: 'boolean', gridColumns: 6  },
      ]);
    } else {
      this.isEdit     = false;
      this.editId     = '';
      this.formValues = { ativo: true };
      // No modo inclusão: codDepto editável e obrigatório
      this.formFields.set([
        { property: 'codDepto',    label: 'Código',  required: true,  maxLength: 6,   gridColumns: 6  },
        { property: 'nomeDepto',   label: 'Nome',    required: true,  maxLength: 40,  gridColumns: 12 },
        { property: 'gestorDepto', label: 'Gestor',  gridColumns: 12 },
        { property: 'ativo',       label: 'Ativo',   type: 'boolean', gridColumns: 6  },
      ]);
    }
    // markForCheck garante que o OnPush detecte a atualização antes de abrir o modal
    this.cdr.markForCheck();
    this.poModal.open();
  }

  private save(): void {
    const data     = this.dynamicForm.value as Partial<Departamento>;
    const request$ = this.isEdit
      ? this.service.update(this.editId, data)
      : this.service.create(data);

    request$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notification.success(
            this.isEdit
              ? 'Departamento alterado com sucesso.'
              : 'Departamento incluído com sucesso.',
          );
          this.poModal.close();
          this.currentPage = 1;
          this.load();
        },
        error: (err) => this.notification.error(this.parseProtheusError(err)),
      });
  }

  private confirmDelete(row: Departamento): void {
    this.dialog.confirm({
      title:   'Excluir departamento',
      message: `Deseja realmente excluir o departamento "${row.nomeDepto}"?`,
      confirm: () => this.deleteRecord(row),
    });
  }

  private deleteRecord(row: Departamento): void {
    this.loading.set(true);
    this.service
      .delete(row.codDepto)
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.notification.success('Departamento excluído com sucesso.');
          this.items.update((prev) => prev.filter((d) => d.codDepto !== row.codDepto));
        },
        error: (err) => this.notification.error(this.parseProtheusError(err)),
      });
  }

  // ---------------------------------------------------------------------------
  // Data loading
  // ---------------------------------------------------------------------------

  private load(append = false): void {
    this.loading.set(true);
    if (!append) this.items.set([]);
    this.service
      .getAll({
        page:     this.currentPage,
        pageSize: this.pageSize,
        ...this.currentFilters,
      })
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (res) => {
          if (append) {
            this.items.update((prev) => [...prev, ...res.items]);
          } else {
            this.items.set(res.items);
          }
          this.hasNext.set(res.hasNext);
        },
        error: () => this.notification.error('Erro ao carregar departamentos.'),
      });
  }

  // ---------------------------------------------------------------------------
  // Error helper
  // ---------------------------------------------------------------------------

  private parseProtheusError(err: unknown): string {
    const decode = (s: string): string => {
      try {
        return new TextDecoder('iso-8859-1').decode(
          Uint8Array.from(s, (c) => c.charCodeAt(0)),
        );
      } catch {
        return s;
      }
    };
    try {
      const e      = (err as { error?: { errorMessage?: string; message?: string } }).error;
      const errObj = JSON.parse(e?.errorMessage ?? '{}');
      const msg    = decode(errObj.message ?? '');
      const detail = errObj.detailedMessage ? ` — ${decode(errObj.detailedMessage)}` : '';
      return `Erro ${errObj.code}: ${msg}${detail}`;
    } catch {
      return (err as { error?: { message?: string } }).error?.message
        ?? 'Erro ao processar a requisição.';
    }
  }
}
