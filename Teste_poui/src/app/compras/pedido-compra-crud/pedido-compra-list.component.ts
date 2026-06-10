/**
 * @generated  poui-specialist v1.0
 * @author     Andre Costa <andre.andrelscosta@gmail.com>
 * @license    Uso permitido · redistribuição proibida sem autorização escrita
 * @see        https://github.com/Alscosta1973/poui-specialist
 */
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

// ---------------------------------------------------------------------------
// Interface local (não depende do service/model paralelo)
// ---------------------------------------------------------------------------
export interface PedidoCompraItem {
  numero: string;
  emissao: string;
  fornecedor: string;
  loja: string;
  valorTotal: number;
  status: string;
}

// ---------------------------------------------------------------------------
// Demo data — carregado apenas no handler de erro do load()
// ---------------------------------------------------------------------------
const DEMO_PEDIDOS: PedidoCompraItem[] = [
  {
    numero: '000001',
    emissao: '2026-01-10',
    fornecedor: 'METALURGICA BRASILFOR LTDA',
    loja: '01',
    valorTotal: 48750.00,
    status: 'A',
  },
  {
    numero: '000002',
    emissao: '2026-02-03',
    fornecedor: 'DISTRIBUIDORA QUIMICOR S.A.',
    loja: '01',
    valorTotal: 12340.50,
    status: 'E',
  },
  {
    numero: '000003',
    emissao: '2026-02-18',
    fornecedor: 'ACOS ESPECIAIS NORTECO LTDA',
    loja: '02',
    valorTotal: 97200.00,
    status: 'A',
  },
  {
    numero: '000004',
    emissao: '2026-03-05',
    fornecedor: 'PLASTICOS INDUMAX INDUSTRIA',
    loja: '01',
    valorTotal: 6580.75,
    status: 'C',
  },
  {
    numero: '000005',
    emissao: '2026-04-22',
    fornecedor: 'ROLAMENTOS E MANCAIS TECNO',
    loja: '03',
    valorTotal: 23415.90,
    status: 'E',
  },
];

