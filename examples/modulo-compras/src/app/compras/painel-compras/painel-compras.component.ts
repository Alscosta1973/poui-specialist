/**
 * @generated  poui-specialist v1.10.0
 * @author     Andre Costa <andre.andrelscosta@gmail.com>
 * @license    Uso permitido · redistribuição proibida sem autorização escrita
 * @see        https://github.com/Alscosta1973/poui-specialist
 */
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs/operators';
import {
  PoButtonModule,
  PoChartModule,
  PoChartOptions,
  PoChartSerie,
  PoChartType,
  PoLoadingModule,
  PoPageModule,
  PoToolbarModule,
  PoWidgetModule,
} from '@po-ui/ng-components';
import { PainelComprasDashboardData, PainelComprasService } from './painel-compras.service';

// Dados de demonstração — usados apenas quando os endpoints REST de Compras
// (pedidos, solicitacoes, fornecedores) ainda não respondem (contratos backend
// atualmente são skeletons WsRestFul sem regra de negócio implementada).
const DEMO_DASHBOARD_DATA: PainelComprasDashboardData = {
  totalPedidosAbertos: 12,
  totalSolicitacoesPendentes: 5,
  valorTotalPedidos: 187650.32,
  fornecedoresAtivos: 34,
  statusCategories: ['Aberto', 'Aprovado', 'Faturado', 'Cancelado'],
  statusSeries: [{ label: 'Pedidos por status', data: [12, 8, 21, 2] }],
};

@Component({
  selector: 'app-painel-compras',
  standalone: true,
  imports: [
    PoPageModule,
    PoToolbarModule,
    PoWidgetModule,
    PoChartModule,
    PoLoadingModule,
    PoButtonModule,
  ],
  templateUrl: './painel-compras.component.html',
  styleUrl: './painel-compras.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PainelComprasComponent implements OnInit, AfterViewInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly painelComprasService = inject(PainelComprasService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly isDemoData = signal(false);

  readonly totalPedidosAbertos = signal('—');
  readonly totalSolicitacoesPendentes = signal('—');
  readonly valorTotalPedidos = signal('—');
  readonly fornecedoresAtivos = signal('—');

  readonly barChartType = PoChartType.Bar;
  readonly chartOptions = signal<PoChartOptions>({
    axis: { gridLines: 5 },
  });
  readonly chartCategories = signal<string[]>([]);
  readonly chartSeries = signal<PoChartSerie[]>([]);

  ngOnInit(): void {
    this.loadDashboard();
  }

  ngAfterViewInit(): void {
    // Quirk #1 (po-ui-quirks-onpush.md): po-page-content zera a opacidade e só
    // a restaura em um setTimeout próprio; em OnPush isso não dispara um novo
    // ciclo de CD sozinho. Forçamos um detectChanges síncrono logo em seguida.
    setTimeout(() => this.cdr.detectChanges());
  }

  reload(): void {
    this.loadDashboard();
  }

  private loadDashboard(): void {
    this.loading.set(true);
    this.error.set(null);
    this.isDemoData.set(false);

    this.painelComprasService
      .getDashboardData()
      .pipe(
        finalize(() => {
          this.loading.set(false);
          this.cdr.markForCheck();
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: data => this.applyData(data),
        error: () => {
          this.error.set(
            'Não foi possível carregar os dados do Painel de Compras. Os endpoints REST de Pedidos, ' +
              'Solicitações e Fornecedores ainda podem não estar implementados no backend.',
          );
          this.isDemoData.set(true);
          this.applyData(DEMO_DASHBOARD_DATA);
        },
      });
  }

  private applyData(data: PainelComprasDashboardData): void {
    this.totalPedidosAbertos.set(data.totalPedidosAbertos.toString());
    this.totalSolicitacoesPendentes.set(data.totalSolicitacoesPendentes.toString());
    this.valorTotalPedidos.set(
      data.valorTotalPedidos.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
    );
    this.fornecedoresAtivos.set(data.fornecedoresAtivos.toString());
    this.chartCategories.set(data.statusCategories);
    this.chartSeries.set(data.statusSeries);
  }
}
