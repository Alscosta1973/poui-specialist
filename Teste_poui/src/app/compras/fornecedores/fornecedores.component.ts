/**
 * @generated  poui-specialist v1.7.0 — refactor from FORN001.prw (SA2)
 * @author     Andre Costa <andre.andrelscosta@gmail.com>
 * @license    Uso permitido · redistribuição proibida sem autorização escrita
 * @see        https://github.com/Alscosta1973/poui-specialist
 *
 * Wave 13 — refactor
 * Origem: src/fixtures/fornecedores.prw (User Function FORN001, tabela SA2)
 * Padrão PO-UI: page-dynamic-search (browse + filtros avançados)
 */
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  PoNotificationService,
  PoPageAction,
  PoTableColumn,
  PoTableModule,
} from '@po-ui/ng-components';
import {
  PoPageDynamicSearchFilters,
  PoPageDynamicSearchModule,
} from '@po-ui/ng-templates';
import { FornecedoresService } from './fornecedores.service';
import { Fornecedor } from './models/fornecedor.model';

@Component({
  selector: 'app-fornecedores',
  standalone: true,
  imports: [PoPageDynamicSearchModule, PoTableModule],
  templateUrl: './fornecedores.component.html',
  styleUrl: './fornecedores.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FornecedoresComponent implements OnInit, AfterViewInit {
  private readonly service      = inject(FornecedoresService);
  private readonly notification = inject(PoNotificationService);
  private readonly router       = inject(Router);
  private readonly cdr          = inject(ChangeDetectorRef);
  private readonly destroyRef   = inject(DestroyRef);

  readonly items    = signal<Fornecedor[]>([]);
  readonly loading  = signal(false);
  readonly hasNext  = signal(false);

  private currentPage  = 1;
  private lastQuery    = '';
  private lastFilters: Record<string, string> = {};

  readonly cols: PoTableColumn[] = [
    { property: 'codigo',    label: 'Código',    width: '8%' },
    { property: 'loja',      label: 'Loja',      width: '5%' },
    { property: 'nome',      label: 'Nome' },
    { property: 'tipo',      label: 'Tipo',      width: '6%' },
    { property: 'cnpj',      label: 'CNPJ/CPF',  width: '14%' },
    { property: 'municipio', label: 'Município',  width: '14%' },
    { property: 'estado',    label: 'UF',         width: '5%' },
    {
      property: 'bloqueado', label: 'Bloqueado', width: '10%', type: 'label',
      labels: [
        { value: 'S', label: 'Sim', color: 'color-07' },
        { value: ' ', label: 'Não', color: 'color-11' },
      ],
    },
  ];

  readonly filters: PoPageDynamicSearchFilters[] = [
    { property: 'codigo', label: 'Código', gridColumns: 3 },
    { property: 'nome',   label: 'Nome',   gridColumns: 6 },
    {
      property: 'tipo', label: 'Tipo', gridColumns: 3,
      options: [
        { label: 'Física',   value: 'F' },
        { label: 'Jurídica', value: 'J' },
      ],
    },
  ];

  readonly pageActions: PoPageAction[] = [
    { label: 'Incluir',  action: () => this.onIncluir(),  icon: 'po-icon-plus' },
  ];

  ngOnInit(): void { this.load(); }

  ngAfterViewInit(): void { setTimeout(() => this.cdr.detectChanges()); }

  onSearch(query: string): void {
    this.currentPage = 1;
    this.lastQuery   = query;
    this.load();
  }

  onAdvancedSearch(filters: Record<string, string>): void {
    this.currentPage  = 1;
    this.lastFilters  = filters;
    this.lastQuery    = '';
    this.load();
  }

  onShowMore(): void {
    this.currentPage++;
    this.load(true);
  }

  private onIncluir(): void {
    this.router.navigate(['/compras/fornecedores/novo']);
  }

  private load(append = false): void {
    this.loading.set(true);
    this.service.getAll(this.currentPage, this.lastQuery)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.items.set(append ? [...this.items(), ...res.items] : res.items);
          this.hasNext.set(res.hasNext);
          this.loading.set(false);
        },
        error: () => {
          this.notification.error('Erro ao carregar fornecedores.');
          this.loading.set(false);
        },
      });
  }
}
