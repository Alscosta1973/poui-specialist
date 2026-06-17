/**
 * @generated  poui-specialist v1.3
 * @author     Andre Costa <andre.andrelscosta@gmail.com>
 * @license    Uso permitido · redistribuição proibida sem autorização escrita
 * @see        https://github.com/Alscosta1973/poui-specialist
 */

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
} from '@po-ui/ng-components';
import {
  PoPageDynamicSearchModule,
  PoPageDynamicSearchFilters,
} from '@po-ui/ng-templates';
import { CadTaxaService } from './cad-taxa.service';
import { TaxaCartao } from './models/taxa-cartao.model';

const DEMO_TAXAS: TaxaCartao[] = [
  { id: '1', bandeira: 'Visa',       tipo: 'Credito', parcelas: 1,  taxa: 2.50, dtIni: '2024-01-01', dtFim: '2024-12-31' },
  { id: '2', bandeira: 'Visa',       tipo: 'Debito',  parcelas: 1,  taxa: 1.20, dtIni: '2024-01-01', dtFim: '2024-12-31' },
  { id: '3', bandeira: 'Mastercard', tipo: 'Credito', parcelas: 2,  taxa: 3.10, dtIni: '2024-01-01', dtFim: '2024-12-31' },
  { id: '4', bandeira: 'Elo',        tipo: 'Credito', parcelas: 1,  taxa: 2.80, dtIni: '2024-01-01', dtFim: '2024-12-31' },
  { id: '5', bandeira: 'Hipercard',  tipo: 'Debito',  parcelas: 1,  taxa: 1.50, dtIni: '2024-01-01', dtFim: '2024-12-31' },
];

