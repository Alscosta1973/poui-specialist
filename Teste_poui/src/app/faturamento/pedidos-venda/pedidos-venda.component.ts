/**
 * @generated  poui-specialist v1.3
 * @author     Andre Costa <andre.andrelscosta@gmail.com>
 * @license    Uso permitido · redistribuição proibida sem autorização escrita
 * @see        https://github.com/Alscosta1973/poui-specialist
 */
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
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

// ── Domain models ─────────────────────────────────────────────────────────────
export interface PedidoSC5 {
  c5Num:       string;
  c5Emissao:   string;   // ISO 8601 'YYYY-MM-DD'
  c5Cliente:   string;
  c5Lojacli:   string;
  c5Xnome:     string;
  c5Valpedido: number;
}

export interface ItemSC6 {
  c6Num:    string;
  c6Item:   string;
  c6Prod:   string;
  c6Descri: string;
  c6Qtdven: number;
  c6Prcven: number;
}

// ── Demo data — remove when wiring the real service ───────────────────────────
const DEMO_SC5: PedidoSC5[] = [
  { c5Num: '000001', c5Emissao: '2026-05-01', c5Cliente: '000001', c5Lojacli: '01', c5Xnome: 'ACME Comercial Ltda',      c5Valpedido: 15800.00 },
  { c5Num: '000002', c5Emissao: '2026-05-12', c5Cliente: '000002', c5Lojacli: '01', c5Xnome: 'Beta Distribuidora S/A',   c5Valpedido:  9250.50 },
  { c5Num: '000003', c5Emissao: '2026-05-20', c5Cliente: '000003', c5Lojacli: '02', c5Xnome: 'Gama Atacado ME',          c5Valpedido:  3400.00 },
  { c5Num: '000004', c5Emissao: '2026-06-01', c5Cliente: '000004', c5Lojacli: '01', c5Xnome: 'Delta Varejo Ltda',        c5Valpedido: 21000.75 },
  { c5Num: '000005', c5Emissao: '2026-06-10', c5Cliente: '000005', c5Lojacli: '03', c5Xnome: 'Epsilon Importações Ltda', c5Valpedido:  6600.00 },
];

const DEMO_SC6: Record<string, ItemSC6[]> = {
  '000001': [
    { c6Num: '000001', c6Item: '01', c6Prod: 'PROD001', c6Descri: 'Monitor 24" Full HD',    c6Qtdven: 10, c6Prcven: 950.00 },
    { c6Num: '000001', c6Item: '02', c6Prod: 'PROD002', c6Descri: 'Teclado Mecânico USB',   c6Qtdven:  5, c6Prcven: 280.00 },
    { c6Num: '000001', c6Item: '03', c6Prod: 'PROD003', c6Descri: 'Mouse Óptico Sem Fio',   c6Qtdven: 20, c6Prcven: 120.00 },
  ],
  '000002': [
    { c6Num: '000002', c6Item: '01', c6Prod: 'PROD004', c6Descri: 'Notebook Core i5 15"',   c6Qtdven:  3, c6Prcven: 2850.00 },
    { c6Num: '000002', c6Item: '02', c6Prod: 'PROD005', c6Descri: 'Mochila para Notebook',  c6Qtdven:  5, c6Prcven: 130.50 },
  ],
  '000003': [
    { c6Num: '000003', c6Item: '01', c6Prod: 'PROD006', c6Descri: 'Headset Gamer 7.1',      c6Qtdven:  8, c6Prcven: 425.00 },
  ],
  '000004': [
    { c6Num: '000004', c6Item: '01', c6Prod: 'PROD007', c6Descri: 'Smart TV 55" 4K',        c6Qtdven:  7, c6Prcven: 2999.00 },
    { c6Num: '000004', c6Item: '02', c6Prod: 'PROD008', c6Descri: 'Suporte de Parede TV',   c6Qtdven:  7, c6Prcven:   55.75 },
  ],
  '000005': [
    { c6Num: '000005', c6Item: '01', c6Prod: 'PROD009', c6Descri: 'Cabo HDMI 2m',           c6Qtdven: 30, c6Prcven:   45.00 },
    { c6Num: '000005', c6Item: '02', c6Prod: 'PROD010', c6Descri: 'Régua de Tomadas 6 pts',  c6Qtdven: 20, c6Prcven:   85.00 },
    { c6Num: '000005', c6Item: '03', c6Prod: 'PROD011', c6Descri: 'Adaptador USB-C Hub 7p',  c6Qtdven: 15, c6Prcven:  210.00 },
  ],
};

