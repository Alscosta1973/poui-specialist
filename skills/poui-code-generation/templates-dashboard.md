# Template: dashboard

Gera uma página de dashboard analítico standalone com `po-widget` (cartões KPI), `po-chart` (linha/barra) e `po-loading-overlay`.

## {{kebab-name}}.component.ts

```typescript
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
  PoChartModule,
  PoChartOptions,
  PoChartSerie,
  PoChartType,
  PoLoadingModule,
  PoPageModule,
  PoToolbarModule,
  PoWidgetModule,
} from '@po-ui/ng-components';

@Component({
  selector: '{{selector}}',
  standalone: true,
  imports: [
    PoPageModule,
    PoToolbarModule,
    PoWidgetModule,
    PoChartModule,
    PoLoadingModule,
  ],
  templateUrl: './{{kebab-name}}.component.html',
  styleUrl: './{{kebab-name}}.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class {{ComponentClass}} implements OnInit, AfterViewInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr        = inject(ChangeDetectorRef);

  readonly loading = signal(true);

  // TODO: substitua os signals de KPI com dados do service
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
    // TODO: injete um service e carregue os dados do dashboard
    // Exemplo:
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

  ngAfterViewInit(): void {
    setTimeout(() => this.cdr.detectChanges());
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
    <!-- Cartões KPI -->
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

    <!-- Gráficos -->
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
// Estilos específicos do dashboard
```

## Padrão de service para o dashboard

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

---

## Variações Avançadas

### Padrão 1 — Trend Card (KPI com indicador ↑/↓)

Mostra variação percentual em relação ao período anterior com cor semântica.

**TypeScript (adicionar ao componente):**

```typescript
import { computed, signal } from '@angular/core';

// Dados do período atual e anterior vêm do service
readonly kpi1Current  = signal(0);
readonly kpi1Previous = signal(0);

readonly kpi1Trend = computed(() => {
  const curr = this.kpi1Current();
  const prev = this.kpi1Previous();
  if (prev === 0) return { pct: '—', up: null };
  const delta = ((curr - prev) / prev) * 100;
  return {
    pct: `${Math.abs(delta).toFixed(1)}%`,
    up: delta >= 0,
  };
});
```

**HTML do card (substituir bloco `<po-widget>` simples):**

```html
<po-widget class="po-md-12 po-lg-4 po-mt-2" [p-title]="kpi1Title()">
  <div class="po-font-subtitle po-text-center">{{ kpi1Current() | number:'1.0-0' }}</div>

  <!-- Trend indicator -->
  @if (kpi1Trend().up !== null) {
    <div class="po-text-center po-mt-1">
      <span [class]="kpi1Trend().up ? 'po-color-11' : 'po-color-07'">
        <span [class]="kpi1Trend().up ? 'po-icon-arrow-up' : 'po-icon-arrow-down'"></span>
        {{ kpi1Trend().pct }} vs período anterior
      </span>
    </div>
  }
</po-widget>
```

> **Cores PO-UI para trend:** `po-color-11` = verde (melhora), `po-color-07` = vermelho (piora). Inverter para métricas onde queda é positiva (ex: taxa de rejeição, tempo de espera).

---

### Padrão 2 — Filtro de Período

Seletor de período que recarrega todos os dados do dashboard.

**TypeScript:**

```typescript
import { PoSelectOption } from '@po-ui/ng-components';

readonly periods: PoSelectOption[] = [
  { label: 'Hoje',          value: 'day'     },
  { label: 'Esta semana',   value: 'week'    },
  { label: 'Este mês',      value: 'month'   },
  { label: 'Este trimestre',value: 'quarter' },
  { label: 'Este ano',      value: 'year'    },
];

readonly selectedPeriod = signal<string>('month');

onPeriodChange(period: string): void {
  this.selectedPeriod.set(period);
  this.loadDashboard(period);
}

private loadDashboard(period: string): void {
  this.loading.set(true);
  this.service.getStats({ period })
    .pipe(finalize(() => this.loading.set(false)), takeUntilDestroyed(this.destroyRef))
    .subscribe(res => {
      // popular signals com res
      this.cdr.markForCheck();
    });
}
```

**HTML (adicionar antes dos KPI cards):**

```html
<div class="po-row po-mb-2">
  <po-select
    class="po-md-12 po-lg-3"
    p-label="Período"
    [p-options]="periods"
    [ngModel]="selectedPeriod()"
    (ngModelChange)="onPeriodChange($event)">
  </po-select>
</div>
```

