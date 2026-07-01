import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PoNotificationService } from '@po-ui/ng-components';
import { errorInterceptor } from './error.interceptor';

function setup() {
  const notifySpy = jasmine.createSpyObj<PoNotificationService>('PoNotificationService', ['error']);
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(withInterceptors([errorInterceptor])),
      provideHttpClientTesting(),
      { provide: PoNotificationService, useValue: notifySpy },
    ],
  });
  return {
    http: TestBed.inject(HttpClient),
    httpMock: TestBed.inject(HttpTestingController),
    notifySpy,
  };
}

describe('errorInterceptor', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('should pass successful responses through unchanged', () => {
    const { http, httpMock, notifySpy } = setup();
    let result: unknown;
    http.get('/api/test').subscribe(r => (result = r));

    httpMock.expectOne('/api/test').flush({ ok: true });
    expect(result).toEqual({ ok: true });
    expect(notifySpy.error).not.toHaveBeenCalled();
  });

  it('should show notification on HTTP error with errorMessage field', () => {
    const { http, httpMock, notifySpy } = setup();
    http.get('/api/test').subscribe({ error: () => {} });

    httpMock.expectOne('/api/test').flush(
      { errorMessage: 'Registro não encontrado' },
      { status: 404, statusText: 'Not Found' },
    );
    expect(notifySpy.error).toHaveBeenCalledWith('Registro não encontrado');
  });

  it('should show notification using message field as fallback', () => {
    const { http, httpMock, notifySpy } = setup();
    http.get('/api/test').subscribe({ error: () => {} });

    httpMock.expectOne('/api/test').flush(
      { message: 'Unauthorized' },
      { status: 401, statusText: 'Unauthorized' },
    );
    expect(notifySpy.error).toHaveBeenCalledWith('Unauthorized');
  });

  it('should fallback to status code message when no error body', () => {
    const { http, httpMock, notifySpy } = setup();
    http.get('/api/test').subscribe({ error: () => {} });

    httpMock.expectOne('/api/test').flush(null, { status: 500, statusText: 'Server Error' });
    expect(notifySpy.error).toHaveBeenCalledWith('Erro 500: Server Error');
  });

  it('should rethrow the error so calling code can handle it', () => {
    const { http, httpMock } = setup();
    let caught = false;
    http.get('/api/test').subscribe({ error: () => (caught = true) });

    httpMock.expectOne('/api/test').flush({}, { status: 422, statusText: 'Unprocessable' });
    expect(caught).toBeTrue();
  });

  it('should decode Latin-1 encoded Protheus error message', () => {
    const { http, httpMock, notifySpy } = setup();
    http.get('/api/test').subscribe({ error: () => {} });

    // 'ção' in Latin-1 bytes: ç=231, ã=227, o=111
    const latin1Str = String.fromCharCode(82, 101, 103, 105, 115, 116, 114, 111, 32, 110, 227, 111, 32, 101, 110, 99, 111, 110, 116, 114, 97, 100, 111); // 'Registro não encontrado'
    httpMock.expectOne('/api/test').flush(
      { errorMessage: latin1Str },
      { status: 404, statusText: 'Not Found' },
    );
    expect(notifySpy.error).toHaveBeenCalledWith(jasmine.stringContaining('Registro'));
  });
});
