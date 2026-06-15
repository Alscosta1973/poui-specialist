/**
 * @generated  poui-specialist v1.3
 * @author     Andre Costa <andre.andrelscosta@gmail.com>
 * @license    Uso permitido · redistribuição proibida sem autorização escrita
 * @see        https://github.com/Alscosta1973/poui-specialist
 */
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs/operators';
import {
  PoButtonModule,
  PoModalAction,
  PoModalComponent,
  PoModalModule,
  PoNotificationService,
  PoTableAction,
  PoTableColumn,
  PoTableModule,
} from '@po-ui/ng-components';
import { PoPageModule } from '@po-ui/ng-components';
import { PoFieldModule } from '@po-ui/ng-components';
import { FormsModule } from '@angular/forms';

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface ParametroItem {
  x6Var:     string;   // e.g. "IBPWSPED_URLBASE"
  descricao: string;   // X6_DESCRIC + ' ' + X6_DESC1
  conteudo:  string;   // current value
  contAnt:   string;   // original value (read-only reference)
  categoria: 'ADM' | 'USR' | 'RET';
}

interface ParametrosResponse {
  items:   ParametroItem[];
  isAdmin: boolean;
}

interface PutParametroResponse {
  sucesso: boolean;
}

// ---------------------------------------------------------------------------
// Demo data (loaded only on HTTP error)
// ---------------------------------------------------------------------------

