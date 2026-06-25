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
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs/operators';
import {
  PoDialogService,
  PoNotificationService,
  PoPageAction,
  PoTableAction,
  PoTableColumn,
  PoTableModule,
} from '@po-ui/ng-components';
import { PoPageDynamicSearchModule } from '@po-ui/ng-templates';
import { FuncionariosService } from '../services/funcionarios.service';
import { Funcionario, FuncionariosParams } from '../models/funcionario.model';

@Component({
  selector: 'app-funcionarios-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    PoPageDynamicSearchModule,
    PoTableModule,
  ],
  templateUrl: './funcionarios-list.component.html',
  styleUrl: './funcionarios-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FuncionariosListComponent implements OnInit {
  private readonly service      = inject(FuncionariosService);
  private readonly router       = inject(Router);
  private readonly dialog       = inject(PoDialogService);
  private readonly notification = inject(PoNotificationService);
  private readonly destroyRef   = inject(DestroyRef);

  readonly items   = signal<Funcionario[]>([]);
  readonly loading = signal(false);
  readonly hasNext = signal(false);

  private currentPage    = 1;
  private readonly pageSize = 10;
  private currentFilters: FuncionariosParams = {};

  readonly columns: PoTableColumn[] = [
    { property: 'matricula',    label: 'Matrícula',  width: '10%', sortable: true },
    { property: 'nome',         label: 'Nome',                     sortable: true },
    { property: 'cargo',        label: 'Cargo',      width: '18%' },
    { property: 'departamento', label: 'Depto',      width: '10%' },
    {
      property: 'situacao',
      label: 'Situação',
      width: '10%',
      type: 'label',
      labels: [
        { value: 'A', color: 'color-11', label: 'Ativo'     },
        { value: 'I', color: 'color-07', label: 'Inativo'   },
        { value: 'F', color: 'color-08', label: 'Afastado'  },
      ],
    },
    { property: 'dataAdmissao', label: 'Admissão', width: '12%', type: 'date', format: 'dd/MM/yyyy' },
  ];

  readonly filters = [
    { property: 'nome',         label: 'Nome',         gridColumns: 6 },
    {
      property: 'situacao',
      label: 'Situação',
      gridColumns: 6,
      options: [
        { value: 'A', label: 'Ativo'    },
        { value: 'I', label: 'Inativo'  },
        { value: 'F', label: 'Afastado' },
      ],
    },
    { property: 'departamento', label: 'Departamento', gridColumns: 6 },
    { property: 'admissaoDe',   label: 'Admissão De',  gridColumns: 6, type: 'date' },
    { property: 'admissaoAte',  label: 'Admissão Até', gridColumns: 6, type: 'date' },
  ];

  readonly pageActions: PoPageAction[] = [
    {
      label: 'Incluir',
      icon: 'po-icon-plus',
      action: () => this.router.navigate(['/rh/funcionarios/novo']),
    },
  ];

  readonly tableActions: PoTableAction[] = [
    {
      label: 'Editar',
      action: (row: Funcionario) =>
        this.router.navigate(['/rh/funcionarios', row.matricula, 'editar']),
    },
    {
      label: 'Visualizar',
      action: (row: Funcionario) =>
        this.router.navigate(['/rh/funcionarios', row.matricula]),
    },
    {
      label: 'Excluir',
      action: (row: Funcionario) => this.confirmDelete(row),
    },
  ];

  ngOnInit(): void {
    this.load();
  }

  load(params: FuncionariosParams = {}, append = false): void {
    this.loading.set(true);
    if (!append) {
      this.items.set([]);
    }

    const reqParams: FuncionariosParams = {
      ...params,
      page:     this.currentPage,
      pageSize: this.pageSize,
    };

    this.service
      .getAll(reqParams)
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (res) => {
          if (append) {
            this.items.update((prev) => [...prev, ...res.items]);
          } else {
            this.items.set(res.items);
          }
          this.hasNext.set(res.hasNext);
        },
        error: () => this.notification.error('Erro ao carregar funcionários.'),
      });
  }

  onAdvancedSearch(filters: any): void {
    this.currentPage    = 1;
    this.currentFilters = {
      nome:        filters['nome']         ?? undefined,
      situacao:    filters['situacao']     ?? undefined,
      departamento: filters['departamento'] ?? undefined,
      admissaoDe:  filters['admissaoDe']   ?? undefined,
      admissaoAte: filters['admissaoAte']  ?? undefined,
    };
    this.load(this.currentFilters);
  }

  onQuickSearch(term: string): void {
    this.currentPage    = 1;
    this.currentFilters = term ? { nome: term } : {};
    this.load(this.currentFilters);
  }

  onChangeDisclaimers(disclaimers: any[]): void {
    this.currentPage = 1;
    this.currentFilters = disclaimers.reduce(
      (acc: FuncionariosParams, d: { property: string; value: string }) => ({
        ...acc,
        [d.property]: d.value,
      }),
      {} as FuncionariosParams,
    );
    this.load(this.currentFilters);
  }

  onShowMore(): void {
    this.currentPage++;
    this.load(this.currentFilters, true);
  }

  confirmDelete(row: Funcionario): void {
    this.dialog.confirm({
      title:   'Excluir funcionário',
      message: `Confirma exclusão de ${row.nome}?`,
      confirm: () => this.deleteRecord(row),
    });
  }

  private deleteRecord(row: Funcionario): void {
    this.loading.set(true);
    this.service
      .remove(row.matricula)
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.notification.success(`Funcionário ${row.nome} excluído com sucesso.`);
          this.currentPage = 1;
          this.load(this.currentFilters);
        },
        error: (err) => this.notification.error(this.parseProtheusError(err)),
      });
  }

  private parseProtheusError(err: any): string {
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
