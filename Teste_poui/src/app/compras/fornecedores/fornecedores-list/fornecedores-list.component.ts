import {
  Component,
  ChangeDetectionStrategy,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  PoPageListModule,
  PoTableModule,
  PoTableColumn,
  PoTableAction,
  PoPageAction,
  PoPageFilter,
  PoNotificationService,
} from '@po-ui/ng-components';
import { FornecedoresService } from '../fornecedores.service';
import { Fornecedor } from '../models/fornecedor.model';

@Component({
  selector: 'app-fornecedores-list',
  standalone: true,
  imports: [PoPageListModule, PoTableModule],
  templateUrl: './fornecedores-list.component.html',
  styleUrl: './fornecedores-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FornecedoresListComponent implements OnInit {
  private readonly service = inject(FornecedoresService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly notification = inject(PoNotificationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly title = 'Fornecedores';
  readonly items = signal<Fornecedor[]>([]);
  readonly loading = signal(false);
  readonly hasNext = signal(false);

  private currentPage = 1;
  private readonly pageSize = 10;
  private lastSearch = '';

  readonly columns: PoTableColumn[] = [
    { property: 'code',      label: 'Código',        width: '8%' },
    { property: 'storeId',   label: 'Loja',          width: '5%' },
    { property: 'name',      label: 'Nome' },
    { property: 'shortName', label: 'Nome Reduzido',  width: '15%' },
    {
      property: 'entityType', label: 'Física/Jurídica', width: '14%',
      type: 'label',
      labels: [
        { value: 'F', color: 'color-08', label: 'Física'   },
        { value: 'J', color: 'color-12', label: 'Jurídica' },
      ],
    },
    {
      property: 'registerSituation', label: 'Situação', width: '12%',
      type: 'label',
      labels: [
        { value: '1', color: 'color-07', label: 'Inativo'   },
        { value: '2', color: 'color-11', label: 'Ativo'     },
        { value: '3', color: 'color-09', label: 'Cancelado' },
        { value: '4', color: 'color-12', label: 'Pendente'  },
        { value: '5', color: 'color-08', label: 'Suspenso'  },
      ],
    },
  ];

  readonly tableActions: PoTableAction[] = [
    {
      label: 'Alterar',
      icon: 'po-icon-edit',
      action: (row: Fornecedor) =>
        this.router.navigate([row.code, row.storeId], { relativeTo: this.route }),
    },
    {
      label: 'Excluir',
      icon: 'po-icon-delete',
      type: 'danger',
      action: (row: Fornecedor) => this.deleteFornecedor(row),
    },
  ];

  readonly pageActions: PoPageAction[] = [
    {
      label: 'Incluir',
      icon: 'po-icon-plus',
      action: () => this.router.navigate(['novo'], { relativeTo: this.route }),
    },
  ];

  readonly filterSettings: PoPageFilter = {
    placeholder: 'Buscar fornecedor...',
    action: (q: string) => this.onQuickSearch(q),
  };

  ngOnInit(): void {
    this.load();
  }

  onQuickSearch(q: string): void {
    this.currentPage = 1;
    this.lastSearch = q;
    this.load(q);
  }

  onShowMore(): void {
    this.currentPage++;
    this.service
      .getAll({ page: this.currentPage, pageSize: this.pageSize, q: this.lastSearch })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.items.update((prev) => [...prev, ...res.items]);
          this.hasNext.set(res.hasNext);
        },
        error: () => this.notification.error('Erro ao carregar mais fornecedores.'),
      });
  }

  private load(q = ''): void {
    this.loading.set(true);
    this.service
      .getAll({ page: this.currentPage, pageSize: this.pageSize, q })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.items.set(res.items);
          this.hasNext.set(res.hasNext);
          this.loading.set(false);
        },
        error: () => {
          this.notification.error('Erro ao carregar fornecedores.');
          this.loading.set(false);
        },
      });
  }

  private deleteFornecedor(row: Fornecedor): void {
    this.service.delete(row.code, row.storeId).subscribe({
      next: () => {
        this.notification.success(`Fornecedor ${row.name} excluído com sucesso.`);
        this.items.update((prev) =>
          prev.filter((f) => !(f.code === row.code && f.storeId === row.storeId))
        );
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
