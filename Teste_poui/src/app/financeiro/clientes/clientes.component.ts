import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
  computed,
} from '@angular/core';
import { Router } from '@angular/router';
import {
  PoButtonModule,
  PoLoadingModule,
  PoNotificationService,
  PoPageAction,
  PoPageListModule,
  PoTableAction,
  PoTableColumn,
  PoTableModule,
} from '@po-ui/ng-components';
import { ClientesService } from './clientes.service';
import { Cliente } from './models/cliente.model';

@Component({
  selector: 'app-clientes',
  standalone: true,
  imports: [PoPageListModule, PoTableModule, PoButtonModule, PoLoadingModule],
  templateUrl: './clientes.component.html',
  styleUrls: ['./clientes.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientesComponent implements OnInit {
  private readonly service = inject(ClientesService);
  private readonly router = inject(Router);
  private readonly notification = inject(PoNotificationService);

  readonly items = signal<Cliente[]>([]);
  readonly loading = signal(false);
  readonly hasNext = signal(false);
  readonly currentPage = signal(1);
  readonly pageSize = 10;
  readonly searchTerm = signal('');

  readonly columns: PoTableColumn[] = [
    { property: 'codigo', label: 'Código', width: '8%' },
    { property: 'loja', label: 'Loja', width: '5%' },
    { property: 'nome', label: 'Nome' },
    { property: 'nomeFantasia', label: 'Nome Fantasia' },
    { property: 'cnpj', label: 'CNPJ/CPF', width: '14%' },
    { property: 'cidade', label: 'Cidade', width: '12%' },
    { property: 'uf', label: 'UF', width: '5%' },
    { property: 'telefone', label: 'Telefone', width: '12%' },
  ];

  readonly pageActions: PoPageAction[] = [
    {
      label: 'Novo',
      action: () => this.router.navigate(['/financeiro/clientes/novo']),
      icon: 'an an-plus',
    },
  ];

  readonly tableActions: PoTableAction[] = [
    {
      label: 'Editar',
      action: (row: Cliente) =>
        this.router.navigate(['/financeiro/clientes', row.codigo, row.loja]),
      icon: 'an an-pencil',
    },
    {
      label: 'Excluir',
      action: (row: Cliente) => this.deleteCliente(row),
      icon: 'an an-trash',
      type: 'danger',
    },
  ];

  ngOnInit(): void {
    this.loadClientes();
  }

  onQuickSearch(term: string): void {
    this.searchTerm.set(term);
    this.currentPage.set(1);
    this.loadClientes();
  }

  onShowMore(): void {
    this.currentPage.update((p) => p + 1);
    this.loadMoreClientes();
  }

  private loadClientes(): void {
    this.loading.set(true);
    this.service
      .getClientes(this.currentPage(), this.pageSize, this.searchTerm())
      .subscribe({
        next: (res) => {
          this.items.set(res.items);
          this.hasNext.set(res.hasNext);
          this.loading.set(false);
        },
        error: () => {
          this.notification.error('Erro ao carregar clientes.');
          this.loading.set(false);
        },
      });
  }

  private loadMoreClientes(): void {
    this.loading.set(true);
    this.service
      .getClientes(this.currentPage(), this.pageSize, this.searchTerm())
      .subscribe({
        next: (res) => {
          this.items.update((prev) => [...prev, ...res.items]);
          this.hasNext.set(res.hasNext);
          this.loading.set(false);
        },
        error: () => {
          this.notification.error('Erro ao carregar mais clientes.');
          this.loading.set(false);
        },
      });
  }

  private deleteCliente(row: Cliente): void {
    this.service.deleteCliente(row.codigo, row.loja).subscribe({
      next: () => {
        this.notification.success(`Cliente ${row.nome} excluído com sucesso.`);
        this.items.update((prev) =>
          prev.filter((c) => !(c.codigo === row.codigo && c.loja === row.loja))
        );
      },
      error: () => this.notification.error('Erro ao excluir cliente.'),
    });
  }
}
