import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'estoque/produtos', pathMatch: 'full' },

  // Estoque — Produtos (modal-crud: sem rotas de edição, tudo em modal)
  {
    path: 'estoque/produtos',
    loadComponent: () =>
      import('./estoque/produtos/produtos.component').then(
        (m) => m.ProdutosComponent
      ),
  },

  // Compras — Fornecedores
  {
    path: 'compras/fornecedores',
    loadComponent: () =>
      import('./compras/fornecedores/fornecedores-list/fornecedores-list.component').then(
        (m) => m.FornecedoresListComponent
      ),
  },
  {
    path: 'compras/fornecedores/novo',
    loadComponent: () =>
      import('./compras/fornecedores/fornecedores-edit/fornecedores-edit.component').then(
        (m) => m.FornecedoresEditComponent
      ),
  },
  {
    path: 'compras/fornecedores/:codigo/:loja',
    loadComponent: () =>
      import('./compras/fornecedores/fornecedores-edit/fornecedores-edit.component').then(
        (m) => m.FornecedoresEditComponent
      ),
  },

  // Financeiro — Clientes
  {
    path: 'financeiro/clientes',
    loadComponent: () =>
      import('./financeiro/clientes/clientes.component').then(
        (m) => m.ClientesComponent
      ),
  },
  {
    path: 'financeiro/clientes/novo',
    loadComponent: () =>
      import('./financeiro/clientes/clientes-edit.component').then(
        (m) => m.ClientesEditComponent
      ),
  },
  {
    path: 'financeiro/clientes/:codigo/:loja',
    loadComponent: () =>
      import('./financeiro/clientes/clientes-edit.component').then(
        (m) => m.ClientesEditComponent
      ),
  },

  // Financeiro — Divergências de Cartão (ORTA012)
  {
    path: 'financeiro/divergencias-cartao',
    loadComponent: () =>
      import('./financeiro/divergencias-cartao/divergencias-cartao.component').then(
        (m) => m.DivergenciasCartaoComponent
      ),
  },

  { path: '**', redirectTo: 'estoque/produtos' },
];
