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
  computed,
  DestroyRef,
  HostListener,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  PoButtonModule,
  PoFieldModule,
  PoNotificationService,
  PoPageModule,
  PoTableColumn,
  PoTableModule,
} from '@po-ui/ng-components';
import { PedidoCompraService, GetAllParams } from '../pedido-compra.service';
import { PedidoCompra, PedidoCompraItem, PedidoCompraItemDetail } from '../models/pedido-compra.model';

// Dados de demonstração — usados apenas no callback de erro de buscar()/removerFiltro(),
// caso a API real (WSRESTFUL PedidosAPI) esteja indisponível.
const DEMO_ITEMS: PedidoCompraItem[] = [
  { numero: '000001', item: '01', produto: 'PA0001', quantidade: 10, preco: 25.5,  fornecedor: 'FORNECEDOR ABC LTDA', loja: '01', emissao: '20260610' },
  { numero: '000001', item: '02', produto: 'PA0002', quantidade: 5,  preco: 120,   fornecedor: 'FORNECEDOR ABC LTDA', loja: '01', emissao: '20260610' },
  { numero: '000002', item: '01', produto: 'PA0003', quantidade: 20, preco: 8.9,   fornecedor: 'FORNECEDOR XYZ S.A.', loja: '02', emissao: '20260615' },
  { numero: '000003', item: '01', produto: 'PA0004', quantidade: 1,  preco: 3200,  fornecedor: 'FORNECEDOR DELTA ME', loja: '01', emissao: '20260618' },
];

