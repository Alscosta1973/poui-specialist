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
import { FiltrosPedido, ItemPedidoSC6, PedidoSC5 } from './gerar-nf-pedido.model';

const DEMO_PEDIDOS: PedidoSC5[] = [
  { numPedido: '000001', cliente: 'CLI001', loja: '01', produto: 'PROD001', descricao: 'Produto Alpha',   nomCliente: 'João Silva',    emissao: '2026-06-01', qtdTotal: 10, prcVenda:  150.00, vlrTotal:  1500.00, status: 'Aprovado' },
  { numPedido: '000002', cliente: 'CLI002', loja: '01', produto: 'PROD002', descricao: 'Produto Beta',    nomCliente: 'Maria Souza',   emissao: '2026-06-02', qtdTotal:  5, prcVenda:  160.00, vlrTotal:   800.00, status: 'Aprovado' },
  { numPedido: '000003', cliente: 'CLI001', loja: '01', produto: 'PROD003', descricao: 'Produto Gamma',   nomCliente: 'João Silva',    emissao: '2026-06-03', qtdTotal:  2, prcVenda:  150.00, vlrTotal:   300.00, status: 'Aprovado' },
  { numPedido: '000004', cliente: 'CLI003', loja: '02', produto: 'PROD004', descricao: 'Produto Delta',   nomCliente: 'Carlos Nunes',  emissao: '2026-06-04', qtdTotal:  8, prcVenda:  200.00, vlrTotal:  1600.00, status: 'Aprovado' },
  { numPedido: '000005', cliente: 'CLI004', loja: '01', produto: 'PROD005', descricao: 'Produto Épsilon', nomCliente: 'Ana Ferreira',  emissao: '2026-06-05', qtdTotal:  6, prcVenda:  320.00, vlrTotal:  1920.00, status: 'Aprovado' },
  { numPedido: '000006', cliente: 'CLI005', loja: '02', produto: 'PROD006', descricao: 'Produto Zeta',    nomCliente: 'Roberto Lima',  emissao: '2026-06-05', qtdTotal:  3, prcVenda:  450.00, vlrTotal:  1350.00, status: 'Aprovado' },
  { numPedido: '000007', cliente: 'CLI002', loja: '01', produto: 'PROD007', descricao: 'Produto Eta',     nomCliente: 'Maria Souza',   emissao: '2026-06-06', qtdTotal: 12, prcVenda:   90.00, vlrTotal:  1080.00, status: 'Aprovado' },
  { numPedido: '000008', cliente: 'CLI006', loja: '03', produto: 'PROD008', descricao: 'Produto Theta',   nomCliente: 'Fernanda Rocha',emissao: '2026-06-07', qtdTotal:  4, prcVenda:  550.00, vlrTotal:  2200.00, status: 'Aprovado' },
  { numPedido: '000009', cliente: 'CLI003', loja: '02', produto: 'PROD009', descricao: 'Produto Iota',    nomCliente: 'Carlos Nunes',  emissao: '2026-06-08', qtdTotal:  7, prcVenda:  180.00, vlrTotal:  1260.00, status: 'Aprovado' },
  { numPedido: '000010', cliente: 'CLI007', loja: '01', produto: 'PROD010', descricao: 'Produto Kappa',   nomCliente: 'Paulo Mendonça',emissao: '2026-06-09', qtdTotal:  9, prcVenda:  250.00, vlrTotal:  2250.00, status: 'Aprovado' },
];

