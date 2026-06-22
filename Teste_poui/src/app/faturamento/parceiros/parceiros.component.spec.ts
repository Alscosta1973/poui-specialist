/**
 * @generated  poui-specialist v1.3 — template: test-list
 * @author     Andre Costa <andre.andrelscosta@gmail.com>
 * @license    Uso permitido · redistribuição proibida sem autorização escrita
 */

import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { PoNotificationService } from '@po-ui/ng-components';
import { ParceirosComponent } from './parceiros.component';

describe('ParceirosComponent', () => {
  let component: ParceirosComponent;
  let fixture: ComponentFixture<ParceirosComponent>;
  let httpMock: HttpTestingController;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [ParceirosComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ParceirosComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  // ── dados mock ──────────────────────────────────────────────────────────
  const mockItem = {
    codigo: '000001',
    loja: '01',
    nome: 'FORNECEDOR TESTE LTDA',
    nomeFantasia: 'Fornecedor Teste',
    cnpjCpf: '12.345.678/0001-99',
    inscricaoEstadual: '123456789',
    tipoPessoa: 'J' as const,
    situacao: '1' as const,
    endereco: 'Rua Teste, 100',
    municipio: 'São Paulo',
    uf: 'SP',
    cep: '01310-100',
    telefone: '(11) 3000-0000',
    email: 'teste@teste.com.br',
    limiteCredito: 50000,
    saldoDevedor: 0,
    dataCadastro: '2024-01-10',
  };

  const mockResponse = { items: [mockItem], hasNext: false };
  const apiPath = '/api/faturamento/v1/parceiros';

  // ── smoke ────────────────────────────────────────────────────────────────
  it('should create', waitForAsync(() => {
    fixture.detectChanges();
    httpMock.match(r => r.url.includes(apiPath)).forEach(r => r.flush(mockResponse));
    fixture.whenStable().then(() => {
      fixture.detectChanges();
      expect(component).toBeTruthy();
    });
  }));

  // ── load inicial (GET page=1) ─────────────────────────────────────────────
  it('should load items on init', waitForAsync(() => {
    fixture.detectChanges();
    const req = httpMock.expectOne(r => r.url.includes(apiPath));
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('page')).toBe('1');
    req.flush(mockResponse);
    fixture.whenStable().then(() => {
      fixture.detectChanges();
      expect(component.items()).toEqual([mockItem]);
      expect(component.isLoading()).toBeFalse();
    });
  }));

  // ── loading signal ───────────────────────────────────────────────────────
  it('should set isLoading true during request and false after', waitForAsync(() => {
    fixture.detectChanges();
    expect(component.isLoading()).toBeTrue();
    httpMock.expectOne(r => r.url.includes(apiPath)).flush(mockResponse);
    fixture.whenStable().then(() => {
      fixture.detectChanges();
      expect(component.isLoading()).toBeFalse();
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
  // O componente usa notify.warning (não error) e carrega dados demo como fallback
  it('should call notification.warning on HTTP failure and set isLoading false', waitForAsync(() => {
    const notifSpy = spyOn(TestBed.inject(PoNotificationService), 'warning');
    fixture.detectChanges();
    httpMock.expectOne(r => r.url.includes(apiPath)).flush(
      'Server error', { status: 500, statusText: 'Internal Server Error' }
    );
    fixture.whenStable().then(() => {
      fixture.detectChanges();
      expect(notifSpy).toHaveBeenCalled();
      expect(component.isLoading()).toBeFalse();
    });
  }));

  // ── filtro / quick search ────────────────────────────────────────────────
  // A service.search() envia o parâmetro 'search' (não 'q')
  it('should GET with search param on quick search', waitForAsync(() => {
    fixture.detectChanges();
    httpMock.expectOne(r => r.url.includes(apiPath)).flush(mockResponse);
    fixture.whenStable().then(() => {
      component.onQuickSearch('teste');
      fixture.detectChanges();
      const req = httpMock.expectOne(r =>
        r.url.includes(apiPath) && r.params.get('search') === 'teste'
      );
      expect(req.request.method).toBe('GET');
      req.flush({ items: [], hasNext: false });
      return fixture.whenStable();
    }).then(() => {
      fixture.detectChanges();
      expect(component.items()).toEqual([]);
    });
  }));

  // ── próxima página (page=2) ───────────────────────────────────────────────
  // onNextPage() chama load() que usa items.set() — substitui os itens, não acumula
  it('should GET page=2 on next page', waitForAsync(() => {
    fixture.detectChanges();
    httpMock.expectOne(r => r.url.includes(apiPath)).flush({ items: [mockItem], hasNext: true });
    fixture.whenStable().then(() => {
      fixture.detectChanges();
      expect(component.hasNext()).toBeTrue();

      component.onNextPage();
      fixture.detectChanges();
      const req = httpMock.expectOne(r =>
        r.url.includes(apiPath) && r.params.get('page') === '2'
      );
      req.flush({ items: [mockItem], hasNext: false });
      return fixture.whenStable();
    }).then(() => {
      fixture.detectChanges();
      expect(component.hasNext()).toBeFalse();
      expect(component.items().length).toBe(1);
    });
  }));

  // ── page-dynamic-search: filtro avançado ─────────────────────────────────
  // PoDisclaimerGroup presente — onAdvancedSearch envia filtros como params da lista
  it('should GET with filter params on advanced search', waitForAsync(() => {
    fixture.detectChanges();
    httpMock.expectOne(r => r.url.includes(apiPath)).flush(mockResponse);
    fixture.whenStable().then(() => {
      component.onAdvancedSearch({ nome: 'TESTE' });
      fixture.detectChanges();
      const req = httpMock.expectOne(r =>
        r.url.includes(apiPath) && r.params.get('nome') === 'TESTE'
      );
      expect(req.request.method).toBe('GET');
      req.flush({ items: [], hasNext: false });
      return fixture.whenStable();
    }).then(() => {
      fixture.detectChanges();
      expect(component.items()).toEqual([]);
    });
  }));

});
