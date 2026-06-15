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
      label: 'Gerar NF Pedidos',
      shortLabel: 'Gerar NF',
      icon: 'po-icon-document',
      link: '/faturamento/gerar-nf-pedido',
    },
    {
      label: 'Divergencias Cartao',
      shortLabel: 'Div. Cartao',
      icon: 'po-icon-finance',
      link: '/financeiro/divergencias-cartao',
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
