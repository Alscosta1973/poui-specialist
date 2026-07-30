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
  DestroyRef,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import {
  PoFieldModule,
  PoModalAction,
  PoModalComponent,
  PoModalModule,
  PoNotificationService,
  PoPageFilter,
  PoPageModule,
  PoTableAction,
  PoTableColumn,
  PoTableModule,
} from '@po-ui/ng-components';
import { AprovacaoPedidoService } from './aprovacao-pedido.service';
import {
  AprovacaoAcaoTipo,
  AprovacaoActionDraft,
  AprovacaoActionResponse,
  AprovacaoActionResultSummary,
  AprovacaoPedido,
} from './aprovacao-pedido.model';

@Component({
  selector: 'app-aprovacao-pedido',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PoPageModule, PoTableModule, PoModalModule, PoFieldModule, FormsModule],
  templateUrl: './aprovacao-pedido.component.html',
  styleUrl: './aprovacao-pedido.component.scss',
})
export class AprovacaoPedidoComponent implements OnInit, AfterViewInit {
  @ViewChild('confirmModal') private confirmModal!: PoModalComponent;
  @ViewChild('resultsModal') private resultsModal!: PoModalComponent;

  private readonly service = inject(AprovacaoPedidoService);
  private readonly notification = inject(PoNotificationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  // ── list state ──────────────────────────────────────────────────────────
  readonly title = 'Aprovação de Pedidos';
  readonly items = signal<AprovacaoPedido[]>([]);
  readonly loading = signal(false);
  readonly hasNext = signal(false);

  private currentPage = 1;
  private readonly pageSize = 10;
  private lastSearch = '';

  // ── action state ────────────────────────────────────────────────────────
  readonly currentAction = signal<AprovacaoActionDraft | null>(null);
  readonly motivoRejeicao = signal('');
  readonly actionLoading = signal<Record<string, boolean>>({});
  readonly actionResults = signal<AprovacaoActionResultSummary | null>(null);

  // ── columns ─────────────────────────────────────────────────────────────
  readonly columns: PoTableColumn[] = [
    { property: 'numero', label: 'Número', width: '10%' },
    { property: 'filial', label: 'Filial', width: '8%' },
    { property: 'fornecedor', label: 'Fornecedor' },
    { property: 'valor', label: 'Valor', type: 'currency', format: 'BRL', width: '12%' },
    { property: 'dataEmissao', label: 'Emissão', type: 'date', format: 'dd/MM/yyyy', width: '12%' },
    {
      property: 'status',
      label: 'Status',
      width: '10%',
      type: 'label',
      // TODO: ajustar value conforme os códigos reais devolvidos pelo Protheus
      labels: [
        { value: 'Pendente', label: 'Pendente', color: 'color-08' },
        { value: 'Aprovado', label: 'Aprovado', color: 'color-10' },
        { value: 'Rejeitado', label: 'Rejeitado', color: 'color-07' },
      ],
    },
    { property: 'aprovador', label: 'Aprovador' },
  ];

  // ── row actions ─────────────────────────────────────────────────────────
  readonly tableActions: PoTableAction[] = [
    {
      label: 'Aprovar',
      icon: 'po-icon-ok',
      action: (row: AprovacaoPedido) => this.openAction('aprovar', row),
      disabled: (row: AprovacaoPedido) => this.isRowBusy(row),
    },
    {
      label: 'Rejeitar',
      icon: 'po-icon-close',
      type: 'danger',
      separator: true,
      action: (row: AprovacaoPedido) => this.openAction('rejeitar', row),
      disabled: (row: AprovacaoPedido) => this.isRowBusy(row),
    },
  ];

  // ── filter ──────────────────────────────────────────────────────────────
  readonly filterSettings: PoPageFilter = {
    placeholder: 'Buscar por número ou fornecedor...',
    action: (q: string) => this.onQuickSearch(q),
  };

  // ── modal de confirmação ────────────────────────────────────────────────
  readonly confirmModalTitle = computed(() => {
    const draft = this.currentAction();
    if (!draft) return '';
    return draft.tipo === 'aprovar' ? 'Confirmar Aprovação' : 'Confirmar Rejeição';
  });

  readonly confirmModalMessage = computed(() => {
    const draft = this.currentAction();
    if (!draft) return '';
    const { numero, fornecedor } = draft.row;
    return draft.tipo === 'aprovar'
      ? `Confirma aprovação do pedido ${numero} - ${fornecedor}?`
      : `Confirma rejeição do pedido ${numero} - ${fornecedor}? Informe o motivo abaixo.`;
  });

  readonly isRejectFlow = computed(() => this.currentAction()?.tipo === 'rejeitar');

  readonly confirmPrimary = computed<PoModalAction>(() => {
    const draft = this.currentAction();
    const key = draft ? this.actionKey(draft.row.numero, draft.tipo) : '';
    const isLoading = draft ? (this.actionLoading()[key] ?? false) : false;
    const motivoInvalido = draft?.tipo === 'rejeitar' && this.motivoRejeicao().trim().length === 0;
    return {
      label: 'Confirmar',
      action: () => this.executeAction(),
      loading: isLoading,
      disabled: isLoading || motivoInvalido,
    };
  });

  readonly confirmSecondary: PoModalAction = {
    label: 'Cancelar',
    action: () => {
      this.currentAction.set(null);
      this.confirmModal.close();
    },
  };

  // ── modal de resultados ─────────────────────────────────────────────────
  readonly resultsPrimary: PoModalAction = {
    label: 'Fechar',
    action: () => {
      this.actionResults.set(null);
      this.resultsModal.close();
    },
  };

  readonly resultsColumns: PoTableColumn[] = [
    { property: 'numero', label: 'Pedido', width: '30%' },
    {
      property: 'status', label: 'Status', width: '120px',
      type: 'label',
      labels: [
        { value: 'ok', label: 'OK', color: 'color-10' },
        { value: 'erro', label: 'Erro', color: 'color-07' },
      ],
    },
    { property: 'mensagem', label: 'Mensagem' },
  ];

  // ── lifecycle ───────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.load();
  }

