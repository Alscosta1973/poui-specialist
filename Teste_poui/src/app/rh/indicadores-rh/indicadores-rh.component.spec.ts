/**
 * @generated  poui-specialist v1.0
 * @author     Andre Costa <andre.andrelscosta@gmail.com>
 */
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { PoNotificationService } from '@po-ui/ng-components';
import { IndicadoresRhComponent } from './indicadores-rh.component';
import { DashRhData } from './indicadores-rh.service';

describe('IndicadoresRhComponent', () => {
  let component: IndicadoresRhComponent;
  let fixture: ComponentFixture<IndicadoresRhComponent>;
  let httpMock: HttpTestingController;

  const API = '/rest/api/custom/v1/rh/indicadores';

  const mockData: DashRhData = {
    totalAtivos:      200,
    admissoesMes:     10,
    desligamentosMes: 4,
    mediaSalarial:    5200.00,
    distribuicaoPorDepto: [
      { depto: 'TI',       count: 40 },
      { depto: 'Vendas',   count: 60 },
      { depto: 'Financeiro', count: 25 },
    ],
    evolucaoHeadcount: [
      { mes: 'Jan', count: 190 },
      { mes: 'Fev', count: 195 },
      { mes: 'Mar', count: 198 },
      { mes: 'Abr', count: 200 },
    ],
  };

  // Inicializa o componente e faz flush do GET de indicadores
  function flushInit(data: DashRhData = mockData): Promise<void> {
    fixture.detectChanges();
    httpMock.expectOne(r => r.url.includes(API) && r.method === 'GET').flush(data);
    return fixture.whenStable().then(() => { fixture.detectChanges(); });
  }

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [IndicadoresRhComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture   = TestBed.createComponent(IndicadoresRhComponent);
    component = fixture.componentInstance;
    httpMock  = TestBed.inject(HttpTestingController);
  });

  afterEach(() => { httpMock.verify(); });

  // ── smoke ──────────────────────────────────────────────────────────────────
  it('should create', waitForAsync(() =>
    flushInit().then(() => expect(component).toBeTruthy())
  ));

  // ── loading: true durante requisição, false após ───────────────────────────
  it('should set loading to true on init and false after response', waitForAsync(() => {
    fixture.detectChanges(); // ngOnInit → loading.set(true) + GET pendente
    expect(component.loading()).toBeTrue();
    httpMock.expectOne(r => r.url.includes(API)).flush(mockData);
    return fixture.whenStable().then(() => {
      fixture.detectChanges();
      expect(component.loading()).toBeFalse();
    });
  }));

  // ── KPIs carregados corretamente ────────────────────────────────────────────
  it('should populate KPI signals from HTTP response', waitForAsync(() =>
    flushInit().then(() => {
      expect(component.totalAtivos()).toBe(200);
      expect(component.admissoesMes()).toBe(10);
      expect(component.desligamentosMes()).toBe(4);
      expect(component.mediaSalarial()).toBe(5200.00);
    })
  ));

  // ── computed fmtSal formata corretamente ────────────────────────────────────
  it('should format mediaSalarial via fmtSal computed', waitForAsync(() =>
    flushInit().then(() => {
      expect(component.fmtSal()).toBe('5.200,00');
    })
  ));

  // ── gráfico de barras: categorias e séries ──────────────────────────────────
  it('should populate bar chart categories and series from response', waitForAsync(() =>
    flushInit().then(() => {
      expect(component.barCategories()).toEqual(['TI', 'Vendas', 'Financeiro']);
      expect(component.barSeries()[0].data).toEqual([40, 60, 25]);
    })
  ));

  // ── gráfico de linha: categorias e séries ──────────────────────────────────
  it('should populate line chart categories and series from response', waitForAsync(() =>
    flushInit().then(() => {
      expect(component.lineCategories()).toEqual(['Jan', 'Fev', 'Mar', 'Abr']);
      expect(component.lineSeries()[0].data).toEqual([190, 195, 198, 200]);
    })
  ));

  // ── erro HTTP → notification.error + dados DEMO ────────────────────────────
  it('should call notification.error and apply demo data on HTTP error', waitForAsync(() => {
    const errorSpy = spyOn(TestBed.inject(PoNotificationService), 'error');
    fixture.detectChanges();
    httpMock.expectOne(r => r.url.includes(API)).flush(
      'Server error', { status: 500, statusText: 'Internal Server Error' }
    );
    return fixture.whenStable().then(() => {
      fixture.detectChanges();
      expect(errorSpy).toHaveBeenCalled();
      expect(component.loading()).toBeFalse();
      // fallback para dados DEMO
      expect(component.totalAtivos()).toBe(142);
      expect(component.admissoesMes()).toBe(8);
      expect(component.desligamentosMes()).toBe(3);
    });
  }));

  // ── demo data: gráficos preenchidos após erro ───────────────────────────────
  it('should populate charts with demo data on HTTP error', waitForAsync(() => {
    spyOn(TestBed.inject(PoNotificationService), 'error');
    fixture.detectChanges();
    httpMock.expectOne(r => r.url.includes(API)).flush(
      'error', { status: 500, statusText: 'Server Error' }
    );
    return fixture.whenStable().then(() => {
      fixture.detectChanges();
      expect(component.barCategories().length).toBeGreaterThan(0);
      expect(component.lineCategories().length).toBeGreaterThan(0);
      expect((component.barSeries()[0].data as number[]).length).toBeGreaterThan(0);
    });
  }));

  // ── GET enviado para o endpoint correto ────────────────────────────────────
  it('should send GET to correct API endpoint', waitForAsync(() => {
    fixture.detectChanges();
    const req = httpMock.expectOne(r => r.url === API);
    expect(req.request.method).toBe('GET');
    req.flush(mockData);
    return fixture.whenStable();
  }));
});
