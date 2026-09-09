/**
 * @generated  poui-specialist v1.12.1
 * @node       v24.18.1
 * @author     Andre Costa <andre.andrelscosta@gmail.com>
 * @license    Uso permitido · redistribuição proibida sem autorização escrita
 * @see        https://github.com/Alscosta1973/poui-specialist
 */

import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { PedidoCompraService, ProtheusListResponse } from './pedido-compra.service';
import { PedidoCompraItem } from './models/pedido-compra.model';

describe('PedidoCompraService', () => {
  let service: PedidoCompraService;
  let httpMock: HttpTestingController;

  const apiPath = '/api/custom/v1/pedidos';

  const mockItem: PedidoCompraItem = {
    numero: '000001',
    item: '01',
    produto: 'PRD0001',
    quantidade: 10,
    preco: 25.5,
    fornecedor: 'F00001',
    loja: '01',
    emissao: '20260908',
  };

  const mockResponse: ProtheusListResponse<PedidoCompraItem> = {
    items: [mockItem],
    hasNext: false,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        PedidoCompraService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(PedidoCompraService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ── getAll ────────────────────────────────────────────────────────────────
  it('should GET with pagination params on getAll', () => {
    let result: ProtheusListResponse<PedidoCompraItem> | undefined;
    service.getAll({ page: 1, pageSize: 10, q: '' }).subscribe(r => (result = r));

    const req = httpMock.expectOne(r => r.url === apiPath && r.method === 'GET');
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('pageSize')).toBe('10');
    req.flush(mockResponse);

    expect(result).toEqual(mockResponse);
  });

  it('should omit empty, null and undefined params on getAll', () => {
    service.getAll({ page: 1, q: '', order: undefined, fornecedor: null }).subscribe();

    const req = httpMock.expectOne(r => r.url === apiPath && r.method === 'GET');
    // cleanParams remove '' / null / undefined antes de montar o HttpParams
    expect(req.request.params.has('q')).toBeFalse();
    expect(req.request.params.has('order')).toBeFalse();
    expect(req.request.params.has('fornecedor')).toBeFalse();
    expect(req.request.params.get('page')).toBe('1');
    req.flush(mockResponse);
  });

  it('should GET without params when getAll is called with no arguments', () => {
    service.getAll().subscribe();

    const req = httpMock.expectOne(r => r.url === apiPath && r.method === 'GET');
    expect(req.request.params.keys().length).toBe(0);
    req.flush(mockResponse);
  });

  it('should forward extra filter params as strings on getAll', () => {
    service.getAll({ page: 2, produto: 'PRD0001', quantidade: 10 }).subscribe();

    const req = httpMock.expectOne(r => r.url === apiPath && r.method === 'GET');
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('produto')).toBe('PRD0001');
    expect(req.request.params.get('quantidade')).toBe('10');
    req.flush(mockResponse);
  });

  it('should propagate HTTP error on getAll', () => {
    let status: number | undefined;
    service.getAll({ page: 1 }).subscribe({
      next: () => fail('não deveria emitir next em erro'),
      error: err => (status = err.status),
    });

    httpMock.expectOne(r => r.url === apiPath && r.method === 'GET').flush(
      'Server error', { status: 500, statusText: 'Internal Server Error' }
    );

    expect(status).toBe(500);
  });

  // ── getByKey ──────────────────────────────────────────────────────────────
  // Chave composta numero+item vai por query string (WSSYNTAX sem segmento {id})
  it('should GET with numero and item as query params on getByKey', () => {
    let result: PedidoCompraItem | undefined;
    service.getByKey('000001', '01').subscribe(r => (result = r));

    const req = httpMock.expectOne(r => r.url === apiPath && r.method === 'GET');
    expect(req.request.params.get('numero')).toBe('000001');
    expect(req.request.params.get('item')).toBe('01');
    req.flush(mockItem);

    expect(result).toEqual(mockItem);
  });

  it('should propagate 404 on getByKey of unknown key', () => {
    let status: number | undefined;
    service.getByKey('999999', '99').subscribe({
      next: () => fail('não deveria emitir next em erro'),
      error: err => (status = err.status),
    });

    httpMock.expectOne(r => r.url === apiPath && r.method === 'GET').flush(
      { errorMessage: 'Registro nao encontrado' }, { status: 404, statusText: 'Not Found' }
    );

    expect(status).toBe(404);
  });

  // ── create ────────────────────────────────────────────────────────────────
  it('should POST payload to base url on create', () => {
    let result: PedidoCompraItem | undefined;
    service.create(mockItem).subscribe(r => (result = r));

    const req = httpMock.expectOne(r => r.url === apiPath && r.method === 'POST');
    expect(req.request.body).toEqual(mockItem);
    // create não envia chave por query string — o backend gera/recebe no body
    expect(req.request.params.keys().length).toBe(0);
    req.flush(mockItem);

    expect(result).toEqual(mockItem);
  });

  it('should propagate Protheus errorMessage on create failure', () => {
    let error: { status: number; error: { errorMessage: string } } | undefined;
    service.create({ numero: '000001', item: '01' }).subscribe({
      next: () => fail('não deveria emitir next em erro'),
      error: err => (error = err),
    });

    httpMock.expectOne(r => r.url === apiPath && r.method === 'POST').flush(
      { errorMessage: '{"code":"MA0001","message":"Registro ja existe","detailedMessage":""}' },
      { status: 400, statusText: 'Bad Request' }
    );

    expect(error?.status).toBe(400);
    expect(error?.error.errorMessage).toContain('MA0001');
  });

  // ── update ────────────────────────────────────────────────────────────────
  it('should PUT with numero and item as query params on update', () => {
    const payload: Partial<PedidoCompraItem> = { quantidade: 20, preco: 30 };
    let result: PedidoCompraItem | undefined;
    service.update('000001', '01', payload).subscribe(r => (result = r));

    const req = httpMock.expectOne(r => r.url === apiPath && r.method === 'PUT');
    expect(req.request.params.get('numero')).toBe('000001');
    expect(req.request.params.get('item')).toBe('01');
    expect(req.request.body).toEqual(payload);
    req.flush({ ...mockItem, ...payload });

    expect(result).toEqual({ ...mockItem, ...payload });
  });

  // ── delete ────────────────────────────────────────────────────────────────
  it('should DELETE with numero and item as query params', () => {
    let completed = false;
    service.delete('000001', '01').subscribe({ complete: () => (completed = true) });

    const req = httpMock.expectOne(r => r.url === apiPath && r.method === 'DELETE');
    expect(req.request.params.get('numero')).toBe('000001');
    expect(req.request.params.get('item')).toBe('01');
    req.flush(null, { status: 204, statusText: 'No Content' });

    expect(completed).toBeTrue();
  });

  it('should propagate 403 on delete without permission', () => {
    let status: number | undefined;
    service.delete('000001', '01').subscribe({
      next: () => fail('não deveria emitir next em erro'),
      error: err => (status = err.status),
    });

    httpMock.expectOne(r => r.url === apiPath && r.method === 'DELETE').flush(
      { errorMessage: 'Forbidden' }, { status: 403, statusText: 'Forbidden' }
    );

    expect(status).toBe(403);
  });
});
