# Test Template — Cenários Avançados

Cenários complementares para adicionar aos templates de família. Carregar este arquivo quando
o componente tiver: **po-modal** com submit/cancel, **po-stepper** com validação por step,
**erros HTTP específicos** (401/403/404) ou **edge cases de paginação**.

> **Regra:** não substituir os cenários dos templates de família — estes são adicionais.
> O agente seleciona os blocos relevantes ao tipo e comportamento do componente.

---

## HTTP — Erros de status específicos

Adicionar quando o componente tem lógica diferente por status (ex: 401 redireciona, 403 avisa, 404 limpa lista).

```typescript
  // ── 401 Unauthorized — redireciona / notifica ─────────────────────────────
  it('should handle 401 Unauthorized on load', waitForAsync(() => {
    // Agente: ajustar spy para o método real (error ou warning)
    const notifSpy = spyOn(TestBed.inject(PoNotificationService), 'error');
    fixture.detectChanges();
    httpMock.expectOne(r => r.url.includes('{{apiPath}}')).flush(
      { message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' }
    );
    return fixture.whenStable().then(() => {
      fixture.detectChanges();
      expect(component.loading()).toBeFalse();
      expect(notifSpy).toHaveBeenCalled();
      // Agente: se o guard redireciona para login, verificar router.navigate
      // const router = TestBed.inject(Router);
      // expect(routerSpy).toHaveBeenCalledWith(['/login']);
    });
  }));

  // ── 403 Forbidden — sem permissão ────────────────────────────────────────
  it('should handle 403 Forbidden on load', waitForAsync(() => {
    const notifSpy = spyOn(TestBed.inject(PoNotificationService), 'error');
    fixture.detectChanges();
    httpMock.expectOne(r => r.url.includes('{{apiPath}}')).flush(
      { message: 'Forbidden' }, { status: 403, statusText: 'Forbidden' }
    );
    return fixture.whenStable().then(() => {
      fixture.detectChanges();
      expect(component.loading()).toBeFalse();
      expect(notifSpy).toHaveBeenCalled();
    });
  }));

  // ── 404 Not Found — registro inexistente ─────────────────────────────────
  it('should handle 404 Not Found on load', waitForAsync(() => {
    // Agente: em page-edit/detail, 404 pode navegar de volta à lista
    const notifSpy = spyOn(TestBed.inject(PoNotificationService), 'error');
    fixture.detectChanges();
    httpMock.expectOne(r => r.url.includes('{{apiPath}}')).flush(
      { message: 'Not found' }, { status: 404, statusText: 'Not Found' }
    );
    return fixture.whenStable().then(() => {
      fixture.detectChanges();
      expect(component.loading()).toBeFalse();
      expect(notifSpy).toHaveBeenCalled();
    });
  }));

  // ── Erro Protheus com errorMessage codificado (Latin-1) ──────────────────
  it('should decode Protheus errorMessage on HTTP error', waitForAsync(() => {
    const notifSpy = spyOn(TestBed.inject(PoNotificationService), 'error');
    fixture.detectChanges();
    httpMock.expectOne(r => r.url.includes('{{apiPath}}')).flush(
      // Protheus envolve a mensagem em JSON stringificado dentro de errorMessage
      { errorMessage: '{"code":"MA0001","message":"Registro j\\u00e1 existe","detailedMessage":""}' },
      { status: 400, statusText: 'Bad Request' }
    );
    return fixture.whenStable().then(() => {
      fixture.detectChanges();
      expect(notifSpy).toHaveBeenCalled();
      // Agente: se o componente decodifica a mensagem, verificar substring
      // expect(notifSpy.calls.mostRecent().args[0]).toContain('MA0001');
    });
  }));
```

---

## Edge Cases — Lista e Paginação

