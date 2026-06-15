/**
 * @generated  poui-specialist v1.3
 * @author     Andre Costa <andre.andrelscosta@gmail.com>
 * @license    Uso permitido · redistribuição proibida sem autorização escrita
 * @see        https://github.com/Alscosta1973/poui-specialist
 */
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  HostListener,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { finalize } from 'rxjs/operators';
import {
  PoButtonModule,
  PoDividerModule,
  PoFieldModule,
  PoModalAction,
  PoModalModule,
  PoModalComponent,
  PoNotificationService,
  PoPageModule,
  PoTableModule,
  PoTagModule,
  PoPageAction,
  PoTableColumn,
  PoTableComponent,
} from '@po-ui/ng-components';

export interface ImportacaoItem {
  id: string;
  status: string;
  mensagem: string;
  pagRec: string;
  prefixo: string;
  titulo: string;
  parcela: string;
  tipo: string;
  forCli: string;
  loja: string;
  emissao: string;
  vencimento: string;
  vencReal: string;
  valor: number;
  natureza: string;
  projeto: string;
  ccusto: string;
  historico: string;
}

const DEMO_ITENS: ImportacaoItem[] = [
  {
    id: '1',
    status: '1',
    mensagem: '',
    pagRec: 'RECEBER',
    prefixo: 'REC',
    titulo: '000001',
    parcela: '001',
    tipo: 'NF',
    forCli: 'CLI001',
    loja: '01',
    emissao: '2026-01-10',
    vencimento: '2026-02-10',
    vencReal: '2026-02-10',
    valor: 1500.00,
    natureza: 'VENDA',
    projeto: 'PROJ01',
    ccusto: 'CC001',
    historico: 'Venda de mercadoria',
  },
  {
    id: '2',
    status: '2',
    mensagem: '',
    pagRec: 'PAGAR',
    prefixo: 'PAG',
    titulo: '000002',
    parcela: '001',
    tipo: 'NF',
    forCli: 'FOR001',
    loja: '01',
    emissao: '2026-01-12',
    vencimento: '2026-02-12',
    vencReal: '2026-02-12',
    valor: 3200.50,
    natureza: 'COMPRA',
    projeto: 'PROJ01',
    ccusto: 'CC002',
    historico: 'Compra de insumos',
  },
  {
    id: '3',
    status: '3',
    mensagem: 'Título gerado com diferença de centavos no valor',
    pagRec: 'RECEBER',
    prefixo: 'REC',
    titulo: '000003',
    parcela: '001',
    tipo: 'DP',
    forCli: 'CLI002',
    loja: '01',
    emissao: '2026-01-15',
    vencimento: '2026-03-15',
    vencReal: '2026-03-15',
    valor: 780.00,
    natureza: 'SERVICO',
    projeto: '',
    ccusto: 'CC001',
    historico: 'Prestação de serviços',
  },
  {
    id: '4',
    status: '4',
    mensagem: 'Cliente CLI003/01 não encontrado na SA1',
    pagRec: 'RECEBER',
    prefixo: 'REC',
    titulo: '000004',
    parcela: '001',
    tipo: 'NF',
    forCli: 'CLI003',
    loja: '01',
    emissao: '2026-01-20',
    vencimento: '2026-02-20',
    vencReal: '2026-02-20',
    valor: 4500.00,
    natureza: 'VENDA',
    projeto: 'PROJ02',
    ccusto: 'CC003',
    historico: 'Venda produto X',
  },
  {
    id: '5',
    status: '5',
    mensagem: 'Banco 999/001/00001 inválido para baixa automática',
    pagRec: 'PAGAR',
    prefixo: 'PAG',
    titulo: '000005',
    parcela: '001',
    tipo: 'NF',
    forCli: 'FOR002',
    loja: '01',
    emissao: '2026-01-22',
    vencimento: '2026-02-22',
    vencReal: '2026-02-22',
    valor: 9200.75,
    natureza: 'COMPRA',
    projeto: '',
    ccusto: 'CC002',
    historico: 'Pagamento fornecedor',
  },
  {
    id: '6',
    status: '1',
    mensagem: '',
    pagRec: 'VERIFICAR',
    prefixo: '',
    titulo: '',
    parcela: '',
    tipo: '',
    forCli: '',
    loja: '',
    emissao: '2026-01-25',
    vencimento: '2026-02-25',
    vencReal: '2026-02-25',
    valor: 0.00,
    natureza: '',
    projeto: '',
    ccusto: '',
    historico: 'Registro pendente de verificação manual',
  },
];

@Component({
  selector: 'app-importacao-financeira',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    PoButtonModule,
    PoDividerModule,
    PoFieldModule,
    PoModalModule,
    PoPageModule,
    PoTableModule,
    PoTagModule,
  ],
  templateUrl: './importacao-financeira.component.html',
  styleUrls: ['./importacao-financeira.component.scss'],
})
export class ImportacaoFinanceiraComponent implements OnInit, AfterViewInit {
  @ViewChild('modalUpload') modalUpload!: PoModalComponent;
  @ViewChild('table')       table!: PoTableComponent;