const DEMO_ITENS: Record<string, ItemPedidoSC6[]> = {
  '000001': [
    { recno:  1, numPedido: '000001', item: '01', produto: 'PROD001', qtdVenda: 5, prcVenda: 150.00, valor:  750.00, emissao: '2026-06-01' },
    { recno:  2, numPedido: '000001', item: '02', produto: 'PROD002', qtdVenda: 3, prcVenda: 150.00, valor:  450.00, emissao: '2026-06-01' },
    { recno:  3, numPedido: '000001', item: '03', produto: 'PROD003', qtdVenda: 2, prcVenda: 150.00, valor:  300.00, emissao: '2026-06-01' },
  ],
  '000002': [
    { recno:  4, numPedido: '000002', item: '01', produto: 'PROD002', qtdVenda: 3, prcVenda: 160.00, valor:  480.00, emissao: '2026-06-02' },
    { recno:  5, numPedido: '000002', item: '02', produto: 'PROD004', qtdVenda: 2, prcVenda: 160.00, valor:  320.00, emissao: '2026-06-02' },
  ],
  '000003': [
    { recno:  6, numPedido: '000003', item: '01', produto: 'PROD003', qtdVenda: 2, prcVenda: 150.00, valor:  300.00, emissao: '2026-06-03' },
  ],
  '000004': [
    { recno:  7, numPedido: '000004', item: '01', produto: 'PROD004', qtdVenda: 4, prcVenda: 200.00, valor:  800.00, emissao: '2026-06-04' },
    { recno:  8, numPedido: '000004', item: '02', produto: 'PROD005', qtdVenda: 4, prcVenda: 200.00, valor:  800.00, emissao: '2026-06-04' },
  ],
  '000005': [
    { recno:  9, numPedido: '000005', item: '01', produto: 'PROD005', qtdVenda: 2, prcVenda: 320.00, valor:  640.00, emissao: '2026-06-05' },
    { recno: 10, numPedido: '000005', item: '02', produto: 'PROD006', qtdVenda: 3, prcVenda: 320.00, valor:  960.00, emissao: '2026-06-05' },
    { recno: 11, numPedido: '000005', item: '03', produto: 'PROD007', qtdVenda: 1, prcVenda: 320.00, valor:  320.00, emissao: '2026-06-05' },
  ],
  '000006': [
    { recno: 12, numPedido: '000006', item: '01', produto: 'PROD006', qtdVenda: 1, prcVenda: 450.00, valor:  450.00, emissao: '2026-06-05' },
    { recno: 13, numPedido: '000006', item: '02', produto: 'PROD008', qtdVenda: 2, prcVenda: 450.00, valor:  900.00, emissao: '2026-06-05' },
  ],
  '000007': [
    { recno: 14, numPedido: '000007', item: '01', produto: 'PROD007', qtdVenda: 6, prcVenda:  90.00, valor:  540.00, emissao: '2026-06-06' },
    { recno: 15, numPedido: '000007', item: '02', produto: 'PROD009', qtdVenda: 4, prcVenda:  90.00, valor:  360.00, emissao: '2026-06-06' },
    { recno: 16, numPedido: '000007', item: '03', produto: 'PROD010', qtdVenda: 2, prcVenda:  90.00, valor:  180.00, emissao: '2026-06-06' },
  ],
  '000008': [
    { recno: 17, numPedido: '000008', item: '01', produto: 'PROD008', qtdVenda: 2, prcVenda: 550.00, valor: 1100.00, emissao: '2026-06-07' },
    { recno: 18, numPedido: '000008', item: '02', produto: 'PROD001', qtdVenda: 2, prcVenda: 550.00, valor: 1100.00, emissao: '2026-06-07' },
  ],
  '000009': [
    { recno: 19, numPedido: '000009', item: '01', produto: 'PROD009', qtdVenda: 4, prcVenda: 180.00, valor:  720.00, emissao: '2026-06-08' },
    { recno: 20, numPedido: '000009', item: '02', produto: 'PROD002', qtdVenda: 3, prcVenda: 180.00, valor:  540.00, emissao: '2026-06-08' },
  ],
  '000010': [
    { recno: 21, numPedido: '000010', item: '01', produto: 'PROD010', qtdVenda: 3, prcVenda: 250.00, valor:  750.00, emissao: '2026-06-09' },
    { recno: 22, numPedido: '000010', item: '02', produto: 'PROD003', qtdVenda: 3, prcVenda: 250.00, valor:  750.00, emissao: '2026-06-09' },
    { recno: 23, numPedido: '000010', item: '03', produto: 'PROD005', qtdVenda: 3, prcVenda: 250.00, valor:  750.00, emissao: '2026-06-09' },
  ],
};