@Component({
  selector: 'app-pedido-compra',
  standalone: true,
  imports: [CommonModule, FormsModule, PoPageModule, PoTableModule, PoButtonModule, PoFieldModule],
  templateUrl: './pedido-compra.component.html',
  styleUrl: './pedido-compra.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PedidoCompraComponent implements OnInit, AfterViewInit {
  private readonly service      = inject(PedidoCompraService);
  private readonly notification = inject(PoNotificationService);
  private readonly destroyRef   = inject(DestroyRef);
  private readonly cdr          = inject(ChangeDetectorRef);
  private readonly router       = inject(Router);

  // ── Data signals
  private readonly allItems  = signal<PedidoCompraItem[]>([]); // cache achatado (numero+item) usado para derivar master/detail
  readonly items              = signal<PedidoCompra[]>([]);
  readonly detailItems        = signal<PedidoCompraItemDetail[]>([]);
  readonly masterAtual        = signal<PedidoCompra | null>(null);
  readonly itensSelecionados  = signal<PedidoCompraItemDetail[]>([]);

  // ── Loading / error state
  readonly carregando = signal(false);

  // ── Navigation signals
  readonly cursorIndex  = signal<number>(0);
  readonly cursorDetail = signal<number>(-1);
  readonly activeBrowse = signal<'master' | 'detail'>('master');
  readonly isFiltrado   = signal(false);

  // ── Alturas responsivas — sem scroll na página
  // Offset 320px = PO shell navbar + título da página + filtros-bar + cabeçalhos dos browses + rodapé
  // Ajuste se adicionar/remover elementos fixos.
  private readonly _winH = signal(window.innerHeight);
  readonly masterHeight  = computed(() => Math.max(160, Math.floor((this._winH() - 320) * 0.47)));
  readonly detailHeight  = computed(() => Math.max(140, Math.floor((this._winH() - 320) * 0.40)));

  // ── Campos de filtro
  // 'produto' vai para o backend via 'q' (busca em C7_PRODUTO); 'numero' e as
  // datas são aplicados client-side, pois o GET de lista não suporta filtro
  // parcial por número (ver comentário em buscar()).
  filtros = { numero: '', produto: '', dataDE: '', dataATE: '' };

  // ── Definição de colunas
  readonly colunasMaster: PoTableColumn[] = [
    { property: 'numero',     label: 'Número',      width: '100px' },
    { property: 'fornecedor', label: 'Fornecedor' },
    { property: 'loja',       label: 'Loja',        width: '70px' },
    { property: 'emissao',    label: 'Emissão',     type: 'date',     format: 'dd/MM/yyyy', width: '110px' },
    { property: 'qtdItens',   label: 'Itens',       type: 'number',   format: '1.0-2',       width: '80px' },
    { property: 'valorTotal', label: 'Valor Total', type: 'currency', format: 'BRL',         width: '130px' },
  ];

  readonly colunasDetail: PoTableColumn[] = [
    { property: 'item',       label: 'Item',        width: '60px' },
    { property: 'produto',    label: 'Produto',     width: '110px' },
    { property: 'quantidade', label: 'Qtde',        type: 'number',   format: '1.0-2', width: '90px' },
    { property: 'preco',      label: 'Preço Unit.', type: 'currency', format: 'BRL',   width: '120px' },
    { property: 'valorTotal', label: 'Valor Total', type: 'currency', format: 'BRL',   width: '120px' },
  ];

  // ── Computed display values
  readonly tituloDetail = computed(() => {
    const m = this.masterAtual();
    return m ? `Itens do Pedido — ${m.numero}` : 'Itens do Pedido';
  });

  readonly qtdSelecionados  = computed(() => this.itensSelecionados().length);
  readonly totalSelecionado = computed(() =>
    this.itensSelecionados().reduce((s, i) => s + i.valorTotal, 0)
  );
  readonly podeConfirmar = computed(() => this.itensSelecionados().length > 0);

  ngOnInit(): void {
    this.buscar();
  }

  ngAfterViewInit(): void {
    // Quirk OnPush #1 — necessário para conteúdo projetado dentro de po-page-default
    setTimeout(() => this.cdr.detectChanges());
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

  // Sobe o DOM a partir da linha para encontrar o ancestral scrollável real.
  // Chamadores DEVEM usar setTimeout(..., 50) — NÃO 0ms — para que a detecção de
  // mudanças do PO-UI tenha concluído e getBoundingClientRect() retorne valores corretos.
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

  // ── Master browse events
  onMasterSelecionado(item: PedidoCompra): void {
    const idx = this.items().findIndex(i => i.numero === item.numero);
    this.cursorIndex.set(idx);
    this.masterAtual.set(item);
    this.cursorDetail.set(-1);
    this.itensSelecionados.set([]);
    this.activeBrowse.set('master');
    this._carregarItens(item.numero);
    this.cdr.markForCheck();
    setTimeout(() => this._highlightMasterRow(), 50);
  }

  onMasterDeselecionado(_item: PedidoCompra): void {
    // seleção única: master permanece selecionado mesmo no p-unselected
  }

  onMasterClick(): void { this.activeBrowse.set('master'); }

  // ── Detail browse events
  onItemSelecionado(item: PedidoCompraItemDetail): void {
    this.itensSelecionados.update(prev => [...prev, item]);
    const idx = this.detailItems().findIndex(i => i.item === item.item);
    if (idx >= 0) this.cursorDetail.set(idx);
    setTimeout(() => this._highlightDetailRow(), 50);
  }

  onItemDeselecionado(item: PedidoCompraItemDetail): void {
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

  // ── Search & filter
  buscar(): void {
    this.carregando.set(true);
    const params: GetAllParams = {
      pageSize: 200,
      // O GET de lista do backend (_PedLista, disparado quando 'numero' está
      // vazio) só suporta busca rápida por produto via 'q'. Enviar 'numero'
      // faria o WSMETHOD GET rotear para _PedCons (consulta por chave exata
      // numero+item) em vez de listar — por isso o filtro de número é
      // aplicado client-side em _aplicarFiltroLocal().
      q: this.filtros.produto?.trim() || undefined,
    };

    this.service.getAll(params).pipe(
      finalize(() => { this.carregando.set(false); this.cdr.markForCheck(); }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: (res) => this._processarResultado(res.items),
      error: (err) => {
        this.notification.error(this.parseProtheusError(err));
        this._processarResultado(DEMO_ITEMS);
      },
    });
  }

  removerFiltro(): void {
    const numeroAtivo = this.masterAtual()?.numero;
    this.filtros = { numero: '', produto: '', dataDE: '', dataATE: '' };

    this.carregando.set(true);
    this.service.getAll({ pageSize: 200 }).pipe(
      finalize(() => { this.carregando.set(false); this.cdr.markForCheck(); }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: (res) => this._processarResultado(res.items, numeroAtivo),
      error: (err) => {
        this.notification.error(this.parseProtheusError(err));
        this._processarResultado(DEMO_ITEMS, numeroAtivo);
      },
    });
  }

  private _processarResultado(itensRaw: PedidoCompraItem[], numeroParaManter?: string): void {
    const filtrados = this._aplicarFiltroLocal(itensRaw);
    this.allItems.set(filtrados);
    this.isFiltrado.set(!!(this.filtros.numero?.trim() || this.filtros.dataDE?.trim() || this.filtros.dataATE?.trim()));

    const masters = this._agruparPorNumero(filtrados);
    this.masterAtual.set(null);
    this.detailItems.set([]);
    this.itensSelecionados.set([]);
    this.cursorIndex.set(0);
    this.cursorDetail.set(-1);
    this.activeBrowse.set('master');
    this.items.set(masters);
    this.cdr.markForCheck();

    if (masters.length > 0) {
      const idx  = numeroParaManter ? masters.findIndex(m => m.numero === numeroParaManter) : 0;
      const alvo = masters[idx >= 0 ? idx : 0];
      this.cursorIndex.set(idx >= 0 ? idx : 0);
      setTimeout(() => this.onMasterSelecionado(alvo), 0);
    }
  }

  private _aplicarFiltroLocal(itens: PedidoCompraItem[]): PedidoCompraItem[] {
    const { numero, dataDE, dataATE } = this.filtros;
    const de  = this._toISO(dataDE);
    const ate = this._toISO(dataATE);

    return itens.filter(i => {
      if (numero?.trim() && !i.numero.includes(numero.trim())) return false;
      const emissaoIso = this._dtoSToIso(i.emissao);
      if (de  && emissaoIso < de)  return false;
      if (ate && emissaoIso > ate) return false;
      return true;
    });
  }

  private _agruparPorNumero(itens: PedidoCompraItem[]): PedidoCompra[] {
    const mapa = new Map<string, PedidoCompra>();
    for (const it of itens) {
      const valorItem = it.quantidade * it.preco;
      const existente = mapa.get(it.numero);
      if (existente) {
        existente.qtdItens   += 1;
        existente.valorTotal += valorItem;
      } else {
        mapa.set(it.numero, {
          numero:     it.numero,
          fornecedor: it.fornecedor,
          loja:       it.loja,
          emissao:    this._dtoSToIso(it.emissao),
          qtdItens:   1,
          valorTotal: valorItem,
        });
      }
    }
    return Array.from(mapa.values()).sort((a, b) => a.numero.localeCompare(b.numero));
  }

  confirmar(): void {
    // TODO: implemente a ação de confirmação (ex: gerar recebimento, aprovar itens etc.)
    this.notification.success('Ação executada com sucesso.');
  }

  verDetalhe(): void {
    const atual = this.masterAtual();
    if (!atual) return;
    this.router.navigate(['/compras/pedido-compra', atual.numero, 'detalhe']);
  }

  fmtVal(v: number): string {
    return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  private _carregarItens(numero: string): void {
    const itens: PedidoCompraItemDetail[] = this.allItems()
      .filter(i => i.numero === numero)
      .map(i => ({ ...i, valorTotal: i.quantidade * i.preco }));
    this.detailItems.set(itens);
    this.cdr.markForCheck();
  }

  private _toISO(d: string): string {
    if (!d?.trim()) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
    const m = d.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    return m ? `${m[3]}-${m[2]}-${m[1]}` : '';
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
      return err.error?.message ?? 'Erro ao carregar pedidos de compra.';
    }
  }
}
