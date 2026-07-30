/**
 * @generated  poui-specialist v1.10.0
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
import { SolicitacaoCompraService } from '../solicitacao-compra.service';
import { SolicitacaoCompra } from '../models/solicitacao-compra.model';

@Component({
  selector: 'app-solicitacao-compra',
  standalone: true,
  imports: [PoPageDynamicSearchModule, PoTableModule, PoToolbarModule],
  templateUrl: './solicitacao-compra.component.html',
  styleUrl: './solicitacao-compra.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SolicitacaoCompraComponent implements OnInit, AfterViewInit {
  private readonly service = inject(SolicitacaoCompraService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly notification = inject(PoNotificationService);
  private readonly dialog = inject(PoDialogService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly title = 'Solicitação de Compra';
  readonly items = signal<SolicitacaoCompra[]>([]);
  readonly loading = signal(false);
  readonly hasNext = signal(false);

  private currentPage = 1;
  private readonly pageSize = 10;
  private activeFilters = '';

  // Colunas alinhadas ao contrato TODO de backend/compras/solicitacoes.tlpp (SolicService)
  readonly columns: PoTableColumn[] = [
    { property: 'numero', label: 'Número', width: '10%', sortable: true },
    { property: 'filial', label: 'Filial', width: '8%' },
    { property: 'produto', label: 'Produto', width: '12%', sortable: true },
    { property: 'descricao', label: 'Descrição', sortable: true },
    { property: 'quantidade', label: 'Qtde', type: 'number', format: '1.0-2', width: '10%' },
    { property: 'emissao', label: 'Emissão', type: 'date', format: 'dd/MM/yyyy', width: '12%', sortable: true },
    {
      property: 'status',
      label: 'Status',
      type: 'label',
      width: '12%',
      labels: [
        { value: 'Pendente', label: 'Pendente', color: 'color-08', textColor: '#fff' },
        { value: 'Atendida', label: 'Atendida', color: 'color-10', textColor: '#fff' },
        { value: 'Cancelada', label: 'Cancelada', color: 'color-07', textColor: '#fff' },
      ],
    },
  ];

  // Busca avançada — filtros típicos de Solicitação de Compra (número, filial, status, data)
  readonly advancedFilters: PoPageDynamicSearchFilters[] = [
    { property: 'numero', label: 'Número', gridColumns: 6 },
    { property: 'filial', label: 'Filial', gridColumns: 6 },
    {
      property: 'status',
      label: 'Status',
      gridColumns: 6,
      options: [
        { value: 'Pendente', label: 'Pendente' },
        { value: 'Atendida', label: 'Atendida' },
        { value: 'Cancelada', label: 'Cancelada' },
      ],
    },
    { property: 'emissao', label: 'Data de Emissão', gridColumns: 6, type: 'date' },
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
      action: (row: SolicitacaoCompra) =>
        this.router.navigate([row.numero], { relativeTo: this.route }),
    },
    {
      label: 'Excluir',
      icon: 'po-icon-delete',
      type: 'danger',
      action: (row: SolicitacaoCompra) => this.confirmDelete(row),
    },
  ];

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
        error: () => this.notification.error('Erro ao carregar registros de Solicitação de Compra.'),
      });
  }

  private confirmDelete(row: SolicitacaoCompra): void {
    this.dialog.confirm({
      title: 'Excluir Solicitação de Compra',
      message: `Deseja realmente excluir a solicitação ${row.numero}?`,
      confirm: () => this.delete(row),
    });
  }

  private delete(row: SolicitacaoCompra): void {
    this.loading.set(true);
    this.service.delete(row.numero)
      .pipe(finalize(() => this.loading.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notification.success('Solicitação excluída com sucesso.');
          this.items.update((prev) => prev.filter((r) => r.numero !== row.numero));
        },
        error: (err) => this.notification.error(this.parseProtheusError(err)),
      });
  }

  private parseProtheusError(err: unknown): string {
    try {
      const errObj = JSON.parse((err as any).error?.errorMessage ?? '{}');
      if (!errObj.code) throw new Error('sem errorMessage Protheus');
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