```typescript
  // ── lista com 1 único item ────────────────────────────────────────────────
  it('should display single item correctly', waitForAsync(() => {
    fixture.detectChanges();
    httpMock.expectOne(r => r.url.includes('{{apiPath}}')).flush(
      { items: [mockItem], hasNext: false }
    );
    return fixture.whenStable().then(() => {
      fixture.detectChanges();
      expect(component.items().length).toBe(1);
      expect(component.hasNext()).toBeFalse();
    });
  }));

  // ── última página: hasNext false após show-more ───────────────────────────
  it('should set hasNext false and not allow more on last page', waitForAsync(() => {
    fixture.detectChanges();
    httpMock.expectOne(r => r.url.includes('{{apiPath}}')).flush(
      { items: [mockItem], hasNext: true }
    );
    return fixture.whenStable().then(() => {
      fixture.detectChanges();
      expect(component.hasNext()).toBeTrue();

      // Agente: substituir pelo método real de show-more
      component.onShowMore();
      fixture.detectChanges();
      httpMock.expectOne(r =>
        r.url.includes('{{apiPath}}') && r.params.get('page') === '2'
      ).flush({ items: [mockItem], hasNext: false });
      return fixture.whenStable();
    }).then(() => {
      fixture.detectChanges();
      expect(component.hasNext()).toBeFalse();
      // items acumulados via .update() → 2; via .set() → 1 (verificar o componente)
      expect(component.items().length).toBeGreaterThanOrEqual(1);
    });
  }));

  // ── busca que retorna vazio ───────────────────────────────────────────────
  it('should display empty state when search has no results', waitForAsync(() => {
    fixture.detectChanges();
    httpMock.expectOne(r => r.url.includes('{{apiPath}}')).flush(mockResponse);
    return fixture.whenStable().then(() => {
      // Agente: substituir pelo método real de quick search
      component.onQuickSearch('xxxxxxinexistente');
      fixture.detectChanges();
      httpMock.expectOne(r =>
        r.url.includes('{{apiPath}}')
      ).flush({ items: [], hasNext: false });
      return fixture.whenStable();
    }).then(() => {
      fixture.detectChanges();
      expect(component.items()).toEqual([]);
      expect(component.hasNext()).toBeFalse();
    });
  }));
```

---

## po-modal — Open / Submit / Cancel (modal-crud)

> **Regra:** `PoModalComponent.open()` executa `setTimeout + focus` em `nativeElement`. Em testes
> unitários sem DOM de produção isso gera `TypeError`. Sempre usar `stubModal()` antes de chamar
> qualquer método que abra o modal.

```typescript
  // ── helper: stub do po-modal ──────────────────────────────────────────────
  // Agente: verificar nome real do @ViewChild do modal no componente
  function stubModal(viewChildName = 'modal'): jasmine.SpyObj<any> {
    const modal = (component as any)[viewChildName];
    if (modal) {
      spyOn(modal, 'open').and.stub();
      spyOn(modal, 'close').and.stub();
    }
    return modal;
  }

  // ── abrir modal para incluir ──────────────────────────────────────────────
  it('should open modal on new action', waitForAsync(() => {
    fixture.detectChanges();
    httpMock.expectOne(r => r.url.includes('{{apiPath}}')).flush({ items: [mockItem], hasNext: false });
    return fixture.whenStable().then(() => {
      fixture.detectChanges();
      const modal = stubModal();

      // Agente: substituir pelo método real que abre o modal para inclusão
      component.onNew();
      fixture.detectChanges();

      expect(modal.open).toHaveBeenCalled();
      // Agente: se o componente tem signal de modo (isEditing, modalMode), verificar aqui
      // expect(component.isEditing()).toBeFalse();
    });
  }));

  // ── abrir modal para editar ───────────────────────────────────────────────
  it('should open modal with item data on edit action', waitForAsync(() => {
    fixture.detectChanges();
    httpMock.expectOne(r => r.url.includes('{{apiPath}}')).flush({ items: [mockItem], hasNext: false });
    return fixture.whenStable().then(() => {
      fixture.detectChanges();
      const modal = stubModal();

      // Agente: substituir pelo método real de edição e pelo campo chave do mockItem
      component.onEdit(mockItem);
      fixture.detectChanges();

      expect(modal.open).toHaveBeenCalled();
      // Agente: verificar que o formulário foi preenchido com os dados do item
      // expect(component.formValues()).toEqual(jasmine.objectContaining(mockItem));
    });
  }));

  // ── submit do modal → POST → modal fecha → lista recarregada ─────────────
  it('should POST and close modal on save', waitForAsync(() => {
    const notifSpy = spyOn(TestBed.inject(PoNotificationService), 'success');
    fixture.detectChanges();
    httpMock.expectOne(r => r.url.includes('{{apiPath}}')).flush({ items: [mockItem], hasNext: false });
    return fixture.whenStable().then(() => {
      fixture.detectChanges();
      const modal = stubModal();

      component.onNew();
      // Agente: substituir pelo método real de confirmação/salvar do modal
      component.onSave(mockItem);
      fixture.detectChanges();

      httpMock.expectOne(r =>
        r.url.includes('{{apiPath}}') && r.method === 'POST'
      ).flush(mockItem);
      return fixture.whenStable();
    }).then(() => {
      // Flush do reload da lista após salvar
      httpMock.match(r => r.url.includes('{{apiPath}}')).forEach(r =>
        r.flush({ items: [mockItem], hasNext: false })
      );
      return fixture.whenStable();
    }).then(() => {
      fixture.detectChanges();
      expect(notifSpy).toHaveBeenCalled();
      // Agente: verificar que modal.close() foi chamado
      // expect((component as any).modal.close).toHaveBeenCalled();
    });
  }));

  // ── cancelar modal → nenhuma request enviada ──────────────────────────────
  it('should close modal without HTTP request on cancel', waitForAsync(() => {
    fixture.detectChanges();
    httpMock.expectOne(r => r.url.includes('{{apiPath}}')).flush({ items: [mockItem], hasNext: false });
    return fixture.whenStable().then(() => {
      fixture.detectChanges();
      const modal = stubModal();

      component.onNew();
      // Agente: substituir pelo método real de cancelamento/fechar modal
      component.onCancel();
      fixture.detectChanges();

      // Nenhum POST/PUT deve ter sido feito
      httpMock.expectNone(r => r.method === 'POST' || r.method === 'PUT');
      expect(modal.close).toHaveBeenCalled();
    });
  }));
```

