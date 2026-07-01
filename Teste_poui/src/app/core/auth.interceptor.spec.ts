import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ProAppConfigService } from '@totvs/protheus-lib-core';
import { appContextInterceptor } from './auth.interceptor';

function setup(insideProtheus: boolean, appName = 'meu-modulo') {
  const proSpy = jasmine.createSpyObj<ProAppConfigService>('ProAppConfigService', ['insideProtheus']);
  proSpy.insideProtheus.and.returnValue(insideProtheus);
  (proSpy as any).nameApp = appName;

  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(withInterceptors([appContextInterceptor])),
      provideHttpClientTesting(),
      { provide: ProAppConfigService, useValue: proSpy },
    ],
  });
  return {
    http: TestBed.inject(HttpClient),
    httpMock: TestBed.inject(HttpTestingController),
    proSpy,
  };
}

describe('appContextInterceptor', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('should pass request through without X-App-Name when not inside Protheus', () => {
    const { http, httpMock } = setup(false);
    http.get('/api/test').subscribe();

    const req = httpMock.expectOne('/api/test');
    expect(req.request.headers.has('X-App-Name')).toBeFalse();
    req.flush({});
  });

  it('should add X-App-Name header when inside Protheus', () => {
    const { http, httpMock } = setup(true, 'financeiro');
    http.get('/api/test').subscribe();

    const req = httpMock.expectOne('/api/test');
    expect(req.request.headers.get('X-App-Name')).toBe('financeiro');
    req.flush({});
  });

  it('should fallback to "poui-app" when nameApp is empty', () => {
    const { http, httpMock } = setup(true, '');
    http.get('/api/test').subscribe();

    const req = httpMock.expectOne('/api/test');
    expect(req.request.headers.get('X-App-Name')).toBe('poui-app');
    req.flush({});
  });

  it('should not mutate the original request (clone was used)', () => {
    const { http, httpMock } = setup(true, 'app');
    http.get('/api/items').subscribe();

    const req = httpMock.expectOne('/api/items');
    expect(req.request.method).toBe('GET');
    expect(req.request.url).toBe('/api/items');
    req.flush([]);
  });
});
