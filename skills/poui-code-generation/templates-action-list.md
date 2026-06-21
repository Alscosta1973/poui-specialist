# Template: action-list

Gera um componente standalone `po-page-list` com `po-table`, múltiplas ações procedurais Protheus, modal de confirmação dinâmica, loading isolado por ação e tratamento de resposta estruturada por linha.

> **Regra de ícones:** Sempre use nomes `po-icon-*`. Nunca `an an-*` ou `ph ph-*`.
>
> **Quando usar:** Tela de lista onde o usuário seleciona registros e dispara operações de negócio no Protheus que exigem confirmação e retornam resultado por linha (baixar título, processar NF, confirmar pedido). Para CRUD simples sem ação procedural, use `page-list`.
>
> **Nota:** `type: 'danger'` em `PoPageAction` (ações `multi`) só é renderizado visualmente a partir da 3ª ação quando há 4 ou mais page actions na página — comportamento nativo do PO-UI.

---

## {{kebab-name}}.component.ts

```typescript
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
import { {{ServiceClass}} } from '../{{serviceFile}}';
import {
  {{ModelInterface}},
  ActionConfig,
  ActionDraft,
  ActionResponse,
  ActionResultSummary,
} from './{{modelFile}}.model';

@Component({
  selector: '{{selector}}',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PoPageModule, PoTableModule, PoModalModule],
  templateUrl: './{{kebab-name}}.component.html',
  styleUrl: './{{kebab-name}}.component.scss',
})
export class {{ComponentClass}} implements OnInit {
  @ViewChild('confirmModal') private confirmModal!: PoModalComponent;
  @ViewChild('resultsModal') private resultsModal!: PoModalComponent;

  private readonly service      = inject({{ServiceClass}});
  private readonly notification = inject(PoNotificationService);
  private readonly destroyRef   = inject(DestroyRef);

  // chave primária do modelo — substitua pelo primeiro campo do manifesto
  private readonly chaveUnica = '{{campoChave}}' as keyof {{ModelInterface}};

  // ── list state ──────────────────────────────────────────────────────────
  readonly title        = '{{title}}';
  readonly items        = signal<{{ModelInterface}}[]>([]);
  readonly loading      = signal(false);
  readonly hasNext      = signal(false);
  readonly selectedRows = signal<{{ModelInterface}}[]>([]);

  private currentPage = 1;
  private readonly pageSize = 10;
  private lastSearch = '';

  // ── action state ─────────────────────────────────────────────────────────
  readonly currentAction = signal<ActionDraft<{{ModelInterface}}> | null>(null);
  readonly actionLoading = signal<Record<string, boolean>>({});
  readonly actionResults = signal<ActionResultSummary | null>(null);
  readonly errorRows     = signal<Set<string>>(new Set());

  // ── action config — preencher com as ações do manifesto ──────────────────
  readonly actions: ActionConfig[] = [
    // Exemplo single:
    // {
    //   id: 'baixar',
    //   label: 'Baixar Título',
    //   icon: 'po-icon-ok',
    //   mode: 'single',
    //   endpoint: '/financeiro/titulos/baixar',
    //   modalTitle: 'Confirmar Baixo',
    //   modalMessage: 'Confirma o baixo do título {{numero}} de {{parceiro}}?',
    //   campoChave: 'numero',
    //   danger: false,
    // },
    // Exemplo multi:
    // {
    //   id: 'cancelar',
    //   label: 'Cancelar',
    //   icon: 'po-icon-close',
    //   mode: 'multi',
    //   endpoint: '/financeiro/titulos/cancelar',
    //   modalTitle: 'Cancelar Títulos',
    //   modalMessage: 'Confirma o cancelamento de {{_count}} título(s)?',
    //   campoChave: 'numero',
    //   danger: true,
    // },
  ];

  // ── derived actions ───────────────────────────────────────────────────────
  readonly tableActions: PoTableAction[] = this.actions
    .filter(a => a.mode === 'single')
    .map(a => ({
      label: a.label,
      icon: a.icon,
      ...(a.danger ? { type: 'danger' as const } : {}),
      action: (row: {{ModelInterface}}) => this.openAction(a, [row]),
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

  // ── columns — substitua pelos campos do manifesto ─────────────────────────
  readonly columns: PoTableColumn[] = [
    // { property: 'numero',   label: 'Número',   width: '10%' },
    // { property: 'parceiro', label: 'Parceiro'               },
    // { property: 'valor',    label: 'Valor', type: 'currency', format: 'BRL' },
    // { property: 'venc',     label: 'Vencimento', type: 'date' },
  ];

  // ── filter ────────────────────────────────────────────────────────────────
  readonly filterSettings: PoPageFilter = {
    placeholder: 'Buscar...',
    action: (q: string) => this.onQuickSearch(q),
  };

  // ── modal de confirmação ──────────────────────────────────────────────────
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

  // ── modal de resultados ───────────────────────────────────────────────────
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
        next: (res) => {
          this.items.update(prev => [...prev, ...res.items]);
          this.hasNext.set(res.hasNext);
        },
        error: () => this.notification.error('Erro ao carregar mais registros.'),
      });
  }

  onRowSelected(row: {{ModelInterface}}): void {
    this.selectedRows.update(prev =>
      prev.some(r => r[this.chaveUnica] === row[this.chaveUnica]) ? prev : [...prev, row]
    );
  }

  onRowUnselected(row: {{ModelInterface}}): void {
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

  // ── action methods ────────────────────────────────────────────────────────
  openAction(config: ActionConfig, rows: {{ModelInterface}}[]): void {
    const resolvedMessage = this.interpolateMessage(config.modalMessage, config.mode, rows);
    this.currentAction.set({ config, rows, resolvedMessage });
    this.confirmModal.open();
  }

  executeAction(): void {
    const draft = this.currentAction();
    if (!draft) return;

    const { config, rows } = draft;
    this.actionLoading.update(m => ({ ...m, [config.id]: true }));

    const chave = (config.campoChave || String(this.chaveUnica)) as keyof {{ModelInterface}};
    const payload = config.mode === 'single'
      ? { id: String(rows[0][chave]) }
      : { ids: rows.map(r => String(r[chave])) };

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
    rows: {{ModelInterface}}[],
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
```

