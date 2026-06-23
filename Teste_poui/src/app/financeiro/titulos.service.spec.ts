import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TitulosService } from './titulos.service';

describe('TitulosService', () => {
  let service: TitulosService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        TitulosService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(TitulosService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should GET with pagination params on getAll', () => {
    service.getAll({ page: 1, pageSize: 10, q: '' }).subscribe();
    const req = httpMock.expectOne(r =>
      r.url.includes('/rest/api/custom/v1/financeiro/titulos') && r.method === 'GET'
    );
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('pageSize')).toBe('10');
    expect(req.request.params.get('q')).toBe('');
    req.flush({ items: [], hasNext: false });
  });

  it('should POST to correct endpoint on executarAcao', () => {
    service.executarAcao('/acoes/baixar', { id: 'T001' }).subscribe();
    const req = httpMock.expectOne(r =>
      r.url.includes('/rest/api/custom/v1/acoes/baixar') && r.method === 'POST'
    );
    expect(req.request.url).toBe('/rest/api/custom/v1/acoes/baixar');
    req.flush({ success: true, message: 'Baixado com sucesso' });
  });

  it('should pass payload correctly on executarAcao', () => {
    const payload = { ids: ['T001', 'T002'] };
    service.executarAcao('/acoes/cancelar', payload).subscribe();
    const req = httpMock.expectOne(r =>
      r.url.includes('/rest/api/custom/v1/acoes/cancelar') && r.method === 'POST'
    );
    expect(req.request.body).toEqual(payload);
    req.flush({ success: true, message: 'Cancelado com sucesso' });
  });
});
