# Template: dashboard

Generates a standalone analytics dashboard page with `po-widget` (KPI cards), `po-chart` (line/bar), and `po-loading-overlay`.

## {{kebab-name}}.component.ts

```typescript
import {
  Component,
  ChangeDetectionStrategy,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs/operators';
import {
  PoChartModule,
  PoChartOptions,
  PoChartSerie,
  PoChartType,
  PoLoadingModule,
  PoPageDefaultModule,
  PoToolbarModule,
  PoWidgetModule,
} from '@po-ui/ng-components';

@Component({
  selector: '{{selector}}',
  standalone: true,
  imports: [
    PoPageDefaultModule,
    PoToolbarModule,
    PoWidgetModule,
    PoChartModule,
    PoLoadingModule,
  ],
  templateUrl: './{{kebab-name}}.component.html',
  styleUrl: './{{kebab-name}}.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class {{ComponentClass}} implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);

  // TODO: replace KPI signals with data from service
  readonly kpi1Title = signal('KPI 1');
  readonly kpi1Value = signal('—');
  readonly kpi1Desc  = signal('');

  readonly kpi2Title = signal('KPI 2');
  readonly kpi2Value = signal('—');
  readonly kpi2Desc  = signal('');

  readonly kpi3Title = signal('KPI 3');
  readonly kpi3Value = signal('—');
  readonly kpi3Desc  = signal('');

  readonly lineChartType = PoChartType.Line;
  readonly barChartType  = PoChartType.Bar;

  readonly chartOptions = signal<PoChartOptions>({});
  readonly chartCategories = signal<string[]>([]);
  readonly chartSeries = signal<PoChartSerie[]>([]);

  ngOnInit(): void {
    // TODO: inject a service and load dashboard data
    // Example:
    // inject(DashService).getStats()
    //   .pipe(
    //     finalize(() => this.loading.set(false)),
    //     takeUntilDestroyed(this.destroyRef),
    //   )
    //   .subscribe(res => {
    //     this.kpi1Value.set(res.totalProdutos.toString());
    //     this.chartCategories.set(res.categories);
    //     this.chartSeries.set(res.series);
    //   });
    this.loading.set(false);
  }
}
```

## {{kebab-name}}.component.html

```html
<po-toolbar p-title="Dashboard"></po-toolbar>

<po-page-default p-title="Análise de Dados">

  @if (loading()) {
    <po-loading-overlay p-text="Carregando..."></po-loading-overlay>
  }

  @if (!loading()) {
    <!-- KPI Cards -->
    <div class="po-row">
      <po-widget class="po-md-12 po-lg-4 po-mt-2" [p-title]="kpi1Title()">
        <div class="po-font-subtitle po-text-center">{{ kpi1Value() }}</div>
        <div class="po-text-center">{{ kpi1Desc() }}</div>
      </po-widget>

      <po-widget class="po-md-12 po-lg-4 po-mt-2" [p-title]="kpi2Title()">
        <div class="po-font-subtitle po-text-center">{{ kpi2Value() }}</div>
        <div class="po-text-center">{{ kpi2Desc() }}</div>
      </po-widget>

      <po-widget class="po-md-12 po-lg-4 po-mt-2" [p-title]="kpi3Title()">
        <div class="po-font-subtitle po-text-center">{{ kpi3Value() }}</div>
        <div class="po-text-center">{{ kpi3Desc() }}</div>
      </po-widget>
    </div>

    <!-- Charts -->
    <div class="po-row">
      <po-chart
        class="po-md-12 po-lg-8 po-mt-2"
        p-title="Evolução"
        [p-type]="lineChartType"
        [p-options]="chartOptions()"
        [p-categories]="chartCategories()"
        [p-series]="chartSeries()">
      </po-chart>
    </div>
  }

</po-page-default>
```

## {{kebab-name}}.component.scss

```scss
// Dashboard-specific styles
```

## Dashboard service pattern

```typescript
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PoChartSerie, PoChartOptions } from '@po-ui/ng-components';

export interface DashboardData {
  title: string;
  categories: string[];
  series: PoChartSerie[];
  options: PoChartOptions;
  kpis: {
    label: string;
    value: string;
    description?: string;
  }[];
}

@Injectable({ providedIn: 'root' })
export class DashService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/rest/api/treinamento/v1/consultaModulos';

  getStats(): Observable<DashboardData> {
    return this.http.get<DashboardData>(this.baseUrl);
  }
}
```
