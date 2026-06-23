/**
 * @generated  poui-specialist v1.3 — template: test-complex / action-list
 * @author     Andre Costa <andre.andrelscosta@gmail.com>
 * @license    Uso permitido · redistribuição proibida sem autorização escrita
 */

import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { PoModalComponent, PoNotificationService } from '@po-ui/ng-components';
import { TitulosListComponent } from './titulos-list.component';
import { Titulo } from './titulo.model';

describe('TitulosListComponent', () => {
  let component: TitulosListComponent;
  let fixture: ComponentFixture<TitulosListComponent>;
  let httpMock: HttpTestingController;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [TitulosListComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TitulosListComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  // ── dados mock ──────────────────────────────────────────────────────────
  const mockItem: Titulo = {
    numero: 'TIT-001',
    parceiro: 'CLIENTE TESTE LTDA',
    valor: 1500.00,
    venc: '2024-12-31',
    situacao: 'A',
  };

  const mockResponse = { items: [mockItem], hasNext: false };
  const apiPath = '/rest/api/custom/v1/financeiro/titulos';

  // ── smoke ────────────────────────────────────────────────────────────────
  it('should create', waitForAsync(() => {
    fixture.detectChanges();
    httpMock.match(r => r.url.includes(apiPath)).forEach(r => r.flush(mockResponse));
    return fixture.whenStable().then(() => {
      fixture.detectChanges();
      expect(component).toBeTruthy();
    });
  }));

  // ── load inicial ─────────────────────────────────────────────────────────
  it('should load items on init', waitForAsync(() => {
    fixture.detectChanges();
    const req = httpMock.expectOne(r => r.url.includes(apiPath));
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
    return fixture.whenStable().then(() => {
      fixture.detectChanges();
      expect(component.items()).toContain(mockItem);
      expect(component.loading()).toBeFalse();
    });
  }));

  // ── loading signal ───────────────────────────────────────────────────────
  it('should set loading true during request and false after', waitForAsync(() => {
    fixture.detectChanges();
    expect(component.loading()).toBeTrue();
    httpMock.expectOne(r => r.url.includes(apiPath)).flush(mockResponse);
    fixture.whenStable().then(() => {
      fixture.detectChanges();
      expect(component.loading()).toBeFalse();
    });
  }));

  // ── empty state ──────────────────────────────────────────────────────────
  it('should handle empty response', waitForAsync(() => {
    fixture.detectChanges();
    httpMock.expectOne(r => r.url.includes(apiPath)).flush({ items: [], hasNext: false });
    fixture.whenStable().then(() => {
      fixture.detectChanges();
      expect(component.items()).toEqual([]);
      expect(component.hasNext()).toBeFalse();
    });
  }));

  // ── error state ──────────────────────────────────────────────────────────
  it('should call notification.error on HTTP failure and set loading false', waitForAsync(() => {
    const notifSpy = spyOn(TestBed.inject(PoNotificationService), 'error');
    fixture.detectChanges();
    httpMock.expectOne(r => r.url.includes(apiPath)).flush(
      'Server error', { status: 500, statusText: 'Internal Server Error' }
    );
    fixture.whenStable().then(() => {
      fixture.detectChanges();
      expect(notifSpy).toHaveBeenCalled();
      expect(component.loading()).toBeFalse();
    });
  }));

  // ── seleção / desseleção de linha ─────────────────────────────────────────
  it('should update selectedRows on row select/unselect', waitForAsync(() => {
    fixture.detectChanges();
    httpMock.expectOne(r => r.url.includes(apiPath)).flush(mockResponse);
    return fixture.whenStable().then(() => {
      fixture.detectChanges();

      component.onRowSelected(mockItem);
      expect(component.selectedRows()).toContain(mockItem);

      component.onRowUnselected(mockItem);
      expect(component.selectedRows()).not.toContain(mockItem);
    });
  }));

  // ── helper: silenciar open/close das modais PO-UI em testes unitários ─────
  // PoModalComponent.open() usa setTimeout+focus em nativeElement — em testes
  // sem DOM de produção isso gera "Cannot read properties of undefined (nativeElement)".
  // A solução é espiar os métodos de modal DEPOIS do primeiro detectChanges
  // (que inicializa o @ViewChild) e antes de chamar openAction/executeAction.
  function stubModals(): void {
    const confirmModal: PoModalComponent = (component as any).confirmModal;
    const resultsModal: PoModalComponent = (component as any).resultsModal;
    if (confirmModal) {
      spyOn(confirmModal, 'open').and.stub();
      spyOn(confirmModal, 'close').and.stub();
    }
    if (resultsModal) {
      spyOn(resultsModal, 'open').and.stub();
      spyOn(resultsModal, 'close').and.stub();
    }
  }

  // ── abrir modal de confirmação ────────────────────────────────────────────
  it('should set currentAction on openAction', waitForAsync(() => {
    fixture.detectChanges();
    httpMock.expectOne(r => r.url.includes(apiPath)).flush(mockResponse);
    return fixture.whenStable().then(() => {
      fixture.detectChanges();
      stubModals();

      const firstAction = component.actions[0]; // 'baixar' — single
      component.openAction(firstAction, [mockItem]);
      fixture.detectChanges();

      expect(component.currentAction()).not.toBeNull();
      expect(component.currentAction()?.config.id).toBe('baixar');
    });
  }));

  // ── executar ação → POST → sucesso total → currentAction limpo ───────────
  it('should clear currentAction on full success response', waitForAsync(() => {
    let notifSpy: jasmine.Spy;
    fixture.detectChanges();
    httpMock.expectOne(r => r.url.includes(apiPath)).flush(mockResponse);
    return fixture.whenStable().then(() => {
      fixture.detectChanges();
      stubModals();

      notifSpy = spyOn(TestBed.inject(PoNotificationService), 'success');
      const firstAction = component.actions[0]; // 'baixar'
      component.openAction(firstAction, [mockItem]);
      component.executeAction();
      fixture.detectChanges();

      // Flush POST da ação baixar
      httpMock.expectOne(r => r.method === 'POST').flush({ sucesso: 1, falha: 0, itens: [] });
      return fixture.whenStable();
    }).then(() => {
      // Flush reload da lista após a ação (load() é chamado em handleActionResponse)
      httpMock.match(r => r.url.includes(apiPath)).forEach(r => r.flush(mockResponse));
      return fixture.whenStable();
    }).then(() => {
      fixture.detectChanges();
      expect(notifSpy).toHaveBeenCalled();
      expect(component.currentAction()).toBeNull();
    });
  }));

  // ── executar ação → POST → falha parcial → actionResults preenchido ───────
  it('should set actionResults on partial failure response', waitForAsync(() => {
    fixture.detectChanges();
    httpMock.expectOne(r => r.url.includes(apiPath)).flush(mockResponse);
    return fixture.whenStable().then(() => {
      fixture.detectChanges();
      stubModals();

      const firstAction = component.actions[0]; // 'baixar', campoChave: 'numero'
      component.openAction(firstAction, [mockItem]);
      component.executeAction();
      fixture.detectChanges();

      httpMock.expectOne(r => r.method === 'POST').flush({
        sucesso: 0,
        falha: 1,
        itens: [{ id: mockItem.numero, status: 'erro', mensagem: 'Erro simulado' }],
      });
      return fixture.whenStable();
    }).then(() => {
      httpMock.match(r => r.url.includes(apiPath)).forEach(r => r.flush(mockResponse));
      return fixture.whenStable();
    }).then(() => {
      fixture.detectChanges();
      expect(component.actionResults()).not.toBeNull();
      expect(component.actionResults()?.falha).toBe(1);
    });
  }));

  // ── executar ação → erro HTTP → notification.error e currentAction limpo ──
  it('should call notification.error on action HTTP failure', waitForAsync(() => {
    let notifSpy: jasmine.Spy;
    fixture.detectChanges();
    httpMock.expectOne(r => r.url.includes(apiPath)).flush(mockResponse);
    return fixture.whenStable().then(() => {
      fixture.detectChanges();
      stubModals();

      notifSpy = spyOn(TestBed.inject(PoNotificationService), 'error');
      const firstAction = component.actions[0]; // 'baixar'
      component.openAction(firstAction, [mockItem]);
      component.executeAction();
      fixture.detectChanges();

      httpMock.expectOne(r => r.method === 'POST').flush(
        'Server error', { status: 500, statusText: 'Internal Server Error' }
      );
      return fixture.whenStable();
    }).then(() => {
      fixture.detectChanges();
      expect(notifSpy).toHaveBeenCalled();
      expect(component.currentAction()).toBeNull();
    });
  }));

});
