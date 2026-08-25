/**
 * @generated  poui-specialist v1.16.2
 * @author     Andre Costa <andre.andrelscosta@gmail.com>
 * @license    Uso permitido · redistribuição proibida sem autorização escrita
 * @see        https://github.com/Alscosta1973/poui-specialist
 * @node       not detected (>=18.19 required)
 * @angular    ^21.2.0 (17-21+ supported)
 */

import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  HostListener,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs/operators';
import {
  PoDialogService,
  PoNotificationService,
  PoPageModule,
  PoTableModule,
  PoTableColumn,
  PoTableAction,
  PoPageAction,
  PoPageFilter,
} from '@po-ui/ng-components';
import { FornecedoresService } from '../fornecedores.service';
import { Fornecedor } from '../models/fornecedor.model';

@Component({
  selector: 'app-fornecedores-list',
  standalone: true,
  imports: [PoPageModule, PoTableModule],
  templateUrl: './fornecedores-list.component.html',
  styleUrl: './fornecedores-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FornecedoresListComponent implements OnInit, AfterViewInit {
  private readonly service = inject(FornecedoresService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly notification = inject(PoNotificationService);
  private readonly dialog = inject(PoDialogService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly title = 'Fornecedores';
  readonly items = signal<Fornecedor[]>([]);
  readonly loading = signal(false);
  readonly hasNext = signal(false);

  private readonly _winH = signal(window.innerHeight);
  readonly tableHeight = computed(() => Math.max(200, this._winH() - 424));

  private currentPage = 1;
  private readonly pageSize = 10;
  private lastSearch = '';

  readonly columns: PoTableColumn[] = [
    { property: 'codigo', label: 'Código', width: '8%', sortable: true },
    { property: 'loja', label: 'Loja', width: '6%' },
    { property: 'nome', label: 'Razão Social', sortable: true },
    { property: 'nomeFantasia', label: 'Nome Fantasia' },
    { property: 'cnpj', label: 'CNPJ', width: '14%' },
    { property: 'municipio', label: 'Município', width: '14%' },
    { property: 'estado', label: 'UF', width: '5%' },
    {
      property: 'situacao',
      label: 'Situação',
      width: '10%',
      type: 'label',
      labels: [
        { value: '1', color: 'color-07', label: 'Inativo' },
        { value: '2', color: 'color-11', label: 'Ativo' },
      ],
    },
  ];

  readonly tableActions: PoTableAction[] = [
    {
      label: 'Editar',
      icon: 'po-icon-edit',
      action: (row: Fornecedor) => this.router.navigate([row.id], { relativeTo: this.route }),
    },
    {
      label: 'Excluir',
      icon: 'po-icon-delete',
      type: 'danger',
      separator: true,
      action: (row: Fornecedor) => this.confirmDelete(row),
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
    placeholder: 'Buscar por código, razão social ou CNPJ...',
    action: (q: string) => this.onQuickSearch(q),
  };

  ngOnInit(): void {
    this.load();
  }

  ngAfterViewInit(): void {
    this._winH.set(window.innerHeight);
    setTimeout(() => this.cdr.detectChanges());
  }

  @HostListener('window:resize')
  onResize(): void {
    this._winH.set(window.innerHeight);
  }

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
          this.items.update((prev) => [...prev, ...res.items]);
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
        error: () => this.notification.error('Erro ao carregar fornecedores.'),
      });
  }

  private confirmDelete(row: Fornecedor): void {
    this.dialog.confirm({
      title: 'Excluir fornecedor',
      message: `Deseja realmente excluir o fornecedor ${row.codigo}/${row.loja} — ${row.nome}?`,
      confirm: () => this.delete(row),
    });
  }

  private delete(row: Fornecedor): void {
    this.loading.set(true);
    this.service
      .delete(row.id)
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.notification.success('Fornecedor excluído com sucesso.');
          this.items.update((prev) => prev.filter((r) => r.id !== row.id));
        },
        error: (err) => this.notification.error(this.parseProtheusError(err)),
      });
  }

  private parseProtheusError(err: unknown): string {
    const body = (err as HttpErrorResponse | undefined)?.error as ProtheusErrorBody | undefined;

    if (!body?.errorMessage) {
      return body?.message ?? 'Erro ao processar a requisição.';
    }
    try {
      const errObj = JSON.parse(body.errorMessage) as ProtheusStructuredError;
      const decode = (s: string) =>
        new TextDecoder('iso-8859-1').decode(Uint8Array.from(s, (c) => c.charCodeAt(0)));
      const msg = decode(errObj.message ?? '');
      const detail = errObj.detailedMessage ? ` — ${decode(errObj.detailedMessage)}` : '';
      return `Erro ${errObj.code}: ${msg}${detail}`;
    } catch {
      return body.message ?? 'Erro ao processar a requisição.';
    }
  }
}

interface ProtheusErrorBody {
  errorMessage?: string;
  message?: string;
}

interface ProtheusStructuredError {
  code?: string;
  message?: string;
  detailedMessage?: string;
}
