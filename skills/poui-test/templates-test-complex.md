# Test Template — Família Complex

Cobre: `action-list`, `two-panel-browse`, `stacked-browse`, `master-detail`

Inserir após o bloco base. O agente seleciona as seções relevantes ao subtipo identificado no Passo 2.

> **IMPORTANTE — Compatibilidade PO-UI**: Componentes PO-UI registram `setTimeout` internos ao
> renderizar. Use SEMPRE `waitForAsync` + `fixture.whenStable()`. NUNCA use `fakeAsync`/`tick()` —
> causa o erro "N timer(s) still in the queue" com módulos PO-UI.

## Cenários base (todos os subtipos)

```typescript
  // ── dados mock ──────────────────────────────────────────────────────────
  // Agente: preencher campos baseado nos columns: PoTableColumn[] do componente
  const mockItem: {{ModelInterface}} = {
  } as {{ModelInterface}};

  const mockResponse = { items: [mockItem], hasNext: false };
  const apiPath = '{{apiPath}}';

  // ── smoke ────────────────────────────────────────────────────────────────
  it('should create', waitForAsync(() => {
    fixture.detectChanges();
    httpMock.match(r => r.url.includes(apiPath)).forEach(r => r.flush(mockResponse));
    return fixture.whenStable().then(() => {
      fixture.detectChanges();
      expect(component).toBeTruthy();
    });
  }));

  // ── load inicial ─────────────────────────────────────────────────────────
  it('should load items on init', waitForAsync(() => {
    fixture.detectChanges();
    const req = httpMock.expectOne(r => r.url.includes(apiPath));
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
    return fixture.whenStable().then(() => {
      fixture.detectChanges();
      expect(component.items()).toContain(mockItem);
      expect(component.loading()).toBeFalse();
    });
  }));
```

## Cenários action-list (incluir se `actions: ActionConfig[]` presente)

```typescript
  // ── helper: silenciar open/close das modais PO-UI em testes unitários ─────
  // PoModalComponent.open() usa setTimeout+focus em nativeElement — em testes
  // sem DOM de produção isso gera "Cannot read properties of undefined (nativeElement)".
  // Chamar stubModals() APÓS o primeiro detectChanges (que inicializa @ViewChild)
  // e ANTES de qualquer openAction()/executeAction().
  function stubModals(): void {
    const confirmModal = (component as any).confirmModal;
    const resultsModal = (component as any).resultsModal;
    if (confirmModal) {
      spyOn(confirmModal, 'open').and.stub();
      spyOn(confirmModal, 'close').and.stub();
    }
    if (resultsModal) {
      spyOn(resultsModal, 'open').and.stub();
      spyOn(resultsModal, 'close').and.stub();
    }
  }

  // ── seleção / desseleção de linha ─────────────────────────────────────────
  it('should update selectedRows on row select/unselect', waitForAsync(() => {
    fixture.detectChanges();
    httpMock.expectOne(r => r.url.includes(apiPath)).flush(mockResponse);
    return fixture.whenStable().then(() => {
      fixture.detectChanges();

      component.onRowSelected(mockItem);
      expect(component.selectedRows()).toContain(mockItem);

      component.onRowUnselected(mockItem);
      expect(component.selectedRows()).not.toContain(mockItem);
    });
  }));

  // ── abrir modal de confirmação ────────────────────────────────────────────
  it('should set currentAction on openAction', waitForAsync(() => {
    fixture.detectChanges();
    httpMock.expectOne(r => r.url.includes(apiPath)).flush(mockResponse);
    return fixture.whenStable().then(() => {
      fixture.detectChanges();
      stubModals(); // deve ser chamado após detectChanges inicializar @ViewChild

      // Agente: usar component.actions[0] ou o primeiro ActionConfig real
      const firstAction = component.actions[0];
      component.openAction(firstAction, [mockItem]);
      fixture.detectChanges();

      expect(component.currentAction()).not.toBeNull();
      expect(component.currentAction()?.config.id).toBe(firstAction.id);
    });
  }));

  // ── executar ação → POST → sucesso total → currentAction limpo ───────────
  it('should clear currentAction on full success response', waitForAsync(() => {
    let notifSpy: jasmine.Spy;
    fixture.detectChanges();
    httpMock.expectOne(r => r.url.includes(apiPath)).flush(mockResponse);
    return fixture.whenStable().then(() => {
      fixture.detectChanges();
      stubModals();

      notifSpy = spyOn(TestBed.inject(PoNotificationService), 'success');
      const firstAction = component.actions[0];
      component.openAction(firstAction, [mockItem]);
      component.executeAction();
      fixture.detectChanges();

      // Flush POST da ação
      httpMock.expectOne(r => r.method === 'POST').flush({ sucesso: 1, falha: 0, itens: [] });
      return fixture.whenStable();
    }).then(() => {
      // Flush reload da lista após a ação (handleActionResponse chama load())
      httpMock.match(r => r.url.includes(apiPath)).forEach(r => r.flush(mockResponse));
      return fixture.whenStable();
    }).then(() => {
      fixture.detectChanges();
      expect(notifSpy).toHaveBeenCalled();
      expect(component.currentAction()).toBeNull();
    });
  }));

  // ── executar ação → POST → falha parcial → actionResults preenchido ───────
  it('should set actionResults on partial failure response', waitForAsync(() => {
    fixture.detectChanges();
    httpMock.expectOne(r => r.url.includes(apiPath)).flush(mockResponse);
    return fixture.whenStable().then(() => {
      fixture.detectChanges();
      stubModals();

      // Agente: usar component.actions[0] ou o primeiro ActionConfig real
      const firstAction = component.actions[0];
      component.openAction(firstAction, [mockItem]);
      component.executeAction();
      fixture.detectChanges();

      // Agente: substituir `mockItem['numero']` pelo campo chave real do modelo (campoChave de actions[0])
      httpMock.expectOne(r => r.method === 'POST').flush({
        sucesso: 0,
        falha: 1,
        itens: [{ id: String(mockItem['numero' as keyof {{ModelInterface}}]), status: 'erro', mensagem: 'Erro simulado' }],
      });
      return fixture.whenStable();
    }).then(() => {
      httpMock.match(r => r.url.includes(apiPath)).forEach(r => r.flush(mockResponse));
      return fixture.whenStable();
    }).then(() => {
      fixture.detectChanges();
      expect(component.actionResults()).not.toBeNull();
      expect(component.actionResults()?.falha).toBe(1);
    });
  }));

  // ── executar ação → erro HTTP → notification.error e currentAction limpo ──
  it('should call notification.error on action HTTP failure', waitForAsync(() => {
    let notifSpy: jasmine.Spy;
    fixture.detectChanges();
    httpMock.expectOne(r => r.url.includes(apiPath)).flush(mockResponse);
    return fixture.whenStable().then(() => {
      fixture.detectChanges();
      stubModals();

      notifSpy = spyOn(TestBed.inject(PoNotificationService), 'error');
      const firstAction = component.actions[0];
      component.openAction(firstAction, [mockItem]);
      component.executeAction();
      fixture.detectChanges();

      httpMock.expectOne(r => r.method === 'POST').flush(
        'Server error', { status: 500, statusText: 'Internal Server Error' }
      );
      return fixture.whenStable();
    }).then(() => {
      fixture.detectChanges();
      expect(notifSpy).toHaveBeenCalled();
      expect(component.currentAction()).toBeNull();
    });
  }));
```