const DEMO_PARAMETROS: ParametroItem[] = [
  {
    x6Var:     'IBPWSPED_URLBASE',
    descricao: 'URL Base do WS de Pedidos Endereço raiz do serviço REST',
    conteudo:  'https://erp.empresa.com.br/rest',
    contAnt:   'https://erp.empresa.com.br/rest',
    categoria: 'ADM',
  },
  {
    x6Var:     'IBPWSPED_TOKEN',
    descricao: 'Token de Autenticação Chave de acesso à API',
    conteudo:  'eyJhbGciOiJIUzI1NiJ9',
    contAnt:   'eyJhbGciOiJIUzI1NiJ9',
    categoria: 'ADM',
  },
  {
    x6Var:     'IBPWSPED_TIMOUT',
    descricao: 'Timeout de Requisição Tempo máximo em segundos',
    conteudo:  '30',
    contAnt:   '30',
    categoria: 'ADM',
  },
  {
    x6Var:     'IBPWSPED_MAXPG',
    descricao: 'Máximo de Pedidos por Página Quantidade de registros por requisição',
    conteudo:  '50',
    contAnt:   '100',
    categoria: 'USR',
  },
  {
    x6Var:     'IBPWSPED_FILDTA',
    descricao: 'Filtro de Data Padrão Período padrão ao abrir a tela',
    conteudo:  '30',
    contAnt:   '30',
    categoria: 'USR',
  },
  {
    x6Var:     'IBPWSPED_EXIBST',
    descricao: 'Exibir Status Detalhado Mostrar código e descrição do status',
    conteudo:  'S',
    contAnt:   'S',
    categoria: 'USR',
  },
  {
    x6Var:     'IBPWSPED_RTCOD',
    descricao: 'Código de Retorno Padrão Código HTTP de sucesso esperado',
    conteudo:  '200',
    contAnt:   '200',
    categoria: 'RET',
  },
  {
    x6Var:     'IBPWSPED_RTMSG',
    descricao: 'Mensagem de Retorno Padrão Texto exibido ao usuário em caso de sucesso',
    conteudo:  'Pedido enviado com sucesso.',
    contAnt:   'Pedido enviado com sucesso.',
    categoria: 'RET',
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type Categoria = 'ADM' | 'USR' | 'RET';

@Component({
  selector: 'app-ws-pedidos-parametros',
  standalone: true,
  imports: [
    FormsModule,
    PoPageModule,
    PoTableModule,
    PoModalModule,
    PoButtonModule,
    PoFieldModule,
  ],
  templateUrl: './ws-pedidos-parametros.component.html',
  styleUrl: './ws-pedidos-parametros.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WsPedidosParametrosComponent implements OnInit {
  @ViewChild('editModal') private editModal!: PoModalComponent;

  private readonly http         = inject(HttpClient);
  private readonly notification = inject(PoNotificationService);
  private readonly destroyRef   = inject(DestroyRef);

  // ----- API base path -----
  private readonly apiBase = '/api/ibp/v1/wspedpar/parametros';

  // ----- State signals -----
  readonly loading         = signal(false);
  readonly saving          = signal(false);
  readonly isAdmin         = signal(true);   // real value comes from GET response
  readonly allItems        = signal<ParametroItem[]>([]);
  readonly activeCategoria = signal<Categoria>('USR');

  // ----- Modal edit state -----
  readonly itemEditando = signal<ParametroItem | null>(null);
  // Plain string field — required for two-way [(ngModel)] binding (signals are not assignable)
  novoConteudo = '';

  // ----- Derived items (category filter applied in template via getter) -----
  get itensFiltrados(): ParametroItem[] {
    return this.allItems().filter(i => i.categoria === this.activeCategoria());
  }

  // ----- Table columns -----
  readonly columns: PoTableColumn[] = [
    { property: 'x6Var',    label: 'Parâmetro',         width: '120px' },
    { property: 'descricao', label: 'Descrição' },
    { property: 'conteudo', label: 'Conteúdo',          width: '200px' },
    { property: 'contAnt',  label: 'Conteúdo Anterior', width: '200px' },
  ];

  // ----- Table actions -----
  readonly tableActions: PoTableAction[] = [
    {
      label: 'Editar',
      icon:  'po-icon-edit',
      action: (row: ParametroItem) => this.abrirModal(row),
    },
  ];

  // ----- Modal actions -----
  readonly modalPrimaryAction: PoModalAction = {
    label:    'Confirmar',
    loading:  false,
    action:   () => this.confirmarEdicao(),
  };

  readonly modalSecondaryAction: PoModalAction = {
    label:  'Cancelar',
    action: () => this.fecharModal(),
  };

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  ngOnInit(): void {
    this.carregarParametros(this.activeCategoria());
  }

  // ---------------------------------------------------------------------------
  // Category selection
  // ---------------------------------------------------------------------------

  selecionarCategoria(categoria: Categoria): void {
    this.activeCategoria.set(categoria);
    this.carregarParametros(categoria);
  }

  kindFor(categoria: Categoria): 'primary' | 'secondary' {
    return this.activeCategoria() === categoria ? 'primary' : 'secondary';
  }

  // ---------------------------------------------------------------------------
  // Data loading
  // ---------------------------------------------------------------------------

  private carregarParametros(categoria: Categoria): void {
    this.loading.set(true);
    try {
      this.http
        .get<ParametrosResponse>(`${this.apiBase}?categoria=${categoria}`)
        .pipe(
          finalize(() => this.loading.set(false)),
          takeUntilDestroyed(this.destroyRef),
        )
        .subscribe({
          next: (res) => {
            this.isAdmin.set(res.isAdmin);
            this.allItems.set(res.items);
            if (!res.isAdmin && this.activeCategoria() === 'ADM') {
              this.activeCategoria.set('USR');
            }
          },
          error: () => this._loadDemo(),
        });
    } catch {
      // Interceptor threw synchronously (e.g. missing Protheus config in dev)
      this.loading.set(false);
      this._loadDemo();
    }
  }

  private _loadDemo(): void {
    this.isAdmin.set(true);
    this.allItems.set(DEMO_PARAMETROS);
    this.notification.warning('Modo demonstração: dados da API não disponíveis.');
  }

  // ---------------------------------------------------------------------------
  // Edit modal
  // ---------------------------------------------------------------------------

  private abrirModal(item: ParametroItem): void {
    this.itemEditando.set({ ...item });
    this.novoConteudo = item.conteudo;
    this.editModal.open();
  }

  fecharModal(): void {
    this.editModal.close();
    this.itemEditando.set(null);
    this.novoConteudo = '';
  }

  confirmarEdicao(): void {
    const item = this.itemEditando();
    if (!item) return;

    const valorNovo = this.novoConteudo.trim();
    if (valorNovo === item.conteudo) {
      this.fecharModal();
      return;
    }

    this.saving.set(true);
    this.modalPrimaryAction.loading = true;

    this.http
      .put<PutParametroResponse>(`${this.apiBase}/${item.x6Var}`, { conteudo: valorNovo })
      .pipe(
        finalize(() => {
          this.saving.set(false);
          this.modalPrimaryAction.loading = false;
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (res) => {
          if (res.sucesso) {
            // Update the items signal with the new value
            this.allItems.update(rows =>
              rows.map(r =>
                r.x6Var === item.x6Var
                  ? { ...r, conteudo: valorNovo }
                  : r,
              ),
            );
            this.notification.success(`Parâmetro "${item.x6Var}" atualizado com sucesso.`);
            this.fecharModal();
          } else {
            this.notification.error('O servidor retornou falha ao salvar o parâmetro.');
          }
        },
        error: (err) => {
          this.notification.error(this.parseProtheusError(err));
        },
      });
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private parseProtheusError(err: { error?: { errorMessage?: string; message?: string } }): string {
    try {
      const errObj = JSON.parse(err.error?.errorMessage ?? '{}');
      const msg    = decodeURIComponent(escape(errObj.message ?? ''));
      const detail = errObj.detailedMessage
        ? ` — ${decodeURIComponent(escape(errObj.detailedMessage))}`
        : '';
      return `Erro ${errObj.code}: ${msg}${detail}`;
    } catch {
      return err.error?.message ?? 'Erro ao processar a requisição.';
    }
  }
}
