# Test Template — Família List

Cobre: `page-list`, `page-dynamic-search`, `page-dynamic`

Inserir após o bloco base. Fechar com `});` na última linha.

> **Nota sobre timers PO-UI**: Componentes que usam `PoPageDynamicSearchModule`, `PoTableModule` ou
> outros módulos PO-UI registram `setTimeout` internos ao renderizar. Use `waitForAsync` +
> `fixture.whenStable()` — NÃO `fakeAsync` — para evitar o erro "N timer(s) still in the queue".
> O bloco base deve usar `waitForAsync` nos `beforeEach`.

## Ajuste no bloco base para família list

Substituir o `beforeEach(async () => {...})` do base por:

```typescript
  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [{{ComponentClass}}],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent({{ComponentClass}});
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });
```

Adicionar `waitForAsync` ao import do `@angular/core/testing`.

## Cenários

```typescript
  // ── dados mock ──────────────────────────────────────────────────────────
  // Agente: preencher campos baseado nos `columns: PoTableColumn[]` do componente
  const mockItem: {{ModelInterface}} = {
  } as {{ModelInterface}};

  const mockResponse = { items: [mockItem], hasNext: false };

  // ── smoke ────────────────────────────────────────────────────────────────
  it('should create', waitForAsync(() => {
    fixture.detectChanges();
    httpMock.match(r => r.url.includes('{{apiPath}}')).forEach(r => r.flush(mockResponse));
    fixture.whenStable().then(() => {
      fixture.detectChanges();
      expect(component).toBeTruthy();
    });
  }));

  // ── load inicial (GET page=1) ─────────────────────────────────────────────
  it('should load items on init', waitForAsync(() => {
    fixture.detectChanges();
    const req = httpMock.expectOne(r => r.url.includes('{{apiPath}}'));
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
  // Agente: verificar se o signal se chama `isLoading` ou `loading` no componente
  it('should set isLoading true during request and false after', waitForAsync(() => {
    fixture.detectChanges();
    expect(component.isLoading()).toBeTrue();
    httpMock.expectOne(r => r.url.includes('{{apiPath}}')).flush(mockResponse);
    fixture.whenStable().then(() => {
      fixture.detectChanges();
      expect(component.isLoading()).toBeFalse();
    });
  }));

  // ── empty state ──────────────────────────────────────────────────────────
  it('should handle empty response', waitForAsync(() => {
    fixture.detectChanges();
    httpMock.expectOne(r => r.url.includes('{{apiPath}}')).flush({ items: [], hasNext: false });
    fixture.whenStable().then(() => {
      fixture.detectChanges();
      expect(component.items()).toEqual([]);
      expect(component.hasNext()).toBeFalse();
    });
  }));

  // ── error state ──────────────────────────────────────────────────────────
  // Agente: verificar o método de notificação real — pode ser warning (com fallback demo)
  //         ou error (sem fallback). Adaptar o spy conforme o componente.
  it('should call notification on HTTP failure and set isLoading false', waitForAsync(() => {
    const notifSpy = spyOn(TestBed.inject(PoNotificationService), 'warning');
    fixture.detectChanges();
    httpMock.expectOne(r => r.url.includes('{{apiPath}}')).flush(
      'Server error', { status: 500, statusText: 'Internal Server Error' }
    );
    fixture.whenStable().then(() => {
      fixture.detectChanges();
      expect(notifSpy).toHaveBeenCalled();
      expect(component.isLoading()).toBeFalse();
    });
  }));

  // ── filtro / quick search ────────────────────────────────────────────────
  // Agente: substituir pelo método de busca real e pelo parâmetro da API ('q', 'search', 'filter')
  it('should GET with search param on quick search', waitForAsync(() => {
    fixture.detectChanges();
    httpMock.expectOne(r => r.url.includes('{{apiPath}}')).flush(mockResponse);
    fixture.whenStable().then(() => {
      component.onQuickSearch('teste');
      fixture.detectChanges();
      const req = httpMock.expectOne(r =>
        r.url.includes('{{apiPath}}') && r.params.get('search') === 'teste'
      );
      expect(req.request.method).toBe('GET');
      req.flush({ items: [], hasNext: false });
      return fixture.whenStable();
    }).then(() => {
      fixture.detectChanges();
      expect(component.items()).toEqual([]);
    });
  }));

  // ── show more / próxima página ───────────────────────────────────────────
  // Agente: substituir pelo método real (ex: onNextPage, onShowMore, showMore)
  // Nota: load() usa items.set() — SUBSTITUI os itens, não acumula
  it('should GET page=2 on next page', waitForAsync(() => {
    fixture.detectChanges();
    httpMock.expectOne(r => r.url.includes('{{apiPath}}')).flush({ items: [mockItem], hasNext: true });
    fixture.whenStable().then(() => {
      fixture.detectChanges();
      expect(component.hasNext()).toBeTrue();

      component.onNextPage();
      fixture.detectChanges();
      const req = httpMock.expectOne(r =>
        r.url.includes('{{apiPath}}') && r.params.get('page') === '2'
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
  // Agente: incluir apenas se PoDisclaimerGroup presente no componente
  //         Invocar o método de filtro avançado real com campos reais do modelo
  it('should GET with filter params on advanced search', waitForAsync(() => {
    fixture.detectChanges();
    httpMock.expectOne(r => r.url.includes('{{apiPath}}')).flush(mockResponse);
    fixture.whenStable().then(() => {
      component.onAdvancedSearch({ nome: 'TESTE' });
      fixture.detectChanges();
      const req = httpMock.expectOne(r =>
        r.url.includes('{{apiPath}}') && r.params.get('nome') === 'TESTE'
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
```

## Nota para o agente

- O signal de loading pode ser `isLoading` ou `loading` — verificar no `.component.ts` e ajustar todos os `component.isLoading()` no spec
- O método de notificação em erro pode ser `warning` (com dados demo) ou `error` (sem fallback) — verificar e ajustar o spy (`'warning'` ou `'error'`)
- O parâmetro de quick search pode ser `q`, `search`, ou `filter` — verificar na service e ajustar `r.params.get('search')`
- O método show-more pode ser `onNextPage`, `onShowMore`, ou `showMore` — verificar no `.component.ts`
- `show-more` com `items.set()` SUBSTITUI os itens (não acumula) — verificar se o componente usa `set` ou `update`; se usar `update`, a asserção muda para `expect(component.items().length).toBe(2)`
- Para `page-dynamic` (PoPageDynamicTableComponent), verificar se o componente gerencia `items` via signal próprio ou delega ao PoPageDynamicTable — adaptar cenários conforme
- Preencher `mockItem` com campos realistas baseados nos `labels` de `columns: PoTableColumn[]`
- **NÃO usar `fakeAsync`** com componentes PO-UI — registram `setTimeout` internos que causam "N timer(s) still in the queue"
