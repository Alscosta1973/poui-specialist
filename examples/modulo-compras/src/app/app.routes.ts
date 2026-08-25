import { Routes } from '@angular/router';
import { authGuard } from './auth/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'inicio', pathMatch: 'full' },
  { path: 'inicio', canActivate: [authGuard], loadComponent: () => import('./home/home.component').then(m => m.HomeComponent) },
  { path: 'auth/login', loadComponent: () => import('./auth/login/login.component').then(m => m.LoginComponent) },
  { path: 'compras/painel-compras', loadComponent: () => import('./compras/painel-compras/painel-compras.component').then(m => m.PainelComprasComponent) },
  { path: 'compras/solicitacao-compra', loadComponent: () => import('./compras/solicitacao-compra/solicitacao-compra.component').then(m => m.SolicitacaoCompraComponent) },
  { path: 'compras/pedido-compra', loadComponent: () => import('./compras/pedido-compra/pedido-compra.component').then(m => m.PedidoCompraComponent) },
  { path: 'compras/pedido-compra/:id/detalhe', loadComponent: () => import('./compras/pedido-compra-detalhe/pedido-compra-detalhe.component').then(m => m.PedidoCompraDetalheComponent) },
  { path: 'compras/aprovacao-pedido', loadComponent: () => import('./compras/aprovacao-pedido/aprovacao-pedido.component').then(m => m.AprovacaoPedidoComponent) },
  { path: 'compras/produto', loadComponent: () => import('./compras/produto/produto.component').then(m => m.ProdutoComponent) },
  {
    path: 'financeiro/fornecedores-list',
    loadComponent: () =>
      import('./financeiro/fornecedores-list/fornecedores-list.component')
        .then(m => m.FornecedoresListComponent),
  },
  { path: '**', redirectTo: 'inicio' }
];
