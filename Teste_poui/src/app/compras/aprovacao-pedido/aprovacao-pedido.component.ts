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
  computed,
  DestroyRef,
  HostListener,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  PoButtonModule,
  PoFieldModule,
  PoLoadingModule,
  PoNotificationService,
  PoPageModule,
  PoTableColumn,
  PoTableModule,
} from '@po-ui/ng-components';
import { AprovacaoPedidoService } from '../aprovacao-pedido.service';
import { PedidoAprovacao, ItemPedidoAprovacao } from './models/aprovacao-pedido.model';

// Dados de demonstração — usados em caso de erro na chamada HTTP
const DEMO_MASTER: PedidoAprovacao[] = [
  { numero: '000010', emissao: '2026-06-10', fornecedor: 'FORNECEDOR ABC LTDA',    loja: '01', valorTotal:  5500.00, status: 'P' },
  { numero: '000011', emissao: '2026-06-12', fornecedor: 'DISTRIBUIDORA XYZ S/A', loja: '02', valorTotal: 12000.00, status: 'P' },
  { numero: '000012', emissao: '2026-06-15', fornecedor: 'COMERCIAL DEF ME',       loja: '01', valorTotal:  3200.00, status: 'P' },
];

const DEMO_DETAIL: Record<string, ItemPedidoAprovacao[]> = {
  '000010': [
    { item: '001', produto: 'PROD010', descricao: 'Parafuso M8x25',     unidade: 'CX', quantidade:  10, valorUnit: 150.00, valorTotal: 1500.00 },
    { item: '002', produto: 'PROD011', descricao: 'Arruela Lisa 3/8',   unidade: 'KG', quantidade:  20, valorUnit: 100.00, valorTotal: 2000.00 },
    { item: '003', produto: 'PROD012', descricao: 'Porca Sextavada M8', unidade: 'PC', quantidade: 100, valorUnit:  20.00, valorTotal: 2000.00 },
  ],
  '000011': [
    { item: '001', produto: 'PROD020', descricao: 'Cabo de Aço 3mm', unidade: 'MT', quantidade: 100, valorUnit:  82.00, valorTotal:  8200.00 },
    { item: '002', produto: 'PROD021', descricao: 'Rolamento 6205',  unidade: 'PC', quantidade:  20, valorUnit: 190.00, valorTotal:  3800.00 },
  ],
  '000012': [
    { item: '001', produto: 'PROD030', descricao: 'Luva de Segurança',  unidade: 'PR', quantidade: 50, valorUnit: 32.00, valorTotal: 1600.00 },
    { item: '002', produto: 'PROD031', descricao: 'Óculos de Proteção', unidade: 'PC', quantidade: 40, valorUnit: 40.00, valorTotal: 1600.00 },
  ],
};

