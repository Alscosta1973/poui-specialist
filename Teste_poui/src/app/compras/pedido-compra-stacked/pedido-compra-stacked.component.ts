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
  computed,
  DestroyRef,
  HostListener,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  PoButtonModule,
  PoFieldModule,
  PoNotificationService,
  PoPageModule,
  PoTableColumn,
  PoTableModule,
} from '@po-ui/ng-components';
import { PedidoCompraStackedService } from '../pedido-compra-stacked.service';
import { PedidoCompraMaster, ItemCompra } from '../models/pedido-compra-stacked.model';

// ── Demo data — remove when a rota REST estiver disponível ──────────────────
const DEMO_MASTER: PedidoCompraMaster[] = [
  {
    numero: '000001', emissao: '2026-06-01',
    fornecedor: 'METALFORTE IND. E COM. LTDA', loja: '01',
    valorTotal: 48750.00, status: 'A',
  },
  {
    numero: '000002', emissao: '2026-06-02',
    fornecedor: 'ACOS NACIONAL S/A', loja: '01',
    valorTotal: 123400.00, status: 'A',
  },
  {
    numero: '000003', emissao: '2026-06-04',
    fornecedor: 'PLASTICOS OMEGA LTDA', loja: '02',
    valorTotal: 9870.50, status: 'E',
  },
  {
    numero: '000004', emissao: '2026-06-06',
    fornecedor: 'QUIMICOS DO BRASIL LTDA', loja: '01',
    valorTotal: 33200.00, status: 'A',
  },
  {
    numero: '000005', emissao: '2026-06-09',
    fornecedor: 'LUBRIFICANTES CENTRAL S/A', loja: '03',
    valorTotal: 0.00, status: 'C',
  },
];

const DEMO_DETAIL: Record<string, ItemCompra[]> = {
  '000001': [
    { item: '01', produto: 'CH0025', descricao: 'CHAPA ACO CARBONO 2,5mm', unidade: 'KG', quantidade: 500, valorUnit:  55.00, valorTotal: 27500.00 },
    { item: '02', produto: 'TB0032', descricao: 'TUBO REDONDO ACO 32mm',   unidade: 'PC', quantidade: 120, valorUnit:  89.00, valorTotal: 10680.00 },
    { item: '03', produto: 'PR0010', descricao: 'PERFIL L 1"x1/8"',        unidade: 'MT', quantidade: 210, valorUnit:  51.29, valorTotal: 10770.90 },
  ],
  '000002': [
    { item: '01', produto: 'BL0050', descricao: 'BARRA LISA ACO 1020 50mm', unidade: 'KG', quantidade: 800, valorUnit: 102.50, valorTotal: 82000.00 },
    { item: '02', produto: 'BH0060', descricao: 'BARRA HEXAGONAL 60mm',     unidade: 'KG', quantidade: 400, valorUnit: 103.50, valorTotal: 41400.00 },
  ],
  '000003': [
    { item: '01', produto: 'PP0020', descricao: 'POLIPROPILENO GRANEL',     unidade: 'KG', quantidade: 300, valorUnit:  18.90, valorTotal:  5670.00 },
    { item: '02', produto: 'PE0015', descricao: 'POLIETILENO ALTA DENS.',   unidade: 'KG', quantidade: 200, valorUnit:  21.00, valorTotal:  4200.50 },
  ],
  '000004': [
    { item: '01', produto: 'OL0010', descricao: 'OLEO MINERAL INDUSTRIAL',  unidade: 'LT', quantidade: 200, valorUnit:  42.00, valorTotal:  8400.00 },
    { item: '02', produto: 'AC0005', descricao: 'ACIDO CLORIDRICO 30%',     unidade: 'LT', quantidade: 100, valorUnit:  38.50, valorTotal:  3850.00 },
    { item: '03', produto: 'SO0008', descricao: 'SODA CAUSTICA ESCAMAS',    unidade: 'KG', quantidade: 500, valorUnit:  41.90, valorTotal: 20950.00 },
  ],
  '000005': [],
};
// ── fim demo data ────────────────────────────────────────────────────────────