  ngAfterViewInit(): void {
    // Quirk #1 (po-ui-quirks-onpush): força re-render após ng-content projetado em po-page-list
    setTimeout(() => this.cdr.detectChanges());
  }

  // ── list methods ────────────────────────────────────────────────────────
  onQuickSearch(q: string): void {
    this.currentPage = 1;
    this.lastSearch = q;
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

  // ── action methods ──────────────────────────────────────────────────────
  openAction(tipo: AprovacaoAcaoTipo, row: AprovacaoPedido): void {
    this.motivoRejeicao.set('');
    this.currentAction.set({ tipo, row });
    this.confirmModal.open();
  }

  executeAction(): void {
    const draft = this.currentAction();
    if (!draft) return;

    const { tipo, row } = draft;
    const key = this.actionKey(row.numero, tipo);
    this.actionLoading.update(m => ({ ...m, [key]: true }));

    const request$ = tipo === 'aprovar'
      ? this.service.aprovar(row.numero)
      : this.service.rejeitar(row.numero, this.motivoRejeicao().trim());

    request$
      .pipe(
        finalize(() => this.actionLoading.update(m => ({ ...m, [key]: false }))),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (res) => this.handleActionResponse(res, tipo),
        error: (err) => {
          this.notification.error(this.parseProtheusError(err));
          this.currentAction.set(null);
          this.confirmModal.close();
        },
      });
  }

  isRowBusy(row: AprovacaoPedido): boolean {
    const loading = this.actionLoading();
    return !!loading[this.actionKey(row.numero, 'aprovar')] || !!loading[this.actionKey(row.numero, 'rejeitar')];
  }

  private handleActionResponse(res: AprovacaoActionResponse, tipo: AprovacaoAcaoTipo): void {
    this.currentAction.set(null);
    this.confirmModal.close();
    this.currentPage = 1;
    this.load();

    if (res.falha === 0) {
      const verbo = tipo === 'aprovar' ? 'aprovado' : 'rejeitado';
      this.notification.success(`Pedido ${verbo} com sucesso.`);
      return;
    }

    const actionLabel = tipo === 'aprovar' ? 'Aprovação' : 'Rejeição';
    this.actionResults.set({ ...res, actionLabel });
    this.resultsModal.open();
  }

  private actionKey(numero: string, tipo: AprovacaoAcaoTipo): string {
    return `${numero}-${tipo}`;
  }

  private parseProtheusError(err: unknown): string {
    try {
      const errObj = JSON.parse((err as any).error?.errorMessage ?? '{}');
      const decode = (s: string) => new TextDecoder('iso-8859-1').decode(
        Uint8Array.from(s, c => c.charCodeAt(0))
      );
      const msg = decode(errObj.message ?? '');
      const detail = errObj.detailedMessage ? ` — ${decode(errObj.detailedMessage)}` : '';
      return `Erro ${errObj.code}: ${msg}${detail}`;
    } catch {
      return (err as any).error?.message ?? 'Erro ao processar a requisição.';
    }
  }
}
