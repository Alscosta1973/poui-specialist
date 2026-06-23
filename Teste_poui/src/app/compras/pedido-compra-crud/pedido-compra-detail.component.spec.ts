import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter, ActivatedRoute, Router } from '@angular/router';
import { LOCALE_ID, NO_ERRORS_SCHEMA } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import { PoNotificationService } from '@po-ui/ng-components';
import { PedidoCompraDetailComponent } from './pedido-compra-detail.component';
import localePtBr from '@angular/common/locales/pt';

registerLocaleData(localePtBr, 'pt-BR');

const mockRecord = {
  numero: '000001',
  emissao: '2026-01-10',
  fornecedor: 'METALURGICA BRASILFOR LTDA',
  loja: '01',
  condPagto: '028',
  observacao: 'Pedido urgente — entrega em 5 dias úteis.',
  totalPedido: 4250.00,
  itens: [
    { produto: 'ACO001', descricao: 'Aço carbono barra', unidade: 'KG', quantidade: 500, valorUnit: 8.50, valorTotal: 4250.00 }
  ]
};

describe('PedidoCompraDetailComponent', () => {

  // ── SEM ROUTE PARAM — redireciona para lista ───────────────────────────────
  describe('sem route param', () => {
    let component: PedidoCompraDetailComponent;
    let fixture: ComponentFixture<PedidoCompraDetailComponent>;
    let httpMock: HttpTestingController;

    beforeEach(waitForAsync(() => {
      TestBed.configureTestingModule({
        imports: [PedidoCompraDetailComponent],
        providers: [
          provideHttpClient(),
          provideHttpClientTesting(),
          provideRouter([]),
          { provide: ActivatedRoute, useValue: { snapshot: { params: {} } } },
          { provide: LOCALE_ID, useValue: 'en-US' },
        ],
        schemas: [NO_ERRORS_SCHEMA],
      }).compileComponents();
    }));

    beforeEach(() => {
      fixture = TestBed.createComponent(PedidoCompraDetailComponent);
      component = fixture.componentInstance;
      httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpMock.verify());

    it('should redirect to list when no route param', waitForAsync(() => {
      const navigateSpy = spyOn(TestBed.inject(Router), 'navigate');
      fixture.detectChanges();
      return fixture.whenStable().then(() => {
        httpMock.expectNone(r => r.url.includes('/rest/api/custom/v1/pedidocompra'));
        expect(navigateSpy).toHaveBeenCalledWith(['/compras/pedido-compra-crud']);
      });
    }));
  });

  // ── COM ROUTE PARAM — fluxo normal ────────────────────────────────────────
  describe('com route param', () => {
    let component: PedidoCompraDetailComponent;
    let fixture: ComponentFixture<PedidoCompraDetailComponent>;
    let httpMock: HttpTestingController;

    beforeEach(waitForAsync(() => {
      TestBed.configureTestingModule({
        imports: [PedidoCompraDetailComponent],
        providers: [
          provideHttpClient(),
          provideHttpClientTesting(),
          provideRouter([]),
          { provide: ActivatedRoute, useValue: { snapshot: { params: { numero: '000001' } } } },
        ],
        schemas: [NO_ERRORS_SCHEMA],
      }).compileComponents();
    }));

    beforeEach(() => {
      fixture = TestBed.createComponent(PedidoCompraDetailComponent);
      component = fixture.componentInstance;
      httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpMock.verify());

    it('should create', waitForAsync(() => {
      fixture.detectChanges();
      httpMock.expectOne(r => r.url.includes('/rest/api/custom/v1/pedidocompra')).flush(mockRecord);
      return fixture.whenStable().then(() => {
        fixture.detectChanges();
        expect(component).toBeTruthy();
      });
    }));

    it('should load record on init and clear loading', waitForAsync(() => {
      fixture.detectChanges();
      const req = httpMock.expectOne(r =>
        r.url.includes('/rest/api/custom/v1/pedidocompra') && r.method === 'GET'
      );
      req.flush(mockRecord);
      return fixture.whenStable().then(() => {
        fixture.detectChanges();
        expect(component.loading()).toBeFalse();
        expect(component.record()).toEqual(mockRecord);
      });
    }));

    it('should compute pageTitle from loaded record', waitForAsync(() => {
      fixture.detectChanges();
      httpMock.expectOne(r => r.url.includes('/rest/api/custom/v1/pedidocompra')).flush(mockRecord);
      return fixture.whenStable().then(() => {
        fixture.detectChanges();
        expect(component.pageTitle()).toContain('000001');
        expect(component.pageTitle()).toContain('METALURGICA BRASILFOR LTDA');
      });
    }));

    it('should compute totalGeral from record itens', waitForAsync(() => {
      fixture.detectChanges();
      httpMock.expectOne(r => r.url.includes('/rest/api/custom/v1/pedidocompra')).flush(mockRecord);
      return fixture.whenStable().then(() => {
        fixture.detectChanges();
        expect(component.totalGeral()).toBe(4250.00);
      });
    }));

    it('should navigate to edit route on Editar action', waitForAsync(() => {
      fixture.detectChanges();
      httpMock.expectOne(r => r.url.includes('/rest/api/custom/v1/pedidocompra')).flush(mockRecord);
      return fixture.whenStable().then(() => {
        fixture.detectChanges();
        const navigateSpy = spyOn(TestBed.inject(Router), 'navigate');
        (component.pageActions[0].action as Function)();
        expect(navigateSpy).toHaveBeenCalledWith(['/compras/pedido-compra-crud', '000001', 'editar']);
      });
    }));

    it('should navigate back on Voltar action', waitForAsync(() => {
      fixture.detectChanges();
      httpMock.expectOne(r => r.url.includes('/rest/api/custom/v1/pedidocompra')).flush(mockRecord);
      return fixture.whenStable().then(() => {
        fixture.detectChanges();
        const navigateSpy = spyOn(TestBed.inject(Router), 'navigate');
        (component.pageActions[1].action as Function)();
        expect(navigateSpy).toHaveBeenCalledWith(['/compras/pedido-compra-crud']);
      });
    }));

    it('should fall back to demo data and show warning on load error', waitForAsync(() => {
      const warnSpy = spyOn(TestBed.inject(PoNotificationService), 'warning');
      fixture.detectChanges();
      httpMock.expectOne(r => r.url.includes('/rest/api/custom/v1/pedidocompra'))
        .flush('Error', { status: 503, statusText: 'Service Unavailable' });
      return fixture.whenStable().then(() => {
        fixture.detectChanges();
        expect(component.loading()).toBeFalse();
        expect(component.record()).not.toBeNull();
        expect(warnSpy).toHaveBeenCalledWith('Dados demo — serviço indisponível.');
      });
    }));
  });

  // ── PARAM INEXISTENTE — não encontrado nem no demo ─────────────────────────
  describe('com route param inexistente', () => {
    let component: PedidoCompraDetailComponent;
    let fixture: ComponentFixture<PedidoCompraDetailComponent>;
    let httpMock: HttpTestingController;

    beforeEach(waitForAsync(() => {
      TestBed.configureTestingModule({
        imports: [PedidoCompraDetailComponent],
        providers: [
          provideHttpClient(),
          provideHttpClientTesting(),
          provideRouter([]),
          { provide: ActivatedRoute, useValue: { snapshot: { params: { numero: '999999' } } } },
        ],
        schemas: [NO_ERRORS_SCHEMA],
      }).compileComponents();
    }));

    beforeEach(() => {
      fixture = TestBed.createComponent(PedidoCompraDetailComponent);
      component = fixture.componentInstance;
      httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpMock.verify());

    it('should show error notification and navigate back when record not found', waitForAsync(() => {
      const errSpy = spyOn(TestBed.inject(PoNotificationService), 'error');
      const navigateSpy = spyOn(TestBed.inject(Router), 'navigate');
      fixture.detectChanges();
      httpMock.expectOne(r => r.url.includes('/rest/api/custom/v1/pedidocompra'))
        .flush('Not found', { status: 404, statusText: 'Not Found' });
      return fixture.whenStable().then(() => {
        fixture.detectChanges();
        expect(errSpy).toHaveBeenCalledWith('Pedido não encontrado.');
        expect(navigateSpy).toHaveBeenCalledWith(['/compras/pedido-compra-crud']);
        expect(component.loading()).toBeFalse();
      });
    }));
  });
});
