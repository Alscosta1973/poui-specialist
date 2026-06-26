/**
 * @generated  poui-specialist v1.5.1
 * @author     Andre Costa <andre.andrelscosta@gmail.com>
 * @license    Uso permitido · redistribuição proibida sem autorização escrita
 */
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { PoNotificationService } from '@po-ui/ng-components';
import { TENANT_ID } from '../rh.tokens';
import { DepartamentosListComponent } from './departamentos-list.component';
import { Departamento } from './departamento.model';

describe('DepartamentosListComponent', () => {
  let component: DepartamentosListComponent;
  let fixture: ComponentFixture<DepartamentosListComponent>;
  let httpMock: HttpTestingController;

  const mockItem: Departamento = {
    codDepto:    '001',
    nomeDepto:   'RECURSOS HUMANOS',
    gestorDepto: 'ANA PAULA RODRIGUES SILVA',
    ativo:       true,
  };

  const mockResponse = { items: [mockItem], hasNext: false };

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [DepartamentosListComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: TENANT_ID, useValue: 'T1' },
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture   = TestBed.createComponent(DepartamentosListComponent);
    component = fixture.componentInstance;
    httpMock  = TestBed.inject(HttpTestingController);
  });

  afterEach(() => { httpMock.verify(); });

  // ── smoke ────────────────────────────────────────────────────────────────

  it('should create', waitForAsync(() => {
    fixture.detectChanges();
    httpMock.match(r => r.url.includes('/rh/v1/departamentos')).forEach(r => r.flush(mockResponse));
    return fixture.whenStable().then(() => {
      fixture.detectChanges();
      expect(component).toBeTruthy();
    });
  }));

  // ── colunas e ações definidas ─────────────────────────────────────────────

  it('should define 4 table columns', () => {
    expect(component.columns.length).toBe(4);
    expect(component.columns.map(c => c.property))
      .toEqual(['codDepto', 'nomeDepto', 'gestorDepto', 'ativo']);
  });

  it('should define page actions (Incluir) and table actions (Editar, Excluir)', () => {
    expect(component.pageActions.length).toBe(1);
    expect(component.pageActions[0].label).toBe('Incluir');
    expect(component.tableActions.length).toBe(2);
    expect(component.tableActions.map(a => a.label)).toEqual(['Editar', 'Excluir']);
  });

  // ── load inicial ─────────────────────────────────────────────────────────

  it('should load items on init', waitForAsync(() => {
    fixture.detectChanges();
    const req = httpMock.expectOne(r => r.url.includes('/rh/v1/departamentos'));
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('page')).toBe('1');
    req.flush(mockResponse);
    return fixture.whenStable().then(() => {
      fixture.detectChanges();
      expect(component.items()).toEqual([mockItem]);
      expect(component.loading()).toBeFalse();
    });
  }));

  // ── loading signal ────────────────────────────────────────────────────────

  it('should set loading true during request and false after', waitForAsync(() => {
    fixture.detectChanges();
    expect(component.loading()).toBeTrue();
    httpMock.expectOne(r => r.url.includes('/rh/v1/departamentos')).flush(mockResponse);
    return fixture.whenStable().then(() => {
      fixture.detectChanges();
      expect(component.loading()).toBeFalse();
    });
  }));

  // ── empty state ───────────────────────────────────────────────────────────

  it('should handle empty response', waitForAsync(() => {
    fixture.detectChanges();
    httpMock.expectOne(r => r.url.includes('/rh/v1/departamentos'))
      .flush({ items: [], hasNext: false });
    return fixture.whenStable().then(() => {
      fixture.detectChanges();
      expect(component.items()).toEqual([]);
      expect(component.hasNext()).toBeFalse();
    });
  }));

  // ── error state ───────────────────────────────────────────────────────────

  it('should call notification.error on HTTP failure and set loading false', waitForAsync(() => {
    const notifSpy = spyOn(TestBed.inject(PoNotificationService), 'error');
    fixture.detectChanges();
    httpMock.expectOne(r => r.url.includes('/rh/v1/departamentos')).flush(
      'Server error', { status: 500, statusText: 'Internal Server Error' },
    );
    return fixture.whenStable().then(() => {
      fixture.detectChanges();
      expect(notifSpy).toHaveBeenCalled();
      expect(component.loading()).toBeFalse();
    });
  }));

  // ── quick search ──────────────────────────────────────────────────────────

  it('should GET with q param on quick search', waitForAsync(() => {
    fixture.detectChanges();
    httpMock.expectOne(r => r.url.includes('/rh/v1/departamentos')).flush(mockResponse);
    return fixture.whenStable().then(() => {
      component.onQuickSearch('FINANCEIRO');
      fixture.detectChanges();
      const req = httpMock.expectOne(r =>
        r.url.includes('/rh/v1/departamentos') && r.params.get('q') === 'FINANCEIRO',
      );
      expect(req.request.method).toBe('GET');
      req.flush({ items: [], hasNext: false });
      return fixture.whenStable();
    }).then(() => {
      fixture.detectChanges();
      expect(component.items()).toEqual([]);
    });
  }));

  it('should clear q param on empty quick search', waitForAsync(() => {
    fixture.detectChanges();
    httpMock.expectOne(r => r.url.includes('/rh/v1/departamentos')).flush(mockResponse);
    return fixture.whenStable().then(() => {
      component.onQuickSearch('');
      fixture.detectChanges();
      const req = httpMock.expectOne(r => r.url.includes('/rh/v1/departamentos'));
      expect(req.request.params.has('q')).toBeFalse();
      req.flush(mockResponse);
      return fixture.whenStable();
    });
  }));

  // ── advanced search ───────────────────────────────────────────────────────

  it('should GET with nomeDepto param on advanced search', waitForAsync(() => {
    fixture.detectChanges();
    httpMock.expectOne(r => r.url.includes('/rh/v1/departamentos')).flush(mockResponse);
    return fixture.whenStable().then(() => {
      component.onAdvancedSearch({ nomeDepto: 'FINANCEIRO' });
      fixture.detectChanges();
      const req = httpMock.expectOne(r =>
        r.url.includes('/rh/v1/departamentos') && r.params.get('nomeDepto') === 'FINANCEIRO',
      );
      expect(req.request.method).toBe('GET');
      req.flush({ items: [], hasNext: false });
      return fixture.whenStable();
    }).then(() => {
      fixture.detectChanges();
      expect(component.items()).toEqual([]);
    });
  }));

  it('should ignore null/undefined params on advanced search', waitForAsync(() => {
    fixture.detectChanges();
    httpMock.expectOne(r => r.url.includes('/rh/v1/departamentos')).flush(mockResponse);
    return fixture.whenStable().then(() => {
      component.onAdvancedSearch({ nomeDepto: '', ativo: '' });
      fixture.detectChanges();
      const req = httpMock.expectOne(r => r.url.includes('/rh/v1/departamentos'));
      expect(req.request.params.has('nomeDepto')).toBeFalse();
      req.flush(mockResponse);
      return fixture.whenStable();
    });
  }));

  // ── change disclaimers ────────────────────────────────────────────────────

  it('should reload with disclaimers filters', waitForAsync(() => {
    fixture.detectChanges();
    httpMock.expectOne(r => r.url.includes('/rh/v1/departamentos')).flush(mockResponse);
    return fixture.whenStable().then(() => {
      component.onChangeDisclaimers([{ property: 'ativo', value: 'true' }]);
      fixture.detectChanges();
      const req = httpMock.expectOne(r =>
        r.url.includes('/rh/v1/departamentos') && r.params.get('ativo') === 'true',
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
      return fixture.whenStable();
    });
  }));

  it('should reload with page=1 when disclaimers change', waitForAsync(() => {
    fixture.detectChanges();
    httpMock.expectOne(r => r.url.includes('/rh/v1/departamentos')).flush(mockResponse);
    return fixture.whenStable().then(() => {
      component.onChangeDisclaimers([{ property: 'ativo', value: 'false' }]);
      fixture.detectChanges();
      const req = httpMock.expectOne(r => r.url.includes('/rh/v1/departamentos'));
      expect(req.request.params.get('page')).toBe('1');
      req.flush(mockResponse);
      return fixture.whenStable();
    });
  }));

  // ── show more (acumula) ───────────────────────────────────────────────────

  it('should GET page=2 and append items on show more', waitForAsync(() => {
    fixture.detectChanges();
    httpMock.expectOne(r => r.url.includes('/rh/v1/departamentos'))
      .flush({ items: [mockItem], hasNext: true });
    return fixture.whenStable().then(() => {
      fixture.detectChanges();
      expect(component.hasNext()).toBeTrue();

      component.onShowMore();
      fixture.detectChanges();
      const req = httpMock.expectOne(r =>
        r.url.includes('/rh/v1/departamentos') && r.params.get('page') === '2',
      );
      req.flush({ items: [{ ...mockItem, codDepto: '002' }], hasNext: false });
      return fixture.whenStable();
    }).then(() => {
      fixture.detectChanges();
      expect(component.hasNext()).toBeFalse();
      expect(component.items().length).toBe(2);
    });
  }));

  // ── modal: abertura modo inclusão ─────────────────────────────────────────

  it('should set isEdit=false and enable codDepto on openModal() new', waitForAsync(() => {
    fixture.detectChanges();
    httpMock.expectOne(r => r.url.includes('/rh/v1/departamentos')).flush(mockResponse);
    return fixture.whenStable().then(() => {
      fixture.detectChanges();
      (component as any).openModal();
      const fields = component.formFields();
      const codField = fields.find(f => f.property === 'codDepto');
      expect((component as any).isEdit).toBeFalse();
      expect(codField?.disabled).toBeFalsy();
      expect(codField?.required).toBeTrue();
    });
  }));

  // ── modal: abertura modo edição ───────────────────────────────────────────

  it('should set isEdit=true and disable codDepto on openModal(row)', waitForAsync(() => {
    fixture.detectChanges();
    httpMock.expectOne(r => r.url.includes('/rh/v1/departamentos')).flush(mockResponse);
    return fixture.whenStable().then(() => {
      fixture.detectChanges();
      (component as any).openModal(mockItem);
      const fields = component.formFields();
      const codField = fields.find(f => f.property === 'codDepto');
      expect((component as any).isEdit).toBeTrue();
      expect((component as any).editId).toBe('001');
      expect(codField?.disabled).toBeTrue();
    });
  }));

  // ── save: POST ────────────────────────────────────────────────────────────

  it('should POST and show success notification on save new', waitForAsync(() => {
    const notifSpy = spyOn(TestBed.inject(PoNotificationService), 'success');
    fixture.detectChanges();
    httpMock.expectOne(r => r.url.includes('/rh/v1/departamentos')).flush(mockResponse);
    return fixture.whenStable().then(() => {
      (component as any).isEdit    = false;
      (component as any).editId    = '';
      (component as any).dynamicForm = { value: { codDepto: '008', nomeDepto: 'NOVO DEPTO', ativo: true } };
      (component as any).save();
      fixture.detectChanges();

      const postReq = httpMock.expectOne(r =>
        r.url.includes('/rh/v1/departamentos') && r.method === 'POST',
      );
      postReq.flush(mockItem);
      const reloadReq = httpMock.expectOne(r => r.url.includes('/rh/v1/departamentos'));
      reloadReq.flush(mockResponse);
      return fixture.whenStable();
    }).then(() => {
      fixture.detectChanges();
      expect(notifSpy).toHaveBeenCalledWith('Departamento incluído com sucesso.');
    });
  }));

  // ── save: PUT ─────────────────────────────────────────────────────────────

  it('should PUT and show success notification on save existing', waitForAsync(() => {
    const notifSpy = spyOn(TestBed.inject(PoNotificationService), 'success');
    fixture.detectChanges();
    httpMock.expectOne(r => r.url.includes('/rh/v1/departamentos')).flush(mockResponse);
    return fixture.whenStable().then(() => {
      (component as any).isEdit    = true;
      (component as any).editId    = '001';
      (component as any).dynamicForm = { value: { ...mockItem, nomeDepto: 'RH ATUALIZADO' } };
      (component as any).save();
      fixture.detectChanges();

      const putReq = httpMock.expectOne(r =>
        r.url.includes('/rh/v1/departamentos/001') && r.method === 'PUT',
      );
      putReq.flush({ ...mockItem, nomeDepto: 'RH ATUALIZADO' });
      const reloadReq = httpMock.expectOne(r => r.url.includes('/rh/v1/departamentos'));
      reloadReq.flush(mockResponse);
      return fixture.whenStable();
    }).then(() => {
      fixture.detectChanges();
      expect(notifSpy).toHaveBeenCalledWith('Departamento alterado com sucesso.');
    });
  }));

  // ── save: error ───────────────────────────────────────────────────────────

  it('should show error notification on save failure', waitForAsync(() => {
    const notifSpy = spyOn(TestBed.inject(PoNotificationService), 'error');
    fixture.detectChanges();
    httpMock.expectOne(r => r.url.includes('/rh/v1/departamentos')).flush(mockResponse);
    return fixture.whenStable().then(() => {
      (component as any).isEdit    = false;
      (component as any).dynamicForm = { value: { codDepto: '999', nomeDepto: 'X', ativo: true } };
      (component as any).save();
      fixture.detectChanges();

      httpMock.expectOne(r => r.method === 'POST').flush(
        'Conflict', { status: 409, statusText: 'Conflict' },
      );
      return fixture.whenStable();
    }).then(() => {
      fixture.detectChanges();
      expect(notifSpy).toHaveBeenCalled();
    });
  }));

  // ── delete ────────────────────────────────────────────────────────────────

  it('should DELETE record and remove from items list', waitForAsync(() => {
    const notifSpy = spyOn(TestBed.inject(PoNotificationService), 'success');
    fixture.detectChanges();
    httpMock.expectOne(r => r.url.includes('/rh/v1/departamentos')).flush(mockResponse);
    return fixture.whenStable().then(() => {
      fixture.detectChanges();
      expect(component.items().length).toBe(1);

      (component as any).deleteRecord(mockItem);
      fixture.detectChanges();
      const req = httpMock.expectOne(r =>
        r.url.includes('/rh/v1/departamentos/001') && r.method === 'DELETE',
      );
      req.flush(null, { status: 204, statusText: 'No Content' });
      return fixture.whenStable();
    }).then(() => {
      fixture.detectChanges();
      expect(notifSpy).toHaveBeenCalledWith('Departamento excluído com sucesso.');
      expect(component.items().length).toBe(0);
    });
  }));

  it('should set loading false after DELETE error', waitForAsync(() => {
    const notifSpy = spyOn(TestBed.inject(PoNotificationService), 'error');
    fixture.detectChanges();
    httpMock.expectOne(r => r.url.includes('/rh/v1/departamentos')).flush(mockResponse);
    return fixture.whenStable().then(() => {
      (component as any).deleteRecord(mockItem);
      fixture.detectChanges();
      httpMock.expectOne(r => r.method === 'DELETE').flush(
        'Error', { status: 500, statusText: 'Internal Server Error' },
      );
      return fixture.whenStable();
    }).then(() => {
      fixture.detectChanges();
      expect(notifSpy).toHaveBeenCalled();
      expect(component.loading()).toBeFalse();
    });
  }));
});