## Cenários two-panel-browse (incluir se `selectedLeft` + `selectedRight` presentes)

```typescript
  it('should enable confirm when both panels have selection', waitForAsync(() => {
    fixture.detectChanges();
    httpMock.match(r => r.url.includes(apiPath)).forEach(r => r.flush(mockResponse));
    return fixture.whenStable().then(() => {
      fixture.detectChanges();

      // Agente: invocar métodos reais de seleção por painel
      // component.onSelectLeft(mockItem);
      // component.onSelectRight(mockItem);
      fixture.detectChanges();
      // Agente: verificar signal ou computed que controla o botão de confirmação
      // expect(component.canConfirm()).toBeTrue();
    });
  }));
```

## Cenários stacked-browse (incluir se `activeBrowse` presente)

```typescript
  it('should switch activeBrowse on tab', waitForAsync(() => {
    fixture.detectChanges();
    httpMock.match(r => r.url.includes(apiPath)).forEach(r => r.flush(mockResponse));
    return fixture.whenStable().then(() => {
      fixture.detectChanges();

      const initialBrowse = component.activeBrowse();
      // Agente: invocar método de troca de browse real (ex: onTabKey, switchBrowse)
      // component.onTabKey();
      fixture.detectChanges();
      expect(component.activeBrowse()).not.toBe(initialBrowse);
    });
  }));
```

## Cenários master-detail (incluir se `detailColumns` presente)

```typescript
  it('should load detail rows on row expand', waitForAsync(() => {
    fixture.detectChanges();
    httpMock.expectOne(r => r.url.includes(apiPath)).flush(mockResponse);
    return fixture.whenStable().then(() => {
      fixture.detectChanges();

      // Agente: invocar método de expansão real com mockItem
      // component.onRowExpand(mockItem);
      fixture.detectChanges();

      // Agente: ajustar URL do detalhe conforme endpoint real
      const detailReq = httpMock.expectOne(r =>
        r.url.includes(apiPath) && r.url.includes('/itens')
      );
      detailReq.flush({ items: [], hasNext: false });
      return fixture.whenStable();
    }).then(() => {
      fixture.detectChanges();
    });
  }));
```

Fechar com:
```typescript
});
```

## Nota para o agente

- Substituir comentários `// Agente:` e campos com `mockItem['campo']` pelos valores reais do modelo
- Incluir APENAS os blocos de cenários correspondentes ao subtipo identificado no Passo 2
- Para action-list: `String(mockItem['numero' as keyof Titulo])` — usar o campo `campoChave` real de `actions[0].campoChave`
- O sinal de loading é `loading()` (não `isLoading()`) em componentes action-list
- **CRÍTICO — PoModalComponent.open()**: `openAction()` chama `confirmModal.open()`, que executa `setTimeout+focus` em `nativeElement`. Em testes unitários sem DOM de produção isso gera `TypeError: Cannot read properties of undefined (reading 'nativeElement')`. Solução obrigatória: chamar `stubModals()` após o primeiro `fixture.detectChanges()` (que inicializa o `@ViewChild`) e antes de qualquer `openAction()`/`executeAction()`.
- Para `executeAction()`: após o POST de sucesso/falha parcial, o componente chama `load()` gerando um segundo GET — sempre fazer flush desse reload com `httpMock.match(r => r.url.includes(apiPath)).forEach(r => r.flush(mockResponse))`
- Para `notification.success`: o spy deve ser criado ANTES de `executeAction()` ser chamado
- **NÃO usar `fakeAsync`** com componentes PO-UI — registram `setTimeout` internos que causam "N timer(s) still in the queue"