@Component({
  selector: 'app-pedido-compra-stacked',
  standalone: true,
  imports: [CommonModule, FormsModule, PoPageModule, PoTableModule, PoButtonModule, PoFieldModule],
  templateUrl: './pedido-compra-stacked.component.html',
  styleUrl: './pedido-compra-stacked.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PedidoCompraStackedComponent implements OnInit {
  private readonly service      = inject(PedidoCompraStackedService);
  private readonly notification = inject(PoNotificationService);
  private readonly destroyRef   = inject(DestroyRef);
  private readonly cdr          = inject(ChangeDetectorRef);

  // ── Data signals
  readonly items             = signal<PedidoCompraMaster[]>([]);
  readonly detailItems       = signal<ItemCompra[]>([]);
  readonly masterAtual       = signal<PedidoCompraMaster | null>(null);
  readonly itensSelecionados = signal<ItemCompra[]>([]);

  // ── Navigation signals
  readonly cursorIndex  = signal<number>(0);
  readonly cursorDetail = signal<number>(-1);
  readonly activeBrowse = signal<'master' | 'detail'>('master');
  readonly isFiltrado   = signal(false);

  // ── Responsive heights — sem scroll de página
  // Offset 320px = navbar PO shell + título da página + filtros-bar + headers dos browses + rodapé
  private readonly _winH = signal(window.innerHeight);
  readonly masterHeight  = computed(() => Math.max(160, Math.floor((this._winH() - 320) * 0.47)));
  readonly detailHeight  = computed(() => Math.max(140, Math.floor((this._winH() - 320) * 0.40)));

  // ── Filtros
  filtros = { campo1: '', campo2: '', dataDE: '', dataATE: '' };

  // ── Colunas Master (SC7 cabeçalho)
  readonly colunasMaster: PoTableColumn[] = [
    { property: 'numero',     label: 'Número',     width: '90px' },
    { property: 'emissao',    label: 'Emissão',    type: 'date', format: 'dd/MM/yyyy', width: '110px' },
    { property: 'fornecedor', label: 'Fornecedor' },
    { property: 'loja',       label: 'Loja',       width: '50px' },
    { property: 'valorTotal', label: 'Total',      type: 'currency', format: 'BRL', width: '120px' },
    {
      property: 'status', label: 'Status', width: '90px',
      type: 'label',
      labels: [
        { value: 'A', label: 'Aberto',     color: 'color-08' },
        { value: 'E', label: 'Encerrado',  color: 'color-11' },
        { value: 'C', label: 'Cancelado',  color: 'color-07' },
      ],
    },
  ];

  // ── Colunas Detail (SC7 itens)
  readonly colunasDetail: PoTableColumn[] = [
    { property: 'item',       label: 'Item',      width: '60px' },
    { property: 'produto',    label: 'Produto',   width: '100px' },
    { property: 'descricao',  label: 'Descrição' },
    { property: 'unidade',    label: 'UN',        width: '60px' },
    { property: 'quantidade', label: 'Qtde',      type: 'number', width: '80px' },
    { property: 'valorUnit',  label: 'Vlr Unit.', type: 'currency', format: 'BRL', width: '120px' },
    { property: 'valorTotal', label: 'Total',     type: 'currency', format: 'BRL', width: '120px' },
  ];

  // ── Computed
  readonly tituloDetail = computed(() => {
    const m = this.masterAtual();
    return m ? `Itens do Pedido (SC7) — ${m.numero}` : 'Itens do Pedido (SC7)';
  });

  readonly qtdSelecionados  = computed(() => this.itensSelecionados().length);
  readonly totalSelecionado = computed(() =>
    this.itensSelecionados().reduce((s, i) => s + (i.valorTotal ?? 0), 0)
  );
  readonly podeConfirmar = computed(() => this.itensSelecionados().length > 0);

  ngOnInit(): void {
    this.buscar();
  }

  @HostListener('window:resize')
  onResize(): void { this._winH.set(window.innerHeight); }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    const tag = (event.target as HTMLElement)?.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea') return;

    if (event.key === 'Tab') {
      event.preventDefault();
      const next = this.activeBrowse() === 'master' ? 'detail' : 'master';
      this.activeBrowse.set(next);
      if (next === 'detail' && this.cursorDetail() < 0 && this.detailItems().length) {
        this.cursorDetail.set(0);
        setTimeout(() => this._highlightDetailRow(), 50);
      }
      return;
    }

    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    const delta = event.key === 'ArrowDown' ? 1 : -1;

    if (this.activeBrowse() === 'master') {
      this._moverCursor(delta);
      setTimeout(() => this._highlightMasterRow(), 50);
    } else {
      this._moverCursorDetail(delta);
      setTimeout(() => this._highlightDetailRow(), 50);
    }
  }

  private _moverCursor(delta: number): void {
    const its = this.items();
    if (!its.length) return;
    const cur  = this.cursorIndex();
    const next = cur < 0 ? 0 : Math.max(0, Math.min(its.length - 1, cur + delta));
    if (next === cur && cur >= 0) return;
    this.cursorIndex.set(next);
    this.onMasterSelecionado(its[next]);
  }

  private _moverCursorDetail(delta: number): void {
    const its = this.detailItems();
    if (!its.length) return;
    const cur  = this.cursorDetail();
    const next = cur < 0 ? 0 : Math.max(0, Math.min(its.length - 1, cur + delta));
    if (next === cur && cur >= 0) return;
    this.cursorDetail.set(next);
    setTimeout(() => this._highlightDetailRow(), 50);
  }

  private _highlightMasterRow(): void {
    document.querySelectorAll('.master-browse .row-ativa').forEach(el => el.classList.remove('row-ativa'));
    const idx  = this.cursorIndex();
    if (idx < 0) return;
    const rows = document.querySelectorAll<HTMLElement>('.master-browse table tbody tr');
    const row  = rows[idx];
    if (!row) return;
    row.classList.add('row-ativa');
    this._scrollRowIntoView(row);
  }

  private _highlightDetailRow(): void {
    document.querySelectorAll('.detail-browse .row-ativa').forEach(el => el.classList.remove('row-ativa'));
    const idx  = this.cursorDetail();
    if (idx < 0) return;
    const rows = document.querySelectorAll<HTMLElement>('.detail-browse table tbody tr');
    const row  = rows[idx];
    if (!row) return;
    row.classList.add('row-ativa');
    this._scrollRowIntoView(row);
  }

  // Percorre o DOM para encontrar o ancestral scrollável real.
  // Chamadores DEVEM usar setTimeout(..., 50) — NÃO 0ms — para que o
  // change detection do PO-UI tenha concluído e getBoundingClientRect() retorne valores corretos.
  private _scrollRowIntoView(row: HTMLElement): void {
    let container: HTMLElement | null = row.parentElement;
    while (container && container !== document.documentElement) {
      const s = window.getComputedStyle(container);
      if ((s.overflowY === 'auto' || s.overflowY === 'scroll') && container.scrollHeight > container.clientHeight) break;
      container = container.parentElement;
    }
    if (!container || container === document.documentElement) return;
    const thead     = container.querySelector('thead') as HTMLElement | null;
    const theadH    = thead ? thead.offsetHeight : 0;
    const cRect     = container.getBoundingClientRect();
    const rRect     = row.getBoundingClientRect();
    const rowTop    = rRect.top - cRect.top + container.scrollTop;
    const rowBottom = rowTop + row.offsetHeight;
    const visTop    = container.scrollTop + theadH;
    const visBot    = container.scrollTop + container.clientHeight;
    if (rowTop < visTop)          container.scrollTop = Math.max(0, rowTop - theadH);
    else if (rowBottom > visBot)  container.scrollTop = rowBottom - container.clientHeight;
  }

  // ── Eventos do browse master
  onMasterSelecionado(item: PedidoCompraMaster): void {
    const idx = this.items().findIndex(i => i.numero === item.numero);
    this.cursorIndex.set(idx);
    this.masterAtual.set(item);
    this.cursorDetail.set(-1);
    this.activeBrowse.set('master');
    this._carregarItens(item.numero);
    this.cdr.markForCheck();
    setTimeout(() => this._highlightMasterRow(), 50);
  }

  onMasterDeselecionado(_item: PedidoCompraMaster): void {
    // single-select: master permanece selecionado mesmo no p-unselected
  }

  onMasterClick(): void { this.activeBrowse.set('master'); }

  // ── Eventos do browse detail
  onItemSelecionado(item: ItemCompra): void {
    this.itensSelecionados.update(prev => [...prev, item]);
    const idx = this.detailItems().findIndex(i => i.item === item.item);
    if (idx >= 0) this.cursorDetail.set(idx);
    setTimeout(() => this._highlightDetailRow(), 50);
  }

  onItemDeselecionado(item: ItemCompra): void {
    this.itensSelecionados.update(prev => prev.filter(i => i.item !== item.item));
  }

  onTodosItensSelecionados(): void {
    this.itensSelecionados.set([...this.detailItems()]);
    this.cdr.markForCheck();
  }

  onTodosItensDeselecionados(): void {
    this.itensSelecionados.set([]);
    this.cdr.markForCheck();
  }

  onDetailClick(): void {
    this.activeBrowse.set('detail');
    if (this.cursorDetail() < 0 && this.detailItems().length) {
      this.cursorDetail.set(0);
      setTimeout(() => this._highlightDetailRow(), 50);
    }
  }

  // ── Busca e filtro
  buscar(): void {
    const { campo1, campo2, dataDE, dataATE } = this.filtros;
    const de  = this._toISO(dataDE);
    const ate = this._toISO(dataATE);

    // Substituir por chamada real ao service:
    // this.service.buscar(this.filtros).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
    //   next: r => { this.items.set(r.items); ... },
    //   error: () => { this.items.set(DEMO_MASTER.map(r => ({ ...r }))); ... }
    // });
    const resultado = DEMO_MASTER.filter(r => {
      if (campo1?.trim() && !r.numero.includes(campo1.trim()))                                           return false;
      if (campo2?.trim() && !r.fornecedor.toLowerCase().includes(campo2.trim().toLowerCase()))            return false;
      if (de  && r.emissao < de)                                                                          return false;
      if (ate && r.emissao > ate)                                                                         return false;
      return true;
    });

    this.isFiltrado.set(!!(campo1?.trim() || campo2?.trim() || dataDE?.trim() || dataATE?.trim()));
    this.masterAtual.set(null);
    this.detailItems.set([]);
    this.itensSelecionados.set([]);
    this.cursorIndex.set(0);
    this.cursorDetail.set(-1);
    this.activeBrowse.set('master');
    this.items.set(resultado.map(r => ({ ...r })));
    this.cdr.markForCheck();
    if (resultado.length > 0) setTimeout(() => this.onMasterSelecionado(resultado[0]), 0);
  }

  removerFiltro(): void {
    const keyAtivo = this.masterAtual()?.numero;
    this.filtros   = { campo1: '', campo2: '', dataDE: '', dataATE: '' };
    this.isFiltrado.set(false);
    this.masterAtual.set(null);
    this.detailItems.set([]);
    this.cursorDetail.set(-1);
    this.activeBrowse.set('master');
    this.items.set(DEMO_MASTER.map(r => ({ ...r })));
    this.cdr.markForCheck();
    setTimeout(() => {
      const idx  = keyAtivo ? DEMO_MASTER.findIndex(r => r.numero === keyAtivo) : 0;
      const alvo = DEMO_MASTER[idx >= 0 ? idx : 0];
      this.cursorIndex.set(idx >= 0 ? idx : 0);
      this.onMasterSelecionado(alvo);
    }, 0);
  }

  aprovarItens(): void {
    if (!this.masterAtual() || !this.itensSelecionados().length) return;
    // Substituir por chamada real:
    // this.service.aprovarItens(this.masterAtual()!.numero, this.itensSelecionados())
    //   .pipe(takeUntilDestroyed(this.destroyRef))
    //   .subscribe({ next: () => { this.notification.success('Itens aprovados com sucesso.'); ... } });
    this.notification.success(`${this.itensSelecionados().length} item(ns) aprovado(s) com sucesso.`);
    this.itensSelecionados.set([]);
    this.cdr.markForCheck();
  }

  fmtVal(v: number): string {
    return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  private _carregarItens(numero: string): void {
    // Substituir por chamada real:
    // this.service.getItens(numero).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
    //   next: itens => { this.detailItems.set(itens); this.cdr.markForCheck(); },
    //   error: () => { this.detailItems.set(DEMO_DETAIL[numero] ?? []); this.cdr.markForCheck(); }
    // });
    this.detailItems.set((DEMO_DETAIL[numero] ?? []).map(i => ({ ...i })));
    this.cdr.markForCheck();
  }

  private _toISO(d: string): string {
    if (!d?.trim()) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
    const m = d.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    return m ? `${m[3]}-${m[2]}-${m[1]}` : '';
  }
}
