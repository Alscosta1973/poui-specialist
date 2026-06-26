import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PoMenuModule, PoToolbarModule, PoMenuItem } from '@po-ui/ng-components';
import { ProAppConfigService } from '@totvs/protheus-lib-core';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, PoMenuModule, PoToolbarModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  constructor(private proAppConfigService: ProAppConfigService) {
    if (!this.proAppConfigService.insideProtheus()) {
      this.proAppConfigService.loadAppConfig();
    }
  }

  readonly menus: PoMenuItem[] = [
    {
      label: 'Parceiros',
      shortLabel: 'Parceiros',
      icon: 'po-icon-users',
      link: '/faturamento/parceiros',
    },
    {
      label: 'Gerar NF Pedidos',
      shortLabel: 'Gerar NF',
      icon: 'po-icon-document',
      link: '/faturamento/gerar-nf-pedido',
    },
    {
      label: 'Divergência Cartão',
      shortLabel: 'Div. Cartão',
      icon: 'po-icon-finance',
      subItems: [
        {
          label: 'Divergência',
          link: '/financeiro/divergencias-cartao',
        },
        {
          label: 'Cad. Taxa',
          link: '/financeiro/cad-taxa',
        },
        {
          label: 'Cad. Taxa V2',
          link: '/financeiro/cad-taxa-v2/c',
        },
      ],
    },
    {
      label: 'Conciliacao Cartao',
      shortLabel: 'Conciliacao',
      icon: 'po-icon-finance',
      link: '/financeiro/conciliacao-cartao',
    },
    {
      label: 'Pedidos de Compra',
      shortLabel: 'Ped. Compra',
      icon: 'po-icon-purchase',
      link: '/compras/pedido-compra',
    },
    {
      label: 'Ped. Compra (Stacked)',
      shortLabel: 'Compra Stack',
      icon: 'po-icon-purchase',
      link: '/compras/pedido-compra-stacked',
    },
    {
      label: 'Ped. Compra (CRUD)',
      shortLabel: 'CRUD Compra',
      icon: 'po-icon-list',
      link: '/compras/pedido-compra-crud',
    },
    {
      label: 'Aprovação Pedido',
      shortLabel: 'Aprov. PC',
      icon: 'po-icon-ok',
      link: '/compras/aprovacao-pedido',
    },
    {
      label: 'Importação Financeira',
      shortLabel: 'Imp. Fin.',
      icon: 'po-icon-upload',
      link: '/financeiro/importacao-financeira',
    },
    {
      label: 'WsPedidos Log',
      shortLabel: 'Ws Log',
      icon: 'po-icon-list',
      link: '/ecommerce/ws-pedidos-log',
    },
    {
      label: 'WsPedidos Parametros',
      shortLabel: 'Ws Params',
      icon: 'po-icon-settings',
      link: '/ecommerce/ws-pedidos-parametros',
    },
    {
      label: 'Títulos',
      shortLabel: 'Títulos',
      icon: 'po-icon-document',
      link: '/financeiro/titulos-list',
    },
    {
      label: 'RH',
      shortLabel: 'RH',
      icon: 'po-icon-user',
      subItems: [
        {
          label: 'Indicadores',
          link: '/rh/indicadores-rh',
        },
        {
          label: 'Funcionários',
          link: '/rh/funcionarios',
        },
        {
          label: 'Departamentos',
          link: '/rh/departamentos',
        },
        {
          label: 'Onboarding',
          link: '/rh/onboarding',
        },
      ],
    },
    {
      label: 'Sair',
      shortLabel: 'Sair',
      icon: 'po-icon-exit',
      action: this.closeApp.bind(this),
    },
  ];

  private closeApp(): void {
    if (this.proAppConfigService.insideProtheus()) {
      this.proAppConfigService.callAppClose();
    }
  }
}
