# Test Other — Dashboard e Service

Cobre as famílias `dashboard` e `service`.

---

## Família: dashboard

> Usa o boilerplate de `templates-test-base.md` (base normal com `ComponentFixture`).
> Inserir após o bloco base.

> **IMPORTANTE — Compatibilidade PO-UI**: Use SEMPRE `waitForAsync` + `fixture.whenStable()`.
> NUNCA use `fakeAsync`/`tick()` — causa "N timer(s) still in the queue" com módulos PO-UI.

```typescript
  const mockKpis = { /* Agente: derivar campos do response GET de KPIs do .component.ts */ };

  it('should create', waitForAsync(() => {
    fixture.detectChanges();
    return fixture.whenStable().then(() => {
      httpMock.match(r => r.url.includes('{{apiPath}}')).forEach(r => r.flush(mockKpis));
      fixture.detectChanges();
      return fixture.whenStable();
    }).then(() => {
      expect(component).toBeTruthy();
    });
  }));

  it('should load KPIs on init', waitForAsync(() => {
    fixture.detectChanges();
    return fixture.whenStable().then(() => {
      const req = httpMock.expectOne(r => r.url.includes('{{apiPath}}'));
      expect(req.request.method).toBe('GET');
      req.flush(mockKpis);
      fixture.detectChanges();
      return fixture.whenStable();
    }).then(() => {
      expect(component.loading()).toBeFalse();
      // Agente: verificar signal de KPI real (ex: component.kpis(), component.totalVendas())
    });
  }));

  it('should handle HTTP error on KPI load', waitForAsync(() => {
    const notifSpy = spyOn(TestBed.inject(PoNotificationService), 'error');
    fixture.detectChanges();
    return fixture.whenStable().then(() => {
      httpMock.expectOne(r => r.url.includes('{{apiPath}}')).flush(
        'Error', { status: 500, statusText: 'Server Error' }
      );
      fixture.detectChanges();
      return fixture.whenStable();
    }).then(() => {
      expect(component.loading()).toBeFalse();
      expect(notifSpy).toHaveBeenCalled();
    });
  }));
});
```

---

## Família: service

> **STANDALONE** — NÃO usa `templates-test-base.md`. O service tem setup próprio com `TestBed` direto.
> NÃO usa `waitForAsync`/`whenStable()` — métodos de serviço retornam Observable; chamar `.subscribe()`
> e fazer flush síncrono com `httpMock.expectOne(...).flush(...)`.

```typescript
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { {{ServiceClass}} } from './{{serviceFile}}';

describe('{{ServiceClass}}', () => {
  let service: {{ServiceClass}};
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {{ServiceClass}},
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject({{ServiceClass}});
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // Agente: gerar um it() por método público encontrado no .service.ts
  // Exemplos padrão abaixo — adaptar nomes de métodos e parâmetros:

  it('should GET with pagination params on getAll', () => {
    service.getAll({ page: 1, pageSize: 10, q: '' }).subscribe();
    const req = httpMock.expectOne(r =>
      r.url.includes('{{apiPath}}') && r.method === 'GET'
    );
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('pageSize')).toBe('10');
    req.flush({ items: [], hasNext: false });
  });

  // Agente: para `executarAcao` do TitulosService verificar POST com payload `{ id }` ou `{ ids }`.
  // Exemplo:
  // it('should POST to correct endpoint on executarAcao', () => {
  //   service.executarAcao('/acoes/baixar', { id: 'T001' }).subscribe();
  //   const req = httpMock.expectOne(r =>
  //     r.url.includes('/acoes/baixar') && r.method === 'POST'
  //   );
  //   expect(req.request.body).toEqual({ id: 'T001' });
  //   req.flush({ success: true, message: 'OK' });
  // });
});
```

## Notas de Agente

- **Para service**: substituir `{{ServiceClass}}` e `{{serviceFile}}` pelos valores reais lidos do `.service.ts`.
- **Para dashboard**: substituir `{{apiPath}}` pelo valor de `apiUrl` encontrado no `.component.ts` ou no `.service.ts` injetado.
- **`executarAcao`**: quando presente, verificar POST com payload `{ id }` (ação single) e `{ ids }` (ação batch); o endpoint é composto dinamicamente como `/rest/api/custom/v1${endpoint}`.
- **`PoChartSerie.data` é `number | number[]`**: ao acessar `.length` ou índices do array `data` em specs de dashboard, usar cast explícito: `(component.barSeries()[0].data as number[]).length` — sem o cast, TypeScript gera `error TS2339: Property 'length' does not exist on type 'number | number[]'`.
- Fechar o bloco `describe` com `});` na última linha gerada.
