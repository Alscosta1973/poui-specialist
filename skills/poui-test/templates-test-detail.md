# Test Template — Família Detail

Cobre: `page-detail`

Inserir após o bloco base. Fechar com `});` na última linha.

> **Nota sobre timers PO-UI**: Componentes que usam `PoPageDetailComponent` ou outros módulos PO-UI
> registram `setTimeout` internos ao renderizar. Use `waitForAsync` + `fixture.whenStable()` —
> NÃO `fakeAsync` — para evitar o erro "N timer(s) still in the queue".
>
> **Regra obrigatória — `PoNotificationService`**: `warning()` e `error()` registram timers internos
> de auto-dismiss. **Sempre criar spy** em todos os métodos de notification que forem chamados pelo
> código em teste, ANTES do flush de erro. Sem o spy, `fixture.whenStable()` aguarda o timer e causa
> timeout de 5000ms.
>
> **Regra obrigatória — locale pt-BR**: Se o template HTML usar `CurrencyPipe` ou `DatePipe` com
> locale explícito `'pt-BR'` (ex: `| currency:'BRL':'symbol':'1.2-2':'pt-BR'`), adicionar ao spec:
> ```typescript
> import { registerLocaleData } from '@angular/common';
> import localePtBr from '@angular/common/locales/pt';
> registerLocaleData(localePtBr, 'pt-BR'); // após todos os imports
> ```
> Sem esse registro, `fixture.detectChanges()` lança NG0701 (Missing locale data for the locale "pt-BR").
> Não use `{ provide: LOCALE_ID, useValue: 'pt-BR' }` isoladamente — o locale explícito no pipe ignora LOCALE_ID.

## Cenários

```typescript
  // ── dados mock ──────────────────────────────────────────────────────────
  // Agente: preencher campos baseado nos campos exibidos no template HTML
  const mockItem: {{ModelInterface}} = {
  } as {{ModelInterface}};

  // ── smoke ────────────────────────────────────────────────────────────────
  it('should create', waitForAsync(() => {
    fixture.detectChanges();
    httpMock.expectOne(r => r.url.match(new RegExp('{{apiPath}}/.+'))).flush(mockItem);
    return fixture.whenStable().then(() => {
      fixture.detectChanges();
      expect(component).toBeTruthy();
    });
  }));

  // ── carrega item por route param ──────────────────────────────────────────
  it('should load item on init via route param', waitForAsync(() => {
    fixture.detectChanges();
    const req = httpMock.expectOne(r => r.url.match(new RegExp('{{apiPath}}/.+')));
    expect(req.request.method).toBe('GET');
    req.flush(mockItem);
    return fixture.whenStable().then(() => {
      fixture.detectChanges();
      expect(component.loading()).toBeFalse();
    });
  }));

  // ── botão Editar → router.navigate ───────────────────────────────────────
  it('should navigate to edit route on edit action', waitForAsync(() => {
    fixture.detectChanges();
    httpMock.expectOne(r => r.url.match(new RegExp('{{apiPath}}/.+'))).flush(mockItem);
    return fixture.whenStable().then(() => {
      fixture.detectChanges();

      const router = TestBed.inject(Router);
      const navigateSpy = spyOn(router, 'navigate');

      // Agente: invocar método de edição real (ex: onEdit, ação de page actions)
      // component.onEdit();
      expect(navigateSpy).toHaveBeenCalledWith(jasmine.arrayContaining(['edit']));
    });
  }));

  // ── botão Excluir → DELETE → router.navigate back ────────────────────────
  it('should call DELETE and navigate back on delete', waitForAsync(() => {
    fixture.detectChanges();
    httpMock.expectOne(r => r.url.match(new RegExp('{{apiPath}}/.+'))).flush(mockItem);
    return fixture.whenStable().then(() => {
      fixture.detectChanges();

      const router = TestBed.inject(Router);
      const navigateSpy = spyOn(router, 'navigate');

      // Agente: invocar método de exclusão real
      // component.onDelete();
      fixture.detectChanges();

      httpMock.expectOne(r =>
        r.url.match(new RegExp('{{apiPath}}/.+')) && r.method === 'DELETE'
      ).flush(null, { status: 204, statusText: 'No Content' });
      return fixture.whenStable();
    }).then(() => {
      fixture.detectChanges();
      expect(navigateSpy).toHaveBeenCalled();
    });
  }));
});
```

## Nota para o agente

- Adicionar `import { Router } from '@angular/router';` ao bloco de imports no topo do spec
- O signal de loading pode ser `loading` ou `isLoading` — verificar no `.component.ts` e ajustar `component.loading()` conforme o nome real
- Para testes que dependem do `:id` da rota, verificar se o componente usa `ActivatedRoute` via `inject()` ou via `snapshot.params` — adaptar o mock de rota conforme necessário:
  - Se usar `inject(ActivatedRoute)`: adicionar `{ provide: ActivatedRoute, useValue: { snapshot: { params: { id: '1' } } } }` nos `providers` do TestBed
  - Se usar `ActivatedRoute` via construtor: mesmo approach acima
- **Verificar o template HTML** antes de gerar o spec: se `CurrencyPipe` ou `DatePipe` aparecer com locale `'pt-BR'` hardcoded (4º ou 5º argumento do pipe), adicionar `registerLocaleData` no topo do spec
- Para componentes com **fallback demo + warning**: criar spy em `PoNotificationService.warning` ANTES do flush de erro (ou do `fixture.detectChanges()` que dispara o http)
- Para componentes sem método delete, **omitir o cenário DELETE** — adaptar cenários somente ao que existe no `.component.ts`
- Para ações em `pageActions[]`: usar `(component.pageActions[N].action as Function)()` — o tipo `PoPageAction.action` é `Function | string | undefined`; verificar sempre qual índice é Editar e qual é Voltar/Excluir no componente real
- A asserção de navegação após carregar deve usar o valor real da chave primária (ex: `r.numero`) que vem de `record()` — verificar o `router.navigate(...)` real no componente
- Substituir comentários `// Agente:` pelo método real encontrado no `.component.ts`
- **NÃO usar `fakeAsync`** com componentes PO-UI — registram `setTimeout` internos que causam "N timer(s) still in the queue"
