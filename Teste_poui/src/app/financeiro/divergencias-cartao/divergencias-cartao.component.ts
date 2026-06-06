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
  PoPageAction,
  PoPageModule,
  PoTableColumn,
  PoTableModule,
} from '@po-ui/ng-components';
import { DivergenciaCartao, TotaisStatus, TxOkStatus } from './divergencia-cartao.model';
import { DivergenciaCartaoService } from './divergencia-cartao.service';
import { catchError, EMPTY } from 'rxjs';

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
  @ViewChild('modalObs') modalObs!: PoModalComponent;

  private readonly service = inject(DivergenciaCartaoService);
  private readonly notification = inject(PoNotificationService);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    // Re-aplica highlight na linha ativa apos cada ciclo de render
    effect(() => {
      this.divergenciaAtiva();
      this.divergenciasFiltradas();
      setTimeout(() => this.highlightActiveRow(), 0);
    });
  }

  readonly divergencias = signal<DivergenciaCartao[]>([]);
  readonly filtroStatus = signal<TxOkStatus | null>(null);
  readonly selecionados = signal<DivergenciaCartao[]>([]);
  readonly divergenciaAtiva = signal<DivergenciaCartao | null>(null);
  readonly obsTextoAtual = signal('');
  readonly obsModificado = signal(false);
  readonly loading = signal(false);
  readonly tableHeight = signal(400);

  readonly totais = computed(() => calcularTotais(this.divergencias()));
  readonly totaisSel = computed(() => calcularTotais(this.selecionados()));
  readonly totaisSelMap = computed(
    () => new Map<TxOkStatus, TotaisStatus>(this.totaisSel().map((t) => [t.tipo, t]))
  );
  readonly divergenciasFiltradas = computed(() => {
    const f = this.filtroStatus();
    return f ? this.divergencias().filter((d) => d.txOk === f) : this.divergencias();
  });

  obsTexto = '';

  readonly pageActions: PoPageAction[] = [
    { label: 'Colunas', icon: 'po-icon-settings', action: () => this.abrirColunas() },
  ];

  readonly modalPrimario: PoModalAction = {
    label: 'Confirmar',
    action: () => this.confirmarRegularizar(),
  };

  readonly modalSecundario: PoModalAction = {
    label: 'Cancelar',
    action: () => this.modalObs.close(),
  };

  // txOk: PRIMEIRO, tipo columnTemplate, fixed: true => aparece na seção "Fixo" do gerenciador
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

  ngOnInit(): void {
    this.carregar();
  }

  ngAfterViewInit(): void {
    this.tableHeight.set(this.calcTableHeight());
  }

  @HostListener('window:resize')
  onResize(): void {
    this.tableHeight.set(this.calcTableHeight());
  }

  private calcTableHeight(): number {
    // viewport - po-toolbar(55) - page header(68) - buttons row(44) - widgets(92) - obs panel(100) - misc(31)
    return Math.max(200, window.innerHeight - 390);
  }

  carregar(): void {
    this.loading.set(true);
    this.service
      .listar()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.divergencias.set(data);
          this.selecionados.set([]);
          this.loading.set(false);
        },
        error: () => {
          this.divergencias.set(DEMO_DIVERGENCIAS);
          this.selecionados.set([]);
          this.loading.set(false);
        },
      });
  }

  onSelect(row: DivergenciaCartao): void {
    this.selecionados.update((prev) => [...prev, row]);
    this.definirAtivo(row);
  }

  onUnselect(row: DivergenciaCartao): void {
    this.selecionados.update((prev) => prev.filter((r) => r.nsu !== row.nsu));
  }

  onAllSelected(rows: DivergenciaCartao[]): void {
    this.selecionados.set(rows ?? []);
  }

  onAllUnselected(): void {
    this.selecionados.set([]);
  }

  onTableContainerClick(event: Event): void {
    const target = event.target as HTMLElement;
    const tbody = target.closest('tbody') as HTMLTableSectionElement | null;
    if (!tbody) return;

    const table = tbody.closest('table');
    if (!table) return;

    const tbodies = Array.from(table.querySelectorAll<HTMLTableSectionElement>(':scope > tbody'));
    const index = tbodies.indexOf(tbody);
    if (index < 0) return;

    const items = this.divergenciasFiltradas();
    if (index < items.length) {
      this.definirAtivo(items[index]);
    }
  }

  private definirAtivo(row: DivergenciaCartao): void {
    this.divergenciaAtiva.set(row);
    this.obsTextoAtual.set(row.observacao);
    this.obsModificado.set(false);
  }

  onObsChange(texto: string): void {
    this.obsTextoAtual.set(texto);
    this.obsModificado.set(true);
  }

  salvarObs(): void {
    const ativa = this.divergenciaAtiva();
    if (!ativa) return;
    const obs = this.obsTextoAtual();
    // Atualiza localmente
    const atualizada = { ...ativa, observacao: obs };
    this.divergencias.update((list) =>
      list.map((d) => (d.nsu === ativa.nsu ? atualizada : d))
    );
    this.divergenciaAtiva.set(atualizada);
    this.obsModificado.set(false);
    // Persiste no backend (best-effort: erro nao reverte estado local)
    this.service
      .salvarObs({ nsu: ativa.nsu, observacao: obs })
      .pipe(
        catchError(() => {
          this.notification.warning('Obs salva localmente — backend indisponivel.');
          return EMPTY;
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => this.notification.success('Observacao salva.'));
  }

  fecharObs(): void {
    this.divergenciaAtiva.set(null);
    this.obsTextoAtual.set('');
    this.obsModificado.set(false);
  }

  filtrarPorStatus(status: TxOkStatus | null): void {
    this.filtroStatus.set(status);
    this.selecionados.set([]);
  }

  abrirColunas(): void {
    const btn = document.querySelector<HTMLButtonElement>('.po-table-actions-column-manager button');
    btn?.click();
  }

  statusLabel(v: string): string {
    return STATUS_LABELS[v as TxOkStatus] ?? '';
  }

  getTotalSel(tipo: TxOkStatus): TotaisStatus {
    return this.totaisSelMap().get(tipo) ?? { tipo, label: '', count: 0, vlTotal: 0, vlDif: 0 };
  }

  confirmar(): void {
    const nsus = this.selecionados().map((d) => d.nsu);
    if (nsus.length === 0) {
      this.notification.warning('Selecione ao menos um NSU para confirmar.');
      return;
    }
    this.service
      .confirmar({ nsus })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => { this.notification.success('NSUs confirmados com sucesso.'); this.carregar(); },
        error: () => { this.notification.error('Erro ao confirmar NSUs.'); },
      });
  }

  regularizar(): void {
    if (this.selecionados().filter((d) => d.txOk !== '5').length === 0) {
      this.notification.warning('Selecione ao menos um NSU nao regularizado.');
      return;
    }
    this.obsTexto = '';
    this.modalObs.open();
  }

  private confirmarRegularizar(): void {
    if (!this.obsTexto.trim()) {
      this.notification.warning('Informe a observacao antes de confirmar.');
      return;
    }
    const nsus = this.selecionados().filter((d) => d.txOk !== '5').map((d) => d.nsu);
    const agora = new Date();
    const prefixo =
      agora.toLocaleDateString('pt-BR') + ' ' + agora.toLocaleTimeString('pt-BR') + ' - ' + this.usuarioAtual() + '\n';
    this.service
      .regularizar({ nsus, observacao: prefixo + this.obsTexto.trim() })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notification.success('Regularizacao realizada com sucesso.');
          this.modalObs.close();
          this.carregar();
        },
        error: () => { this.notification.error('Erro ao regularizar NSUs.'); },
      });
  }

  revalidarTaxa(): void {
    const nsus = this.selecionados().map((d) => d.nsu);
    if (nsus.length === 0) {
      this.notification.warning('Selecione ao menos um NSU para revalidar.');
      return;
    }
    this.service
      .revalidarTaxa({ nsus })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => { this.notification.success('Taxa revalidada com sucesso.'); this.carregar(); },
        error: () => { this.notification.error('Erro ao revalidar taxa.'); },
      });
  }

  exportarRelatorio(): void {
    this.service.relatorio().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (blob) => this.downloadBlob(blob, 'relatorio-divergencias.pdf'),
      error: () => this.notification.error('Erro ao gerar relatorio.'),
    });
  }

  exportarCsv(): void {
    this.service.exportar().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (blob) => this.downloadBlob(blob, 'divergencias-cartao.csv'),
      error: () => this.notification.error('Erro ao exportar CSV.'),
    });
  }

  fechar(): void {
    window.history.back();
  }

  fmtVal(v: number): string {
    return Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  difClass(v: number): string {
    return v < 0 ? 'valor-negativo' : 'valor-positivo';
  }

  private highlightActiveRow(): void {
    document.querySelectorAll('.div-table-container .row-ativa').forEach(
      (el) => el.classList.remove('row-ativa')
    );
    const ativa = this.divergenciaAtiva();
    if (!ativa) return;
    const index = this.divergenciasFiltradas().findIndex((d) => d.nsu === ativa.nsu);
    if (index < 0) return;
    const table = document.querySelector('.div-table-container table');
    if (!table) return;
    const tbodies = table.querySelectorAll<HTMLTableSectionElement>(':scope > tbody');
    tbodies[index]?.classList.add('row-ativa');
  }

  private downloadBlob(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  }

  private usuarioAtual(): string {
    return 'USUARIO';
  }
}
