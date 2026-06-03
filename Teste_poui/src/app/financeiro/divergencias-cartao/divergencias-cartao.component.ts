import {
  ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, signal, computed
} from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  PoButtonModule, PoContainerModule, PoFieldModule,
  PoLoadingModule, PoModalModule, PoModalComponent,
  PoNotificationService, PoTableColumn, PoTableModule,
  PoTagModule, PoInfoModule, PoGridModule,
  PoPageModule, PoPageAction, PoPageFilter
} from '@po-ui/ng-components';
import { ViewChild } from '@angular/core';
import { DivergenciaCartaoService } from './divergencia-cartao.service';
import { DivergenciaCartao, SummaryCard, STATUS_MAP } from './divergencia-cartao.model';

@Component({
  selector: 'app-divergencias-cartao',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, FormsModule,
    PoPageModule, PoTableModule, PoButtonModule, PoContainerModule,
    PoFieldModule, PoLoadingModule, PoModalModule, PoTagModule,
    PoInfoModule, CurrencyPipe, DatePipe, DecimalPipe
  ],
  templateUrl: './divergencias-cartao.component.html',
  styleUrls: ['./divergencias-cartao.component.scss'],
})
export class DivergenciasCartaoComponent implements OnInit {

  @ViewChild('modalObs') modalObs!: PoModalComponent;

  // ── state ──────────────────────────────────────────────────────────────────
  readonly loading   = signal(false);
  readonly items     = signal<DivergenciaCartao[]>([]);
  readonly summary   = signal<SummaryCard[]>([]);
  readonly selected  = signal<DivergenciaCartao[]>([]);
  readonly filterTxok = signal<string>('');
  readonly drawerItem = signal<DivergenciaCartao | null>(null);
  readonly obsText   = signal('');

  readonly markedNsus = signal<Set<string>>(new Set());

  readonly selectedSummary = computed(() => {
    const nsus = this.markedNsus();
    const all  = this.items();
    const marked = all.filter(r => nsus.has(r.ZB1_NSU));
    return {
      qtd:            nsus.size,
      vlrLiqContrato: marked.reduce((a, r) => a + r.TT_VLVLIQ, 0),
      difBluOrt:      marked.reduce((a, r) => a + r.TT_DIFBLU, 0),
    };
  });

  readonly hasAcordoMarked = computed(() => {
    const nsus = this.markedNsus();
    return this.items().some(r => nsus.has(r.ZB1_NSU) && r.ZB1_TXOK === '4');
  });

  // ── table config ───────────────────────────────────────────────────────────
  readonly columns: PoTableColumn[] = [
    { property: 'ZB1_DTTRAN', label: 'Data',             type: 'date', format: 'dd/MM/yy', width: '90px' },
    { property: 'ZB1_NSU',    label: 'NSU',              width: '110px' },
    { property: 'ZB1_BAND',   label: 'Bandeira',         width: '110px' },
    { property: 'ZB1_VLBRUT', label: 'Vlr Bruto',       type: 'currency', format: 'BRL' },
    { property: 'ZB1_PARCTT', label: 'Parc',             width: '60px' },
    { property: 'ZB1_ZB4PER', label: 'Tx Cto',          type: 'number', format: '1.2-2', width: '80px' },
    { property: 'TT_VLVLIQ',  label: 'Vlr Liq Cto',    type: 'currency', format: 'BRL' },
    { property: 'ZB1_TXADM',  label: 'Tx Inf',          type: 'number', format: '1.2-2', width: '80px' },
    { property: 'ZB1_VLRLIQ', label: 'Vlr Informado',   type: 'currency', format: 'BRL' },
    { property: 'TT_DIFBLU',  label: 'Dif Blu×Ort',    type: 'currency', format: 'BRL' },
    { property: 'ZB1_TXADCL', label: 'Tx Adicional',   type: 'number', format: '1.2-2', width: '90px' },
    { property: 'TT_DIFORT',  label: 'Dif Ort×Cli',   type: 'currency', format: 'BRL' },
    {
      property: 'ZB1_TXOK', label: 'Status', type: 'label', width: '140px',
      labels: Object.entries(STATUS_MAP).map(([value, s]) => ({
        value, label: s.label, color: s.color, textColor: 'white'
      }))
    },
  ];

  // ── page actions ───────────────────────────────────────────────────────────
  get pageActions(): PoPageAction[] {
    return [
      {
        label: 'Regularizar',
        action: () => this.regularizar(),
        disabled: !this.hasAcordoMarked(),
      },
      { label: 'Revalidar Taxa', action: () => this.revalidarTaxa() },
      { label: 'Relatório',      action: () => this.notify.information('Gerando relatório...') },
      { label: 'Exportar',       action: () => this.notify.information('Exportando para Excel...') },
    ];
  }

  readonly statusFilter = Object.entries(STATUS_MAP).map(([value, s]) => ({
    value, label: s.label
  }));

  constructor(
    private svc: DivergenciaCartaoService,
    private notify: PoNotificationService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void { this.load(); }

  // ── data ───────────────────────────────────────────────────────────────────
  load(): void {
    this.loading.set(true);
    this.svc.getAll(this.filterTxok() || undefined).subscribe(res => {
      this.items.set(res.items);
      this.summary.set(res.summary);
      this.loading.set(false);
      this.cdr.markForCheck();
    });
  }

  onFilterTxok(txok: string): void {
    this.filterTxok.set(this.filterTxok() === txok ? '' : txok);
    this.load();
  }

  // ── row selection / marking ────────────────────────────────────────────────
  onRowClick(row: DivergenciaCartao): void {
    this.drawerItem.set(row);
    this.obsText.set(row.ZB1_OBS ?? '');
    this.cdr.markForCheck();
  }

  closeDrawer(): void { this.drawerItem.set(null); }

  toggleMark(): void {
    const row = this.drawerItem();
    if (!row) return;
    const nsus = new Set(this.markedNsus());
    if (nsus.has(row.ZB1_NSU)) {
      nsus.delete(row.ZB1_NSU);
      this.markedNsus.set(nsus);
      this.cdr.markForCheck();
      return;
    }
    // obs obrigatória exceto TXOK='5'
    if (row.ZB1_TXOK !== '5' && !this.obsText().trim()) {
      this.notify.warning('Observação obrigatória para marcar este registro.');
      return;
    }
    this.svc.gravarObservacao(row.ZB1_NSU, this.obsText()).subscribe(() => {
      nsus.add(row.ZB1_NSU);
      this.markedNsus.set(nsus);
      this.cdr.markForCheck();
    });
  }

  isMarked(row: DivergenciaCartao): boolean {
    return this.markedNsus().has(row.ZB1_NSU);
  }

  // ── actions ────────────────────────────────────────────────────────────────
  regularizar(): void {
    const nsus = Array.from(this.markedNsus());
    this.loading.set(true);
    this.svc.regularizar({ nsus }).subscribe(() => {
      this.markedNsus.set(new Set());
      this.load();
      this.notify.success('Registros regularizados com sucesso.');
    });
  }

  revalidarTaxa(): void {
    this.loading.set(true);
    this.svc.revalidarTaxa().subscribe(() => {
      this.load();
      this.notify.success('Taxas revalidadas contra ZB4.');
    });
  }

  // ── helpers ────────────────────────────────────────────────────────────────
  difClass(val: number): string {
    return val < 0 ? 'dif-neg' : val > 0 ? 'dif-pos' : '';
  }

  statusLabel(txok: string): string {
    return STATUS_MAP[txok]?.label ?? txok;
  }

  trackByNsu(_: number, r: DivergenciaCartao): string { return r.ZB1_NSU; }
}
