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
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs/operators';
import {
  PoBreadcrumb,
  PoContainerModule,
  PoDynamicModule,
  PoDynamicViewField,
  PoLoadingModule,
  PoNotificationService,
  PoPageModule,
  PoTableColumn,
  PoTableModule,
} from '@po-ui/ng-components';
import { PedidoCompraService } from '../pedido-compra.service';
import { PedidoCompra, PedidoCompraItem, PedidoCompraItemDetail } from '../models/pedido-compra.model';

// Dados de demonstração — mesmo conjunto usado em PedidoCompraComponent (browse),
// para que a navegação lista → detalhe continue funcionando quando a API real
// (WSRESTFUL PedidosAPI) está indisponível. Usado apenas no callback de erro de load().
const DEMO_ITEMS: PedidoCompraItem[] = [
  { numero: '000001', item: '01', produto: 'PA0001', quantidade: 10, preco: 25.5,  fornecedor: 'FORNECEDOR ABC LTDA', loja: '01', emissao: '20260610' },
  { numero: '000001', item: '02', produto: 'PA0002', quantidade: 5,  preco: 120,   fornecedor: 'FORNECEDOR ABC LTDA', loja: '01', emissao: '20260610' },
  { numero: '000002', item: '01', produto: 'PA0003', quantidade: 20, preco: 8.9,   fornecedor: 'FORNECEDOR XYZ S.A.', loja: '02', emissao: '20260615' },
  { numero: '000003', item: '01', produto: 'PA0004', quantidade: 1,  preco: 3200,  fornecedor: 'FORNECEDOR DELTA ME', loja: '01', emissao: '20260618' },
];

// Detalhe somente leitura do Pedido de Compra (PedidoCompra é um cabeçalho
// agregado client-side — ver comentário em models/pedido-compra.model.ts).
// Rota: compras/pedido-compra/:id/detalhe — :id recebe o 'numero' do pedido.
@Component({
  selector: 'app-pedido-compra-detalhe',
  standalone: true,
  imports: [PoPageModule, PoDynamicModule, PoLoadingModule, PoTableModule, PoContainerModule],
  templateUrl: './pedido-compra-detalhe.component.html',
  styleUrl: './pedido-compra-detalhe.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PedidoCompraDetalheComponent implements OnInit, AfterViewInit {
  private readonly service      = inject(PedidoCompraService);
  private readonly router       = inject(Router);
  private readonly route        = inject(ActivatedRoute);
  private readonly notification = inject(PoNotificationService);
  private readonly destroyRef   = inject(DestroyRef);
  private readonly cdr          = inject(ChangeDetectorRef);

  readonly loading      = signal(false);
  readonly record       = signal<PedidoCompra | null>(null);
  readonly itensPedido  = signal<PedidoCompraItemDetail[]>([]);
  private recordId = '';

  readonly breadcrumb: PoBreadcrumb = {
    items: [
      { label: 'Compras', link: '/compras/painel-compras' },
      { label: 'Pedido de Compra', link: '/compras/pedido-compra' },
      { label: 'Detalhe' },
    ],
  };

  readonly viewFields: PoDynamicViewField[] = [
    { property: 'numero',     label: 'Número',      gridColumns: 3 },
    { property: 'fornecedor', label: 'Fornecedor',  gridColumns: 6 },
    { property: 'loja',       label: 'Loja',        gridColumns: 3 },
    { property: 'emissao',    label: 'Emissão',     type: 'date',     format: 'dd/MM/yyyy', gridColumns: 3 },
    { property: 'qtdItens',   label: 'Qtde. Itens', type: 'number',   gridColumns: 3 },
    { property: 'valorTotal', label: 'Valor Total', type: 'currency', gridColumns: 3 },
  ];

  readonly colunasItens: PoTableColumn[] = [
    { property: 'item',       label: 'Item',        width: '60px' },
    { property: 'produto',    label: 'Produto',     width: '110px' },
    { property: 'quantidade', label: 'Qtde',        type: 'number',   format: '1.0-2', width: '90px' },
    { property: 'preco',      label: 'Preço Unit.', type: 'currency', format: 'BRL',   width: '120px' },
    { property: 'valorTotal', label: 'Valor Total', type: 'currency', format: 'BRL',   width: '120px' },
  ];

  ngOnInit(): void {
    this.recordId = this.route.snapshot.paramMap.get('id') ?? '';
    this.load();
  }

  ngAfterViewInit(): void {
    // Quirk OnPush #1 — necessário para conteúdo projetado dentro de po-page-detail
    setTimeout(() => this.cdr.detectChanges());
  }

  voltar(): void {
    this.router.navigate(['/compras/pedido-compra']);
  }

  private load(): void {
    if (!this.recordId) {
      this.notification.error('Número do pedido não informado.');
      return;
    }

    this.loading.set(true);
    // GET de lista (WSMETHOD GET / _PedLista) não suporta filtro server-side por
    // 'numero' — ver comentário em PedidoCompraComponent.buscar(). O filtro por
    // número e a agregação de cabeçalho são feitos client-side, no mesmo padrão
    // já usado no browse (_agruparPorNumero).
    this.service.getAll({ pageSize: 200 }).pipe(
      finalize(() => { this.loading.set(false); this.cdr.markForCheck(); }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next:  (res) => this._processarResultado(res.items),
      error: (err) => {
        this.notification.error(this.parseProtheusError(err));
        this._processarResultado(DEMO_ITEMS);
      },
    });
  }

  private _processarResultado(itensRaw: PedidoCompraItem[]): void {
    const itensDoPedido = itensRaw.filter(i => i.numero === this.recordId);

    if (itensDoPedido.length === 0) {
      this.notification.error(`Pedido ${this.recordId} não encontrado.`);
      this.record.set(null);
      this.itensPedido.set([]);
      this.cdr.markForCheck();
      return;
    }

    this.record.set(this._montarCabecalho(itensDoPedido));
    this.itensPedido.set(itensDoPedido.map(i => ({ ...i, valorTotal: i.quantidade * i.preco })));
    this.cdr.markForCheck();
  }

  private _montarCabecalho(itens: PedidoCompraItem[]): PedidoCompra {
    const primeiro    = itens[0];
    const valorTotal  = itens.reduce((s, i) => s + i.quantidade * i.preco, 0);
    return {
      numero:     primeiro.numero,
      fornecedor: primeiro.fornecedor,
      loja:       primeiro.loja,
      emissao:    this._dtoSToIso(primeiro.emissao),
      qtdItens:   itens.length,
      valorTotal,
    };
  }

  // Converte formato DtoS do Protheus ('yyyyMMdd') para ISO ('yyyy-MM-dd')
  private _dtoSToIso(cData: string): string {
    if (!cData || cData.length !== 8) return '';
    return `${cData.slice(0, 4)}-${cData.slice(4, 6)}-${cData.slice(6, 8)}`;
  }

  // Decodifica o formato de erro do REST Protheus — ver WSMETHOD SetResponse com errorMessage em pedidos.tlpp
  private parseProtheusError(err: any): string {
    try {
      const errObj = JSON.parse(err.error?.errorMessage ?? '{}');
      if (!errObj.code) throw new Error('sem errorMessage Protheus');
      const msg    = decodeURIComponent(escape(errObj.message ?? ''));
      const detail = errObj.detailedMessage
        ? ` — ${decodeURIComponent(escape(errObj.detailedMessage))}`
        : '';
      return `Erro ${errObj.code}: ${msg}${detail}`;
    } catch {
      return err.error?.message ?? 'Erro ao carregar o pedido de compra.';
    }
  }
}
