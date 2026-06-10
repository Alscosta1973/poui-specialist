import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'faturamento/gerar-nf-pedido',
    pathMatch: 'full',
  },
  {
    path: 'faturamento/gerar-nf-pedido',
    loadComponent: () =>
      import('./faturamento/gerar-nf-pedido/gerar-nf-pedido.component')
        .then(m => m.GerarNfPedidoComponent),
  },
  {
    path: 'financeiro/divergencias-cartao',
    loadComponent: () =>
      import(
        './financeiro/divergencias-cartao/divergencias-cartao.component'
      ).then((m) => m.DivergenciasCartaoComponent),
  },
  {
    path: 'financeiro/conciliacao-cartao',
    loadComponent: () =>
      import(
        './financeiro/conciliacao-cartao/conciliacao-cartao.component'
      ).then((m) => m.ConciliacaoCartaoComponent),
  },
  {
    path: 'compras/pedido-compra',
    loadComponent: () =>
      import('./compras/pedido-compra/pedido-compra.component')
        .then(m => m.PedidoCompraComponent),
  },
  {
    path: 'compras/pedido-compra-stacked',
    loadComponent: () =>
      import('./compras/pedido-compra-stacked/pedido-compra-stacked.component')
        .then(m => m.PedidoCompraStackedComponent),
  },
];
