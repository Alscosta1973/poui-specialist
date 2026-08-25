/**
 * @generated  poui-specialist v1.16.2
 * @author     Andre Costa <andre.andrelscosta@gmail.com>
 * @license    Uso permitido · redistribuição proibida sem autorização escrita
 * @see        https://github.com/Alscosta1973/poui-specialist
 * @node       v24.18.1 (>=18.19 required)
 * @angular    ^21.2.0 (17-21+ supported)
 */

import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { FornecedoresListComponent } from './fornecedores-list.component';
import { Fornecedor } from '../models/fornecedor.model';

describe('FornecedoresListComponent', () => {
  let component: FornecedoresListComponent;
  let fixture: ComponentFixture<FornecedoresListComponent>;
  let httpMock: HttpTestingController;

  const apiPath = '/rest/api/custom/v1/fornecedores';

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [FornecedoresListComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FornecedoresListComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  // ── dados mock ────────────────────────────────────────────────────────────
  const mockItem: Fornecedor = {
    id: '000001-01',
    codigo: '000001',
    loja: '01',
    nome: 'FORNECEDOR TESTE LTDA',
    nomeFantasia: 'Teste',
    cnpj: '12.345.678/0001-90',
    municipio: 'Sao Paulo',
    estado: 'SP',
    telefone: '(11) 3333-4444',
    email: 'contato@teste.com.br',
    situacao: '2',
  };

  const mockItem2: Fornecedor = {
    id: '000002-01',
    codigo: '000002',
    loja: '01',
    nome: 'FORNECEDOR SEGUNDO SA',
    nomeFantasia: 'Segundo',
    cnpj: '98.765.432/0001-10',
    municipio: 'Campinas',
    estado: 'SP',
    situacao: '1',
  };

  const mockResponse = { items: [mockItem], hasNext: false };

  // ── smoke ─────────────────────────────────────────────────────────────────
  it('should create', waitForAsync(() => {
    fixture.detectChanges();
    httpMock.match(r => r.url.includes(apiPath)).forEach(r => r.flush(mockResponse));
    return fixture.whenStable().then(() => {
      fixture.detectChanges();
      expect(component).toBeTruthy();
      expect(component.title).toBe('Fornecedores');
    });
  }));

  it('should expose the configured table columns', waitForAsync(() => {
    fixture.detectChanges();
    httpMock.expectOne(r => r.url.includes(apiPath)).flush(mockResponse);
    return fixture.whenStable().then(() => {
      fixture.detectChanges();
      expect(component.columns.map(c => c.property)).toEqual([
        'codigo', 'loja', 'nome', 'nomeFantasia', 'cnpj', 'municipio', 'estado', 'situacao',
      ]);
      const situacao = component.columns.find(c => c.property === 'situacao');
      expect(situacao?.type).toBe('label');
      expect(situacao?.labels?.map(l => l.value)).toEqual(['1', '2']);
    });
  }));

  // ── load inicial (GET page=1&pageSize=10) ─────────────────────────────────
  it('should load items on init', waitForAsync(() => {
    fixture.detectChanges();
    const req = httpMock.expectOne(r => r.url.includes(apiPath));
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('pageSize')).toBe('10');
    // q vazio é removido por cleanParams()
    expect(req.request.params.has('q')).toBeFalse();
    req.flush(mockResponse);
    return fixture.whenStable().then(() => {
      fixture.detectChanges();
      expect(component.items()).toEqual([mockItem]);
      expect(component.hasNext()).toBeFalse();
      expect(component.loading()).toBeFalse();
    });
  }));

  // ── loading signal ────────────────────────────────────────────────────────
  it('should set loading true during request and false after', waitForAsync(() => {
    fixture.detectChanges();
    expect(component.loading()).toBeTrue();
    httpMock.expectOne(r => r.url.includes(apiPath)).flush(mockResponse);
    return fixture.whenStable().then(() => {
      fixture.detectChanges();
      expect(component.loading()).toBeFalse();
    });
  }));

  // ── empty state ───────────────────────────────────────────────────────────
  it('should handle empty response', waitForAsync(() => {
    fixture.detectChanges();
    httpMock.expectOne(r => r.url.includes(apiPath)).flush({ items: [], hasNext: false });
    return fixture.whenStable().then(() => {
      fixture.detectChanges();
      expect(component.items()).toEqual([]);
      expect(component.hasNext()).toBeFalse();
      expect(component.loading()).toBeFalse();
    });
  }));

  // ── error state ───────────────────────────────────────────────────────────
  it('should call notification.error on HTTP failure and set loading false', waitForAsync(() => {
    const notifSpy = spyOn((component as any).notification, 'error');
    fixture.detectChanges();
    httpMock.expectOne(r => r.url.includes(apiPath)).flush(
      'Server error', { status: 500, statusText: 'Internal Server Error' }
    );
    return fixture.whenStable().then(() => {
      fixture.detectChanges();
      expect(notifSpy).toHaveBeenCalledWith('Erro ao carregar fornecedores.');
      expect(component.items()).toEqual([]);
      expect(component.loading()).toBeFalse();
    });
  }));

  // ── quick search (p-filter) ───────────────────────────────────────────────
  it('should GET with q param on quick search', waitForAsync(() => {
    fixture.detectChanges();
    httpMock.expectOne(r => r.url.includes(apiPath)).flush({ items: [mockItem], hasNext: true });
    return fixture.whenStable().then(() => {
      fixture.detectChanges();

      component.onQuickSearch('teste');
      fixture.detectChanges();

      const req = httpMock.expectOne(r => r.url.includes(apiPath) && r.params.get('q') === 'teste');
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('page')).toBe('1');
      req.flush({ items: [mockItem2], hasNext: false });
      return fixture.whenStable();
    }).then(() => {
      fixture.detectChanges();
      expect(component.items()).toEqual([mockItem2]);
      expect(component.hasNext()).toBeFalse();
    });
  }));

  it('should trigger quick search through p-filter action', waitForAsync(() => {
    fixture.detectChanges();
    httpMock.expectOne(r => r.url.includes(apiPath)).flush(mockResponse);
    return fixture.whenStable().then(() => {
      fixture.detectChanges();

      (component.filterSettings.action as Function)('000002');
      fixture.detectChanges();

      httpMock
        .expectOne(r => r.url.includes(apiPath) && r.params.get('q') === '000002')
        .flush({ items: [mockItem2], hasNext: false });
      return fixture.whenStable();
    }).then(() => {
      fixture.detectChanges();
      expect(component.items()).toEqual([mockItem2]);
    });
  }));

  // ── show more / próxima página (items.update → acumula) ───────────────────
  it('should GET page=2 and append items on show more', waitForAsync(() => {
    fixture.detectChanges();
    httpMock.expectOne(r => r.url.includes(apiPath)).flush({ items: [mockItem], hasNext: true });
    return fixture.whenStable().then(() => {
      fixture.detectChanges();
      expect(component.hasNext()).toBeTrue();

      component.onShowMore();
      fixture.detectChanges();

      const req = httpMock.expectOne(r => r.url.includes(apiPath) && r.params.get('page') === '2');
      expect(req.request.method).toBe('GET');
      req.flush({ items: [mockItem2], hasNext: false });
      return fixture.whenStable();
    }).then(() => {
      fixture.detectChanges();
      expect(component.items()).toEqual([mockItem, mockItem2]);
      expect(component.hasNext()).toBeFalse();
      expect(component.loading()).toBeFalse();
    });
  }));

  it('should keep last search term when loading next page', waitForAsync(() => {
    fixture.detectChanges();
    httpMock.expectOne(r => r.url.includes(apiPath)).flush(mockResponse);
    return fixture.whenStable().then(() => {
      fixture.detectChanges();

      component.onQuickSearch('teste');
      fixture.detectChanges();
      httpMock
        .expectOne(r => r.url.includes(apiPath) && r.params.get('q') === 'teste')
        .flush({ items: [mockItem], hasNext: true });
      return fixture.whenStable();
    }).then(() => {
      fixture.detectChanges();

      component.onShowMore();
      fixture.detectChanges();

      const req = httpMock.expectOne(r => r.url.includes(apiPath) && r.params.get('page') === '2');
      expect(req.request.params.get('q')).toBe('teste');
      req.flush({ items: [mockItem2], hasNext: false });
      return fixture.whenStable();
    }).then(() => {
      fixture.detectChanges();
      expect(component.items().length).toBe(2);
    });
  }));

  it('should call notification.error when show more fails', waitForAsync(() => {
    let notifSpy: jasmine.Spy;
    fixture.detectChanges();
    httpMock.expectOne(r => r.url.includes(apiPath)).flush({ items: [mockItem], hasNext: true });
    return fixture.whenStable().then(() => {
      fixture.detectChanges();

      notifSpy = spyOn((component as any).notification, 'error');
      component.onShowMore();
      fixture.detectChanges();

      httpMock.expectOne(r => r.url.includes(apiPath) && r.params.get('page') === '2').flush(
        'Server error', { status: 500, statusText: 'Internal Server Error' }
      );
      return fixture.whenStable();
    }).then(() => {
      fixture.detectChanges();
      expect(notifSpy).toHaveBeenCalledWith('Erro ao carregar mais registros.');
      // itens já carregados permanecem intactos quando a próxima página falha
      expect(component.items()).toEqual([mockItem]);
      expect(component.loading()).toBeFalse();
    });
  }));

  // ── navegação: incluir / editar ───────────────────────────────────────────
  it('should navigate to new record on page action', waitForAsync(() => {
    fixture.detectChanges();
    httpMock.expectOne(r => r.url.includes(apiPath)).flush(mockResponse);
    return fixture.whenStable().then(() => {
      fixture.detectChanges();

      const navigateSpy = spyOn(TestBed.inject(Router), 'navigate');
      (component.pageActions[0].action as Function)();

      expect(navigateSpy).toHaveBeenCalledWith(['novo'], jasmine.any(Object));
    });
  }));

  it('should navigate to record id on edit table action', waitForAsync(() => {
    fixture.detectChanges();
    httpMock.expectOne(r => r.url.includes(apiPath)).flush(mockResponse);
    return fixture.whenStable().then(() => {
      fixture.detectChanges();

      const navigateSpy = spyOn(TestBed.inject(Router), 'navigate');
      (component.tableActions[0].action as Function)(mockItem);

      expect(navigateSpy).toHaveBeenCalledWith([mockItem.id], jasmine.any(Object));
    });
  }));

  // ── exclusão: confirm → DELETE → remove da lista ──────────────────────────
  it('should ask for confirmation before deleting', waitForAsync(() => {
    fixture.detectChanges();
    httpMock.expectOne(r => r.url.includes(apiPath)).flush(mockResponse);
    return fixture.whenStable().then(() => {
      fixture.detectChanges();

      const confirmSpy = spyOn((component as any).dialog, 'confirm');
      (component.tableActions[1].action as Function)(mockItem);

      expect(confirmSpy).toHaveBeenCalled();
      const args = confirmSpy.calls.mostRecent().args[0] as any;
      expect(args.title).toBe('Excluir fornecedor');
      expect(args.message).toContain(mockItem.codigo);
      expect(args.message).toContain(mockItem.nome);
      // nenhuma request enquanto o usuário não confirmar
      httpMock.expectNone(r => r.method === 'DELETE');
    });
  }));

  it('should DELETE and remove item from list on confirm', waitForAsync(() => {
    let successSpy: jasmine.Spy;
    fixture.detectChanges();
    httpMock
      .expectOne(r => r.url.includes(apiPath))
      .flush({ items: [mockItem, mockItem2], hasNext: false });
    return fixture.whenStable().then(() => {
      fixture.detectChanges();

      successSpy = spyOn((component as any).notification, 'success');
      spyOn((component as any).dialog, 'confirm').and.callFake((args: any) => args.confirm());

      (component.tableActions[1].action as Function)(mockItem);
      fixture.detectChanges();

      const req = httpMock.expectOne(r => r.url === `${apiPath}/${mockItem.id}`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null, { status: 204, statusText: 'No Content' });
      return fixture.whenStable();
    }).then(() => {
      fixture.detectChanges();
      expect(successSpy).toHaveBeenCalledWith('Fornecedor excluído com sucesso.');
      expect(component.items()).toEqual([mockItem2]);
      expect(component.loading()).toBeFalse();
    });
  }));

  it('should encode the composite key in the DELETE url', waitForAsync(() => {
    // chave composta legada do Protheus pode conter '/' ou espaço (A2_COD + A2_LOJA)
    const legacyItem: Fornecedor = { ...mockItem, id: '00 03/A-01', codigo: '00 03/A' };
    fixture.detectChanges();
    httpMock.expectOne(r => r.url.includes(apiPath)).flush({ items: [legacyItem], hasNext: false });
    return fixture.whenStable().then(() => {
      fixture.detectChanges();

      spyOn((component as any).notification, 'success');
      spyOn((component as any).dialog, 'confirm').and.callFake((args: any) => args.confirm());

      (component.tableActions[1].action as Function)(legacyItem);
      fixture.detectChanges();

      const req = httpMock.expectOne(
        r => r.url === `${apiPath}/${encodeURIComponent(legacyItem.id)}`
      );
      expect(req.request.method).toBe('DELETE');
      req.flush(null, { status: 204, statusText: 'No Content' });
      return fixture.whenStable();
    }).then(() => {
      fixture.detectChanges();
      expect(component.items()).toEqual([]);
    });
  }));

  it('should show decoded Protheus error message on delete failure', waitForAsync(() => {
    let notifSpy: jasmine.Spy;
    fixture.detectChanges();
    httpMock.expectOne(r => r.url.includes(apiPath)).flush(mockResponse);
    return fixture.whenStable().then(() => {
      fixture.detectChanges();

      notifSpy = spyOn((component as any).notification, 'error');
      spyOn((component as any).dialog, 'confirm').and.callFake((args: any) => args.confirm());

      (component.tableActions[1].action as Function)(mockItem);
      fixture.detectChanges();

      httpMock.expectOne(r => r.url === `${apiPath}/${mockItem.id}`).flush(
        { errorMessage: '{"code":"MA0001","message":"Registro em uso","detailedMessage":"Bloqueado"}' },
        { status: 400, statusText: 'Bad Request' }
      );
      return fixture.whenStable();
    }).then(() => {
      fixture.detectChanges();
      expect(notifSpy).toHaveBeenCalledWith('Erro MA0001: Registro em uso — Bloqueado');
      // item permanece na lista quando a exclusão falha
      expect(component.items()).toEqual([mockItem]);
      expect(component.loading()).toBeFalse();
    });
  }));

  it('should keep the generic message when errorMessage is not valid JSON', waitForAsync(() => {
    let notifSpy: jasmine.Spy;
    fixture.detectChanges();
    httpMock.expectOne(r => r.url.includes(apiPath)).flush(mockResponse);
    return fixture.whenStable().then(() => {
      fixture.detectChanges();

      notifSpy = spyOn((component as any).notification, 'error');
      spyOn((component as any).dialog, 'confirm').and.callFake((args: any) => args.confirm());

      (component.tableActions[1].action as Function)(mockItem);
      fixture.detectChanges();

      httpMock.expectOne(r => r.url === `${apiPath}/${mockItem.id}`).flush(
        { errorMessage: 'texto solto sem json' },
        { status: 400, statusText: 'Bad Request' }
      );
      return fixture.whenStable();
    }).then(() => {
      fixture.detectChanges();
      expect(notifSpy).toHaveBeenCalledWith('Erro ao processar a requisição.');
      expect(component.loading()).toBeFalse();
    });
  }));

  it('should fall back to generic message when error has no errorMessage', waitForAsync(() => {
    let notifSpy: jasmine.Spy;
    fixture.detectChanges();
    httpMock.expectOne(r => r.url.includes(apiPath)).flush(mockResponse);
    return fixture.whenStable().then(() => {
      fixture.detectChanges();

      notifSpy = spyOn((component as any).notification, 'error');
      spyOn((component as any).dialog, 'confirm').and.callFake((args: any) => args.confirm());

      (component.tableActions[1].action as Function)(mockItem);
      fixture.detectChanges();

      httpMock.expectOne(r => r.url === `${apiPath}/${mockItem.id}`).flush(
        { message: 'Falha inesperada' }, { status: 500, statusText: 'Internal Server Error' }
      );
      return fixture.whenStable();
    }).then(() => {
      fixture.detectChanges();
      expect(notifSpy).toHaveBeenCalledWith('Falha inesperada');
      expect(component.loading()).toBeFalse();
    });
  }));

  // ── altura da tabela reativa ao resize ────────────────────────────────────
  it('should recompute tableHeight on window resize', waitForAsync(() => {
    fixture.detectChanges();
    httpMock.expectOne(r => r.url.includes(apiPath)).flush(mockResponse);
    return fixture.whenStable().then(() => {
      fixture.detectChanges();

      component.onResize();
      fixture.detectChanges();

      expect(component.tableHeight()).toBe(Math.max(200, window.innerHeight - 424));
      expect(component.tableHeight()).toBeGreaterThanOrEqual(200);
    });
  }));

  // ── edge cases ────────────────────────────────────────────────────────────
  it('should display single item correctly', waitForAsync(() => {
    fixture.detectChanges();
    httpMock.expectOne(r => r.url.includes(apiPath)).flush({ items: [mockItem], hasNext: false });
    return fixture.whenStable().then(() => {
      fixture.detectChanges();
      expect(component.items().length).toBe(1);
      expect(component.hasNext()).toBeFalse();
    });
  }));

  it('should display empty state when search has no results', waitForAsync(() => {
    fixture.detectChanges();
    httpMock.expectOne(r => r.url.includes(apiPath)).flush(mockResponse);
    return fixture.whenStable().then(() => {
      fixture.detectChanges();

      component.onQuickSearch('xxxxxxinexistente');
      fixture.detectChanges();

      httpMock
        .expectOne(r => r.url.includes(apiPath) && r.params.get('q') === 'xxxxxxinexistente')
        .flush({ items: [], hasNext: false });
      return fixture.whenStable();
    }).then(() => {
      fixture.detectChanges();
      expect(component.items()).toEqual([]);
      expect(component.hasNext()).toBeFalse();
    });
  }));

  it('should reset paging to page 1 on a new quick search', waitForAsync(() => {
    fixture.detectChanges();
    httpMock.expectOne(r => r.url.includes(apiPath)).flush({ items: [mockItem], hasNext: true });
    return fixture.whenStable().then(() => {
      fixture.detectChanges();

      component.onShowMore();
      fixture.detectChanges();
      httpMock
        .expectOne(r => r.url.includes(apiPath) && r.params.get('page') === '2')
        .flush({ items: [mockItem2], hasNext: true });
      return fixture.whenStable();
    }).then(() => {
      fixture.detectChanges();
      expect(component.items().length).toBe(2);

      component.onQuickSearch('teste');
      fixture.detectChanges();

      const req = httpMock.expectOne(r => r.url.includes(apiPath) && r.params.get('q') === 'teste');
      expect(req.request.params.get('page')).toBe('1');
      req.flush({ items: [mockItem], hasNext: false });
      return fixture.whenStable();
    }).then(() => {
      fixture.detectChanges();
      // load() usa items.set() — substitui o acumulado da paginação anterior
      expect(component.items()).toEqual([mockItem]);
    });
  }));
});