@Component({
  selector: 'app-cad-taxa',
  standalone: true,
  imports: [
    PoPageDynamicSearchModule,
    PoTableModule,
    PoModalModule,
    PoDynamicModule,
  ],
  templateUrl: './cad-taxa.component.html',
  styleUrl: './cad-taxa.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CadTaxaComponent implements OnInit {
  @ViewChild(PoModalComponent)       private poModal!: PoModalComponent;
  @ViewChild(PoDynamicFormComponent) private dynamicForm!: PoDynamicFormComponent;

  private readonly service      = inject(CadTaxaService);
  private readonly notification = inject(PoNotificationService);
  private readonly dialog       = inject(PoDialogService);
  private readonly cdr          = inject(ChangeDetectorRef);
  private readonly destroyRef   = inject(DestroyRef);

  readonly title   = 'Cadastro de Taxas de Cartão';
  readonly items   = signal<TaxaCartao[]>([]);
  readonly loading = signal(false);
  readonly hasNext = signal(false);

  private currentPage   = 1;
  private readonly pageSize = 10;
  private activeFilters = '';
  private isEdit        = false;
  private editId        = '';

  formValues: Partial<TaxaCartao> = {};

  readonly columns: PoTableColumn[] = [
    { property: 'bandeira',  label: 'Bandeira',   width: '18%' },
    { property: 'tipo',      label: 'Tipo',        width: '14%' },
    { property: 'parcelas',  label: 'Parcelas',    width: '12%', type: 'number' },
    { property: 'taxa',      label: 'Taxa (%)',    width: '14%', type: 'number', format: '1.2-2' },
    { property: 'dtIni',     label: 'Vigência De', width: '16%', type: 'date', format: 'dd/MM/yyyy' },
    { property: 'dtFim',     label: 'Vigência Até', width: '16%', type: 'date', format: 'dd/MM/yyyy' },
  ];

  readonly fields: PoDynamicFormField[] = [
    {
      property: 'bandeira', label: 'Bandeira', required: true, gridColumns: 6,
      options: [
        { value: 'Visa',        label: 'Visa' },
        { value: 'Mastercard',  label: 'Mastercard' },
        { value: 'Elo',         label: 'Elo' },
        { value: 'Hipercard',   label: 'Hipercard' },
        { value: 'AmericanExpress', label: 'American Express' },
      ],
    },
    {
      property: 'tipo', label: 'Tipo', required: true, gridColumns: 6,
      options: [
        { value: 'Credito', label: 'Crédito' },
        { value: 'Debito',  label: 'Débito' },
      ],
    },
    { property: 'parcelas', label: 'Parcelas',    required: true, type: 'number', gridColumns: 4 },
    { property: 'taxa',     label: 'Taxa (%)',    required: true, type: 'number', decimalsLength: 2, gridColumns: 4 },
    { property: 'dtIni',    label: 'Vigência De', required: true, type: 'date',   gridColumns: 4 },
    { property: 'dtFim',    label: 'Vigência Até', required: true, type: 'date',  gridColumns: 4 },
  ];

  readonly advancedFilters: PoPageDynamicSearchFilters[] = [
    {
      property: 'bandeira', label: 'Bandeira', gridColumns: 6,
      options: [
        { value: 'Visa',            label: 'Visa' },
        { value: 'Mastercard',      label: 'Mastercard' },
        { value: 'Elo',             label: 'Elo' },
        { value: 'Hipercard',       label: 'Hipercard' },
        { value: 'AmericanExpress', label: 'American Express' },
      ],
    },
    {
      property: 'tipo', label: 'Tipo', gridColumns: 6,
      options: [
        { value: 'Credito', label: 'Crédito' },
        { value: 'Debito',  label: 'Débito' },
      ],
    },
  ];

  readonly pageActions: PoPageAction[] = [
    { label: 'Incluir', action: () => this.openModal() },
  ];

  readonly tableActions: PoTableAction[] = [
    { label: 'Editar',  icon: 'po-icon-edit',   action: (row: TaxaCartao) => this.openModal(row) },
    { label: 'Excluir', icon: 'po-icon-delete',  type: 'danger', action: (row: TaxaCartao) => this.confirmDelete(row) },
  ];

  readonly confirmarModal: PoModalAction = { label: 'Salvar',   action: () => this.save() };
  readonly cancelarModal:  PoModalAction = { label: 'Cancelar', action: () => this.poModal.close() };

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
    this.activeFilters = disclaimers.map(d => `${d.property}=${d.value}`).join('&');
    this.load();
  }

  onShowMore(): void {
    this.currentPage++;
    this.loading.set(true);
    this.service
      .getAll({ page: this.currentPage, pageSize: this.pageSize, q: this.activeFilters })
      .pipe(finalize(() => this.loading.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          this.items.update(prev => [...prev, ...res.items]);
          this.hasNext.set(res.hasNext);
        },
        error: () => this.notification.error('Erro ao carregar mais registros.'),
      });
  }

  private openModal(row?: TaxaCartao): void {
    if (row) {
      this.isEdit  = true;
      this.editId  = row.id;
      this.formValues = { ...row };
    } else {
      this.isEdit  = false;
      this.editId  = '';
      this.formValues = {};
    }
    this.cdr.markForCheck();
    this.poModal.open();
  }

  private save(): void {
    const data = this.dynamicForm.value as Partial<TaxaCartao>;
    const request$ = this.isEdit
      ? this.service.update(this.editId, data)
      : this.service.create(data);

    request$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notification.success(
            this.isEdit ? 'Taxa alterada com sucesso.' : 'Taxa incluída com sucesso.'
          );
          this.poModal.close();
          this.currentPage = 1;
          this.load();
        },
        error: err => this.notification.error(this.parseProtheusError(err)),
      });
  }

  private confirmDelete(row: TaxaCartao): void {
    this.dialog.confirm({
      title: 'Excluir taxa',
      message: `Deseja excluir a taxa de ${row.bandeira} (${row.tipo})?`,
      confirm: () => this.delete(row),
    });
  }

  private delete(row: TaxaCartao): void {
    this.loading.set(true);
    this.service.delete(row.id)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => {
          this.notification.success('Taxa excluída com sucesso.');
          this.items.update(prev => prev.filter(r => r.id !== row.id));
        },
        error: err => this.notification.error(this.parseProtheusError(err)),
      });
  }

  private load(): void {
    this.loading.set(true);
    if (this.currentPage === 1) this.items.set([]);
    this.service
      .getAll({ page: this.currentPage, pageSize: this.pageSize, q: this.activeFilters })
      .pipe(finalize(() => this.loading.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          this.items.set(res.items);
          this.hasNext.set(res.hasNext);
          this.cdr.markForCheck();
        },
        error: () => {
          this.items.set(DEMO_TAXAS);
          this.hasNext.set(false);
          this.cdr.markForCheck();
        },
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
