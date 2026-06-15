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
  DestroyRef,
  HostListener,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs/operators';
import {
  PoNotificationService,
  PoPageModule,
  PoTableColumn,
  PoTableModule,
} from '@po-ui/ng-components';

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface ArquivoItem {
  id:        string;
  descricao: string;  // "08/08/2024 às 10:30:00"
}

export interface PedidoItem {
  id:        string;
  arqId:     string;
  descricao: string;  // "000123456_NF.json"
}

export interface LogLine {
  seq:   number;
  linha: string;
}

// ---------------------------------------------------------------------------
// Demo data (loaded only on HTTP error)
// ---------------------------------------------------------------------------

const DEMO_ARQUIVOS: ArquivoItem[] = [
  { id: '1', descricao: '10/06/2026 às 08:15:42' },
  { id: '2', descricao: '10/06/2026 às 14:22:07' },
  { id: '3', descricao: '11/06/2026 às 09:05:31' },
];

const DEMO_LOG_ARQ: Record<string, LogLine[]> = {
  '1': [
    { seq: 1,  linha: '[08:15:42] Iniciando processamento de pedidos e-commerce...' },
    { seq: 2,  linha: '[08:15:42] Conectando ao WS: https://erp.empresa.com.br/rest' },
    { seq: 3,  linha: '[08:15:43] Autenticado com sucesso. Token gerado.' },
    { seq: 4,  linha: '[08:15:43] Buscando pedidos pendentes na plataforma...' },
    { seq: 5,  linha: '[08:15:44] 3 pedidos encontrados para processamento.' },
    { seq: 6,  linha: '[08:15:44] Iniciando envio ao Protheus...' },
    { seq: 7,  linha: '[08:15:47] Processamento concluído. 3/3 enviados com sucesso.' },
  ],
  '2': [
    { seq: 1,  linha: '[14:22:07] Iniciando processamento de pedidos e-commerce...' },
    { seq: 2,  linha: '[14:22:08] Autenticado com sucesso. Token gerado.' },
    { seq: 3,  linha: '[14:22:09] 1 pedido encontrado para processamento.' },
    { seq: 4,  linha: '[14:22:09] ERRO: Timeout na conexão com o Protheus (30s).' },
    { seq: 5,  linha: '[14:22:09] Tentativa 1/3: aguardando 5s...' },
    { seq: 6,  linha: '[14:22:14] Tentativa 2/3: reconectando...' },
    { seq: 7,  linha: '[14:22:17] Processamento concluído. 1/1 enviados com sucesso.' },
  ],
  '3': [
    { seq: 1,  linha: '[09:05:31] Iniciando processamento de pedidos e-commerce...' },
    { seq: 2,  linha: '[09:05:32] Conectando ao WS: https://erp.empresa.com.br/rest' },
    { seq: 3,  linha: '[09:05:32] ERRO: Falha de autenticação. Token inválido.' },
    { seq: 4,  linha: '[09:05:32] Abortando processamento.' },
  ],
};

const DEMO_PEDIDOS: Record<string, PedidoItem[]> = {
  '1': [
    { id: '1', arqId: '1', descricao: '20260610_081542_PED001.json' },
    { id: '2', arqId: '1', descricao: '20260610_081542_PED002.json' },
    { id: '3', arqId: '1', descricao: '20260610_081542_PED003.json' },
  ],
  '2': [
    { id: '1', arqId: '2', descricao: '20260610_142207_PED004.json' },
  ],
  '3': [],
};