  private readonly http         = inject(HttpClient);
  private readonly notification = inject(PoNotificationService);
  private readonly cdr          = inject(ChangeDetectorRef);
  private readonly destroyRef   = inject(DestroyRef);

  readonly itens            = signal<ImportacaoItem[]>([]);
  readonly itensSelecionados = signal<ImportacaoItem[]>([]);
  readonly itemAtivo        = signal<ImportacaoItem | null>(null);
  readonly loading          = signal(false);
  readonly tableHeight      = signal(400);

  banco   = '';
  agencia = '';
  conta   = '';

  readonly qtdAguardando = computed(() => this.itens().filter(i => i.status === '1').length);
  readonly qtdGerado     = computed(() => this.itens().filter(i => i.status === '2').length);
  readonly qtdAviso      = computed(() => this.itens().filter(i => i.status === '3').length);
  readonly qtdErroGer    = computed(() => this.itens().filter(i => i.status === '4').length);
  readonly qtdErroBx     = computed(() => this.itens().filter(i => i.status === '5').length);

  get pageActions(): PoPageAction[] {
    return [
      {
        label: 'Importar Planilha',
        icon: 'po-icon-upload',
        action: () => this.abrirModalUpload(),
      },
      {
        label: 'Gerar Títulos',
        icon: 'po-icon-play',
        action: () => this.gerarTitulos(),
        disabled: this.itensSelecionados().length === 0,
      },
    ];
  }

  readonly arquivoNome = signal<string | null>(null);

  readonly modalUploadPrimary: PoModalAction = {
    label: 'Importar',
    action: () => this.confirmarUpload(),
  };
  readonly modalUploadSecondary: PoModalAction = {
    label: 'Cancelar',
    action: () => this.modalUpload.close(),
  };

  readonly columns: PoTableColumn[] = [
    { property: 'status',     label: 'St.',        width: '44px',  type: 'columnTemplate' },
    { property: 'prefixo',    label: 'Prefixo',    width: '80px'  },
    { property: 'titulo',     label: 'Título',     width: '90px'  },
    { property: 'parcela',    label: 'Parcela',    width: '80px'  },
    { property: 'tipo',       label: 'Tipo',       width: '70px'  },
    { property: 'forCli',     label: 'For/Cli',    width: '90px'  },
    { property: 'loja',       label: 'Loja',       width: '60px'  },
    { property: 'emissao',    label: 'Emissão',    width: '100px', type: 'date', format: 'dd/MM/yyyy' },
    { property: 'vencimento', label: 'Vencimento', width: '110px', type: 'date', format: 'dd/MM/yyyy' },
    { property: 'vencReal',   label: 'Venc. Real', width: '110px', type: 'date', format: 'dd/MM/yyyy' },
    { property: 'valor',      label: 'Valor',      width: '120px', type: 'columnTemplate' },
    { property: 'natureza',   label: 'Natureza',   width: '90px'  },
    { property: 'projeto',    label: 'Projeto',    width: '90px'  },
    { property: 'ccusto',     label: 'C. Custo',   width: '90px'  },
  ];

  ngOnInit(): void {
    this._carregarItens();
  }

  ngAfterViewInit(): void {
    this.tableHeight.set(this.calcTableHeight());
  }

  @HostListener('window:resize')
  onResize(): void {
    this.tableHeight.set(this.calcTableHeight());
  }

  private calcTableHeight(): number {
    // Reserva espaço para: header da página + bancário + status + detail panel
    return Math.max(200, window.innerHeight - 600);
  }

  // ── Formatação ────────────────────────────────────────────────────────────

  labelStatus(status: string): string {
    const map: Record<string, string> = {
      '1': 'Aguardando',
      '2': 'Gerado/Baixado',
      '3': 'Gerado c/ Aviso',
      '4': 'Erro Geração',
      '5': 'Erro Baixa',
    };
    return map[status] ?? status;
  }

  corStatus(status: string): string {
    const map: Record<string, string> = {
      '1': '#f0a500', '2': '#2c9f45', '3': '#0079b8', '4': '#c91f37', '5': '#7d4dcc',
    };
    return map[status] ?? '#999';
  }