@Component({
  selector: 'app-gerar-nf-pedido',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PoPageModule,
    PoTableModule,
    PoButtonModule,
    PoFieldModule,
  ],
  templateUrl: './gerar-nf-pedido.component.html',
  styleUrl:    './gerar-nf-pedido.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GerarNfPedidoComponent implements OnInit {
  private readonly notification = inject(PoNotificationService);
  private readonly cdr          = inject(ChangeDetectorRef);

  filtros: FiltrosPedido = { numPedido: '', codCliente: '', dataEmissaoDe: '', dataEmissaoAte: '' };

  readonly pedidos           = signal<PedidoSC5[]>([]);
  readonly itensPedidoAtual  = signal<ItemPedidoSC6[]>([]);
  readonly pedidoAtual       = signal<PedidoSC5 | null>(null);
  readonly itensSelecionados = signal<ItemPedidoSC6[]>([]);
  readonly cursorIndex       = signal<number>(0);
  readonly cursorSC6         = signal<number>(-1);
  readonly activeBrowse      = signal<'sc5' | 'sc6'>('sc5');
  readonly isFiltrado        = signal(false);

  readonly winH       = signal(768);
  // 320 = toolbar(48) + pageHeader(96) + contentPad(16) + filterBar(48) + browseHeaders(30) + footer(50) + safety(32)
  readonly sc5Height  = computed(() => Math.max(160, Math.floor((this.winH() - 320) * 0.47)));
  readonly sc6Height  = computed(() => Math.max(140, Math.floor((this.winH() - 320) * 0.40)));

  readonly totalSelecionado  = computed(() => this.itensSelecionados().reduce((s, i) => s + i.valor, 0));
  readonly pedidosComSelecao = computed(() => new Set(this.itensSelecionados().map(i => i.numPedido)));
  readonly qtdPedidos        = computed(() => this.pedidosComSelecao().size);
  readonly qtdItens          = computed(() => this.itensSelecionados().length);
  readonly podeGerar         = computed(() => this.itensSelecionados().length > 0);

  readonly tituloSC6 = computed(() => {
    const p = this.pedidoAtual();
    return p
      ? `Itens do Pedido ${p.numPedido} — ${p.nomCliente}`
      : 'Itens do Pedido — selecione um pedido acima';
  });

  readonly pedidosParaExibir = computed(() => {
    const selecionados = this.pedidosComSelecao();
    const ativo = this.pedidoAtual();
    return this.pedidos().map(p => ({
      ...p,
      _marcado:  selecionados.has(p.numPedido) ? '✔' : '',
      $selected: ativo?.numPedido === p.numPedido,
    }));
  });

  readonly colunasSC5: PoTableColumn[] = [
    { property: '_marcado',   label: '',           width: '32px'  },
    { property: 'numPedido',  label: 'Pedido',     width: '80px'  },
    { property: 'cliente',    label: 'Cliente',    width: '80px'  },
    { property: 'nomCliente', label: 'Nome'                       },
    { property: 'emissao',    label: 'Emissão',    width: '90px',  type: 'date', format: 'dd/MM/yyyy' },
    { property: 'qtdTotal',   label: 'Qtd',        width: '60px',  type: 'number' },
    { property: 'vlrTotal',   label: 'Vl. Total',  width: '110px', type: 'currency', format: 'BRL' },
    { property: 'status',     label: 'Status',     width: '90px'  },
  ];

  readonly colunasSC6: PoTableColumn[] = [
    { property: 'item',      label: 'Item',      width: '50px'  },
    { property: 'produto',   label: 'Produto'                   },
    { property: 'qtdVenda',  label: 'Qtd',       width: '68px',  type: 'number' },
    { property: 'prcVenda',  label: 'Pr. Venda', width: '100px', type: 'currency', format: 'BRL' },
    { property: 'valor',     label: 'Valor',     width: '110px', type: 'currency', format: 'BRL' },
    { property: 'emissao',   label: 'Emissão',   width: '90px',  type: 'date', format: 'dd/MM/yyyy' },
  ];

  ngOnInit(): void {
    this.winH.set(window.innerHeight);
    this.pedidos.set(DEMO_PEDIDOS.map(p => ({ ...p })));
    this.cursorIndex.set(0);
    this.onPedidoSelecionado(DEMO_PEDIDOS[0]);
  }

  @HostListener('window:resize')
  onResize(): void {
    this.winH.set(window.innerHeight);
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    const tag = (event.target as HTMLElement)?.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea') return;

    if (event.key === 'Tab') {
      event.preventDefault();
      this.activeBrowse.set(this.activeBrowse() === 'sc5' ? 'sc6' : 'sc5');
      if (this.activeBrowse() === 'sc6' && this.cursorSC6() < 0 && this.itensPedidoAtual().length) {
        this.cursorSC6.set(0);
        setTimeout(() => this._highlightSC6Row(), 50);
      }
      return;
    }

    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    const delta = event.key === 'ArrowDown' ? 1 : -1;

    if (this.activeBrowse() === 'sc5') {
      this._moverCursor(delta);
      setTimeout(() => this._highlightActiveRow(), 50);
    } else {
      this._moverCursorSC6(delta);
      setTimeout(() => this._highlightSC6Row(), 50);
    }
  }

  buscarPedidos(): void {
    const { numPedido, codCliente, dataEmissaoDe, dataEmissaoAte } = this.filtros;
    const de  = this._toISO(dataEmissaoDe);
    const ate = this._toISO(dataEmissaoAte);

    const resultado = DEMO_PEDIDOS.filter(p => {
      if (numPedido?.trim() && !p.numPedido.includes(numPedido.trim())) return false;
      if (codCliente?.trim()) {
        const s = codCliente.trim().toLowerCase();
        if (!p.cliente.toLowerCase().includes(s) && !p.nomCliente.toLowerCase().includes(s)) return false;
      }
      if (de  && p.emissao < de)  return false;
      if (ate && p.emissao > ate) return false;
      return true;
    });

    this.isFiltrado.set(!!(numPedido?.trim() || codCliente?.trim() ||
      dataEmissaoDe?.trim() || dataEmissaoAte?.trim()));
    this.pedidoAtual.set(null);
    this.itensPedidoAtual.set([]);
    this.itensSelecionados.set([]);
    this.cursorIndex.set(0);
    this.cursorSC6.set(-1);
    this.activeBrowse.set('sc5');
    this.pedidos.set(resultado.map(p => ({ ...p })));
    this.cdr.markForCheck();

    if (resultado.length > 0) {
      setTimeout(() => this.onPedidoSelecionado(resultado[0]), 0);
    }
  }

  removerFiltro(): void {
    const numAtivo = this.pedidoAtual()?.numPedido;
    this.filtros = { numPedido: '', codCliente: '', dataEmissaoDe: '', dataEmissaoAte: '' };
    this.isFiltrado.set(false);
    this.pedidos.set(DEMO_PEDIDOS.map(p => ({ ...p })));
    this.pedidoAtual.set(null);
    this.itensPedidoAtual.set([]);
    this.cursorSC6.set(-1);
    this.activeBrowse.set('sc5');
    this.cdr.markForCheck();
    setTimeout(() => {
      const todos = DEMO_PEDIDOS;
      const idx   = numAtivo ? todos.findIndex(p => p.numPedido === numAtivo) : 0;
      const alvo  = todos[idx >= 0 ? idx : 0];
      this.cursorIndex.set(idx >= 0 ? idx : 0);
      this.onPedidoSelecionado(alvo);
    }, 0);
  }

  onSC5Click(): void {
    this.activeBrowse.set('sc5');
  }

  onSC6Click(): void {
    this.activeBrowse.set('sc6');
    if (this.cursorSC6() < 0 && this.itensPedidoAtual().length) {
      this.cursorSC6.set(0);
      setTimeout(() => this._highlightSC6Row(), 50);
    }
  }

  onPedidoSelecionado(pedido: PedidoSC5): void {
    const idx = this.pedidos().findIndex(p => p.numPedido === pedido.numPedido);
    this.cursorIndex.set(idx);
    this.cursorSC6.set(-1);
    this.activeBrowse.set('sc5');
    this.pedidoAtual.set(pedido);
    this._carregarItens(pedido.numPedido);
    setTimeout(() => this._highlightActiveRow(), 50);
  }

  onPedidoDeselecionado(_pedido: PedidoSC5): void {
    this.pedidoAtual.set(null);
    this.itensPedidoAtual.set([]);
    this.cursorSC6.set(-1);
    this.cdr.markForCheck();
  }

  onItemSelecionado(item: ItemPedidoSC6): void {
    const idx = this.itensPedidoAtual().findIndex(
      i => i.numPedido === item.numPedido && i.item === item.item
    );
    if (idx >= 0) { this.cursorSC6.set(idx); setTimeout(() => this._highlightSC6Row(), 50); }
    const jaExiste = this.itensSelecionados().some(
      i => i.numPedido === item.numPedido && i.item === item.item
    );
    if (!jaExiste) {
      this.itensSelecionados.update(itens => [...itens, item]);
    }
    this.cdr.markForCheck();
  }

  onItemDeselecionado(item: ItemPedidoSC6): void {
    this.itensSelecionados.update(itens =>
      itens.filter(i => !(i.numPedido === item.numPedido && i.item === item.item))
    );
    this.cdr.markForCheck();
  }

  onTodosItensSelecionados(): void {
    const atuais  = this.itensPedidoAtual();
    const jaSelec = this.itensSelecionados();
    const novos   = atuais.filter(
      a => !jaSelec.some(s => s.numPedido === a.numPedido && s.item === a.item)
    );
    this.itensSelecionados.update(itens => [...itens, ...novos]);
    this.cdr.markForCheck();
  }

  onTodosItensDeselecionados(): void {
    const pedidoNum = this.pedidoAtual()?.numPedido;
    if (pedidoNum) {
      this.itensSelecionados.update(itens => itens.filter(i => i.numPedido !== pedidoNum));
    }
    this.cdr.markForCheck();
  }

  abrirModal(): void {
    const qtd   = this.qtdItens();
    const total = this.fmtVal(this.totalSelecionado());
    this.notification.success(`NF gerada (simulação): ${qtd} item(ns) · R$ ${total}`);
    this.itensSelecionados.set([]);
    this.itensPedidoAtual.set([]);
    this.pedidoAtual.set(null);
    this.buscarPedidos();
  }

  temItensMarcados(row: PedidoSC5): boolean {
    return this.pedidosComSelecao().has(row.numPedido);
  }

  fmtVal(v: number): string {
    return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // Normaliza para ISO (YYYY-MM-DD). po-datepicker retorna ISO por padrão;
  // aceita também DD/MM/YYYY caso o usuário tenha digitado manualmente.
  private _toISO(d: string): string {
    if (!d?.trim()) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
    const m = d.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    return m ? `${m[3]}-${m[2]}-${m[1]}` : '';
  }

  private _moverCursor(delta: number): void {
    const pedidos = this.pedidos();
    if (!pedidos.length) return;
    const current = this.cursorIndex();
    const next    = current < 0 ? 0 : Math.max(0, Math.min(pedidos.length - 1, current + delta));
    if (next === current && current >= 0) return;
    this.cursorIndex.set(next);
    this.cursorSC6.set(-1);
    this.pedidoAtual.set(pedidos[next]);
    this._carregarItens(pedidos[next].numPedido);
  }

  private _moverCursorSC6(delta: number): void {
    const itens = this.itensPedidoAtual();
    if (!itens.length) return;
    const current = this.cursorSC6();
    const next    = current < 0 ? 0 : Math.max(0, Math.min(itens.length - 1, current + delta));
    if (next === current && current >= 0) return;
    this.cursorSC6.set(next);
  }

  private _highlightActiveRow(): void {
    document.querySelectorAll('.sc5-browse .row-ativa').forEach(
      el => el.classList.remove('row-ativa')
    );
    const idx = this.cursorIndex();
    if (idx < 0) return;
    const rows = document.querySelectorAll<HTMLElement>('.sc5-browse table tbody tr');
    const row  = rows[idx];
    if (!row) return;
    row.classList.add('row-ativa');
    this._scrollRowIntoView(row);
  }

  private _highlightSC6Row(): void {
    document.querySelectorAll('.sc6-browse .row-ativa').forEach(
      el => el.classList.remove('row-ativa')
    );
    const idx = this.cursorSC6();
    if (idx < 0) return;
    const rows = document.querySelectorAll<HTMLElement>('.sc6-browse table tbody tr');
    const row  = rows[idx];
    if (!row) return;
    row.classList.add('row-ativa');
    this._scrollRowIntoView(row);
  }

  // Sobe o DOM a partir da linha até encontrar o ancestral scrollável real.
  // Não depende de nome de classe interno do PO-UI — funciona em qualquer versão.
  // NUNCA usar scrollIntoView nativo: não desconta o thead sticky (linha 0 fica
  // escondida atrás do cabeçalho fixo ao voltar para o topo).
  private _scrollRowIntoView(row: HTMLElement): void {
    let container: HTMLElement | null = row.parentElement;
    while (container && container !== document.documentElement) {
      const style = window.getComputedStyle(container);
      if (
        (style.overflowY === 'auto' || style.overflowY === 'scroll') &&
        container.scrollHeight > container.clientHeight
      ) { break; }
      container = container.parentElement;
    }
    if (!container || container === document.documentElement) return;

    const thead  = container.querySelector('thead') as HTMLElement | null;
    const theadH = thead ? thead.offsetHeight : 0;

    const cRect     = container.getBoundingClientRect();
    const rRect     = row.getBoundingClientRect();
    const rowTop    = rRect.top - cRect.top + container.scrollTop;
    const rowBottom = rowTop + row.offsetHeight;

    const visTop = container.scrollTop + theadH;
    const visBot = container.scrollTop + container.clientHeight;

    if (rowTop < visTop) {
      container.scrollTop = Math.max(0, rowTop - theadH);
    } else if (rowBottom > visBot) {
      container.scrollTop = rowBottom - container.clientHeight;
    }
  }

  private _carregarItens(numPedido: string): void {
    const selec = this.itensSelecionados();
    const itens = (DEMO_ITENS[numPedido] ?? []).map(i => ({
      ...i,
      $selected: selec.some(s => s.numPedido === i.numPedido && s.item === i.item),
    }));
    this.itensPedidoAtual.set(itens);
    this.cdr.detectChanges();
  }
}