@Component({
  selector: 'app-pedidos-venda',
  standalone: true,
  imports: [CommonModule, FormsModule, PoPageModule, PoTableModule, PoButtonModule, PoFieldModule],
  templateUrl: './pedidos-venda.component.html',
  styleUrl: './pedidos-venda.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PedidosVendaComponent implements OnInit {
  private readonly notification = inject(PoNotificationService);
  private readonly cdr          = inject(ChangeDetectorRef);

  // ── Data signals ─────────────────────────────────────────────────────────
  readonly items             = signal<PedidoSC5[]>([]);
  readonly detailItems       = signal<ItemSC6[]>([]);
  readonly masterAtual       = signal<PedidoSC5 | null>(null);
  readonly itensSelecionados = signal<ItemSC6[]>([]);

  // ── Navigation signals ───────────────────────────────────────────────────
  readonly cursorIndex  = signal<number>(0);
  readonly cursorDetail = signal<number>(-1);
  readonly activeBrowse = signal<'master' | 'detail'>('master');
  readonly isFiltrado   = signal(false);

  // ── Responsive heights — no page scroll ──────────────────────────────────
  // Offset 320px = PO shell navbar + page title + filtros-bar + browse headers + rodapé
  private readonly _winH = signal(window.innerHeight);
  readonly masterHeight  = computed(() => Math.max(160, Math.floor((this._winH() - 320) * 0.47)));
  readonly detailHeight  = computed(() => Math.max(140, Math.floor((this._winH() - 320) * 0.40)));

  // ── Filter fields ────────────────────────────────────────────────────────
  filtros = { numPedido: '', nomeCliente: '', dataDE: '', dataATE: '' };

  // ── Column definitions ───────────────────────────────────────────────────
  readonly colunasMaster: PoTableColumn[] = [
    { property: 'c5Num',       label: 'Número',        width: '90px' },
    { property: 'c5Emissao',   label: 'Emissão',       type: 'date', format: 'dd/MM/yyyy', width: '110px' },
    { property: 'c5Cliente',   label: 'Cliente',       width: '90px' },
    { property: 'c5Lojacli',   label: 'Loja',          width: '60px' },
    { property: 'c5Xnome',     label: 'Nome Cliente' },
    { property: 'c5Valpedido', label: 'Valor Pedido',  type: 'currency', format: 'BRL', width: '130px' },
  ];

  readonly colunasDetail: PoTableColumn[] = [
    { property: 'c6Num',    label: 'Pedido',       width: '80px' },
    { property: 'c6Item',   label: 'Item',         width: '55px' },
    { property: 'c6Prod',   label: 'Produto',      width: '100px' },
    { property: 'c6Descri', label: 'Descrição' },
    { property: 'c6Qtdven', label: 'Qtd Vendida',  type: 'number',   width: '100px' },
    { property: 'c6Prcven', label: 'Preço Venda',  type: 'currency', format: 'BRL', width: '120px' },
  ];

  // ── Computed display values ───────────────────────────────────────────────
  readonly tituloDetail = computed(() => {
    const m = this.masterAtual();
    return m ? `Itens do Pedido (SC6) — ${m.c5Num}` : 'Itens do Pedido (SC6)';
  });

  readonly qtdSelecionados  = computed(() => this.itensSelecionados().length);
  readonly totalSelecionado = computed(() =>
    this.itensSelecionados().reduce((s, i) => s + (i.c6Prcven * i.c6Qtdven), 0)
  );
  readonly podeGerarNF = computed(() => this.masterAtual() !== null);

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
    const its  = this.items();
    if (!its.length) return;
    const cur  = this.cursorIndex();
    const next = cur < 0 ? 0 : Math.max(0, Math.min(its.length - 1, cur + delta));
    if (next === cur && cur >= 0) return;
    this.cursorIndex.set(next);
    this.onMasterSelecionado(its[next]);
  }

  private _moverCursorDetail(delta: number): void {
    const its  = this.detailItems();
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

  // Walks up from the row to find the real scrollable ancestor.
  // Callers MUST use setTimeout(..., 50) — NOT 0ms — so PO-UI's change detection
  // has completed and getBoundingClientRect() returns correct values.
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
    if (rowTop    < visTop)  container.scrollTop = Math.max(0, rowTop - theadH);
    else if (rowBottom > visBot) container.scrollTop = rowBottom - container.clientHeight;
  }

  // ── Master browse events ─────────────────────────────────────────────────
  onMasterSelecionado(item: PedidoSC5): void {
    const idx = this.items().findIndex(i => i.c5Num === item.c5Num);
    this.cursorIndex.set(idx);
    this.masterAtual.set(item);
    this.cursorDetail.set(-1);
    this.activeBrowse.set('master');
    this._carregarItens(item.c5Num);
    this.cdr.markForCheck();
    setTimeout(() => this._highlightMasterRow(), 50);
  }

  onMasterDeselecionado(_item: PedidoSC5): void {
    // single-select: master stays selected even on p-unselected
  }

  onMasterClick(): void { this.activeBrowse.set('master'); }

  // ── Detail browse events ─────────────────────────────────────────────────
  onItemSelecionado(item: ItemSC6): void {
    this.itensSelecionados.update(prev => [...prev, item]);
    const idx = this.detailItems().findIndex(i => i.c6Item === item.c6Item);
    if (idx >= 0) this.cursorDetail.set(idx);
    setTimeout(() => this._highlightDetailRow(), 50);
  }

  onItemDeselecionado(item: ItemSC6): void {
    this.itensSelecionados.update(prev =>
      prev.filter(i => i.c6Item !== item.c6Item)
    );
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

  // ── Search & filter ───────────────────────────────────────────────────────
  buscar(): void {
    const { numPedido, nomeCliente, dataDE, dataATE } = this.filtros;
    const de  = this._toISO(dataDE);
    const ate = this._toISO(dataATE);

    // TODO: replace with real service call when backend is available:
    // this.service.buscar(this.filtros).subscribe({
    //   next: r => { this.items.set(r.items); ... },
    //   error: () => { this.items.set(DEMO_SC5.map(r => ({ ...r }))); ... }
    // });
    const resultado = DEMO_SC5.filter(r => {
      if (numPedido?.trim()   && !r.c5Num.includes(numPedido.trim()))                              return false;
      if (nomeCliente?.trim() && !r.c5Xnome.toLowerCase().includes(nomeCliente.trim().toLowerCase())) return false;
      if (de  && r.c5Emissao < de)  return false;
      if (ate && r.c5Emissao > ate) return false;
      return true;
    });

    this.isFiltrado.set(!!(numPedido?.trim() || nomeCliente?.trim() || dataDE?.trim() || dataATE?.trim()));
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
    const numAtivo = this.masterAtual()?.c5Num;
    this.filtros   = { numPedido: '', nomeCliente: '', dataDE: '', dataATE: '' };
    this.isFiltrado.set(false);
    this.masterAtual.set(null);
    this.detailItems.set([]);
    this.cursorDetail.set(-1);
    this.activeBrowse.set('master');
    this.items.set(DEMO_SC5.map(r => ({ ...r })));
    this.cdr.markForCheck();
    setTimeout(() => {
      const todos = DEMO_SC5;
      const idx   = numAtivo ? todos.findIndex(r => r.c5Num === numAtivo) : 0;
      const alvo  = todos[idx >= 0 ? idx : 0];
      this.cursorIndex.set(idx >= 0 ? idx : 0);
      this.onMasterSelecionado(alvo);
    }, 0);
  }

  gerarNF(): void {
    const pedido = this.masterAtual();
    if (!pedido) return;
    // TODO: implement NF generation — call Protheus REST endpoint
    this.notification.success(`NF gerada para o pedido ${pedido.c5Num}.`);
  }

  fmtVal(v: number): string {
    return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  private _carregarItens(numPedido: string): void {
    // TODO: replace with real service call:
    // this.service.getItens(numPedido).subscribe({
    //   next: itens => { this.detailItems.set(itens); ... },
    //   error: () => { this.detailItems.set(DEMO_SC6[numPedido] ?? []); ... }
    // });
    const itens = DEMO_SC6[numPedido] ?? [];
    this.detailItems.set(itens.map(i => ({ ...i })));
    this.cdr.markForCheck();
  }

  private _toISO(d: string): string {
    if (!d?.trim()) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
    const m = d.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    return m ? `${m[3]}-${m[2]}-${m[1]}` : '';
  }
}
