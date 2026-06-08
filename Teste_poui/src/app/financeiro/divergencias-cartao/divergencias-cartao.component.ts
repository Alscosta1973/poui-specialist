import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  HostListener,
  inject,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  PoButtonModule,
  PoDividerModule,
  PoFieldModule,
  PoModalAction,
  PoModalComponent,
  PoModalModule,
  PoNotificationService,
  PoPageModule,
  PoTableColumn,
  PoTableModule,
} from '@po-ui/ng-components';
import { DivergenciaCartao, TotaisStatus, TxOkStatus } from './divergencia-cartao.model';
import { DivergenciaCartaoService } from './divergencia-cartao.service';

const STATUS_LABELS: Record<TxOkStatus, string> = {
  '1': 'Diverg. MDR',
  '2': 'Diverg. Antecip.',
  '3': 'MDR + Antecip.',
  '4': 'Em Acordo',
  '5': 'Regularizado',
};

function calcularTotais(items: DivergenciaCartao[]): TotaisStatus[] {
  return (['1', '2', '3', '4', '5'] as TxOkStatus[]).map((tipo) => {
    const grupo = items.filter((d) => d.txOk === tipo);
    return {
      tipo,
      label: STATUS_LABELS[tipo],
      count: grupo.length,
      vlTotal: grupo.reduce((s, d) => s + d.vlLiquido, 0),
      vlDif: grupo.reduce((s, d) => s + d.difBlumar, 0),
    };
  });
}

const DEMO_DIVERGENCIAS: DivergenciaCartao[] = [
  { nsu: '100000000001', data: '2026-05-10', bandeira: 'Visa',       vlBruto: 1500.00, parcela: 3, totalParcelas: 3, txContrato: 1.89, vlLiquido: 1471.65, txMdr: 2.40, vlInformado: 1464.00, difBlumar:   -7.65, txCliente: 1.90, difCliente:  -1.50, txOk: '1', observacao: '' },
  { nsu: '100000000002', data: '2026-05-12', bandeira: 'Mastercard', vlBruto:  870.50, parcela: 1, totalParcelas: 1, txContrato: 2.10, vlLiquido:  852.22, txMdr: 2.10, vlInformado:  852.22, difBlumar:    0.00, txCliente: 2.55, difCliente:   3.92, txOk: '2', observacao: '12/05/2026 08:14:22 - JOSE\nDivergencia TX antecipacao verificada.' },
  { nsu: '100000000003', data: '2026-05-13', bandeira: 'Elo',        vlBruto: 3200.00, parcela: 6, totalParcelas: 6, txContrato: 2.50, vlLiquido: 3120.00, txMdr: 3.10, vlInformado: 3008.00, difBlumar: -112.00, txCliente: 3.10, difCliente:   0.00, txOk: '3', observacao: '13/05/2026 09:00:00 - MARIA\nMDR e antecipacao divergentes.' },
  { nsu: '100000000004', data: '2026-05-14', bandeira: 'Visa',       vlBruto:  420.00, parcela: 2, totalParcelas: 2, txContrato: 1.89, vlLiquido:  412.06, txMdr: 1.89, vlInformado:  412.06, difBlumar:    0.00, txCliente: 1.89, difCliente:   0.00, txOk: '4', observacao: '' },
  { nsu: '100000000005', data: '2026-05-15', bandeira: 'Hipercard',  vlBruto:  650.00, parcela: 1, totalParcelas: 1, txContrato: 3.20, vlLiquido:  629.20, txMdr: 3.20, vlInformado:  629.20, difBlumar:    0.00, txCliente: 3.20, difCliente:   0.00, txOk: '5', observacao: '15/05/2026 10:30:00 - JOSE\nRegularizado conforme acordo.' },
  { nsu: '100000000006', data: '2026-05-16', bandeira: 'Amex',       vlBruto: 2100.00, parcela: 4, totalParcelas: 4, txContrato: 2.75, vlLiquido: 2042.25, txMdr: 3.10, vlInformado: 1968.90, difBlumar:  -73.35, txCliente: 2.75, difCliente:   0.00, txOk: '1', observacao: '' },
  { nsu: '100000000007', data: '2026-05-17', bandeira: 'Mastercard', vlBruto:  980.00, parcela: 3, totalParcelas: 3, txContrato: 2.10, vlLiquido:  959.42, txMdr: 2.10, vlInformado:  959.42, difBlumar:    0.00, txCliente: 2.80, difCliente:   6.37, txOk: '2', observacao: '' },
  { nsu: '100000000008', data: '2026-05-18', bandeira: 'Elo',        vlBruto:  560.00, parcela: 1, totalParcelas: 1, txContrato: 2.50, vlLiquido:  546.00, txMdr: 2.50, vlInformado:  546.00, difBlumar:    0.00, txCliente: 2.50, difCliente:   0.00, txOk: '4', observacao: '' },
  { nsu: '100000000009', data: '2026-05-19', bandeira: 'Visa',       vlBruto: 1800.00, parcela: 6, totalParcelas: 6, txContrato: 1.89, vlLiquido: 1760.02, txMdr: 2.90, vlInformado: 1647.82, difBlumar: -112.20, txCliente: 2.90, difCliente:   0.00, txOk: '3', observacao: '' },
  { nsu: '100000000010', data: '2026-05-20', bandeira: 'Hipercard',  vlBruto:  320.00, parcela: 2, totalParcelas: 2, txContrato: 3.20, vlLiquido:  309.76, txMdr: 3.20, vlInformado:  309.76, difBlumar:    0.00, txCliente: 3.20, difCliente:   0.00, txOk: '5', observacao: '20/05/2026 14:00:00 - ADMIN\nRegularizado via revalidacao automatica.' },
];