@Component({
  selector: 'app-pedido-compra-list',
  standalone: true,
  imports: [PoPageDynamicSearchModule, PoTableModule, PoToolbarModule],
  templateUrl: './pedido-compra-list.component.html',
  styleUrl: './pedido-compra-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PedidoCompraListComponent implements OnInit {
  private readonly router        = inject(Router);
  private readonly route         = inject(ActivatedRoute);
  private readonly notification  = inject(PoNotificationService);
  private readonly dialog        = inject(PoDialogService);
  private readonly destroyRef    = inject(DestroyRef);

  readonly title   = 'Pedidos de Compra';
  readonly items   = signal<PedidoCompraItem[]>([]);
  readonly loading = signal(false);
  readonly hasNext = signal(false);

  private currentPage  = 1;
  private readonly pageSize = 10;
  private activeFilters = '';

  // -------------------------------------------------------------------------
  // Colunas
  // -------------------------------------------------------------------------
  readonly columns: PoTableColumn[] = [
    {
      property: 'numero',
      label: 'Número',
      width: '10%',
      sortable: true,
    },
    {
      property: 'emissao',
      label: 'Emissão',
      type: 'date',
      format: 'dd/MM/yyyy',
      width: '12%',
    },
    {
      property: 'fornecedor',
      label: 'Fornecedor',
      sortable: true,
    },
    {
      property: 'loja',
      label: 'Loja',
      width: '6%',
    },
    {
      property: 'valorTotal',
      label: 'Total',
      type: 'currency',
      format: 'BRL',
      width: '12%',
    },
    {
      property: 'status',
      label: 'Status',
      type: 'label',
      width: '10%',
      labels: [
        { value: 'A', color: 'color-08', label: 'Aberto' },
        { value: 'E', color: 'color-11', label: 'Encerrado' },
        { value: 'C', color: 'color-07', label: 'Cancelado' },
      ],
    },
  ];

  // -------------------------------------------------------------------------
  // Filtros de busca avançada
  // -------------------------------------------------------------------------
  readonly advancedFilters: PoPageDynamicSearchFilters[] = [
    { property: 'numero',         label: 'Nº Pedido',    gridColumns: 6 },
    { property: 'fornecedor',     label: 'Fornecedor',   gridColumns: 6 },
    { property: 'dataEmissaoDe',  label: 'Emissão De',   gridColumns: 6, type: 'date' },
    { property: 'dataEmissaoAte', label: 'Emissão Até',  gridColumns: 6, type: 'date' },
    {
      property: 'status',
      label: 'Status',
      gridColumns: 6,
      options: [
        { value: 'A', label: 'Aberto' },
        { value: 'E', label: 'Encerrado' },
        { value: 'C', label: 'Cancelado' },
      ],
    },
  ];

  // -------------------------------------------------------------------------
  // Ações da página
  // -------------------------------------------------------------------------
  readonly pageActions: PoPageAction[] = [
    {
      label: 'Incluir',
      icon: 'po-icon-plus',
      action: () => this.router.navigate(['novo'], { relativeTo: this.route }),
    },
  ];

  // -------------------------------------------------------------------------
  // Ações da tabela
  // -------------------------------------------------------------------------
  readonly tableActions: PoTableAction[] = [
    {
      label: 'Editar',
      icon: 'po-icon-edit',
      action: (row: PedidoCompraItem) =>
        this.router.navigate([row.numero, 'editar'], { relativeTo: this.route }),
    },
    {
      label: 'Visualizar',
      icon: 'po-icon-eye',
      action: (row: PedidoCompraItem) =>
        this.router.navigate([row.numero, 'detalhe'], { relativeTo: this.route }),
    },
    {
      label: 'Cancelar',
      icon: 'po-icon-close',
      type: 'danger',
      disabled: (row: PedidoCompraItem) => row.status !== 'A',
      action: (row: PedidoCompraItem) => this.confirmCancel(row),
    },
  ];

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------
  ngOnInit(): void {
    this.load();
  }

  // -------------------------------------------------------------------------
  // Handlers de busca
  // -------------------------------------------------------------------------
  onQuickSearch(term: string): void {
    this.currentPage  = 1;
    this.activeFilters = term ? `q=${encodeURIComponent(term)}` : '';
    this.load();
  }

  onAdvancedSearch(filters: { [key: string]: string }): void {
    this.currentPage  = 1;
    this.activeFilters = Object.entries(filters)
      .filter(([, v]) => v !== null && v !== undefined && v !== '')
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join('&');
    this.load();
  }

  onChangeDisclaimers(disclaimers: { property: string; value: string }[]): void {
    this.currentPage  = 1;
    this.activeFilters = disclaimers
      .map((d) => `${d.property}=${encodeURIComponent(d.value)}`)
      .join('&');
    this.load();
  }

  onShowMore(): void {
    this.currentPage++;
    this.loading.set(true);
    // Quando o service real estiver disponível, substituir DEMO_PEDIDOS
    // por: this.service.getAll({ page: this.currentPage, pageSize: this.pageSize, q: this.activeFilters })
    //        .pipe(finalize(...), takeUntilDestroyed(this.destroyRef))
    //        .subscribe({ next: (res) => { ... }, error: () => ... });
    this.loading.set(false);
  }

  // -------------------------------------------------------------------------
  // Carga de dados
  // -------------------------------------------------------------------------
  private load(): void {
    this.loading.set(true);
    if (this.currentPage === 1) this.items.set([]);

    // Quando o service real (PedidoCompraCrudService) estiver disponível:
    //   this.service
    //     .getAll({ page: this.currentPage, pageSize: this.pageSize, q: this.activeFilters })
    //     .pipe(finalize(() => this.loading.set(false)), takeUntilDestroyed(this.destroyRef))
    //     .subscribe({
    //       next: (res) => { this.items.set(res.items); this.hasNext.set(res.hasNext); },
    //       error: () => { this.items.set(DEMO_PEDIDOS); this.notification.warning('Dados demo — serviço indisponível.'); },
    //     });

    // Temporário — carrega demo data diretamente
    setTimeout(() => {
      this.items.set(this.applyDemoFilter());
      this.hasNext.set(false);
      this.loading.set(false);
    }, 300);
  }

  // Filtragem local simples para demo
  private applyDemoFilter(): PedidoCompraItem[] {
    if (!this.activeFilters) return DEMO_PEDIDOS;
    const params = new URLSearchParams(this.activeFilters);
    return DEMO_PEDIDOS.filter((p) => {
      const q          = params.get('q');
      const numero     = params.get('numero');
      const fornecedor = params.get('fornecedor');
      const status     = params.get('status');
      if (q          && !p.fornecedor.toLowerCase().includes(q.toLowerCase()) &&
                        !p.numero.includes(q)) return false;
      if (numero     && !p.numero.includes(numero))                             return false;
      if (fornecedor && !p.fornecedor.toLowerCase().includes(fornecedor.toLowerCase())) return false;
      if (status     && p.status !== status)                                    return false;
      return true;
    });
  }

  // -------------------------------------------------------------------------
  // Cancelamento
  // -------------------------------------------------------------------------
  private confirmCancel(row: PedidoCompraItem): void {
    this.dialog.confirm({
      title: 'Cancelar Pedido',
      message: `Deseja realmente cancelar o pedido ${row.numero} — ${row.fornecedor}?`,
      confirm: () => this.cancelPedido(row),
    });
  }

  private cancelPedido(row: PedidoCompraItem): void {
    // Quando o service real estiver disponível, substituir por:
    //   this.service.patch(row.numero, { status: 'C' })
    //     .pipe(finalize(() => this.loading.set(false)))
    //     .subscribe({
    //       next: () => { this.notification.success('Pedido cancelado com sucesso.'); this.load(); },
    //       error: (err) => this.notification.error(this.parseProtheusError(err)),
    //     });

    // Demo — atualiza localmente
    this.items.update((prev) =>
      prev.map((p) => (p.numero === row.numero ? { ...p, status: 'C' } : p))
    );
    this.notification.success(`Pedido ${row.numero} cancelado com sucesso.`);
  }

  // -------------------------------------------------------------------------
  // Utilitários
  // -------------------------------------------------------------------------
  private parseProtheusError(err: unknown): string {
    try {
      const e = err as { error?: { errorMessage?: string; message?: string } };
      const errObj = JSON.parse(e.error?.errorMessage ?? '{}');
      const msg    = decodeURIComponent(escape(errObj.message ?? ''));
      const detail = errObj.detailedMessage
        ? ` — ${decodeURIComponent(escape(errObj.detailedMessage))}`
        : '';
      return `Erro ${errObj.code}: ${msg}${detail}`;
    } catch {
      const e = err as { error?: { message?: string } };
      return e.error?.message ?? 'Erro ao processar a requisição.';
    }
  }
}
