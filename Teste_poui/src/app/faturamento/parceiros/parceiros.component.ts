/**
 * @generated  poui-specialist v1.3
 * @author     Andre Costa <andre.andrelscosta@gmail.com>
 * @license    Uso permitido · redistribuição proibida sem autorização escrita
 * @see        https://github.com/Alscosta1973/poui-specialist
 */

import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  signal,
  inject,
} from '@angular/core';
import { Router } from '@angular/router';

import {
  PoPageDynamicSearchModule,
  PoTableModule,
  PoButtonModule,
  PoNotificationService,
  PoPageDynamicSearchFilters,
  PoTableColumn,
  PoTableAction,
  PoPageAction,
  PoDisclaimerGroup,
  PoDisclaimer,
} from '@po-ui/ng-components';

import { ParceirosService } from './parceiros.service';
import { Parceiro, ParceiroFilter, TipoPessoa, SituacaoParceiro } from './parceiro.model';

/** Dados de demo usados apenas quando a API retorna erro */
const DEMO_PARCEIROS: Parceiro[] = [
  {
    codigo: '000001', loja: '01', nome: 'FORNECEDOR DEMO LTDA', nomeFantasia: 'Fornecedor Demo',
    cnpjCpf: '12.345.678/0001-99', inscricaoEstadual: '123456789', tipoPessoa: 'J',
    situacao: '1', endereco: 'Rua das Acácias, 100', municipio: 'São Paulo', uf: 'SP',
    cep: '01310-100', telefone: '(11) 3000-0000', email: 'contato@demo.com.br',
    limiteCredito: 50000, saldoDevedor: 1200.50, dataCadastro: '2024-01-10',
  },
  {
    codigo: '000002', loja: '01', nome: 'CLIENTE EXEMPLO S/A', nomeFantasia: 'Exemplo S/A',
    cnpjCpf: '98.765.432/0001-11', inscricaoEstadual: '987654321', tipoPessoa: 'J',
    situacao: '1', endereco: 'Av. Paulista, 1000', municipio: 'São Paulo', uf: 'SP',
    cep: '01310-200', telefone: '(11) 4000-0000', email: 'contato@exemplo.com.br',
    limiteCredito: 100000, saldoDevedor: 5000, dataCadastro: '2024-02-15',
  },
  {
    codigo: '000003', loja: '01', nome: 'DISTRIBUIDORA RIO LTDA', nomeFantasia: 'Dist. Rio',
    cnpjCpf: '11.222.333/0001-44', inscricaoEstadual: '111222333', tipoPessoa: 'J',
    situacao: '2', endereco: 'Rua da Lapa, 50', municipio: 'Rio de Janeiro', uf: 'RJ',
    cep: '20021-180', telefone: '(21) 5000-0000', email: 'rio@dist.com.br',
    limiteCredito: 30000, saldoDevedor: 0, dataCadastro: '2023-11-01',
  },
];

@Component({
  selector: 'app-parceiros',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PoPageDynamicSearchModule,
    PoTableModule,
    PoButtonModule,
  ],
  templateUrl: './parceiros.component.html',
  styleUrls: ['./parceiros.component.scss'],
})
export class ParceirosComponent implements OnInit {
  private readonly service  = inject(ParceirosService);
  private readonly router   = inject(Router);
  private readonly notify   = inject(PoNotificationService);

  readonly items       = signal<Parceiro[]>([]);
  readonly isLoading   = signal(false);
  readonly hasNext     = signal(false);
  readonly currentPage = signal(1);
  readonly pageSize    = 10;

  private activeFilters   = signal<ParceiroFilter>({});
  private quickSearchTerm = signal('');

  readonly disclaimerGroup = signal<PoDisclaimerGroup>({
    title: 'Filtros ativos',
    disclaimers: [],
  });

  readonly columns: PoTableColumn[] = [
    { property: 'codigo',       label: 'Código',         width: '90px' },
    { property: 'loja',         label: 'Loja',           width: '60px' },
    { property: 'nome',         label: 'Razão Social',   width: '30%' },
    { property: 'nomeFantasia', label: 'Nome Fantasia',  width: '20%' },
    { property: 'cnpjCpf',     label: 'CNPJ/CPF',       width: '160px' },
    {
      property: 'tipoPessoa', label: 'Tipo', width: '90px',
      type: 'label',
      labels: [
        { value: 'F', label: 'Física',   color: 'color-08' },
        { value: 'J', label: 'Jurídica', color: 'color-03' },
        { value: 'X', label: 'Exterior', color: 'color-07' },
      ],
    },
    {
      property: 'situacao', label: 'Situação', width: '100px',
      type: 'label',
      labels: [
        { value: '1', label: 'Ativo',     color: 'color-10' },
        { value: '2', label: 'Bloqueado', color: 'color-07' },
      ],
    },
    { property: 'municipio', label: 'Município', width: '140px' },
    { property: 'uf',        label: 'UF',        width: '60px' },
    {
      property: 'limiteCredito', label: 'Limite Crédito',
      type: 'currency', format: 'BRL', width: '140px',
    },
  ];

  readonly tableActions: PoTableAction[] = [
    {
      label: 'Visualizar',
      icon: 'ph ph-eye',
      action: (row: Parceiro) => this.onView(row),
    },
    {
      label: 'Editar',
      icon: 'ph ph-pencil',
      action: (row: Parceiro) => this.onEdit(row),
    },
    {
      label: 'Excluir',
      icon: 'ph ph-trash',
      type: 'danger',
      action: (row: Parceiro) => this.onDelete(row),
    },
  ];

