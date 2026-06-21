/**
 * @generated  poui-specialist v1.3 — action-list
 * @author     Andre Costa <andre.andrelscosta@gmail.com>
 */
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
import { TitulosService } from '../titulos.service';
import {
  Titulo,
  ActionConfig,
  ActionDraft,
  ActionResponse,
  ActionResultSummary,
} from './titulo.model';

@Component({
  selector: 'app-titulos-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PoPageModule, PoTableModule, PoModalModule],
  templateUrl: './titulos-list.component.html',
  styleUrl: './titulos-list.component.scss',
})
export class TitulosListComponent implements OnInit {
  @ViewChild('confirmModal') private confirmModal!: PoModalComponent;
  @ViewChild('resultsModal') private resultsModal!: PoModalComponent;

  private readonly service      = inject(TitulosService);
  private readonly notification = inject(PoNotificationService);
  private readonly destroyRef   = inject(DestroyRef);

  private readonly chaveUnica = 'numero' as keyof Titulo;

  readonly title        = 'Títulos a Receber';
  readonly items        = signal<Titulo[]>([]);
  readonly loading      = signal(false);
  readonly hasNext      = signal(false);
  readonly selectedRows = signal<Titulo[]>([]);

  private currentPage = 1;
  private readonly pageSize = 10;
  private lastSearch = '';

  readonly currentAction = signal<ActionDraft<Titulo> | null>(null);
  readonly actionLoading = signal<Record<string, boolean>>({});
  readonly actionResults = signal<ActionResultSummary | null>(null);
  readonly errorRows     = signal<Set<string>>(new Set());

  readonly actions: ActionConfig[] = [
    {
      id: 'baixar',
      label: 'Baixar Título',
      icon: 'po-icon-ok',
      mode: 'single',
      endpoint: '/financeiro/titulos/baixar',
      modalTitle: 'Confirmar Baixo',
      modalMessage: 'Confirma o baixo do título {{numero}} de {{parceiro}}?',
      campoChave: 'numero',
      danger: false,
    },
    {
      id: 'cancelar',
      label: 'Cancelar Selecionados',
      icon: 'po-icon-close',
      mode: 'multi',
      endpoint: '/financeiro/titulos/cancelar',
      modalTitle: 'Cancelar Títulos',
      modalMessage: 'Confirma o cancelamento de {{_count}} título(s) selecionado(s)?',
      campoChave: 'numero',
      danger: true,
    },
  ];

  readonly tableActions: PoTableAction[] = this.actions
    .filter(a => a.mode === 'single')
    .map(a => ({
      label: a.label,
      icon: a.icon,
      ...(a.danger ? { type: 'danger' as const } : {}),
      action: (row: Titulo) => this.openAction(a, [row]),
    }));

  readonly pageActions = computed<PoPageAction[]>(() =>
    this.actions
      .filter(a => a.mode === 'multi')
      .map(a => ({
        label: a.label,
        icon: a.icon,
        ...(a.danger ? { type: 'danger' as const } : {}),
        disabled: this.selectedRows().length === 0,
        action: () => this.openAction(a, this.selectedRows()),
      }))
  );

  readonly columns: PoTableColumn[] = [
    { property: 'numero',   label: 'Número',    width: '10%' },
    { property: 'parceiro', label: 'Parceiro'               },
    { property: 'valor',    label: 'Valor',     type: 'currency', format: 'BRL' },
    { property: 'venc',     label: 'Vencimento' },
    {
      property: 'situacao', label: 'Situação', width: '110px',
      type: 'label',
      labels: [
        { value: 'A', label: 'Aberto',  color: 'color-08' },
        { value: 'B', label: 'Baixado', color: 'color-10' },
        { value: 'C', label: 'Cancelado', color: 'color-07' },
      ],
    },
  ];

  readonly filterSettings: PoPageFilter = {
    placeholder: 'Buscar...',
    action: (q: string) => this.onQuickSearch(q),
  };

  readonly confirmPrimary = computed<PoModalAction>(() => {
    const draft     = this.currentAction();
    const isLoading = draft ? (this.actionLoading()[draft.config.id] ?? false) : false;
    return {
      label: 'Confirmar',
      action: () => this.executeAction(),
      loading: isLoading,
      disabled: isLoading,
    };
  });

  readonly confirmSecondary: PoModalAction = {
    label: 'Cancelar',
    action: () => {
      this.currentAction.set(null);
      this.confirmModal.close();
    },
  };

  readonly resultsPrimary: PoModalAction = {
    label: 'Fechar',
    action: () => {
      this.actionResults.set(null);
      this.resultsModal.close();
    },
  };

  readonly resultsColumns: PoTableColumn[] = [
    { property: 'id',       label: 'Registro', width: '30%' },
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

  ngOnInit(): void {
    this.load();
  }

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
        next: (res) => {
          this.items.update(prev => [...prev, ...res.items]);
          this.hasNext.set(res.hasNext);
        },
        error: () => this.notification.error('Erro ao carregar mais registros.'),
      });
  }

  onRowSelected(row: Titulo): void {
    this.selectedRows.update(prev =>
      prev.some(r => r[this.chaveUnica] === row[this.chaveUnica]) ? prev : [...prev, row]
    );
  }

  onRowUnselected(row: Titulo): void {
    this.selectedRows.update(prev =>
      prev.filter(r => r[this.chaveUnica] !== row[this.chaveUnica])
    );
  }

  onAllSelected(): void {
    this.selectedRows.set([...this.items()]);
  }

  onAllUnselected(): void {
    this.selectedRows.set([]);
  }

  private load(q = ''): void {
    this.loading.set(true);
    this.service
      .getAll({ page: this.currentPage, pageSize: this.pageSize, q })
      .pipe(finalize(() => this.loading.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.items.set(res.items);
          this.hasNext.set(res.hasNext);
        },
        error: () => this.notification.error('Erro ao carregar registros.'),
      });
  }

  openAction(config: ActionConfig, rows: Titulo[]): void {
    const resolvedMessage = this.interpolateMessage(config.modalMessage, config.mode, rows);
    this.currentAction.set({ config, rows, resolvedMessage });
    this.confirmModal.open();
  }

  executeAction(): void {
    const draft = this.currentAction();
    if (!draft) return;

    const { config, rows } = draft;
    this.actionLoading.update(m => ({ ...m, [config.id]: true }));

    const payload = config.mode === 'single'
      ? { id: String(rows[0][this.chaveUnica]) }
      : { ids: rows.map(r => String(r[this.chaveUnica])) };

    this.service.executarAcao(config.endpoint, payload)
      .pipe(
        finalize(() => this.actionLoading.update(m => ({ ...m, [config.id]: false }))),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (res) => this.handleActionResponse(res, config.label),
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
    rows: Titulo[],
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