const DEMO_LOG_PED: Record<string, Record<string, LogLine[]>> = {
  '1': {
    '1': [
      { seq: 1, linha: '[PED001] Lendo dados do pedido...' },
      { seq: 2, linha: '[PED001] Cliente: 000001 / Loja: 01' },
      { seq: 3, linha: '[PED001] Itens: 3 produtos — valor total: R$ 1.580,00' },
      { seq: 4, linha: '[PED001] Enviando para SC5/SC6...' },
      { seq: 5, linha: '[PED001] SC5 criado: pedido 000123' },
      { seq: 6, linha: '[PED001] SC6 — 3 itens inseridos com sucesso.' },
      { seq: 7, linha: '[PED001] Concluído com sucesso.' },
    ],
    '2': [
      { seq: 1, linha: '[PED002] Lendo dados do pedido...' },
      { seq: 2, linha: '[PED002] Cliente: 000002 / Loja: 01 — valor: R$ 299,90' },
      { seq: 3, linha: '[PED002] SC5 criado: pedido 000124' },
      { seq: 4, linha: '[PED002] SC6 — 1 item inserido com sucesso.' },
      { seq: 5, linha: '[PED002] Concluído com sucesso.' },
    ],
    '3': [
      { seq: 1, linha: '[PED003] Lendo dados do pedido...' },
      { seq: 2, linha: '[PED003] AVISO: Produto PROD999 não encontrado no cadastro.' },
      { seq: 3, linha: '[PED003] Pedido ignorado — produto inativo.' },
    ],
  },
  '2': {
    '1': [
      { seq: 1, linha: '[PED004] Lendo dados do pedido...' },
      { seq: 2, linha: '[PED004] Cliente: 000005 / Loja: 02 — valor: R$ 4.200,00' },
      { seq: 3, linha: '[PED004] SC5 criado: pedido 000125' },
      { seq: 4, linha: '[PED004] SC6 — 2 itens inseridos com sucesso.' },
      { seq: 5, linha: '[PED004] Concluído com sucesso.' },
    ],
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

@Component({
  selector: 'app-ws-pedidos-log',
  standalone: true,
  imports: [PoPageModule, PoTableModule],
  templateUrl: './ws-pedidos-log.component.html',
  styleUrl: './ws-pedidos-log.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WsPedidosLogComponent implements OnInit {
  private readonly http         = inject(HttpClient);
  private readonly notification = inject(PoNotificationService);
  private readonly destroyRef   = inject(DestroyRef);
  private readonly cdr          = inject(ChangeDetectorRef);

  private readonly apiBase = '/api/ibp/v1/wspedlog';

  // ── Data signals
  readonly arquivos   = signal<ArquivoItem[]>([]);
  readonly logArquivo = signal<LogLine[]>([]);
  readonly pedidos    = signal<PedidoItem[]>([]);
  readonly logPedido  = signal<LogLine[]>([]);
  readonly arqAtual   = signal<ArquivoItem | null>(null);
  readonly pedAtual   = signal<PedidoItem | null>(null);
  readonly loading    = signal(false);

  // ── Navigation signals
  readonly activeBrowse = signal<'arquivos' | 'pedidos'>('arquivos');
  readonly cursorArq    = signal<number>(0);
  readonly cursorPed    = signal<number>(-1);

  // ── Responsive heights — no page scroll
  private readonly _winH = signal(window.innerHeight);
  readonly panelHeight   = computed(() => {
    const available = this._winH() - 140;   // navbar + page title
    const rowH      = Math.floor((available - 16) / 2);  // 16 = gap between rows
    return Math.max(120, rowH - 28);         // 28 = painel-titulo height
  });

  // ── Column definitions
  readonly colunasArq:    PoTableColumn[] = [{ property: 'descricao', label: 'Data/Hora' }];
  readonly colunasLogArq: PoTableColumn[] = [{ property: 'linha',     label: 'Informações' }];
  readonly colunasPed:    PoTableColumn[] = [{ property: 'descricao', label: 'Arquivo'   }];
  readonly colunasLogPed: PoTableColumn[] = [{ property: 'linha',     label: 'Informações' }];

  // ── Computed panel titles
  readonly tituloLogArq = computed(() => {
    const a = this.arqAtual();
    return a ? `Log do Arquivo — ${a.descricao}` : 'Log do Arquivo';
  });
  readonly tituloPedidos = computed(() => {
    const a = this.arqAtual();
    return a ? `Pedidos — ${a.descricao}` : 'Pedidos';
  });
  readonly tituloLogPed = computed(() => {
    const p = this.pedAtual();
    return p ? `Log do Pedido — ${p.descricao}` : 'Log do Pedido';
  });

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  ngOnInit(): void {
    this._carregarArquivos();
  }

  @HostListener('window:resize')
  onResize(): void { this._winH.set(window.innerHeight); }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    const tag = (event.target as HTMLElement)?.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea') return;

    if (event.key === 'Tab') {
      event.preventDefault();
      this.activeBrowse.set(this.activeBrowse() === 'arquivos' ? 'pedidos' : 'arquivos');
      return;
    }

    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    const delta = event.key === 'ArrowDown' ? 1 : -1;

    if (this.activeBrowse() === 'arquivos') {
      this._moverArq(delta);
    } else {
      this._moverPed(delta);
    }
  }

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  private _moverArq(delta: number): void {
    const list = this.arquivos();
    if (!list.length) return;
    const next = Math.max(0, Math.min(list.length - 1, this.cursorArq() + delta));
    if (next === this.cursorArq()) return;
    this.cursorArq.set(next);
    this._selecionarArquivo(list[next]);
    setTimeout(() => this._highlightArq(), 50);
  }

  private _moverPed(delta: number): void {
    const list = this.pedidos();
    if (!list.length) return;
    const cur  = this.cursorPed();
    const next = cur < 0 ? 0 : Math.max(0, Math.min(list.length - 1, cur + delta));
    if (next === cur && cur >= 0) return;
    this.cursorPed.set(next);
    this._selecionarPedido(list[next]);
    setTimeout(() => this._highlightPed(), 50);
  }

  private _highlightArq(): void {
    document.querySelectorAll('.painel-arq .row-ativa').forEach(el => el.classList.remove('row-ativa'));
    const rows = document.querySelectorAll<HTMLElement>('.painel-arq table tbody tr');
    const row  = rows[this.cursorArq()];
    if (!row) return;
    row.classList.add('row-ativa');
    this._scrollRowIntoView(row);
  }

  private _highlightPed(): void {
    document.querySelectorAll('.painel-ped .row-ativa').forEach(el => el.classList.remove('row-ativa'));
    const idx = this.cursorPed();
    if (idx < 0) return;
    const rows = document.querySelectorAll<HTMLElement>('.painel-ped table tbody tr');
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
    const thead  = container.querySelector('thead') as HTMLElement | null;
    const theadH = thead ? thead.offsetHeight : 0;
    const cRect  = container.getBoundingClientRect();
    const rRect  = row.getBoundingClientRect();
    const rowTop = rRect.top - cRect.top + container.scrollTop;
    const rowBot = rowTop + row.offsetHeight;
    const visTop = container.scrollTop + theadH;
    const visBot = container.scrollTop + container.clientHeight;
    if (rowTop < visTop)       container.scrollTop = Math.max(0, rowTop - theadH);
    else if (rowBot > visBot)  container.scrollTop = rowBot - container.clientHeight;
  }

  // ---------------------------------------------------------------------------
  // po-table event handlers
  // ---------------------------------------------------------------------------

  onArquivoSelecionado(item: ArquivoItem): void {
    // Force single-select: clear all prior PO-UI checkmarks (Quirk 8 — must defer to setTimeout 0)
    setTimeout(() => {
      this.arquivos.update(list => list.map(a => ({ ...a, $selected: a.id === item.id })));
      this.cdr.markForCheck();
    }, 0);
    const idx = this.arquivos().findIndex(a => a.id === item.id);
    this.cursorArq.set(idx);
    this.activeBrowse.set('arquivos');
    this._selecionarArquivo(item);
    setTimeout(() => this._highlightArq(), 50);
  }

  onArquivoDeselecionado(_item: ArquivoItem): void {
    // Single-select: re-mark current arquivo so PO-UI cannot accumulate empty state
    const arq = this.arqAtual();
    if (!arq) return;
    setTimeout(() => {
      this.arquivos.update(list => list.map(a => ({ ...a, $selected: a.id === arq.id })));
      this.cdr.markForCheck();
    }, 0);
  }

  onPedidoSelecionado(item: PedidoItem): void {
    // Force single-select: clear all prior PO-UI checkmarks (Quirk 8 — must defer to setTimeout 0)
    setTimeout(() => {
      this.pedidos.update(list => list.map(p => ({ ...p, $selected: p.id === item.id })));
      this.cdr.markForCheck();
    }, 0);
    const idx = this.pedidos().findIndex(p => p.id === item.id);
    this.cursorPed.set(idx);
    this.activeBrowse.set('pedidos');
    this._selecionarPedido(item);
    setTimeout(() => this._highlightPed(), 50);
  }

  onPedidoDeselecionado(_item: PedidoItem): void {
    // Single-select: re-mark current pedido so PO-UI cannot accumulate empty state
    const ped = this.pedAtual();
    if (!ped) return;
    setTimeout(() => {
      this.pedidos.update(list => list.map(p => ({ ...p, $selected: p.id === ped.id })));
      this.cdr.markForCheck();
    }, 0);
  }

  private _selecionarArquivo(item: ArquivoItem): void {
    this.arqAtual.set(item);
    this.logArquivo.set([]);
    this.pedidos.set([]);
    this.logPedido.set([]);
    this.pedAtual.set(null);
    this.cursorPed.set(-1);
    this.cdr.markForCheck();
    this._carregarLogArquivo(item.id);
    this._carregarPedidos(item.id);
  }

  private _selecionarPedido(item: PedidoItem): void {
    this.pedAtual.set(item);
    this.logPedido.set([]);
    this.cdr.markForCheck();
    this._carregarLogPedido(item.arqId, item.id);
  }

  // ---------------------------------------------------------------------------
  // Data loading
  // ---------------------------------------------------------------------------

  private _carregarArquivos(): void {
    this.loading.set(true);
    try {
      this.http
        .get<ArquivoItem[]>(`${this.apiBase}/arquivos`)
        .pipe(finalize(() => this.loading.set(false)), takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (res) => {
            this.arquivos.set(res);
            this.cdr.markForCheck();
            if (res.length) setTimeout(() => { this._selecionarArquivo(res[0]); setTimeout(() => this._highlightArq(), 50); }, 0);
          },
          error: () => this._loadDemoArquivos(),
        });
    } catch {
      this.loading.set(false);
      this._loadDemoArquivos();
    }
  }

  private _carregarLogArquivo(arqId: string): void {
    try {
      this.http
        .get<LogLine[]>(`${this.apiBase}/arquivos/${arqId}/log`)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next:  (res) => { this.logArquivo.set(res);                    this.cdr.markForCheck(); },
          error: ()    => { this.logArquivo.set(DEMO_LOG_ARQ[arqId] ?? []); this.cdr.markForCheck(); },
        });
    } catch {
      this.logArquivo.set(DEMO_LOG_ARQ[arqId] ?? []);
      this.cdr.markForCheck();
    }
  }

  private _carregarPedidos(arqId: string): void {
    try {
      this.http
        .get<PedidoItem[]>(`${this.apiBase}/arquivos/${arqId}/pedidos`)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (res) => {
            this.pedidos.set(res);
            this.cdr.markForCheck();
            if (res.length) { this.cursorPed.set(0); this._selecionarPedido(res[0]); setTimeout(() => this._highlightPed(), 50); }
          },
          error: () => this._loadDemoPedidos(arqId),
        });
    } catch {
      this._loadDemoPedidos(arqId);
    }
  }

  private _carregarLogPedido(arqId: string, pedId: string): void {
    try {
      this.http
        .get<LogLine[]>(`${this.apiBase}/pedidos/${arqId}/${pedId}/log`)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next:  (res) => { this.logPedido.set(res);                             this.cdr.markForCheck(); },
          error: ()    => { this.logPedido.set(DEMO_LOG_PED[arqId]?.[pedId] ?? []); this.cdr.markForCheck(); },
        });
    } catch {
      this.logPedido.set(DEMO_LOG_PED[arqId]?.[pedId] ?? []);
      this.cdr.markForCheck();
    }
  }

  private _loadDemoArquivos(): void {
    this.arquivos.set(DEMO_ARQUIVOS);
    this.notification.warning('Modo demonstração: dados da API não disponíveis.');
    this.cdr.markForCheck();
    setTimeout(() => { this._selecionarArquivo(DEMO_ARQUIVOS[0]); setTimeout(() => this._highlightArq(), 50); }, 0);
  }

  private _loadDemoPedidos(arqId: string): void {
    const ped = DEMO_PEDIDOS[arqId] ?? [];
    this.pedidos.set(ped);
    this.cdr.markForCheck();
    if (ped.length) { this.cursorPed.set(0); this._selecionarPedido(ped[0]); setTimeout(() => this._highlightPed(), 50); }
  }
}