  readonly pageActions: PoPageAction[] = [
    {
      label: 'Novo',
      icon: 'ph ph-plus',
      action: () => this.router.navigate(['/faturamento/parceiros/novo']),
    },
  ];

  readonly filters: PoPageDynamicSearchFilters[] = [
    { property: 'codigo',     label: 'Código',             gridColumns: 3 },
    { property: 'nome',       label: 'Nome / Razão Social', gridColumns: 6 },
    { property: 'cnpjCpf',   label: 'CNPJ / CPF',         gridColumns: 3 },
    {
      property: 'tipoPessoa', label: 'Tipo de Pessoa', gridColumns: 3,
      options: [
        { label: 'Física',   value: 'F' },
        { label: 'Jurídica', value: 'J' },
        { label: 'Exterior', value: 'X' },
      ],
    },
    {
      property: 'situacao', label: 'Situação', gridColumns: 3,
      options: [
        { label: 'Ativo',     value: '1' },
        { label: 'Bloqueado', value: '2' },
      ],
    },
    { property: 'uf',        label: 'UF',        gridColumns: 3 },
    { property: 'municipio', label: 'Município', gridColumns: 3 },
  ];

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.isLoading.set(true);
    const term    = this.quickSearchTerm();
    const filters = this.activeFilters();
    const page    = this.currentPage();

    const request$ = term
      ? this.service.search(term, page, this.pageSize)
      : this.service.list(page, this.pageSize, filters);

    request$.subscribe({
      next: (res) => {
        this.items.set(res.items);
        this.hasNext.set(res.hasNext);
        this.isLoading.set(false);
      },
      error: () => {
        this.items.set(DEMO_PARCEIROS);
        this.hasNext.set(false);
        this.isLoading.set(false);
        this.notify.warning('Não foi possível conectar ao servidor. Exibindo dados de exemplo.');
      },
    });
  }

  onQuickSearch(term: string): void {
    this.quickSearchTerm.set(term ?? '');
    this.activeFilters.set({});
    this.currentPage.set(1);
    this.updateDisclaimers({});
    this.load();
  }

  onAdvancedSearch(filters: Record<string, string>): void {
    const f: ParceiroFilter = {
      codigo:     filters['codigo']     ?? undefined,
      nome:       filters['nome']       ?? undefined,
      cnpjCpf:    filters['cnpjCpf']    ?? undefined,
      tipoPessoa: (filters['tipoPessoa'] as TipoPessoa)      ?? undefined,
      situacao:   (filters['situacao']   as SituacaoParceiro) ?? undefined,
      uf:         filters['uf']         ?? undefined,
      municipio:  filters['municipio']  ?? undefined,
    };
    (Object.keys(f) as (keyof ParceiroFilter)[]).forEach(k => f[k] === undefined && delete f[k]);

    this.activeFilters.set(f);
    this.quickSearchTerm.set('');
    this.currentPage.set(1);
    this.updateDisclaimers(filters);
    this.load();
  }

  private readonly FILTER_LABELS: Record<string, string> = {
    codigo:     'Código',
    nome:       'Nome / Razão Social',
    cnpjCpf:    'CNPJ / CPF',
    tipoPessoa: 'Tipo de Pessoa',
    situacao:   'Situação',
    uf:         'UF',
    municipio:  'Município',
  };

  private readonly OPTION_LABELS: Record<string, Record<string, string>> = {
    tipoPessoa: { F: 'Física', J: 'Jurídica', X: 'Exterior' },
    situacao:   { '1': 'Ativo', '2': 'Bloqueado' },
  };

  private updateDisclaimers(filters: Record<string, string>): void {
    const disclaimers: PoDisclaimer[] = Object.entries(filters)
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .map(([key, value]) => {
        const label        = this.FILTER_LABELS[key] ?? key;
        const displayValue = this.OPTION_LABELS[key]?.[value] ?? value;
        return { property: key, label: `${label}: ${displayValue}`, value };
      });

    this.disclaimerGroup.set({ ...this.disclaimerGroup(), disclaimers });
  }

  onDisclaimersChange(disclaimers: PoDisclaimer[]): void {
    if (disclaimers.length === 0) {
      this.activeFilters.set({});
      this.quickSearchTerm.set('');
      this.currentPage.set(1);
      this.updateDisclaimers({});
      this.load();
      return;
    }
    const remaining: Record<string, string> = {};
    disclaimers.forEach(d => {
      if (d.property && d.value !== undefined) remaining[d.property] = d.value as string;
    });
    this.onAdvancedSearch(remaining);
  }

  onNextPage(): void {
    if (this.hasNext()) {
      this.currentPage.update(p => p + 1);
      this.load();
    }
  }

  onPreviousPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
      this.load();
    }
  }

  onView(row: Parceiro): void {
    this.router.navigate(['/faturamento/parceiros', row.codigo, row.loja, 'detalhe']);
  }

  onEdit(row: Parceiro): void {
    this.router.navigate(['/faturamento/parceiros', row.codigo, row.loja, 'editar']);
  }

  onDelete(row: Parceiro): void {
    if (!confirm(`Confirma a exclusão do parceiro "${row.nome}"?`)) return;
    this.service.delete(row.codigo, row.loja).subscribe({
      next: () => {
        this.notify.success(`Parceiro "${row.nome}" excluído com sucesso.`);
        this.load();
      },
      error: () => {
        this.notify.error('Falha ao excluir o parceiro. Verifique e tente novamente.');
      },
    });
  }
}
