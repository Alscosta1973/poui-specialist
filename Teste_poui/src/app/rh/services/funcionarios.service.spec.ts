// @generated poui-specialist v1.0 — Task 8 Wave 1
// Testes: FuncionariosService | Karma + Jasmine

import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';

import { FuncionariosService } from './funcionarios.service';
import {
  Funcionario,
  FuncionarioForm,
  FuncionariosResponse,
} from '../models/funcionario.model';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const mockFuncionario: Funcionario = {
  matricula: '000001',
  nome: 'João da Silva',
  dataAdmissao: '2020-01-15',
  cargo: 'Analista',
  departamento: 'TI',
  situacao: 'A',
};

const mockResponse: FuncionariosResponse = {
  items: [mockFuncionario],
  hasNext: false,
  page: 1,
  pageSize: 20,
  total: 1,
};

const mockForm: FuncionarioForm = {
  matricula: '000002',
  nome: 'Maria Souza',
  dataAdmissao: '2021-03-10',
  cargo: 'Desenvolvedora',
  situacao: 'A',
};

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('FuncionariosService', () => {
  let service: FuncionariosService;
  let httpMock: HttpTestingController;
  const BASE = '/rh/funcionarios';

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [FuncionariosService],
    });

    service = TestBed.inject(FuncionariosService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify(); // garante que não há requisições pendentes
  });

  // -------------------------------------------------------------------------
  // getAll()
  // -------------------------------------------------------------------------

  describe('getAll()', () => {
    it('deve fazer GET em /rh/funcionarios e retornar a lista', () => {
      service.getAll().subscribe((res) => {
        expect(res).toEqual(mockResponse);
      });

      const req = httpMock.expectOne((r) => r.url === BASE);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('deve enviar params padrão: filial=01, page=1, pageSize=20', () => {
      service.getAll().subscribe();

      const req = httpMock.expectOne((r) => r.url === BASE);
      const params = req.request.params;
      expect(params.get('filial')).toBe('01');
      expect(params.get('page')).toBe('1');
      expect(params.get('pageSize')).toBe('20');
      req.flush(mockResponse);
    });

    it('deve sobrescrever params quando fornecidos', () => {
      service.getAll({ filial: '02', page: 3, pageSize: 50, nome: 'João', situacao: 'A' }).subscribe();

      const req = httpMock.expectOne((r) => r.url === BASE);
      const params = req.request.params;
      expect(params.get('filial')).toBe('02');
      expect(params.get('page')).toBe('3');
      expect(params.get('pageSize')).toBe('50');
      expect(params.get('nome')).toBe('João');
      expect(params.get('situacao')).toBe('A');
      req.flush(mockResponse);
    });

    it('deve enviar header X-Tenant-Id', () => {
      service.getAll().subscribe();

      const req = httpMock.expectOne((r) => r.url === BASE);
      expect(req.request.headers.get('X-Tenant-Id')).toBe('01');
      req.flush(mockResponse);
    });

    it('não deve incluir param nome quando não fornecido', () => {
      service.getAll({ filial: '01' }).subscribe();

      const req = httpMock.expectOne((r) => r.url === BASE);
      expect(req.request.params.has('nome')).toBeFalse();
      req.flush(mockResponse);
    });
  });

  // -------------------------------------------------------------------------
  // getById()
  // -------------------------------------------------------------------------

  describe('getById()', () => {
    it('deve fazer GET em /rh/funcionarios/:mat e retornar o funcionário', () => {
      service.getById('000001').subscribe((res) => {
        expect(res).toEqual(mockFuncionario);
      });

      const req = httpMock.expectOne((r) => r.url === `${BASE}/000001`);
      expect(req.request.method).toBe('GET');
      req.flush(mockFuncionario);
    });

    it('deve enviar param filial padrão 01', () => {
      service.getById('000001').subscribe();

      const req = httpMock.expectOne((r) => r.url === `${BASE}/000001`);
      expect(req.request.params.get('filial')).toBe('01');
      req.flush(mockFuncionario);
    });

    it('deve usar a filial fornecida', () => {
      service.getById('000001', '02').subscribe();

      const req = httpMock.expectOne((r) => r.url === `${BASE}/000001`);
      expect(req.request.params.get('filial')).toBe('02');
      req.flush(mockFuncionario);
    });

    it('deve enviar header X-Tenant-Id', () => {
      service.getById('000001').subscribe();

      const req = httpMock.expectOne((r) => r.url === `${BASE}/000001`);
      expect(req.request.headers.get('X-Tenant-Id')).toBe('01');
      req.flush(mockFuncionario);
    });
  });

  // -------------------------------------------------------------------------
  // create()
  // -------------------------------------------------------------------------

  describe('create()', () => {
    it('deve fazer POST em /rh/funcionarios com o body correto', () => {
      service.create(mockForm).subscribe((res) => {
        expect(res).toEqual(mockFuncionario);
      });

      const req = httpMock.expectOne(BASE);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(mockForm);
      expect(req.request.headers.get('Content-Type')).toBe('application/json');
      req.flush(mockFuncionario);
    });

    it('deve enviar header X-Tenant-Id no POST', () => {
      service.create(mockForm).subscribe();

      const req = httpMock.expectOne(BASE);
      expect(req.request.headers.get('X-Tenant-Id')).toBe('01');
      req.flush(mockFuncionario);
    });
  });

  // -------------------------------------------------------------------------
  // update()
  // -------------------------------------------------------------------------

  describe('update()', () => {
    it('deve fazer PUT em /rh/funcionarios/:mat com o body correto', () => {
      service.update('000001', mockForm).subscribe((res) => {
        expect(res).toEqual(mockFuncionario);
      });

      const req = httpMock.expectOne(`${BASE}/000001`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(mockForm);
      req.flush(mockFuncionario);
    });

    it('deve enviar header X-Tenant-Id no PUT', () => {
      service.update('000001', mockForm).subscribe();

      const req = httpMock.expectOne(`${BASE}/000001`);
      expect(req.request.headers.get('X-Tenant-Id')).toBe('01');
      req.flush(mockFuncionario);
    });
  });

  // -------------------------------------------------------------------------
  // remove()
  // -------------------------------------------------------------------------

  describe('remove()', () => {
    it('deve fazer DELETE em /rh/funcionarios/:mat', () => {
      service.remove('000001').subscribe();

      const req = httpMock.expectOne(`${BASE}/000001`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null, { status: 204, statusText: 'No Content' });
    });

    it('deve enviar header X-Tenant-Id no DELETE', () => {
      service.remove('000001').subscribe();

      const req = httpMock.expectOne(`${BASE}/000001`);
      expect(req.request.headers.get('X-Tenant-Id')).toBe('01');
      req.flush(null, { status: 204, statusText: 'No Content' });
    });
  });
});
