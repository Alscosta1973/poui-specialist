import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { PoDialogService, PoNotificationService } from '@po-ui/ng-components';
import { PedidoCompraComponent } from './pedido-compra.component';
import { PedidoCompra, ItemPedidoCompra } from './models/pedido-compra.model';

const API = '/rest/api/custom/v1/pedidocompra';

describe('PedidoCompraComponent', () => {
  let component: PedidoCompraComponent;
  let fixture: ComponentFixture<PedidoCompraComponent>;
  let httpMock: HttpTestingController;

  const mockItem: ItemPedidoCompra = {
    item: '001', produto: 'PROD001', descricao: 'Parafuso M8x25',
    unidade: 'CX', quantidade: 10, valorUnit: 150.00, valorTotal: 1500.00,
  };

  const mockPedido: PedidoCompra = {
    numero: '000001', emissao: '2026-06-01',
    fornecedor: 'FORNECEDOR ABC LTDA', loja: '01',
    valorTotal: 3500.00, status: 'A', itens: [mockItem],
  };

  const mockResponse = { items: [mockPedido], hasNext: false };

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [PedidoCompraComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PedidoCompraComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  // ── smoke ────────────────────────────────────────────────────────────────
  it('should create', waitForAsync(() => {
    fixture.detectChanges();
    httpMock.match(r => r.url.includes(API)).forEach(r => r.flush(mockResponse));
    return fixture.whenStable().then(() => {
      fixture.detectChanges();
      expect(component).toBeTruthy();
    });
  }));

  // ── load inicial (GET page=1) ─────────────────────────────────────────────
  it('should load items on init', waitForAsync(() => {
    fixture.detectChanges();
    const req = httpMock.expectOne(r => r.url.includes(API));
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('page')).toBe('1');
    req.flush(mockResponse);
    return fixture.whenStable().then(() => {
      fixture.detectChanges();
      expect(component.items()).toEqual([mockPedido]);
      expect(component.loading()).toBeFalse();
    });
  }));

  // ── loading signal ───────────────────────────────────────────────────────
  it('should set loading true during request and false after', waitForAsync(() => {
    fixture.detectChanges();
    expect(component.loading()).toBeTrue();
    httpMock.expectOne(r => r.url.includes(API)).flush(mockResponse);
    return fixture.whenStable().then(() => {
      fixture.detectChanges();
      expect(component.loading()).toBeFalse();
    });
  }));

  // ── empty state ──────────────────────────────────────────────────────────
  it('should handle empty response', waitForAsync(() => {
    fixture.detectChanges();
    httpMock.expectOne(r => r.url.includes(API)).flush({ items: [], hasNext: false });
    return fixture.whenStable().then(() => {
      fixture.detectChanges();
      expect(component.items()).toEqual([]);
      expect(component.hasNext()).toBeFalse();
    });
  }));

  // ── error state: notification.error + fallback DEMO data ─────────────────
  it('should call notification.error and fall back to DEMO data on HTTP failure', waitForAsync(() => {
    const notifSpy = spyOn(TestBed.inject(PoNotificationService), 'error');
    fixture.detectChanges();
    httpMock.expectOne(r => r.url.includes(API)).flush(
      'Server error', { status: 500, statusText: 'Internal Server Error' }
    );
    return fixture.whenStable().then(() => {
      fixture.detectChanges();
      expect(notifSpy).toHaveBeenCalled();
      expect(component.loading()).toBeFalse();
      expect(component.items().length).toBe(3); // DEMO_PEDIDOS tem 3 registros
      expect(component.hasNext()).toBeFalse();
    });
  }));

  // ── filtro: onSearch envia parâmetro q ───────────────────────────────────
  it('should GET with q param on onSearch', waitForAsync(() => {
    fixture.detectChanges();
    httpMock.expectOne(r => r.url.includes(API)).flush(mockResponse);
    return fixture.whenStable().then(() => {
      component.onSearch('ABC');
      fixture.detectChanges();
      const req = httpMock.expectOne(r =>
        r.url.includes(API) && r.params.get('q') === 'ABC'
      );
      expect(req.request.method).toBe('GET');
      req.flush({ items: [], hasNext: false });
      return fixture.whenStable();
    }).then(() => {
      fixture.detectChanges();
      expect(component.items()).toEqual([]);
    });
  }));

  // ── onSearch reseta página para 1 ───────────────────────────────────────
  it('should reset page to 1 on onSearch', waitForAsync(() => {
    fixture.detectChanges();
    httpMock.expectOne(r => r.url.includes(API)).flush({ items: [mockPedido], hasNext: true });
    return fixture.whenStable().then(() => {
      component.onSearch('XYZ');
      fixture.detectChanges();
      const req = httpMock.expectOne(r => r.url.includes(API));
      expect(req.request.params.get('page')).toBe('1');
      req.flush({ items: [], hasNext: false });
      return fixture.whenStable();
    });
  }));

  // ── show more: onShowMore acumula itens ──────────────────────────────────
  it('should GET page=2 and accumulate items on onShowMore', waitForAsync(() => {
    fixture.detectChanges();
    httpMock.expectOne(r => r.url.includes(API)).flush({ items: [mockPedido], hasNext: true });
    return fixture.whenStable().then(() => {
      fixture.detectChanges();
      expect(component.hasNext()).toBeTrue();

      const pedido2: PedidoCompra = {
        numero: '000002', emissao: '2026-06-05',
        fornecedor: 'DISTRIBUIDORA XYZ S/A', loja: '02',
        valorTotal: 8200.00, status: 'E', itens: [],
      };
      component.onShowMore();
      fixture.detectChanges();
      const req = httpMock.expectOne(r =>
        r.url.includes(API) && r.params.get('page') === '2'
      );
      expect(req.request.method).toBe('GET');
      req.flush({ items: [pedido2], hasNext: false });
      return fixture.whenStable();
    }).then(() => {
      fixture.detectChanges();
      expect(component.hasNext()).toBeFalse();
      expect(component.items().length).toBe(2); // acumula: 1 + 1
    });
  }));

  // ── tableAction: Editar navega para o número do pedido ──────────────────
  it('should navigate to pedido numero on Editar action', waitForAsync(() => {
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigate');
    fixture.detectChanges();
    httpMock.expectOne(r => r.url.includes(API)).flush(mockResponse);
    return fixture.whenStable().then(() => {
      fixture.detectChanges();
      const editAction = component.tableActions.find(a => a.label === 'Editar')!;
      editAction.action!(mockPedido);
      expect(navigateSpy).toHaveBeenCalledWith(
        [mockPedido.numero], jasmine.objectContaining({ relativeTo: jasmine.anything() })
      );
    });
  }));

  // ── tableAction: Cancelar abre dialog de confirmação ────────────────────
  it('should open confirm dialog on Cancelar action for Aberto pedido', waitForAsync(() => {
    fixture.detectChanges();
    httpMock.expectOne(r => r.url.includes(API)).flush(mockResponse);
    return fixture.whenStable().then(() => {
      fixture.detectChanges();
      // Spy na instância injetada pelo próprio componente (não pelo TestBed)
      const dialogSpy = spyOn((component as any).dialog, 'confirm');
      const cancelAction = component.tableActions.find(a => a.label === 'Cancelar')!;
      cancelAction.action!(mockPedido);
      expect(dialogSpy).toHaveBeenCalledWith(jasmine.objectContaining({
        title: 'Cancelar Pedido de Compra',
      }));
    });
  }));

  // ── tableAction: Cancelar desabilitado para status != 'A' ───────────────
  it('should disable Cancelar for Encerrado and Cancelado, enable for Aberto', waitForAsync(() => {
    fixture.detectChanges();
    httpMock.expectOne(r => r.url.includes(API)).flush(mockResponse);
    return fixture.whenStable().then(() => {
      fixture.detectChanges();
      const cancelAction = component.tableActions.find(a => a.label === 'Cancelar')!;
      const disabledFn = cancelAction.disabled as (row: PedidoCompra) => boolean;
      expect(disabledFn({ ...mockPedido, status: 'E' })).toBeTrue();
      expect(disabledFn({ ...mockPedido, status: 'C' })).toBeTrue();
      expect(disabledFn({ ...mockPedido, status: 'A' })).toBeFalse();
    });
  }));

  // ── pageAction: Incluir navega para 'novo' ───────────────────────────────
  it('should navigate to novo on Incluir action', waitForAsync(() => {
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigate');
    fixture.detectChanges();
    httpMock.expectOne(r => r.url.includes(API)).flush(mockResponse);
    return fixture.whenStable().then(() => {
      fixture.detectChanges();
      const incluirAction = component.pageActions.find(a => a.label === 'Incluir')!;
      incluirAction.action!();
      expect(navigateSpy).toHaveBeenCalledWith(
        ['novo'], jasmine.objectContaining({ relativeTo: jasmine.anything() })
      );
    });
  }));

  // ── cancelRecord: PATCH /cancelar + atualiza status na lista ────────────
  it('should send PATCH to /cancelar and update item status to C', waitForAsync(() => {
    fixture.detectChanges();
    httpMock.expectOne(r => r.url.includes(API) && !r.url.includes('/cancelar')).flush(mockResponse);

    let confirmCallback: Function | undefined;

    return fixture.whenStable().then(() => {
      fixture.detectChanges();
      // Suprime notification para evitar timers de toast que bloqueiam whenStable
      spyOn((component as any).notification, 'success');
      // Spy na instância injetada pelo próprio componente
      spyOn((component as any).dialog, 'confirm').and.callFake((opts: any) => {
        confirmCallback = opts.confirm;
      });
      const cancelAction = component.tableActions.find(a => a.label === 'Cancelar')!;
      cancelAction.action!(mockPedido);
      confirmCallback!();
      fixture.detectChanges();

      const cancelReq = httpMock.expectOne(r => r.url.includes('/cancelar'));
      expect(cancelReq.request.method).toBe('PATCH');
      cancelReq.flush(null);
      return fixture.whenStable();
    }).then(() => {
      fixture.detectChanges();
      const updated = component.items().find(p => p.numero === '000001');
      expect(updated?.status).toBe('C');
    });
  }));

  // ── columns: coluna de detalhe para itens ────────────────────────────────
  it('should have detail column for itens with inline typeHeader', () => {
    const detailCol = component.columns.find(c => c.property === 'itens');
    expect(detailCol).toBeTruthy();
    expect(detailCol?.type).toBe('detail');
    expect(detailCol?.detail?.typeHeader).toBe('inline');
  });

  // ── columns: coluna label com valores A / E / C ──────────────────────────
  it('should have label column for status with A/E/C values', () => {
    const statusCol = component.columns.find(c => c.property === 'status');
    expect(statusCol?.type).toBe('label');
    const labelValues = statusCol?.labels?.map((l: any) => l.value);
    expect(labelValues).toContain('A');
    expect(labelValues).toContain('E');
    expect(labelValues).toContain('C');
  });
});
