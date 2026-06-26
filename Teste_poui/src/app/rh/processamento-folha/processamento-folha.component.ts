// @generated  poui-specialist v1.0
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs/operators';
import {
  PoModalAction,
  PoModalComponent,
  PoModalModule,
  PoNotificationService,
  PoPageAction,
  PoPageFilter,
  PoPageModule,
  PoTableAction,
  PoTableColumn,
  PoTableModule,
} from '@po-ui/ng-components';
import { ProcessamentoFolhaService } from '../processamento-folha.service';
import {
  ActionConfig,
  ActionDraft,
  ActionResponse,
  ActionResultSummary,
  FolhaProcessamento,
} from './processamento-folha.model';

@Component({
  selector: 'app-processamento-folha',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PoPageModule, PoTableModule, PoModalModule],
  templateUrl: './processamento-folha.component.html',
  styleUrl: './processamento-folha.component.scss',
})
export class ProcessamentoFolhaComponent implements OnInit {
  @ViewChild('confirmModal') private confirmModal!: PoModalComponent;
  @ViewChild('resultsModal') private resultsModal!: PoModalComponent;

  private readonly service      = inject(ProcessamentoFolhaService);
  private readonly notification = inject(PoNotificationService);
  private readonly destroyRef   = inject(DestroyRef);

  private readonly chaveUnica = 'id' as keyof FolhaProcessamento;

  // ── list state ──────────────────────────────────────────────────────────
  readonly title        = 'Processamento de Folha de Pagamento';
  readonly items        = signal<FolhaProcessamento[]>([]);
  readonly loading      = signal(false);
  readonly hasNext      = signal(false);
  readonly selectedRows = signal<FolhaProcessamento[]>([]);

  private currentPage = 1;
  private readonly pageSize = 10;
  private lastSearch = '';

  // ── action state ─────────────────────────────────────────────────────────
  readonly currentAction = signal<ActionDraft<FolhaProcessamento> | null>(null);
  readonly actionLoading = signal<Record<string, boolean>>({});
  readonly actionResults = signal<ActionResultSummary | null>(null);
  readonly errorRows     = signal<Set<string>>(new Set());

  // ── action config ─────────────────────────────────────────────────────────
  readonly actions: ActionConfig[] = [
    {
      id:           'processar',
      label:        'Processar',
      icon:         'po-icon-ok',
      mode:         'single',
      endpoint:     '/rh/folha/processar',
      modalTitle:   'Confirmar Processamento',
      modalMessage: 'Confirma o processamento da folha {{competencia}} (Filial {{filial}})?',
      campoChave:   'id',
    },
    {
      id:           'fechar',
      label:        'Fechar Folha',
      icon:         'po-icon-document',
      mode:         'single',
      endpoint:     '/rh/folha/fechar',
      modalTitle:   'Fechar Folha',
      modalMessage: 'Confirma o fechamento definitivo da folha {{competencia}} (Filial {{filial}})? Esta operação não pode ser desfeita.',
      campoChave:   'id',
    },
    {
      id:           'cancelar',
      label:        'Cancelar',
      icon:         'po-icon-close',
      mode:         'multi',
      endpoint:     '/rh/folha/cancelar',
      modalTitle:   'Cancelar Folhas',
      modalMessage: 'Confirma o cancelamento de {{_count}} folha(s)?',
      campoChave:   'id',
      danger:       true,
    },
  ];

  // ── derived actions ───────────────────────────────────────────────────────
  readonly tableActions: PoTableAction[] = this.actions
    .filter(a => a.mode === 'single')
    .map(a => ({
      label: a.label,
      icon:  a.icon,
      ...(a.danger ? { type: 'danger' as const } : {}),
      action: (row: FolhaProcessamento) => this.openAction(a, [row]),
    }));

  readonly pageActions = computed<PoPageAction[]>(() =>
    this.actions
      .filter(a => a.mode === 'multi')
      .map(a => ({
        label:    a.label,
        icon:     a.icon,
        ...(a.danger ? { type: 'danger' as const } : {}),
        disabled: this.selectedRows().length === 0,
        action:   () => this.openAction(a, this.selectedRows()),
      }))
  );

  // ── columns ───────────────────────────────────────────────────────────────
  readonly columns: PoTableColumn[] = [
    { property: 'competencia',        label: 'Competência',  width: '11%' },
    { property: 'filial',             label: 'Filial',       width: '8%'  },
    {
      property: 'tipo', label: 'Tipo', width: '13%', type: 'label',
      labels: [
        { value: 'M',  label: 'Mensal',       color: 'color-01' },
        { value: 'F',  label: 'Férias',       color: 'color-05' },
        { value: '13', label: '13º Salário',  color: 'color-08' },
      ],
    },
    {
      property: 'situacao', label: 'Situação', width: '15%', type: 'label',
      labels: [
        { value: 'P', label: 'Pendente',          color: 'color-08' },
        { value: 'E', label: 'Em Processamento',  color: 'color-02' },
        { value: 'C', label: 'Concluído',         color: 'color-10' },
        { value: 'X', label: 'Cancelado',         color: 'color-07' },
      ],
    },
    { property: 'totalFuncionarios', label: 'Funcionários', width: '10%' },
    { property: 'totalBruto',        label: 'Total Bruto',  type: 'currency', format: 'BRL' },
    { property: 'totalLiquido',      label: 'Total Líquido', type: 'currency', format: 'BRL' },
  ];

  // ── filter ────────────────────────────────────────────────────────────────
  readonly filterSettings: PoPageFilter = {
    placeholder: 'Buscar por competência ou filial...',
    action:      (q: string) => this.onQuickSearch(q),
  };