  fmtVal(v: number): string {
    return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // ── Navegação / cursor (padrão divergências-cartão) ───────────────────────

  abrirColunas(): void {
    const btn = document.querySelector<HTMLButtonElement>('.po-table-actions-column-manager button');
    btn?.click();
  }

  onTableContainerClick(event: Event): void {
    const target  = event.target as HTMLElement;
    const tbody   = target.closest('tbody') as HTMLTableSectionElement | null;
    if (!tbody) return;
    const tbl     = tbody.closest('table');
    if (!tbl)    return;
    const tbodies = Array.from(tbl.querySelectorAll<HTMLTableSectionElement>(':scope > tbody'));
    const index   = tbodies.indexOf(tbody);
    if (index < 0) return;
    const items = this.itens();
    if (index < items.length) {
      this.itemAtivo.set(items[index]);
      this.cdr.markForCheck();
    }
  }

  // ── Seleção ───────────────────────────────────────────────────────────────

  onRowSelected(row: ImportacaoItem): void {
    const invalido = row.pagRec === 'VERIFICAR' || row.status !== '1';
    if (invalido) {
      const msg = row.pagRec === 'VERIFICAR'
        ? 'Linhas com módulo "VERIFICAR" não podem ser processadas.'
        : 'Apenas itens "Aguardando" podem ser selecionados.';
      this.notification.warning(msg);
      setTimeout(() => {
        this.itens.update(list => list.map(i => i.id === row.id ? { ...i, $selected: false } : i));
        this.cdr.markForCheck();
      }, 0);
      return;
    }
    this.itensSelecionados.update(sel => [...sel, row]);
    this.cdr.markForCheck();
  }

  onRowUnselected(row: ImportacaoItem): void {
    this.itensSelecionados.update(sel => sel.filter(i => i.id !== row.id));
    this.cdr.markForCheck();
  }

  onAllSelected(rows: ImportacaoItem[]): void {
    const validos   = rows.filter(r => r.pagRec !== 'VERIFICAR' && r.status === '1');
    const invalidos = rows.filter(r => r.pagRec === 'VERIFICAR' || r.status !== '1');
    if (invalidos.length) {
      this.notification.warning(`${invalidos.length} item(ns) ignorado(s): módulo VERIFICAR ou status incompatível.`);
      setTimeout(() => {
        this.itens.update(list => list.map(i =>
          invalidos.some(inv => inv.id === i.id) ? { ...i, $selected: false } : i
        ));
        this.cdr.markForCheck();
      }, 0);
    }
    this.itensSelecionados.set(validos);
    this.cdr.markForCheck();
  }

  onAllUnselected(): void {
    this.itensSelecionados.set([]);
    this.cdr.markForCheck();
  }

  // ── Upload ────────────────────────────────────────────────────────────────

  abrirModalUpload(): void {
    this.modalUpload.open();
  }

  onArquivoSelecionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!['xlsx', 'xls', 'csv'].includes(ext)) {
      this.notification.error('Formato inválido. Utilize .xlsx, .xls ou .csv.');
      return;
    }
    this.arquivoNome.set(file.name);
    this.cdr.markForCheck();
  }

  confirmarUpload(): void {
    if (!this.arquivoNome()) return;
    this.modalUpload.close();
    this.notification.warning('Modo demonstração: nenhuma API disponível. Exibindo dados de exemplo.');
    this._loadDemo();
  }

  // ── Ações ─────────────────────────────────────────────────────────────────

  gerarTitulos(): void {
    if (!this.banco || !this.agencia || !this.conta) {
      this.notification.warning('Informe Banco, Agência e Conta antes de gerar os títulos.');
      return;
    }
    const ids = this.itensSelecionados().map(i => i.id);
    if (ids.length === 0) {
      this.notification.warning('Selecione ao menos um item para processar.');
      return;
    }
    this.loading.set(true);
    this.cdr.markForCheck();
    try {
      this.http
        .post<{ items: ImportacaoItem[] }>('/api/financeiro/v1/importacao/gerar', {
          banco: this.banco, agencia: this.agencia, conta: this.conta, ids,
        })
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          finalize(() => { this.loading.set(false); this.cdr.markForCheck(); }),
        )
        .subscribe({
          next: (res) => {
            this.itens.set(res.items);
            this.itensSelecionados.set([]);
            this.itemAtivo.set(null);
            this.notification.success('Títulos gerados com sucesso.');
            this.cdr.markForCheck();
          },
          error: () => {
            this.notification.error('Erro ao comunicar com o servidor. Verifique a configuração da API.');
          },
        });
    } catch {
      this.loading.set(false);
      this.cdr.markForCheck();
      this.notification.error('Erro ao comunicar com o servidor. Verifique a configuração da API.');
    }
  }

  // ── Carregamento ──────────────────────────────────────────────────────────

  private _carregarItens(): void {
    this.loading.set(true);
    this.cdr.markForCheck();
    try {
      this.http
        .get<{ items: ImportacaoItem[] }>('/api/financeiro/v1/importacao/itens')
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          finalize(() => { this.loading.set(false); this.cdr.markForCheck(); }),
        )
        .subscribe({
          next: (res) => {
            this.itens.set(res.items);
            this.itensSelecionados.set([]);
            this.itemAtivo.set(null);
            this.cdr.markForCheck();
          },
          error: () => this._loadDemo(),
        });
    } catch {
      this.loading.set(false);
      this._loadDemo();
    }
  }

  private _loadDemo(): void {
    this.itens.set(DEMO_ITENS);
    this.itensSelecionados.set([]);
    this.itemAtivo.set(null);
    this.notification.warning('Modo demonstração: dados da API não disponíveis.');
    this.cdr.markForCheck();
  }
}
