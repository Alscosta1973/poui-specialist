/**
 * @generated  poui-specialist v1.0
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
  HostListener,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs/operators';
import {
  PoDialogService,
  PoLoadingModule,
  PoNotificationService,
  PoPageAction,
  PoPageFilter,
  PoPageModule,
  PoTableAction,
  PoTableColumn,
  PoTableDetail,
  PoTableModule,
} from '@po-ui/ng-components';
import { PedidoCompraService } from '../pedido-compra.service';
import { PedidoCompra, ItemPedidoCompra } from './models/pedido-compra.model';

// ── Dados de demonstração (usados apenas em caso de erro no carregamento) ──
const DEMO_PEDIDOS: PedidoCompra[] = [
  {
    numero:     '000001',
    emissao:    '2026-06-01',
    fornecedor: 'FORNECEDOR ABC LTDA',
    loja:       '01',
    valorTotal: 3500.00,
    status:     'A',
    itens: [
      { item: '001', produto: 'PROD001', descricao: 'Parafuso M8x25', unidade: 'CX', quantidade: 10, valorUnit: 150.00, valorTotal: 1500.00 },
      { item: '002', produto: 'PROD002', descricao: 'Arruela Lisa 3/8', unidade: 'KG', quantidade: 20, valorUnit: 100.00, valorTotal: 2000.00 },
    ],
  },
  {
    numero:     '000002',
    emissao:    '2026-06-05',
    fornecedor: 'DISTRIBUIDORA XYZ S/A',
    loja:       '02',
    valorTotal: 8200.00,
    status:     'E',
    itens: [
      { item: '001', produto: 'PROD010', descricao: 'Cabo de Aço 3mm', unidade: 'MT', quantidade: 100, valorUnit: 82.00, valorTotal: 8200.00 },
    ],
  },
  {
    numero:     '000003',
    emissao:    '2026-06-08',
    fornecedor: 'COMERCIAL DEF ME',
    loja:       '01',
    valorTotal: 450.00,
    status:     'C',
    itens: [],
  },
];

@Component({
  selector: 'app-pedido-compra',
  standalone: true,
  imports: [PoPageModule, PoTableModule, PoLoadingModule],
  templateUrl: './pedido-compra.component.html',
  styleUrl: './pedido-compra.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PedidoCompraComponent implements OnInit, AfterViewInit {
  private readonly service      = inject(PedidoCompraService);
  private readonly router       = inject(Router);
  private readonly route        = inject(ActivatedRoute);
  private readonly notification = inject(PoNotificationService);
  private readonly dialog       = inject(PoDialogService);
  private readonly destroyRef   = inject(DestroyRef);
  private readonly cdr          = inject(ChangeDetectorRef);

  readonly items   = signal<PedidoCompra[]>([]);
  readonly loading = signal(false);
  readonly hasNext = signal(false);

  private currentPage = 1;
  private readonly pageSize = 10;
  private lastSearch = '';

  // ── Colunas do MASTER — SC7 Pedidos de Compra ──
  readonly columns: PoTableColumn[] = [
    { property: 'numero',     label: 'Número',     width: '10%', sortable: true },
    { property: 'emissao',    label: 'Emissão',    type: 'date', format: 'dd/MM/yyyy', width: '12%' },
    { property: 'fornecedor', label: 'Fornecedor', sortable: true },
    { property: 'loja',       label: 'Loja',       width: '6%' },
    { property: 'valorTotal', label: 'Total',      type: 'currency', format: 'BRL', width: '12%' },
    {
      property: 'status',
      label:    'Status',
      type:     'label',
      width:    '10%',
      labels: [
        { value: 'A', label: 'Aberto',     color: 'color-08' },
        { value: 'E', label: 'Encerrado',  color: 'color-11' },
        { value: 'C', label: 'Cancelado',  color: 'color-07' },
      ],
    },
    // Coluna de detalhe — expande os itens do pedido inline
    {
      property: 'itens',
      label:    'Itens',
      type:     'detail',
      detail:   this.buildDetailConfig(),
    },
  ];

  readonly tableActions: PoTableAction[] = [
    {
      label:  'Editar',
      icon:   'po-icon-edit',
      action: (row: PedidoCompra) =>
        this.router.navigate([row.numero], { relativeTo: this.route }),
    },
    {
      label:     'Cancelar',
      icon:      'po-icon-close',
      type:      'danger',
      separator: true,
      disabled:  (row: PedidoCompra) => row.status !== 'A',
      action:    (row: PedidoCompra) => this.confirmCancel(row),
    },
  ];

  readonly pageActions: PoPageAction[] = [
    {
      label:  'Incluir',
      icon:   'po-icon-plus',
      action: () => this.router.navigate(['novo'], { relativeTo: this.route }),
    },
  ];

  readonly filterSettings: PoPageFilter = {
    placeholder: 'Buscar por número ou fornecedor...',
    action:      (q: string) => this.onSearch(q),
  };

  // OnPush quirk: po-table expand (detail/itens) fires internally sem marcar este
  // componente como dirty. Qualquer click no host dispara detectChanges para forçar
  // a renderização do detalhe.
  @HostListener('click')
  onHostClick(): void {
    this.cdr.detectChanges();
  }

  ngOnInit(): void {
    this.load();
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.cdr.detectChanges());
  }

  onSearch(q: string): void {
    this.currentPage = 1;
    this.lastSearch  = q;
    this.load(q);
  }

  onShowMore(): void {
    this.currentPage++;
    this.loading.set(true);
    this.service
      .getAll({ page: this.currentPage, pageSize: this.pageSize, q: this.lastSearch })
      .pipe(finalize(() => this.loading.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.items.update(prev => [...prev, ...res.items]);
          this.hasNext.set(res.hasNext);
        },
        error: () => this.notification.error('Erro ao carregar mais registros.'),
      });
  }

  private load(q = ''): void {
    this.loading.set(true);
    this.service
      .getAll({ page: this.currentPage, pageSize: this.pageSize, q })
      .pipe(finalize(() => this.loading.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.items.set(res.items);
          this.hasNext.set(res.hasNext);
        },
        error: () => {
          this.notification.error('Não foi possível carregar os pedidos. Exibindo dados de demonstração.');
          this.items.set(DEMO_PEDIDOS);
          this.hasNext.set(false);
        },
      });
  }

  private confirmCancel(row: PedidoCompra): void {
    this.dialog.confirm({
      title:   'Cancelar Pedido de Compra',
      message: `Confirma o cancelamento do pedido ${row.numero}?`,
      confirm: () => this.cancelRecord(row),
    });
  }

  private cancelRecord(row: PedidoCompra): void {
    this.loading.set(true);
    this.service.cancel(row.numero)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => {
          this.notification.success('Pedido cancelado com sucesso.');
          this.items.update(prev =>
            prev.map(r => r.numero === row.numero ? { ...r, status: 'C' as const } : r)
          );
        },
        error: (err) => this.notification.error(this.parseProtheusError(err)),
      });
  }

  // ── Configuração das colunas de DETALHE — SC7 Itens ──
  private buildDetailConfig(): PoTableDetail {
    return {
      columns: [
        { property: 'item',       label: 'Item' },
        { property: 'produto',    label: 'Produto' },
        { property: 'descricao',  label: 'Descrição' },
        { property: 'unidade',    label: 'UN' },
        { property: 'quantidade', label: 'Qtde',      type: 'number',   format: '1.4-4' },
        { property: 'valorUnit',  label: 'Vlr Unit.', type: 'currency', format: 'BRL' },
        { property: 'valorTotal', label: 'Total',     type: 'currency', format: 'BRL' },
      ],
      typeHeader: 'inline',
    };
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