@Component({
  selector: 'app-divergencias-cartao',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    PoPageModule,
    PoButtonModule,
    PoDividerModule,
    PoFieldModule,
    PoModalModule,
    PoTableModule,
  ],
  templateUrl: './divergencias-cartao.component.html',
  styleUrl: './divergencias-cartao.component.scss',
})
export class DivergenciasCartaoComponent implements OnInit, AfterViewInit {
  @ViewChild('modalObs')       modalObs!: PoModalComponent;
  @ViewChild('modalObsEdicao') modalObsEdicao!: PoModalComponent;

  private readonly service      = inject(DivergenciaCartaoService);
  private readonly notification = inject(PoNotificationService);
  private readonly destroyRef   = inject(DestroyRef);

  constructor() {
    effect(() => {
      this.cursorIndex();
      this.divergenciasFiltradas();
      setTimeout(() => this.highlightActiveRow(), 0);
    });
  }

  // ── State ────────────────────────────────────────────────────────────────
  readonly divergencias      = signal<DivergenciaCartao[]>([]);
  readonly filtroStatus      = signal<TxOkStatus | null>(null);
  readonly selecionados      = signal<DivergenciaCartao[]>([]);
  readonly divergenciaAtiva  = signal<DivergenciaCartao | null>(null);
  readonly cursorIndex       = signal<number>(-1);
  readonly loading           = signal(false);
  readonly tableHeight       = signal(400);

  // ── Obs modal state ──────────────────────────────────────────────────────
  readonly obsModalRegistros  = signal<DivergenciaCartao[]>([]);
  obsNovaTxt      = '';
  obsModalPrefixo = '';

  // Obs pendentes (staging): confirmadas no modal mas ainda nao committed ao dado.
  // Sao committed quando o usuario clica Confirmar/Regularizar.
  // Desmarcar um registro descarta a obs pendente dele.
  readonly pendingObs = signal(new Map<string, string>());

  readonly obsModalTitulo = computed(() => {
    const n = this.obsModalRegistros().length;
    return n === 1
      ? `Observacao — NSU ${this.obsModalRegistros()[0]?.nsu ?? ''}`
      : `Observacao — ${n} registros`;
  });

  readonly obsModalNsusTexto = computed(() =>
    this.obsModalRegistros().map((r) => r.nsu).join(', ')
  );

  // Obs exibida no painel = obs committed + pending (se houver)
  readonly obsAtivaDisplay = computed(() => {
    const ativa = this.divergenciaAtiva();
    if (!ativa) return '';
    const pending = this.pendingObs().get(ativa.nsu) ?? '';
    const stored  = ativa.observacao ?? '';
    if (!pending) return stored;
    return stored ? stored + '\n' + pending : pending;
  });

