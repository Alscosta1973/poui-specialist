import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PoPageModule, PoToolbarModule, PoWidgetModule } from '@po-ui/ng-components';

@Component({
  selector: 'app-home',
  imports: [PoPageModule, PoToolbarModule, PoWidgetModule],
  template: `
    <po-page-default p-title="Modulo Compras — PO-UI + Protheus">
      <div class="po-row">
        <po-widget class="po-md-12 po-lg-4 po-mt-2" p-title="Próximos passos">
          <p>1. Gere um componente: <code>/poui-specialist:generate page-list Pedidos --module compras</code></p>
          <p>2. Gere os testes: <code>/poui-specialist:test PedidosComponent --module compras</code></p>
          <p>3. Revise o código: <code>/poui-specialist:review src/app/compras</code></p>
        </po-widget>
        <po-widget class="po-md-12 po-lg-4 po-mt-2" p-title="Tipos disponíveis">
          <ul>
            <li>page-list / page-dynamic-search</li>
            <li>modal-crud / page-edit / stepper-form</li>
            <li>dashboard / upload / po-tree</li>
            <li>infinite-scroll / action-list</li>
          </ul>
        </po-widget>
        <po-widget class="po-md-12 po-lg-4 po-mt-2" p-title="Plugin instalado">
          <p>✓ PO-UI configurado</p>
          <p>✓ Proxy para Protheus: <strong>http://localhost:8086</strong></p>
          <p>✓ OnPush habilitado</p>
          <p>✓ strict: false (compatível com libs Protheus)</p>
          <p>✓ Dark mode via ThemeService</p>
          <p>✓ i18n via PoI18nModule</p>
        </po-widget>
      </div>
    </po-page-default>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeComponent {}
