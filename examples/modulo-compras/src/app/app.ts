import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PoMenuModule, PoToolbarModule, PoMenuItem } from '@po-ui/ng-components';
import { ProAppConfigService } from '@totvs/protheus-lib-core';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, PoMenuModule, PoToolbarModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class App {
  constructor(private proAppConfigService: ProAppConfigService) {
    if (!this.proAppConfigService.insideProtheus()) {
      this.proAppConfigService.loadAppConfig();
    }
  }

  readonly menus: PoMenuItem[] = [
    { label: 'Início', link: '/inicio', shortLabel: 'Início', icon: 'po-icon-home' },
    {
      label: 'Compras', shortLabel: 'Compras', icon: 'po-icon-shopping-cart',
      subItems: [
        { label: 'Painel de Compras', link: '/compras/painel-compras', icon: 'po-icon-chart-columns' },
        { label: 'Solicitação de Compra', link: '/compras/solicitacao-compra', icon: 'po-icon-list' },
        { label: 'Pedido de Compra', link: '/compras/pedido-compra', icon: 'po-icon-list' },
        { label: 'Aprovação de Pedido', link: '/compras/aprovacao-pedido', icon: 'po-icon-ok' },
        { label: 'Produto', link: '/compras/produto', icon: 'po-icon-package' }
      ]
    },
    { label: 'Sair', shortLabel: 'Sair', icon: 'po-icon-exit', action: this.closeApp.bind(this) }
  ];

  private closeApp(): void {
    if (this.proAppConfigService.insideProtheus()) {
      this.proAppConfigService.callAppClose();
    }
  }
}