  // Historico exibido no modal = obs committed + pending (preview do estado final)
  readonly obsModalHistoricoDisplay = computed(() => {
    if (this.obsModalRegistros().length !== 1) return '';
    const r       = this.obsModalRegistros()[0];
    const pending = this.pendingObs().get(r.nsu) ?? '';
    const stored  = r.observacao ?? '';
    if (!pending) return stored;
    return stored ? stored + '\n' + pending : pending;
  });

  // ── Regularizar modal state ──────────────────────────────────────────────
  obsTexto = '';
  private _nsusRegularizar: string[] = [];

  // ── Computed ─────────────────────────────────────────────────────────────
  readonly totais    = computed(() => calcularTotais(this.divergencias()));
  readonly totaisSel = computed(() => calcularTotais(this.selecionados()));
  readonly totaisSelMap = computed(
    () => new Map<TxOkStatus, TotaisStatus>(this.totaisSel().map((t) => [t.tipo, t]))
  );
  readonly divergenciasFiltradas = computed(() => {
    const f = this.filtroStatus();
    return f ? this.divergencias().filter((d) => d.txOk === f) : this.divergencias();
  });

  // ── Modal actions ─────────────────────────────────────────────────────────
  readonly modalObsEdPrimario: PoModalAction = {
    label: 'Confirmar',
    action: () => this.confirmarObsEdicao(),
  };
  readonly modalObsEdSecundario: PoModalAction = {
    label: 'Cancelar',
    action: () => this.modalObsEdicao.close(),
  };
  readonly modalPrimario: PoModalAction = {
    label: 'Confirmar',
    action: () => this.confirmarRegularizar(),
  };
  readonly modalSecundario: PoModalAction = {
    label: 'Cancelar',
    action: () => this.modalObs.close(),
  };

  // ── Columns ───────────────────────────────────────────────────────────────
  readonly colunas: PoTableColumn[] = [
    { property: 'txOk',        label: 'St.',      type: 'columnTemplate',                     width: '28px',  fixed: true },
    { property: 'data',        label: 'Data',     type: 'date',          format: 'dd/MM/yyyy', width: '78px'  },
    { property: 'nsu',         label: 'NSU',      type: 'string',                              width: '100px' },
    { property: 'bandeira',    label: 'Bandeira', type: 'string',                              width: '72px'  },
    { property: 'vlBruto',     label: 'Vl Bruto', type: 'columnTemplate',                      width: '70px'  },
    { property: 'parcela',     label: 'Parc',     type: 'number',                              width: '40px'  },
    { property: 'txContrato',  label: 'Tx Ctrt',  type: 'number',        format: '1.2-2',      width: '52px'  },
    { property: 'vlLiquido',   label: 'Vl Liq',   type: 'columnTemplate',                      width: '70px'  },
    { property: 'txMdr',       label: 'Tx MDR',   type: 'number',        format: '1.2-2',      width: '50px'  },
    { property: 'vlInformado', label: 'Vl Info',  type: 'columnTemplate',                      width: '70px'  },
    { property: 'difBlumar',   label: 'Dif Blu',  type: 'columnTemplate',                      width: '62px'  },
    { property: 'txCliente',   label: 'Tx Cli',   type: 'number',        format: '1.2-2',      width: '50px'  },
    { property: 'difCliente',  label: 'Dif Cli',  type: 'columnTemplate',                      width: '62px'  },
  ];

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngOnInit(): void { this.carregar(); }

  ngAfterViewInit(): void { this.tableHeight.set(this.calcTableHeight()); }

  @HostListener('window:resize')
  onResize(): void { this.tableHeight.set(this.calcTableHeight()); }

  @HostListener('window:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    const tag = (event.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if      (event.key === 'ArrowDown') { event.preventDefault(); this.moverCursor(1);  }
    else if (event.key === 'ArrowUp')   { event.preventDefault(); this.moverCursor(-1); }
    else return;
    // Re-aplica highlight apos PO-UI processar a tecla (pode resetar o DOM)
    setTimeout(() => this.highlightActiveRow(), 50);
  }

