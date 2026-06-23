# Test Template — Família Form

Cobre: `page-edit`, `modal-crud`, `stepper-form`

Inserir após o bloco base. Fechar com `});` na última linha.

> **Nota sobre timers PO-UI**: Componentes que usam `PoPageEditComponent`, `PoModalModule`,
> `PoStepperModule` ou outros módulos PO-UI registram `setTimeout` internos ao renderizar. Use
> `waitForAsync` + `fixture.whenStable()` — NÃO `fakeAsync` — para evitar o erro
> "N timer(s) still in the queue".
>
> **Regra obrigatória — `PoNotificationService`**: `success()`, `warning()` e `error()` registram
> timers internos de auto-dismiss. **Sempre criar spy** em todos os métodos de notification que
> forem chamados pelo código em teste, ANTES da ação que os dispara. Sem o spy, `fixture.whenStable()`
> aguarda o timer e causa timeout de 5000ms.

## Cenários

```typescript
  // ── dados mock ──────────────────────────────────────────────────────────
  // Agente: preencher campos baseado nos `fields: PoDynamicFormField[]` do componente
  const mockItem: {{ModelInterface}} = {
  } as {{ModelInterface}};

  // ── smoke ────────────────────────────────────────────────────────────────
  it('should create', waitForAsync(() => {
    fixture.detectChanges();
    // Agente: flush GET inicial se page-edit (carrega por :id da rota)
    // Para modal-crud: flush GET da lista
    httpMock.match(r => r.url.includes('{{apiPath}}')).forEach(r => r.flush(mockItem));
    return fixture.whenStable().then(() => {
      fixture.detectChanges();
      expect(component).toBeTruthy();
    });
  }));

  // ── carregamento por route param (page-edit / stepper-form) ──────────────
  // Agente: incluir apenas se ActivatedRoute com :id estiver presente
  it('should load item by route param on init', waitForAsync(() => {
    fixture.detectChanges();
    const req = httpMock.expectOne(r => r.url.match(new RegExp('{{apiPath}}/.+')));
    expect(req.request.method).toBe('GET');
    req.flush(mockItem);
    return fixture.whenStable().then(() => {
      fixture.detectChanges();
      expect(component.loading()).toBeFalse();
    });
  }));

  // ── submit → POST (novo registro) ────────────────────────────────────────
  it('should call POST on save new item', waitForAsync(() => {
    fixture.detectChanges();
    httpMock.match(r => r.url.includes('{{apiPath}}')).forEach(r => r.flush(mockItem));
    return fixture.whenStable().then(() => {
      fixture.detectChanges();

      // Agente: invocar método de save real (ex: onSave, onSubmit)
      component.onSave(mockItem);
      fixture.detectChanges();

      const req = httpMock.expectOne(r =>
        r.url.includes('{{apiPath}}') && r.method === 'POST'
      );
      expect(req.request.body).toEqual(jasmine.objectContaining(mockItem));
      req.flush(mockItem);
      // Agente: para page-edit verificar router.navigate; para modal-crud verificar modal fechado
      return fixture.whenStable();
    }).then(() => {
      fixture.detectChanges();
    });
  }));

  // ── submit → PUT (edição) ─────────────────────────────────────────────────
  it('should call PUT on update existing item', waitForAsync(() => {
    fixture.detectChanges();
    httpMock.match(r => r.url.includes('{{apiPath}}')).forEach(r => r.flush(mockItem));
    return fixture.whenStable().then(() => {
      fixture.detectChanges();

      // Agente: invocar com item existente (com ID/chave preenchida)
      component.onSave(mockItem);
      fixture.detectChanges();

      const req = httpMock.expectOne(r =>
        r.url.match(new RegExp('{{apiPath}}/.+')) && r.method === 'PUT'
      );
      req.flush(mockItem);
      return fixture.whenStable();
    }).then(() => {
      fixture.detectChanges();
      expect(component.loading()).toBeFalse();
    });
  }));

  // ── erro no submit ────────────────────────────────────────────────────────
  it('should show error notification on save failure', waitForAsync(() => {
    const notifSpy = spyOn(TestBed.inject(PoNotificationService), 'error');
    fixture.detectChanges();
    httpMock.match(r => r.url.includes('{{apiPath}}')).forEach(r => r.flush(mockItem));
    return fixture.whenStable().then(() => {
      fixture.detectChanges();

      component.onSave(mockItem);
      fixture.detectChanges();

      httpMock.expectOne(r =>
        r.url.includes('{{apiPath}}') && (r.method === 'POST' || r.method === 'PUT')
      ).flush('Error', { status: 400, statusText: 'Bad Request' });
      return fixture.whenStable();
    }).then(() => {
      fixture.detectChanges();
      expect(notifSpy).toHaveBeenCalled();
      expect(component.loading()).toBeFalse();
    });
  }));

  // ── modal-crud: abrir modal para novo registro ───────────────────────────
  // Agente: incluir apenas se for modal-crud (lista com modal inline)
  it('should open modal on new item action', waitForAsync(() => {
    fixture.detectChanges();
    httpMock.expectOne(r => r.url.includes('{{apiPath}}')).flush({ items: [mockItem], hasNext: false });
    return fixture.whenStable().then(() => {
      fixture.detectChanges();

      // Agente: invocar método que abre o modal (ex: openModal, onNew)
      // component.openModal();
      fixture.detectChanges();
      // Agente: verificar signal ou propriedade de estado do modal
      // expect(component.isModalOpen()).toBeTrue();
    });
  }));
});
```

## Nota para o agente

- Substituir comentários `// Agente:` pelo método e signal reais do `.component.ts`
- O signal de loading pode ser `loading` ou `isLoading` — verificar no `.component.ts` e ajustar todos os `component.loading()` no spec
- Para `stepper-form`: adaptar cenários de submit para "avançar steps" + submit no último step; cada step pode disparar GET/POST separado
- Para `modal-crud`: o componente gerencia lista (`items`) + modal state no mesmo arquivo; adaptar flush do load inicial para `{ items: [...], hasNext: false }`
- Não incluir cenário de `ActivatedRoute` em modal-crud (não usa rota com `:id`)
- Adicionar `import { Router } from '@angular/router';` se algum cenário de navegação for necessário
- **NÃO usar `fakeAsync`** com componentes PO-UI — registram `setTimeout` internos que causam "N timer(s) still in the queue"