**Imports adicionais no componente:**

```typescript
imports: [..., PoFieldModule, FormsModule]
```

---

### Padrão 3 — Multi-Series Chart (comparação entre períodos)

Gráfico de barras agrupadas mostrando período atual vs anterior.

**TypeScript:**

```typescript
readonly barChartType = PoChartType.Bar;

// Populado pelo service com dados dos 2 períodos
readonly comparisonSeries = signal<PoChartSerie[]>([]);
readonly comparisonCategories = signal<string[]>([]);

readonly comparisonOptions = signal<PoChartOptions>({
  axis: {
    x: { gridLines: 5 },
    y: { gridLines: 5 },
  },
});

// No subscribe do service:
// this.comparisonCategories.set(['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun']);
// this.comparisonSeries.set([
//   { label: 'Período atual',   data: [120, 145, 98, 167, 134, 189], color: '#0079c2' },
//   { label: 'Período anterior',data: [100, 130, 110, 140, 120, 160], color: '#b3d9f7' },
// ]);
```

**HTML:**

```html
<div class="po-row">
  <po-chart
    class="po-md-12 po-mt-2"
    p-title="Comparativo de períodos"
    [p-type]="barChartType"
    [p-options]="comparisonOptions()"
    [p-categories]="comparisonCategories()"
    [p-series]="comparisonSeries()"
    (p-series-click)="onChartClick($event)">
  </po-chart>
</div>
```

> **Quirk #20 (PoChartSerie.data):** `PoChartSerie.data` aceita `number | number[]`. Em specs, usar cast explícito ao acessar `.length`: `(series()[0].data as number[]).length`.

---

### Padrão 4 — Drill-Down (KPI abre lista de detalhe)

Clique em KPI ou barra do gráfico abre `po-table` com registros que compõem o número.

**TypeScript:**

```typescript
import { PoTableColumn } from '@po-ui/ng-components';

export interface DrillDownItem {
  codigo: string;
  descricao: string;
  valor: number;
  data: string;
}

readonly drillDownItems   = signal<DrillDownItem[]>([]);
readonly drillDownTitle   = signal('');
readonly showDrillDown    = signal(false);
readonly drillDownLoading = signal(false);

readonly drillDownCols: PoTableColumn[] = [
  { property: 'codigo',    label: 'Código',    width: '10%' },
  { property: 'descricao', label: 'Descrição' },
  { property: 'valor',     label: 'Valor',     type: 'currency', format: 'BRL' },
  { property: 'data',      label: 'Data',      type: 'date',     format: 'dd/MM/yyyy' },
];

onKpiClick(kpiId: string, title: string): void {
  this.drillDownTitle.set(title);
  this.showDrillDown.set(true);
  this.drillDownLoading.set(true);
  this.service.getDrillDown(kpiId, this.selectedPeriod())
    .pipe(finalize(() => this.drillDownLoading.set(false)), takeUntilDestroyed(this.destroyRef))
    .subscribe(items => this.drillDownItems.set(items));
}

onChartClick(event: { label: string; data: number; category: string }): void {
  this.onKpiClick(event.category, event.label);
}

closeDrillDown(): void {
  this.showDrillDown.set(false);
  this.drillDownItems.set([]);
}
```

**HTML (adicionar após os gráficos):**

```html
@if (showDrillDown()) {
  <div class="po-row po-mt-2">
    <po-widget class="po-md-12" [p-title]="drillDownTitle()">

      <div class="po-text-right po-mb-1">
        <po-button p-label="Fechar" p-icon="po-icon-close" (p-click)="closeDrillDown()">
        </po-button>
      </div>

      <po-table
        [p-columns]="drillDownCols"
        [p-items]="drillDownItems()"
        [p-loading]="drillDownLoading()"
        [p-striped]="true">
      </po-table>

    </po-widget>
  </div>
}
```

**Imports adicionais no componente:**

```typescript
imports: [..., PoTableModule, PoButtonModule]
```

**Service — adicionar método getDrillDown:**

```typescript
getDrillDown(kpiId: string, period: string): Observable<DrillDownItem[]> {
  return this.http.get<DrillDownItem[]>(`${this.baseUrl}/detalhe`, {
    params: new HttpParams({ fromObject: { kpiId, period } }),
  });
}
```