  private calcTableHeight(): number {
    return Math.max(200, window.innerHeight - 390);
  }

  // ── Data loading ─────────────────────────────────────────────────────────
  carregar(): void {
    this.loading.set(true);
    this.service
      .listar()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          const processed = this.processarDivergencias(data);
          this.divergencias.set(processed);
          this.selecionados.set([]);
          this.loading.set(false);
          if (processed.length > 0) this.definirAtivo(processed[0]);
        },
        error: () => {
          const processed = this.processarDivergencias(DEMO_DIVERGENCIAS);
          this.divergencias.set(processed);
          this.selecionados.set([]);
          this.loading.set(false);
          if (processed.length > 0) this.definirAtivo(processed[0]);
        },
      });
  }

  // difBlumar = vlLiquido - vlInformado (formula padrao; sobrescreve valor do backend)
  private processarDivergencias(data: DivergenciaCartao[]): DivergenciaCartao[] {
    return data.map((d) => ({ ...d, difBlumar: d.vlLiquido - d.vlInformado }));
  }

  // ── Table events ──────────────────────────────────────────────────────────
  onSelect(row: DivergenciaCartao): void {
    const jaSelec = this.selecionados().some((r) => r.nsu === row.nsu);
    this.selecionados.update((prev) => [...prev, row]);
    this.definirAtivo(row);
    if (!jaSelec) this.abrirObsModal([row]);
  }

  onUnselect(row: DivergenciaCartao): void {
    this.selecionados.update((prev) => prev.filter((r) => r.nsu !== row.nsu));
    // Descarta obs pendente deste registro (nao foi committed)
    this.pendingObs.update((map) => {
      const m = new Map(map);
      m.delete(row.nsu);
      return m;
    });
  }

  onAllSelected(rows: DivergenciaCartao[]): void {
    if (!rows?.length) { this.selecionados.set([]); return; }
    const prevLen = this.selecionados().length;
    this.selecionados.set(rows);
    // So abre modal se a selecao cresceu (evita abrir ao desmarcar todos)
    if (rows.length > prevLen) this.abrirObsModal(rows);
  }

  onAllUnselected(): void {
    this.selecionados.set([]);
    // Descarta todas as obs pendentes
    this.pendingObs.set(new Map());
  }

  onTableContainerClick(event: Event): void {
    const target = event.target as HTMLElement;
    const tbody  = target.closest('tbody') as HTMLTableSectionElement | null;
    if (!tbody) return;
    const table  = tbody.closest('table');
    if (!table)  return;
    const tbodies = Array.from(table.querySelectorAll<HTMLTableSectionElement>(':scope > tbody'));
    const index   = tbodies.indexOf(tbody);
    if (index < 0) return;
    const items = this.divergenciasFiltradas();
    if (index < items.length) this.definirAtivo(items[index]);
  }

  // ── Navigation ────────────────────────────────────────────────────────────
  private definirAtivo(row: DivergenciaCartao): void {
    const index = this.divergenciasFiltradas().findIndex((d) => d.nsu === row.nsu);
    this.cursorIndex.set(index);
    this.divergenciaAtiva.set(row);
  }

  private moverCursor(delta: number): void {
    const items = this.divergenciasFiltradas();
    if (!items.length) return;
    const current = this.cursorIndex();
    const next    = current < 0 ? 0 : Math.max(0, Math.min(items.length - 1, current + delta));
    if (next === current && current >= 0) return;
    this.definirAtivo(items[next]);
  }

  fecharObs(): void {
    this.divergenciaAtiva.set(null);
    this.cursorIndex.set(-1);
  }

  // ── Obs modal (marcar registro) ───────────────────────────────────────────
  abrirObsModal(registros: DivergenciaCartao[]): void {
    if (!registros.length) return;
    this.obsModalRegistros.set(registros);
    this.obsNovaTxt      = '';
    this.obsModalPrefixo = this.gerarPrefixo();
    this.modalObsEdicao.open();
  }

  private confirmarObsEdicao(): void {
    const texto = this.obsNovaTxt.trim();
    if (!texto) {
      this.notification.warning('Informe a observacao antes de confirmar.');
      return;
    }
    const novaEntrada = this.obsModalPrefixo + '\n' + texto;

    // Armazena em staging (pending) — nao committed ate Confirmar/Regularizar
    this.pendingObs.update((map) => {
      const m = new Map(map);
      for (const r of this.obsModalRegistros()) {
        const prev = m.get(r.nsu) ?? '';
        m.set(r.nsu, prev ? prev + '\n' + novaEntrada : novaEntrada);
      }
      return m;
    });

    this.modalObsEdicao.close();
    this.notification.success('Observacao registrada (pendente de confirmacao).');
  }

  // Commita obs pendentes para divergencias e limpa o staging
  private aplicarPendingObs(): void {
    const pending = this.pendingObs();
    if (!pending.size) return;
    this.divergencias.update((list) =>
      list.map((d) => {
        const novaObs = pending.get(d.nsu);
        if (!novaObs) return d;
        const completa = d.observacao ? d.observacao + '\n' + novaObs : novaObs;
        return { ...d, observacao: completa };
      })
    );
    this.pendingObs.set(new Map());
  }

  private gerarPrefixo(): string {
    const agora = new Date();
    return (
      agora.toLocaleDateString('pt-BR') +
      ' ' +
      agora.toLocaleTimeString('pt-BR') +
      ' - ' +
      this.usuarioAtual()
    );
  }

  // ── Status dot filter ─────────────────────────────────────────────────────
  toggleFiltroStatus(status: string, event: Event): void {
    event.stopPropagation();
    const s = status as TxOkStatus;
    this.filtrarPorStatus(this.filtroStatus() === s ? null : s);
  }

  // ── Filters ───────────────────────────────────────────────────────────────
  filtrarPorStatus(status: TxOkStatus | null): void {
    this.filtroStatus.set(status);
    this.selecionados.set([]);
    const items = this.divergenciasFiltradas();
    if (items.length > 0) {
      this.definirAtivo(items[0]);
    } else {
      this.cursorIndex.set(-1);
      this.divergenciaAtiva.set(null);
    }
  }

  // ── Columns manager (triggered via gear in toolbar) ───────────────────────
  abrirColunas(): void {
    const btn = document.querySelector<HTMLButtonElement>('.po-table-actions-column-manager button');
    btn?.click();
  }

  // ── Actions ───────────────────────────────────────────────────────────────
  confirmar(): void {
    const nsus = this.selecionados().map((d) => d.nsu);
    if (!nsus.length) { this.notification.warning('Selecione ao menos um NSU para confirmar.'); return; }
    this.aplicarPendingObs();
    this.service.confirmar({ nsus }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next:  () => { this.notification.success('NSUs confirmados com sucesso.'); this.carregar(); },
      error: () =>   this.notification.error('Erro ao confirmar NSUs.'),
    });
  }

  regularizar(): void {
    const paraReg = this.selecionados().filter((d) => d.txOk !== '5');
    if (paraReg.length) {
      // Com seleção marcada: regulariza todos os selecionados Em Acordo
      this._nsusRegularizar = paraReg.map((d) => d.nsu);
    } else {
      // Sem seleção: opera no registro ativo (_RegSem do ADVPL)
      const ativa = this.divergenciaAtiva();
      if (!ativa) {
        this.notification.warning('Posicione em um registro para regularizar.');
        return;
      }
      if (ativa.txOk !== '4') {
        this.notification.warning(`Regularizar exige status Em Acordo. Status atual: ${this.statusLabel(ativa.txOk)}.`);
        return;
      }
      this._nsusRegularizar = [ativa.nsu];
    }
    this.aplicarPendingObs();
    this.obsTexto = '';
    this.modalObs.open();
  }

  private confirmarRegularizar(): void {
    if (!this.obsTexto.trim()) { this.notification.warning('Informe a observacao antes de confirmar.'); return; }
    const nsus    = this._nsusRegularizar;
    const prefixo = this.gerarPrefixo() + '\n';
    this.service.regularizar({ nsus, observacao: prefixo + this.obsTexto.trim() })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next:  () => { this.notification.success('Regularizacao realizada com sucesso.'); this.modalObs.close(); this.carregar(); },
        error: () =>   this.notification.error('Erro ao regularizar NSUs.'),
      });
  }

  revalidarTaxa(): void {
    // Revalida todos os registros com divergencia (TXOK 1,2,3) — sem filtro por selecao (_revalidarTaxa do ADVPL)
    const nsus = this.divergencias()
      .filter((d) => ['1', '2', '3'].includes(d.txOk))
      .map((d) => d.nsu);
    if (!nsus.length) { this.notification.warning('Nao ha registros com divergencia para revalidar.'); return; }
    this.service.revalidarTaxa({ nsus }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next:  () => { this.notification.success('Taxa revalidada com sucesso.'); this.carregar(); },
      error: () =>   this.notification.error('Erro ao revalidar taxa.'),
    });
  }

  exportarRelatorio(): void {
    this.service.relatorio().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next:  (blob) => this.downloadBlob(blob, 'relatorio-divergencias.pdf'),
      error: ()     => this.notification.error('Erro ao gerar relatorio.'),
    });
  }

  exportarCsv(): void {
    this.service.exportar().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next:  (blob) => this.downloadBlob(blob, 'divergencias-cartao.csv'),
      error: ()     => this.notification.error('Erro ao exportar CSV.'),
    });
  }

  fechar(): void { window.history.back(); }

  // ── Formatting helpers ────────────────────────────────────────────────────
  statusLabel(v: string): string {
    return STATUS_LABELS[v as TxOkStatus] ?? '';
  }

  getTotalSel(tipo: TxOkStatus): TotaisStatus {
    return this.totaisSelMap().get(tipo) ?? { tipo, label: '', count: 0, vlTotal: 0, vlDif: 0 };
  }

  fmtVal(v: number): string {
    return Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  difClass(v: number): string {
    return v < 0 ? 'valor-negativo' : 'valor-positivo';
  }

  // ── DOM helpers ───────────────────────────────────────────────────────────
  private highlightActiveRow(): void {
    document.querySelectorAll('.div-table-container .row-ativa').forEach(
      (el) => el.classList.remove('row-ativa')
    );
    const index = this.cursorIndex();
    if (index < 0) return;
    const table  = document.querySelector('.div-table-container table');
    if (!table)   return;
    const tbodies = table.querySelectorAll<HTMLTableSectionElement>(':scope > tbody');
    const el = tbodies[index];
    if (!el) return;
    el.classList.add('row-ativa');
    this.scrollRowIntoView(el);
  }

  // Rola .po-table-container-overflow para manter a linha ativa visivel.
  // IMPORTANTE: o thead tem position:sticky e cobre os primeiros Npx do container.
  // O scroll deve descontar a altura do thead para evitar que a linha fique
  // escondida atras do cabecalho fixo (era o bug: linha 1 ficava atras do thead).
  private scrollRowIntoView(row: HTMLElement): void {
    const container = document.querySelector(
      '.div-table-container .po-table-container-overflow'
    ) as HTMLElement | null;
    if (!container) return;

    // Altura do cabecalho fixo (sticky thead) dentro do container
    const thead  = container.querySelector('thead') as HTMLElement | null;
    const theadH = thead ? thead.offsetHeight : 0;

    // rowTop em coordenadas do conteudo do container
    const cRect     = container.getBoundingClientRect();
    const rRect     = row.getBoundingClientRect();
    const rowTop    = rRect.top - cRect.top + container.scrollTop;
    const rowBottom = rowTop + row.offsetHeight;

    // Topo efetivo da area visivel (abaixo do cabecalho fixo)
    const visTop = container.scrollTop + theadH;
    const visBot = container.scrollTop + container.clientHeight;

    if (rowTop < visTop) {
      // Linha esta acima ou atras do cabecalho: sobe descontando o thead
      container.scrollTop = Math.max(0, rowTop - theadH);
    } else if (rowBottom > visBot) {
      // Linha esta abaixo da area visivel: desce o minimo necessario
      container.scrollTop = rowBottom - container.clientHeight;
    }
  }

  private downloadBlob(blob: Blob, fileName: string): void {
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = fileName; link.click();
    URL.revokeObjectURL(url);
  }

  private usuarioAtual(): string { return 'USUARIO'; }
}