@Component({
  selector: 'app-aprovacao-pedido',
  standalone: true,
  imports: [CommonModule, FormsModule, PoPageModule, PoTableModule, PoButtonModule, PoFieldModule, PoLoadingModule],
  templateUrl: './aprovacao-pedido.component.html',
  styleUrl: './aprovacao-pedido.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AprovacaoPedidoComponent implements OnInit, AfterViewInit {
  private readonly service      = inject(AprovacaoPedidoService);
  private readonly notification = inject(PoNotificationService);
  private readonly destroyRef   = inject(DestroyRef);
  private readonly cdr          = inject(ChangeDetectorRef);

  // ── Data signals
  readonly items             = signal<PedidoAprovacao[]>([]);
  readonly detailItems       = signal<ItemPedidoAprovacao[]>([]);
  readonly masterAtual       = signal<PedidoAprovacao | null>(null);
  readonly itensSelecionados = signal<ItemPedidoAprovacao[]>([]);
  readonly loading           = signal(false);

  // ── Navigation signals
  readonly cursorIndex  = signal<number>(0);
  readonly cursorDetail = signal<number>(-1);
  readonly activeBrowse = signal<'master' | 'detail'>('master');
  readonly isFiltrado   = signal(false);

  // ── Alturas responsivas — sem scroll na página
  private readonly _winH = signal(window.innerHeight);
  readonly masterHeight  = computed(() => Math.max(160, Math.floor((this._winH() - 320) * 0.47)));
  readonly detailHeight  = computed(() => Math.max(140, Math.floor((this._winH() - 320) * 0.40)));

  filtros = { campo1: '', campo2: '', dataDE: '', dataATE: '' };

  // ── Colunas Master — SC7 Pedidos de Compra aguardando aprovação
  readonly colunasMaster: PoTableColumn[] = [
    { property: 'numero',     label: 'Número',    width: '100px', sortable: true },
    { property: 'emissao',    label: 'Emissão',   type: 'date', format: 'dd/MM/yyyy', width: '110px' },
    { property: 'fornecedor', label: 'Fornecedor' },
    { property: 'loja',       label: 'Loja',      width: '60px' },
    { property: 'valorTotal', label: 'Total',     type: 'currency', format: 'BRL', width: '120px' },
    {
      property: 'status', label: 'Status', width: '100px',
      type: 'label',
      labels: [
        { value: 'P', label: 'Pendente',  color: 'color-08' },
        { value: 'A', label: 'Aprovado',  color: 'color-11' },
        { value: 'R', label: 'Reprovado', color: 'color-07' },
      ],
    },
  ];

  // ── Colunas Detail — Itens do Pedido SC7
  readonly colunasDetail: PoTableColumn[] = [
    { property: 'item',       label: 'Item',      width: '60px' },
    { property: 'produto',    label: 'Produto',   width: '100px' },
    { property: 'descricao',  label: 'Descrição' },
    { property: 'unidade',    label: 'UN',        width: '60px' },
    { property: 'quantidade', label: 'Qtde',      type: 'number',   format: '1.4-4', width: '90px' },
    { property: 'valorUnit',  label: 'Vlr Unit.', type: 'currency', format: 'BRL',   width: '120px' },
    { property: 'valorTotal', label: 'Total',     type: 'currency', format: 'BRL',   width: '120px' },
  ];

  readonly tituloDetail = computed(() => {
    const m = this.masterAtual();
    return m ? `Itens do Pedido — ${m.numero}` : 'Itens do Pedido';
  });

  readonly qtdSelecionados  = computed(() => this.itensSelecionados().length);
  readonly totalSelecionado = computed(() =>
    this.itensSelecionados().reduce((s, i) => s + (i.valorTotal ?? 0), 0)
  );
  readonly podeConfirmar = computed(() => {
    const m = this.masterAtual();
    return m !== null && m.status === 'P';
  });

  ngOnInit(): void {
    this.buscar();
  }

  // Quirk #1 — OnPush: po-page-default não projeta ng-content sem ciclo de CD após init
  ngAfterViewInit(): void {
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
    const idx = this.cursorIndex();
    if (idx < 0) return;
    const rows = document.querySelectorAll<HTMLElement>('.master-browse table tbody tr');
    const row  = rows[idx];
    if (!row) return;
    row.classList.add('row-ativa');
    this._scrollRowIntoView(row);
  }

  private _highlightDetailRow(): void {
    document.querySelectorAll('.detail-browse .row-ativa').forEach(el => el.classList.remove('row-ativa'));
    const idx = this.cursorDetail();
    if (idx < 0) return;
    const rows = document.querySelectorAll<HTMLElement>('.detail-browse table tbody tr');
    const row  = rows[idx];
    if (!row) return;
    row.classList.add('row-ativa');
    this._scrollRowIntoView(row);
  }

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
  onMasterSelecionado(item: PedidoAprovacao): void {
    const idx = this.items().findIndex(i => i.numero === item.numero);
    this.cursorIndex.set(idx);
    this.masterAtual.set(item);
    this.cursorDetail.set(-1);
    this.activeBrowse.set('master');
    this._carregarItens(item.numero);
    this.cdr.markForCheck();
    setTimeout(() => this._highlightMasterRow(), 50);
  }

  onMasterDeselecionado(_item: PedidoAprovacao): void {
    // seleção única: master permanece selecionado mesmo no p-unselected
  }

  onMasterClick(): void { this.activeBrowse.set('master'); }

  // ── Detail browse events
  onItemSelecionado(item: ItemPedidoAprovacao): void {
    this.itensSelecionados.update(prev => [...prev, item]);
    const idx = this.detailItems().findIndex(i => i.item === item.item);
    if (idx >= 0) this.cursorDetail.set(idx);
    setTimeout(() => this._highlightDetailRow(), 50);
  }

  onItemDeselecionado(item: ItemPedidoAprovacao): void {
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
    const { campo1, campo2, dataDE, dataATE } = this.filtros;
    this.loading.set(true);
    this.service.getAll({ numero: campo1, fornecedor: campo2, dataDE, dataATE })
      .pipe(
        finalize(() => { this.loading.set(false); this.cdr.markForCheck(); }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (res) => this._aplicarLista(res.items),
        error: () => {
          this.notification.error('Não foi possível carregar os pedidos. Exibindo dados de demonstração.');
          this._aplicarLista(DEMO_MASTER);
        },
      });
  }

  removerFiltro(): void {
    this.filtros = { campo1: '', campo2: '', dataDE: '', dataATE: '' };
    this.buscar();
  }

  confirmar(): void {
    const master = this.masterAtual();
    if (!master) return;
    this.loading.set(true);
    this.service.aprovar(master.numero)
      .pipe(finalize(() => { this.loading.set(false); this.cdr.markForCheck(); }))
      .subscribe({
        next: () => {
          this.notification.success(`Pedido ${master.numero} aprovado com sucesso.`);
          this.items.update(prev =>
            prev.map(p => p.numero === master.numero ? { ...p, status: 'A' as const } : p)
          );
          this.masterAtual.update(m => m ? { ...m, status: 'A' } : m);
          this.itensSelecionados.set([]);
          this.cdr.markForCheck();
        },
        error: (err) => this.notification.error(this._parseError(err)),
      });
  }

  fmtVal(v: number): string {
    return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  private _aplicarLista(lista: PedidoAprovacao[]): void {
    const { campo1, campo2, dataDE, dataATE } = this.filtros;
    this.isFiltrado.set(!!(campo1?.trim() || campo2?.trim() || dataDE?.trim() || dataATE?.trim()));
    this.masterAtual.set(null);
    this.detailItems.set([]);
    this.itensSelecionados.set([]);
    this.cursorIndex.set(0);
    this.cursorDetail.set(-1);
    this.activeBrowse.set('master');
    this.items.set(lista.map(r => ({ ...r })));
    this.cdr.markForCheck();
    if (lista.length > 0) setTimeout(() => this.onMasterSelecionado(lista[0]), 0);
  }

  private _carregarItens(key: string): void {
    this.service.getItens(key)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (itens) => {
          this.detailItems.set(itens.map(i => ({ ...i })));
          this.cdr.markForCheck();
        },
        error: () => {
          const itens = DEMO_DETAIL[key] ?? [];
          this.detailItems.set(itens.map(i => ({ ...i })));
          this.cdr.markForCheck();
        },
      });
  }

  private _parseError(err: unknown): string {
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
