import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter, ActivatedRoute, Router } from '@angular/router';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { PoNotificationService } from '@po-ui/ng-components';
import { PedidoCompraEditComponent } from './pedido-compra-edit.component';

const mockRecord = {
  numero: '000001',
  emissao: '2026-01-10',
  fornecedor: 'FOR001',
  loja: '01',
  condPagto: '028',
  observacao: 'Pedido teste',
  totalPedido: 850.00,
  itens: [
    { produto: 'ACO001', descricao: 'Aço carbono barra', unidade: 'KG', quantidade: 100, valorUnit: 8.50, valorTotal: 850.00 }
  ]
};

describe('PedidoCompraEditComponent', () => {

  // ── MODO INCLUSÃO (sem route param) ────────────────────────────────────────
  describe('modo inclusão', () => {
    let component: PedidoCompraEditComponent;
    let fixture: ComponentFixture<PedidoCompraEditComponent>;
    let httpMock: HttpTestingController;

    beforeEach(waitForAsync(() => {
      TestBed.configureTestingModule({
        imports: [PedidoCompraEditComponent],
        providers: [
          provideHttpClient(),
          provideHttpClientTesting(),
          provideRouter([]),
          { provide: ActivatedRoute, useValue: { snapshot: { params: {} } } },
        ],
        schemas: [NO_ERRORS_SCHEMA],
      }).compileComponents();
    }));

    beforeEach(() => {
      fixture = TestBed.createComponent(PedidoCompraEditComponent);
      component = fixture.componentInstance;
      httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpMock.verify());

    it('should create in create mode', waitForAsync(() => {
      fixture.detectChanges();
      return fixture.whenStable().then(() => {
        fixture.detectChanges();
        expect(component).toBeTruthy();
        expect(component.isEdit()).toBeFalse();
        expect(component.itensArray.length).toBe(1);
      });
    }));

    it('should have invalid form initially (campos obrigatórios vazios)', waitForAsync(() => {
      fixture.detectChanges();
      return fixture.whenStable().then(() => {
        expect(component.form.invalid).toBeTrue();
      });
    }));

    it('should add item to itensArray on adicionarItem()', waitForAsync(() => {
      fixture.detectChanges();
      return fixture.whenStable().then(() => {
        component.adicionarItem();
        expect(component.itensArray.length).toBe(2);
      });
    }));

    it('should remove item from itensArray on removerItem()', waitForAsync(() => {
      fixture.detectChanges();
      return fixture.whenStable().then(() => {
        component.adicionarItem();
        component.removerItem(0);
        expect(component.itensArray.length).toBe(1);
      });
    }));

    it('should recalculate line total on recalcularLinha()', waitForAsync(() => {
      fixture.detectChanges();
      return fixture.whenStable().then(() => {
        const linha = component.itensArray.at(0);
        linha.get('quantidade')?.setValue(10);
        linha.get('valorUnit')?.setValue(5);
        component.recalcularLinha(0);
        expect(linha.get('valorTotal')?.value).toBe(50);
      });
    }));

    it('should show warning and not call POST when form is invalid', waitForAsync(() => {
      const notifSpy = spyOn(TestBed.inject(PoNotificationService), 'warning');
      fixture.detectChanges();
      return fixture.whenStable().then(() => {
        component.save();
        httpMock.expectNone(r => r.url.includes('/rest/api/custom/v1/pedidocompra'));
        expect(notifSpy).toHaveBeenCalled();
      });
    }));

    it('should call POST and clear loading on save with valid form', waitForAsync(() => {
      fixture.detectChanges();
      return fixture.whenStable().then(() => {
        spyOn(TestBed.inject(Router), 'navigate');
        spyOn(TestBed.inject(PoNotificationService), 'success');

        component.form.patchValue({ emissao: '2026-06-23', fornecedor: 'FOR001', loja: '01' });
        const linha = component.itensArray.at(0);
        linha.get('produto')?.setValue('ACO001');
        linha.get('quantidade')?.setValue(10);
        linha.get('valorUnit')?.setValue(8.50);

        component.save();
        fixture.detectChanges();

        const req = httpMock.expectOne(r =>
          r.url.includes('/rest/api/custom/v1/pedidocompra') && r.method === 'POST'
        );
        expect(req.request.method).toBe('POST');
        req.flush(mockRecord);
        return fixture.whenStable();
      }).then(() => {
        fixture.detectChanges();
        expect(component.loading()).toBeFalse();
      });
    }));
  });

  // ── MODO EDIÇÃO (com route param) ──────────────────────────────────────────
  describe('modo edição', () => {
    let component: PedidoCompraEditComponent;
    let fixture: ComponentFixture<PedidoCompraEditComponent>;
    let httpMock: HttpTestingController;

    beforeEach(waitForAsync(() => {
      TestBed.configureTestingModule({
        imports: [PedidoCompraEditComponent],
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
      fixture = TestBed.createComponent(PedidoCompraEditComponent);
      component = fixture.componentInstance;
      httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpMock.verify());

    it('should set isEdit and load record on init', waitForAsync(() => {
      fixture.detectChanges();
      const req = httpMock.expectOne(r =>
        r.url.includes('/rest/api/custom/v1/pedidocompra') && r.method === 'GET'
      );
      req.flush(mockRecord);
      return fixture.whenStable().then(() => {
        fixture.detectChanges();
        expect(component.isEdit()).toBeTrue();
        expect(component.loading()).toBeFalse();
        expect(component.form.getRawValue().fornecedor).toBe('FOR001');
      });
    }));

    it('should populate itensArray after load', waitForAsync(() => {
      fixture.detectChanges();
      httpMock.expectOne(r => r.url.includes('/rest/api/custom/v1/pedidocompra')).flush(mockRecord);
      return fixture.whenStable().then(() => {
        fixture.detectChanges();
        expect(component.itensArray.length).toBe(1);
        expect(component.itensArray.at(0).get('produto')?.value).toBe('ACO001');
      });
    }));

    it('should call PUT on save in edit mode', waitForAsync(() => {
      fixture.detectChanges();
      httpMock.expectOne(r =>
        r.url.includes('/rest/api/custom/v1/pedidocompra') && r.method === 'GET'
      ).flush(mockRecord);
      return fixture.whenStable().then(() => {
        fixture.detectChanges();
        spyOn(TestBed.inject(Router), 'navigate');
        spyOn(TestBed.inject(PoNotificationService), 'success');

        component.save();
        fixture.detectChanges();

        const req = httpMock.expectOne(r =>
          r.url.includes('/rest/api/custom/v1/pedidocompra') && r.method === 'PUT'
        );
        expect(req.request.method).toBe('PUT');
        req.flush(mockRecord);
        return fixture.whenStable();
      }).then(() => {
        fixture.detectChanges();
        expect(component.loading()).toBeFalse();
      });
    }));

    it('should show error notification on save failure', waitForAsync(() => {
      const notifSpy = spyOn(TestBed.inject(PoNotificationService), 'error');
      fixture.detectChanges();
      httpMock.expectOne(r =>
        r.url.includes('/rest/api/custom/v1/pedidocompra') && r.method === 'GET'
      ).flush(mockRecord);
      return fixture.whenStable().then(() => {
        fixture.detectChanges();
        component.save();
        fixture.detectChanges();

        httpMock.expectOne(r =>
          r.url.includes('/rest/api/custom/v1/pedidocompra') && r.method === 'PUT'
        ).flush('Error', { status: 500, statusText: 'Server Error' });
        return fixture.whenStable();
      }).then(() => {
        fixture.detectChanges();
        expect(notifSpy).toHaveBeenCalled();
        expect(component.loading()).toBeFalse();
      });
    }));

    it('should fall back to demo data and show warning on load error', waitForAsync(() => {
      const notifSpy = spyOn(TestBed.inject(PoNotificationService), 'warning');
      fixture.detectChanges();
      httpMock.expectOne(r =>
        r.url.includes('/rest/api/custom/v1/pedidocompra') && r.method === 'GET'
      ).flush('Not found', { status: 404, statusText: 'Not Found' });
      return fixture.whenStable().then(() => {
        fixture.detectChanges();
        expect(notifSpy).toHaveBeenCalledWith('Dados demo — serviço indisponível.');
        expect(component.loading()).toBeFalse();
      });
    }));
  });
});
