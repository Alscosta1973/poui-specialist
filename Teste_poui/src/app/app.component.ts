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
      label: 'Faturamento',
      shortLabel: 'Faturamento',
      icon: 'po-icon-document',
      subItems: [
        {
          label: 'Parceiros',
          link: '/faturamento/parceiros',
        },
        {
          label: 'Gerar NF Pedidos',
          link: '/faturamento/gerar-nf-pedido',
        },
      ],
    },
    {
      label: 'Financeiro',
      shortLabel: 'Financeiro',
      icon: 'po-icon-finance',
      subItems: [
        {
          label: 'Divergência Cartão',
          link: '/financeiro/divergencias-cartao',
        },
        {
          label: 'Conciliação Cartão',
          link: '/financeiro/conciliacao-cartao',
        },
        {
          label: 'Cad. Taxa',
          link: '/financeiro/cad-taxa',
        },
        {
          label: 'Cad. Taxa V2',
          link: '/financeiro/cad-taxa-v2/c',
        },
        {
          label: 'Importação Financeira',
          link: '/financeiro/importacao-financeira',
        },
        {
          label: 'Títulos',
          link: '/financeiro/titulos-list',
        },
      ],
    },
    {
      label: 'Compras',
      shortLabel: 'Compras',
      icon: 'po-icon-purchase',
      subItems: [
        {
          label: 'Pedidos de Compra',
          link: '/compras/pedido-compra',
        },
        {
          label: 'Ped. Compra (Stacked)',
          link: '/compras/pedido-compra-stacked',
        },
        {
          label: 'Ped. Compra (CRUD)',
          link: '/compras/pedido-compra-crud',
        },
        {
          label: 'Aprovação Pedido',
          link: '/compras/aprovacao-pedido',
        },
      ],
    },
    {
      label: 'E-commerce',
      shortLabel: 'E-commerce',
      icon: 'po-icon-cart',
      subItems: [
        {
          label: 'WsPedidos Log',
          link: '/ecommerce/ws-pedidos-log',
        },
        {
          label: 'WsPedidos Parâmetros',
          link: '/ecommerce/ws-pedidos-parametros',
        },
      ],
    },
    {
      label: 'RH',
      shortLabel: 'RH',
      icon: 'po-icon-user',
      subItems: [
        {
          label: 'Dashboard RH',
          link: '/rh/indicadores-rh',
        },
        {
          label: 'Processamento Folha',
          link: '/rh/processamento-folha',
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
