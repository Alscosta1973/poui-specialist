/**
 * @generated  poui-specialist v1.0
 * @author     Andre Costa <andre.andrelscosta@gmail.com>
 */
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs/operators';
import {
  PoChartModule,
  PoChartOptions,
  PoChartSerie,
  PoChartType,
  PoLoadingModule,
  PoNotificationService,
  PoPageModule,
  PoWidgetModule,
} from '@po-ui/ng-components';
import { DashRhData, IndicadoresRhService } from './indicadores-rh.service';

@Component({
  selector: 'app-indicadores-rh',
  standalone: true,
  imports: [CommonModule, PoPageModule, PoWidgetModule, PoChartModule, PoLoadingModule],
  templateUrl: './indicadores-rh.component.html',
  styleUrl: './indicadores-rh.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IndicadoresRhComponent implements OnInit {
  private readonly service      = inject(IndicadoresRhService);
  private readonly notification = inject(PoNotificationService);
  private readonly destroyRef   = inject(DestroyRef);
  private readonly cdr          = inject(ChangeDetectorRef);

  readonly loading          = signal(false);
  readonly totalAtivos      = signal(0);
  readonly admissoesMes     = signal(0);
  readonly desligamentosMes = signal(0);
  readonly mediaSalarial    = signal(0);

  readonly barChartType  = PoChartType.Bar;
  readonly lineChartType = PoChartType.Line;

  readonly chartOptions = signal<PoChartOptions>({ axis: { minRange: 0 } });

  readonly barCategories  = signal<string[]>([]);
  readonly barSeries      = signal<PoChartSerie[]>([]);
  readonly lineCategories = signal<string[]>([]);
  readonly lineSeries     = signal<PoChartSerie[]>([]);

  readonly fmtSal = computed(() =>
    this.mediaSalarial().toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  );

  ngOnInit(): void {
    this.loading.set(true);
    this.service.getIndicadores()
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next:  (data) => this._aplicarDados(data),
        error: () => {
          this.notification.error('Erro ao carregar indicadores de RH.');
          this._aplicarDemo();
        },
      });
  }

  private _aplicarDados(data: DashRhData): void {
    this.totalAtivos.set(data.totalAtivos);
    this.admissoesMes.set(data.admissoesMes);
    this.desligamentosMes.set(data.desligamentosMes);
    this.mediaSalarial.set(data.mediaSalarial);

    this.barCategories.set(data.distribuicaoPorDepto.map(d => d.depto));
    this.barSeries.set([{ label: 'Funcionários', data: data.distribuicaoPorDepto.map(d => d.count) }]);

    this.lineCategories.set(data.evolucaoHeadcount.map(e => e.mes));
    this.lineSeries.set([{ label: 'Headcount', data: data.evolucaoHeadcount.map(e => e.count) }]);

    this.cdr.markForCheck();
  }

  // Quirk: sem REST disponível, exibe dados representativos para demonstração
  private _aplicarDemo(): void {
    this.totalAtivos.set(142);
    this.admissoesMes.set(8);
    this.desligamentosMes.set(3);
    this.mediaSalarial.set(4850.00);

    this.barCategories.set(['TI', 'Vendas', 'RH', 'Financeiro', 'Produção']);
    this.barSeries.set([{ label: 'Funcionários', data: [28, 35, 12, 18, 49] }]);

    this.lineCategories.set(['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun']);
    this.lineSeries.set([{ label: 'Headcount', data: [138, 140, 139, 141, 140, 142] }]);

    this.cdr.markForCheck();
  }
}
