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
  {
    path: 'compras/pedido-compra-crud',
    loadComponent: () =>
      import('./compras/pedido-compra-crud/pedido-compra-list.component')
        .then(m => m.PedidoCompraListComponent),
  },
  // ------------------------------------------------------------------
  // Pedido de Compra — CRUD (page-edit)
  // ------------------------------------------------------------------
  {
    path: 'compras/pedido-compra-crud/novo',
    loadComponent: () =>
      import('./compras/pedido-compra-crud/pedido-compra-edit.component')
        .then(m => m.PedidoCompraEditComponent),
  },
  {
    path: 'compras/pedido-compra-crud/:numero/editar',
    loadComponent: () =>
      import('./compras/pedido-compra-crud/pedido-compra-edit.component')
        .then(m => m.PedidoCompraEditComponent),
  },
  {
    path: 'compras/pedido-compra-crud/:numero/detalhe',
    loadComponent: () =>
      import('./compras/pedido-compra-crud/pedido-compra-detail.component')
        .then(m => m.PedidoCompraDetailComponent),
  },
  {
    path: 'financeiro/cad-taxa-v2/a',
    loadComponent: () =>
      import('./financeiro/cad-taxa-v2/cad-taxa-v2-a.component')
        .then(m => m.CadTaxaV2AComponent),
  },
  {
    path: 'financeiro/cad-taxa-v2/b',
    loadComponent: () =>
      import('./financeiro/cad-taxa-v2/cad-taxa-v2-b.component')
        .then(m => m.CadTaxaV2BComponent),
  },
  {
    path: 'financeiro/cad-taxa-v2/c',
    loadComponent: () =>
      import('./financeiro/cad-taxa-v2/cad-taxa-v2-c.component')
        .then(m => m.CadTaxaV2CComponent),
  },
  {
    path: 'financeiro/cad-taxa',
    loadComponent: () =>
      import('./financeiro/cad-taxa/cad-taxa.component')
        .then(m => m.CadTaxaComponent),
  },
  {
    path: 'financeiro/importacao-financeira',
    loadComponent: () =>
      import('./financeiro/importacao-financeira/importacao-financeira.component')
        .then(m => m.ImportacaoFinanceiraComponent),
  },
  {
    path: 'faturamento/parceiros',
    loadComponent: () =>
      import('./faturamento/parceiros/parceiros.component')
        .then(m => m.ParceirosComponent),
  },
  {
    path: 'ecommerce/ws-pedidos-log',
    loadComponent: () =>
      import('./ecommerce/ws-pedidos-log/ws-pedidos-log.component')
        .then(m => m.WsPedidosLogComponent),
  },
  {
    path: 'ecommerce/ws-pedidos-parametros',
    loadComponent: () =>
      import('./ecommerce/ws-pedidos-parametros/ws-pedidos-parametros.component')
        .then(m => m.WsPedidosParametrosComponent),
  },
  {
    path: 'financeiro/titulos-list',
    loadComponent: () =>
      import('./financeiro/titulos-list/titulos-list.component')
        .then(m => m.TitulosListComponent),
  },
  // ------------------------------------------------------------------
  // Compras — Aprovação de Pedidos (Wave 6 — stacked-browse)
  // ------------------------------------------------------------------
  {
    path: 'compras/aprovacao-pedido',
    loadComponent: () =>
      import('./compras/aprovacao-pedido/aprovacao-pedido.component')
        .then(m => m.AprovacaoPedidoComponent),
  },
  // ------------------------------------------------------------------
  // RH — Funcionários (Wave 1 — teste plugin poui-specialist)
  // ------------------------------------------------------------------
  {
    path: 'rh/funcionarios',
    loadComponent: () =>
      import('./rh/funcionarios/funcionarios-list.component')
        .then(m => m.FuncionariosListComponent),
  },
  {
    path: 'rh/funcionarios/novo',
    loadComponent: () =>
      import('./rh/funcionarios/funcionarios-edit.component')
        .then(m => m.FuncionariosEditComponent),
  },
  {
    path: 'rh/funcionarios/:mat',
    loadComponent: () =>
      import('./rh/funcionarios/funcionarios-detail.component')
        .then(m => m.FuncionariosDetailComponent),
  },
  {
    path: 'rh/funcionarios/:mat/editar',
    loadComponent: () =>
      import('./rh/funcionarios/funcionarios-edit.component')
        .then(m => m.FuncionariosEditComponent),
  },
  // ------------------------------------------------------------------
  // RH — Departamentos (Wave 3 — modal-crud)
  // ------------------------------------------------------------------
  {
    path: 'rh/departamentos',
    loadComponent: () =>
      import('./rh/departamentos/departamentos-list.component')
        .then(m => m.DepartamentosListComponent),
  },
  // ------------------------------------------------------------------
  // RH — Onboarding (Wave 4 — stepper-form)
  // ------------------------------------------------------------------
  {
    path: 'rh/onboarding',
    loadComponent: () =>
      import('./rh/onboarding/onboarding-funcionario.component')
        .then(m => m.OnboardingFuncionarioComponent),
  },
];