  // ── modal de confirmação ──────────────────────────────────────────────────
  readonly confirmPrimary = computed<PoModalAction>(() => {
    const draft     = this.currentAction();
    const isLoading = draft ? (this.actionLoading()[draft.config.id] ?? false) : false;
    return {
      label:    'Confirmar',
      action:   () => this.executeAction(),
      loading:  isLoading,
      disabled: isLoading,
    };
  });

  readonly confirmSecondary: PoModalAction = {
    label:  'Cancelar',
    action: () => {
      this.currentAction.set(null);
      this.confirmModal.close();
    },
  };

  // ── modal de resultados ───────────────────────────────────────────────────
  readonly resultsPrimary: PoModalAction = {
    label:  'Fechar',
    action: () => {
      this.actionResults.set(null);
      this.resultsModal.close();
    },
  };

  readonly resultsColumns: PoTableColumn[] = [
    { property: 'id',       label: 'Folha',  width: '30%' },
    {
      property: 'status', label: 'Status', width: '100px',
      type: 'label',
      labels: [
        { value: 'ok',   label: 'OK',   color: 'color-10' },
        { value: 'erro', label: 'Erro', color: 'color-07' },
      ],
    },
    { property: 'mensagem', label: 'Mensagem' },
  ];

  // ── lifecycle ─────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.load();
  }

  // ── list methods ──────────────────────────────────────────────────────────
  onQuickSearch(q: string): void {
    this.currentPage = 1;
    this.lastSearch  = q;
    this.load(q);
  }

  onShowMore(): void {
    this.currentPage++;
    this.loading.set(true);
    this.service
      .getAll({ page: this.currentPage, pageSize: this.pageSize, q: this.lastSearch })
      .pipe(finalize(() => this.loading.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next:  (res) => {
          this.items.update(prev => [...prev, ...res.items]);
          this.hasNext.set(res.hasNext);
        },
        error: () => this.notification.error('Erro ao carregar mais registros.'),
      });
  }

  onRowSelected(row: FolhaProcessamento): void {
    this.selectedRows.update(prev =>
      prev.some(r => r[this.chaveUnica] === row[this.chaveUnica]) ? prev : [...prev, row]
    );
  }

  onRowUnselected(row: FolhaProcessamento): void {
    this.selectedRows.update(prev =>
      prev.filter(r => r[this.chaveUnica] !== row[this.chaveUnica])
    );
  }

  onAllSelected(): void   { this.selectedRows.set([...this.items()]); }
  onAllUnselected(): void { this.selectedRows.set([]);                }

  private load(q = ''): void {
    this.loading.set(true);
    this.service
      .getAll({ page: this.currentPage, pageSize: this.pageSize, q })
      .pipe(finalize(() => this.loading.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next:  (res) => {
          this.items.set(res.items);
          this.hasNext.set(res.hasNext);
        },
        error: () => this.notification.error('Erro ao carregar registros.'),
      });
  }

  // ── action methods ────────────────────────────────────────────────────────
  openAction(config: ActionConfig, rows: FolhaProcessamento[]): void {
    const resolvedMessage = this.interpolateMessage(config.modalMessage, config.mode, rows);
    this.currentAction.set({ config, rows, resolvedMessage });
    this.confirmModal.open();
  }

  executeAction(): void {
    const draft = this.currentAction();
    if (!draft) return;

    const { config, rows } = draft;
    this.actionLoading.update(m => ({ ...m, [config.id]: true }));

    const chave   = (config.campoChave || String(this.chaveUnica)) as keyof FolhaProcessamento;
    const payload = config.mode === 'single'
      ? { id: String(rows[0][chave]) }
      : { ids: rows.map(r => String(r[chave])) };

    this.service.executarAcao(config.endpoint, payload)
      .pipe(
        finalize(() => this.actionLoading.update(m => ({ ...m, [config.id]: false }))),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next:  (res) => this.handleActionResponse(res, config.label),
        error: (err) => {
          this.notification.error(this.parseProtheusError(err));
          this.currentAction.set(null);
          this.confirmModal.close();
        },
      });
  }

  private handleActionResponse(res: ActionResponse, actionLabel: string): void {
    this.currentAction.set(null);
    this.confirmModal.close();
    this.currentPage = 1;
    this.load();

    if (res.falha === 0) {
      this.notification.success(`${res.sucesso} registro(s) processado(s) com sucesso.`);
      return;
    }

    const erroIds = new Set(res.itens.filter(i => i.status === 'erro').map(i => i.id));
    this.errorRows.set(erroIds);
    this.actionResults.set({ ...res, actionLabel });
    this.resultsModal.open();
  }

  private interpolateMessage(
    template: string,
    mode: 'single' | 'multi',
    rows: FolhaProcessamento[],
  ): string {
    if (mode === 'multi') {
      return template.replace(/\{\{_count\}\}/g, String(rows.length));
    }
    const row = rows[0] as unknown as Record<string, unknown>;
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(row[key] ?? ''));
  }

  private parseProtheusError(err: unknown): string {
    try {
      const e      = err as { error?: { errorMessage?: string; message?: string } };
      const errObj = JSON.parse(e.error?.errorMessage ?? '{}') as {
        code?: number; message?: string; detailedMessage?: string;
      };
      const msg    = decodeURIComponent(escape(errObj.message ?? ''));
      const detail = errObj.detailedMessage
        ? ` — ${decodeURIComponent(escape(errObj.detailedMessage))}`
        : '';
      return `Erro ${errObj.code}: ${msg}${detail}`;
    } catch {
      return (err as { error?: { message?: string } }).error?.message
        ?? 'Erro ao processar a requisição.';
    }
  }
}
