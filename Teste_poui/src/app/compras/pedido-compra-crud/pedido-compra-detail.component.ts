/**
 * @generated  poui-specialist v1.0
 * @author     Andre Costa <andre.andrelscosta@gmail.com>
 * @license    Uso permitido · redistribuição proibida sem autorização escrita
 * @see        https://github.com/Alscosta1973/poui-specialist
 */
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
  computed,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CurrencyPipe, DatePipe } from '@angular/common';
import {
  PoButtonModule,
  PoDividerModule,
  PoInfoModule,
  PoLoadingModule,
  PoNotificationService,
  PoPageAction,
  PoPageModule,
  PoTableColumn,
  PoTableModule,
} from '@po-ui/ng-components';

import { PedidoCompraCrudService } from '../pedido-compra-crud.service';
import { PedidoCompraItem, ItemCompraForm } from '../models/pedido-compra-crud.model';

const DEMO_PEDIDOS: PedidoCompraItem[] = [
  {
    numero: '000001', emissao: '2026-01-10', fornecedor: 'METALURGICA BRASILFOR LTDA',
    loja: '01', condPagto: '028', observacao: 'Pedido urgente — entrega em 5 dias úteis.',
    totalPedido: 48750.00,
    itens: [
      { produto: 'ACO001', descricao: 'Aço carbono 1020 barra redonda', unidade: 'KG', quantidade: 500, valorUnit: 8.50, valorTotal: 4250.00 },
      { produto: 'ACO002', descricao: 'Aço inox 304 chapa 2mm', unidade: 'KG', quantidade: 200, valorUnit: 32.50, valorTotal: 6500.00 },
      { produto: 'TUB001', descricao: 'Tubo aço galvanizado 2"', unidade: 'PC', quantidade: 100, valorUnit: 380.00, valorTotal: 38000.00 },
    ],
  },
  {
    numero: '000002', emissao: '2026-02-03', fornecedor: 'DISTRIBUIDORA QUIMICOR S.A.',
    loja: '01', condPagto: '030', observacao: '',
    totalPedido: 12340.50,
    itens: [
      { produto: 'QUI001', descricao: 'Solvente industrial 200L', unidade: 'LT', quantidade: 200, valorUnit: 28.90, valorTotal: 5780.00 },
      { produto: 'QUI002', descricao: 'Detergente industrial 5L', unidade: 'UN', quantidade: 100, valorUnit: 65.60, valorTotal: 6560.50 },
    ],
  },
  {
    numero: '000003', emissao: '2026-02-18', fornecedor: 'ACOS ESPECIAIS NORTECO LTDA',
    loja: '02', condPagto: '028', observacao: 'Verificar certificado de qualidade.',
    totalPedido: 97200.00,
    itens: [
      { produto: 'ACO003', descricao: 'Aço ferramenta D2 barra', unidade: 'KG', quantidade: 800, valorUnit: 121.50, valorTotal: 97200.00 },
    ],
  },
  {
    numero: '000004', emissao: '2026-03-05', fornecedor: 'PLASTICOS INDUMAX INDUSTRIA',
    loja: '01', condPagto: '000', observacao: 'Pedido cancelado — fornecedor sem estoque.',
    totalPedido: 6580.75,
    itens: [],
  },
  {
    numero: '000005', emissao: '2026-04-22', fornecedor: 'ROLAMENTOS E MANCAIS TECNO',
    loja: '03', condPagto: '028', observacao: '',
    totalPedido: 23415.90,
    itens: [
      { produto: 'ROL001', descricao: 'Rolamento rígido de esferas 6205', unidade: 'UN', quantidade: 50, valorUnit: 185.00, valorTotal: 9250.00 },
      { produto: 'ROL002', descricao: 'Rolamento cônico 30207', unidade: 'UN', quantidade: 30, valorUnit: 472.20, valorTotal: 14165.90 },
    ],
  },
];

@Component({
  selector: 'app-pedido-compra-detail',
  standalone: true,
  imports: [
    CurrencyPipe,
    DatePipe,
    PoPageModule,
    PoTableModule,
    PoButtonModule,
    PoDividerModule,
    PoInfoModule,
    PoLoadingModule,
  ],
  templateUrl: './pedido-compra-detail.component.html',
  styleUrl: './pedido-compra-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PedidoCompraDetailComponent implements OnInit {
  private readonly service      = inject(PedidoCompraCrudService);
  private readonly router       = inject(Router);
  private readonly route        = inject(ActivatedRoute);
  private readonly notification = inject(PoNotificationService);
  private readonly destroyRef   = inject(DestroyRef);
  private readonly cdr          = inject(ChangeDetectorRef);

  readonly loading = signal(true);
  readonly record  = signal<PedidoCompraItem | null>(null);

  readonly pageTitle = computed(() => {
    const r = this.record();
    return r ? `Pedido ${r.numero} — ${r.fornecedor}` : 'Detalhe do Pedido';
  });

  readonly totalGeral = computed(() => {
    const r = this.record();
    if (!r) return 0;
    return (r.itens ?? []).reduce((sum, i) => sum + i.valorTotal, 0);
  });

  readonly pageActions: PoPageAction[] = [
    {
      label: 'Editar',
      icon: 'po-icon-edit',
      action: () => {
        const r = this.record();
        if (r) this.router.navigate(['/compras/pedido-compra-crud', r.numero, 'editar']);
      },
    },
    {
      label: 'Voltar',
      icon: 'po-icon-arrow-left',
      action: () => this.router.navigate(['/compras/pedido-compra-crud']),
    },
  ];

  readonly columnsItens: PoTableColumn[] = [
    { property: 'produto',    label: 'Produto',      width: '12%' },
    { property: 'descricao',  label: 'Descrição' },
    { property: 'unidade',    label: 'UN',           width: '6%'  },
    { property: 'quantidade', label: 'Qtd',          width: '10%', type: 'number', format: '1.2-2' },
    { property: 'valorUnit',  label: 'Vlr Unit.',    width: '12%', type: 'currency', format: 'BRL' },
    { property: 'valorTotal', label: 'Total',        width: '12%', type: 'currency', format: 'BRL' },
  ];

  ngOnInit(): void {
    const numero = this.route.snapshot.params['numero'];
    if (!numero) {
      this.router.navigate(['/compras/pedido-compra-crud']);
      return;
    }
    this.loadRecord(numero);
  }

  private loadRecord(numero: string): void {
    this.service
      .getById(numero)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.record.set(data);
          this.loading.set(false);
          this.cdr.markForCheck();
        },
        error: () => {
          const demo = DEMO_PEDIDOS.find(p => p.numero === numero) ?? null;
          this.record.set(demo);
          this.loading.set(false);
          if (demo) {
            this.notification.warning('Dados demo — serviço indisponível.');
          } else {
            this.notification.error('Pedido não encontrado.');
            this.router.navigate(['/compras/pedido-compra-crud']);
          }
          this.cdr.markForCheck();
        },
      });
  }
}
