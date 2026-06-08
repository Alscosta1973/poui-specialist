import { Routes } from '@angular/router';

export const routes: Routes = [
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
];