---

## po-stepper — Validação por Step

> Usar com `stepper-form`. Cada step pode ter validação antes de avançar.

```typescript
  // ── step 1 → step 2: avançar válido ─────────────────────────────────────
  it('should advance from step 1 to step 2 when form is valid', waitForAsync(() => {
    fixture.detectChanges();
    httpMock.match(r => r.url.includes('{{apiPath}}')).forEach(r => r.flush({}));
    return fixture.whenStable().then(() => {
      fixture.detectChanges();
      expect(component.currentStep()).toBe(1);

      // Agente: preencher campos obrigatórios do step 1 antes de avançar
      // component.form1Values = { nome: 'Teste', cpf: '123.456.789-00' };
      component.goToStep(2);
      fixture.detectChanges();

      expect(component.currentStep()).toBe(2);
    });
  }));

  // ── step 1 → step 2: bloquear se inválido ────────────────────────────────
  it('should NOT advance to step 2 if step 1 is invalid', waitForAsync(() => {
    fixture.detectChanges();
    httpMock.match(r => r.url.includes('{{apiPath}}')).forEach(r => r.flush({}));
    return fixture.whenStable().then(() => {
      fixture.detectChanges();

      // Agente: deixar campos obrigatórios do step 1 em branco
      // Agente: substituir 'canAdvance' pelo getter/computed real do componente
      expect(component.canAdvance()).toBeFalse();
      component.goToStep(2);
      fixture.detectChanges();

      // Deve permanecer no step 1
      expect(component.currentStep()).toBe(1);
    });
  }));

  // ── voltar step: não invalida steps anteriores ────────────────────────────
  it('should allow going back without invalidating completed steps', waitForAsync(() => {
    fixture.detectChanges();
    httpMock.match(r => r.url.includes('{{apiPath}}')).forEach(r => r.flush({}));
    return fixture.whenStable().then(() => {
      fixture.detectChanges();
      component.goToStep(2);
      fixture.detectChanges();
      component.goToStep(1);
      fixture.detectChanges();

      // Agente: verificar que step 1 status não regrediu (ex: ainda 'done' ou 'active')
      expect(component.currentStep()).toBe(1);
    });
  }));

  // ── submit no último step → POST → navega de volta ───────────────────────
  it('should POST on final step submit and navigate back', waitForAsync(() => {
    const notifSpy = spyOn(TestBed.inject(PoNotificationService), 'success');
    // Agente: ajustar se RouterTestingHarness não for usado
    const routerSpy = spyOn(TestBed.inject(Router), 'navigate');
    fixture.detectChanges();
    httpMock.match(r => r.url.includes('{{apiPath}}')).forEach(r => r.flush({}));
    return fixture.whenStable().then(() => {
      fixture.detectChanges();

      // Agente: avançar até o último step e preencher dados
      // component.goToStep(2); ... component.goToStep(N);
      component.onSubmit();
      fixture.detectChanges();

      httpMock.expectOne(r =>
        r.url.includes('{{apiPath}}') && r.method === 'POST'
      ).flush({ success: true });
      return fixture.whenStable();
    }).then(() => {
      fixture.detectChanges();
      expect(notifSpy).toHaveBeenCalled();
      // Agente: verificar rota de retorno real
      // expect(routerSpy).toHaveBeenCalledWith(['..'], jasmine.any(Object));
    });
  }));
```

---

## Nota para o agente

- **Selecionar apenas os blocos relevantes:** HTTP errors se o componente tem tratamento específico por status; po-modal se há `@ViewChild` de `PoModalComponent`; po-stepper se `currentStep` ou `steps: PoStepperItem[]` presentes
- **`stubModal()` obrigatório** antes de qualquer método que abra o modal — `PoModalComponent.open()` acessa `nativeElement` que não existe em testes unitários sem DOM real
- **Importar `Router`** se os cenários de stepper verificam navegação: `import { Router } from '@angular/router';` + `provideRouter([])` nos providers
- **`notifSpy` antes da ação** — `PoNotificationService.success/error` registra timer de auto-dismiss que trava `whenStable()` se não for spyado
- **Fechar com `});`** na última linha do describe (não incluir aqui, o template de família já fecha)