---

## {{kebab-name}}.component.html

```html
<po-page-list
  [p-title]="title"
  [p-actions]="pageActions()"
  [p-filter]="filterSettings">

  <po-table
    [p-columns]="columns"
    [p-items]="items()"
    [p-loading]="loading()"
    [p-actions]="tableActions"
    [p-selectable]="true"
    [p-show-more-disabled]="!hasNext()"
    (p-show-more)="onShowMore()"
    (p-selected)="onRowSelected($event)"
    (p-unselected)="onRowUnselected($event)"
    (p-all-selected)="onAllSelected()"
    (p-all-unselected)="onAllUnselected()">
  </po-table>

</po-page-list>

<!-- Modal de confirmação -->
<po-modal
  #confirmModal
  [p-title]="currentAction()?.config?.modalTitle ?? ''"
  [p-primary-action]="confirmPrimary()"
  [p-secondary-action]="confirmSecondary">
  <p>{{ currentAction()?.resolvedMessage }}</p>
</po-modal>

<!-- Modal de resultados (abre apenas quando falha > 0) -->
<po-modal
  #resultsModal
  [p-title]="'Resultado — ' + (actionResults()?.actionLabel ?? '')"
  [p-primary-action]="resultsPrimary"
  p-size="lg">
  <p>
    <strong>{{ actionResults()?.sucesso }}</strong> processado(s) com sucesso ·
    <strong>{{ actionResults()?.falha }}</strong> com erro
  </p>
  <po-table
    [p-columns]="resultsColumns"
    [p-items]="actionResults()?.itens ?? []">
  </po-table>
</po-modal>
```

---

## {{kebab-name}}.component.scss

```scss
// Adicione estilos específicos do componente aqui
```

---

## {{modelFile}}.model.ts

```typescript
export interface {{ModelInterface}} {
  // TODO: campos do manifesto — ex: numero, parceiro, valor, venc
}

export interface ActionConfig {
  id: string;
  label: string;
  icon: string;
  mode: 'single' | 'multi';
  endpoint: string;
  modalTitle: string;
  modalMessage: string;
  campoChave: string;
  danger?: boolean;
}

export interface ActionDraft<T> {
  config: ActionConfig;
  rows: T[];
  resolvedMessage: string;
}

export interface ActionResponse {
  sucesso: number;
  falha: number;
  itens: ActionItemResult[];
}

export interface ActionItemResult {
  id: string;
  status: 'ok' | 'erro';
  mensagem?: string;
}

export interface ActionResultSummary extends ActionResponse {
  actionLabel: string;
}
```

---

## {{serviceFile}}.service.ts — método adicional

Adicionar ao service existente (gerado por `service` no manifesto) o método abaixo. **Não substituir o service inteiro** — apenas incluir o método após os métodos CRUD.

```typescript
// Adicionar import se ainda não existir:
// import { Observable } from 'rxjs';

executarAcao(
  endpoint: string,
  payload: { id: string } | { ids: string[] },
): Observable<ActionResponse> {
  // endpoint é relativo ao API_BASE (ex: '/financeiro/titulos/baixar'), não à apiUrl da entidade
  return this.http.post<ActionResponse>(`/rest/api/custom/v1${endpoint}`, payload);
}
```

> `ActionResponse` deve ser importado de `./{{modelFile}}.model`.
