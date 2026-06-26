/**
 * @generated  poui-specialist v1.0
 * @author     Andre Costa <andre.andrelscosta@gmail.com>
 */
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { PoNotificationService } from '@po-ui/ng-components';
import { ProcessamentoFolhaComponent } from './processamento-folha.component';
import { FolhaProcessamento } from './processamento-folha.model';

describe('ProcessamentoFolhaComponent', () => {
  let component: ProcessamentoFolhaComponent;
  let fixture: ComponentFixture<ProcessamentoFolhaComponent>;
  let httpMock: HttpTestingController;

  const apiPath = '/rest/api/custom/v1/rh/folha';

  const mockItem: FolhaProcessamento = {
    id:                '001-202601-M',
    competencia:       '202601',
    filial:            '001',
    tipo:              'M',
    situacao:          'P',
    totalFuncionarios: 142,
    totalBruto:        684700,
    totalLiquido:      523100,
  };

  const mockItem2: FolhaProcessamento = {
    id:                '001-202601-F',
    competencia:       '202601',
    filial:            '001',
    tipo:              'F',
    situacao:          'C',
    totalFuncionarios: 12,
    totalBruto:        85200,
    totalLiquido:      70500,
  };

  const mockResponse = { items: [mockItem, mockItem2], hasNext: false };

  // Silencia open/close das modais PO-UI — chamado após primeiro detectChanges
  function stubModals(): void {
    const confirmModal = (component as any).confirmModal;
    const resultsModal = (component as any).resultsModal;
    if (confirmModal) {
      spyOn(confirmModal, 'open').and.stub();
      spyOn(confirmModal, 'close').and.stub();
    }
    if (resultsModal) {
      spyOn(resultsModal, 'open').and.stub();
      spyOn(resultsModal, 'close').and.stub();
    }
  }

  // Inicializa e faz flush do GET de lista
  function flushInit(res = mockResponse): Promise<void> {
    fixture.detectChanges();
    httpMock.expectOne(r => r.url.includes(apiPath) && r.method === 'GET').flush(res);
    return fixture.whenStable().then(() => { fixture.detectChanges(); });
  }

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [ProcessamentoFolhaComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture   = TestBed.createComponent(ProcessamentoFolhaComponent);
    component = fixture.componentInstance;
    httpMock  = TestBed.inject(HttpTestingController);
  });

  afterEach(() => { httpMock.verify(); });

  // ── smoke ──────────────────────────────────────────────────────────────────
  it('should create', waitForAsync(() =>
    flushInit().then(() => expect(component).toBeTruthy())
  ));

  // ── load inicial ───────────────────────────────────────────────────────────
  it('should load items on init and set loading to false', waitForAsync(() => {
    fixture.detectChanges();
    const req = httpMock.expectOne(r => r.url.includes(apiPath) && r.method === 'GET');
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
    return fixture.whenStable().then(() => {
      fixture.detectChanges();
      expect(component.items()).toContain(mockItem);
      expect(component.items().length).toBe(2);
      expect(component.loading()).toBeFalse();
    });
  }));

  // ── hasNext ────────────────────────────────────────────────────────────────
  it('should set hasNext from response', waitForAsync(() => {
    fixture.detectChanges();
    httpMock.expectOne(r => r.url.includes(apiPath)).flush({ items: [mockItem], hasNext: true });
    return fixture.whenStable().then(() => {
      fixture.detectChanges();
      expect(component.hasNext()).toBeTrue();
    });
  }));

  // ── seleção / desseleção de linha ──────────────────────────────────────────
  it('should update selectedRows on row select/unselect', waitForAsync(() =>
    flushInit().then(() => {
      component.onAllUnselected(); // garante estado limpo
      component.onRowSelected(mockItem);
      expect(component.selectedRows()).toContain(mockItem);

      component.onRowUnselected(mockItem);
      expect(component.selectedRows()).not.toContain(mockItem);
    })
  ));

  // ── selecionar/desselecionar todos ────────────────────────────────────────
  it('should select and deselect all rows', waitForAsync(() =>
    flushInit().then(() => {
      component.onAllSelected();
      expect(component.selectedRows().length).toBe(2);

      component.onAllUnselected();
      expect(component.selectedRows().length).toBe(0);
    })
  ));

  // ── pageActions desabilitadas sem seleção ──────────────────────────────────
  it('should have multi page actions disabled when no rows selected', waitForAsync(() =>
    flushInit().then(() => {
      component.onAllUnselected();
      const multiActions = component.pageActions();
      expect(multiActions.every(a => a.disabled)).toBeTrue();
    })
  ));

  // ── pageActions habilitadas com seleção ────────────────────────────────────
  it('should enable multi page actions when rows are selected', waitForAsync(() =>
    flushInit().then(() => {
      component.onRowSelected(mockItem);
      const multiActions = component.pageActions();
      expect(multiActions.every(a => !a.disabled)).toBeTrue();
    })
  ));

  // ── abrir modal de confirmação (single) ────────────────────────────────────
  it('should set currentAction on openAction for processar', waitForAsync(() =>
    flushInit().then(() => {
      stubModals();
      const processarAction = component.actions.find(a => a.id === 'processar')!;
      component.openAction(processarAction, [mockItem]);
      fixture.detectChanges();

      expect(component.currentAction()).not.toBeNull();
      expect(component.currentAction()?.config.id).toBe('processar');
      expect(component.currentAction()?.resolvedMessage).toContain('202601');
      expect(component.currentAction()?.resolvedMessage).toContain('001');
    })
  ));

  // ── interpolação da mensagem multi ────────────────────────────────────────
  it('should interpolate _count in multi action message', waitForAsync(() =>
    flushInit().then(() => {
      stubModals();
      const cancelarAction = component.actions.find(a => a.id === 'cancelar')!;
      component.openAction(cancelarAction, [mockItem, mockItem2]);

      expect(component.currentAction()?.resolvedMessage).toContain('2');
    })
  ));

  // ── executar ação → POST → sucesso total ──────────────────────────────────
  it('should call notification.success and clear currentAction on full success', waitForAsync(() => {
    let notifSpy: jasmine.Spy;
    return flushInit().then(() => {
      stubModals();
      notifSpy = spyOn(TestBed.inject(PoNotificationService), 'success');
      const processarAction = component.actions.find(a => a.id === 'processar')!;
      component.openAction(processarAction, [mockItem]);
      component.executeAction();
      fixture.detectChanges();

      httpMock.expectOne(r => r.method === 'POST').flush({ sucesso: 1, falha: 0, itens: [] });
      return fixture.whenStable();
    }).then(() => {
      // reload da lista após ação
      httpMock.match(r => r.url.includes(apiPath)).forEach(r => r.flush(mockResponse));
      return fixture.whenStable();
    }).then(() => {
      fixture.detectChanges();
      expect(notifSpy).toHaveBeenCalled();
      expect(component.currentAction()).toBeNull();
    });
  }));

  // ── executar ação → POST → falha parcial → actionResults ──────────────────
  it('should set actionResults and keep currentAction null on partial failure', waitForAsync(() =>
    flushInit().then(() => {
      stubModals();
      const processarAction = component.actions.find(a => a.id === 'processar')!;
      component.openAction(processarAction, [mockItem]);
      component.executeAction();
      fixture.detectChanges();

      httpMock.expectOne(r => r.method === 'POST').flush({
        sucesso: 0,
        falha:   1,
        itens:   [{ id: mockItem.id, status: 'erro', mensagem: 'Bloqueio de período' }],
      });
      return fixture.whenStable();
    }).then(() => {
      httpMock.match(r => r.url.includes(apiPath)).forEach(r => r.flush(mockResponse));
      return fixture.whenStable();
    }).then(() => {
      fixture.detectChanges();
      expect(component.actionResults()).not.toBeNull();
      expect(component.actionResults()?.falha).toBe(1);
      expect(component.currentAction()).toBeNull();
    })
  ));

  // ── executar ação → erro HTTP → notification.error ────────────────────────
  it('should call notification.error and clear currentAction on HTTP failure', waitForAsync(() => {
    let notifSpy: jasmine.Spy;
    return flushInit().then(() => {
      stubModals();
      notifSpy = spyOn(TestBed.inject(PoNotificationService), 'error');
      const processarAction = component.actions.find(a => a.id === 'processar')!;
      component.openAction(processarAction, [mockItem]);
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

  // ── onShowMore carrega mais registros ─────────────────────────────────────
  it('should append items on onShowMore', waitForAsync(() =>
    flushInit({ items: [mockItem], hasNext: true }).then(() => {
      component.onShowMore();
      fixture.detectChanges();
      httpMock.expectOne(r => r.url.includes(apiPath) && r.method === 'GET').flush({
        items: [mockItem2], hasNext: false,
      });
      return fixture.whenStable().then(() => {
        fixture.detectChanges();
        expect(component.items().length).toBe(2);
        expect(component.hasNext()).toBeFalse();
      });
    })
  ));
});
