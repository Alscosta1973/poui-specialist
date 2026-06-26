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

> **Stacked-browse — DEMO data**: Componentes stacked-browse frequentemente usam dados DEMO enquanto a
> rota REST não está disponível (chamadas ao service comentadas no código). Nesse caso, **não há HTTP**
> — remover `httpMock.expectOne/match` dos cenários e manter apenas `httpMock.verify()` no `afterEach`
> (passará pois não há requests pendentes). Ainda incluir `provideHttpClient()` e
> `provideHttpClientTesting()` nos providers para satisfazer o DI do service injetado.
>
> **setTimeout chain**: `buscar()` em stacked-browse usa `setTimeout(0, onMasterSelecionado)` →
> `onMasterSelecionado` usa `setTimeout(50, _highlightMasterRow)`. Zone.js rastreia toda a cadeia;
> um único `fixture.whenStable()` aguarda ambos.
>
> **HostListener via método direto**: `@HostListener('window:keydown')` define o método público
> (ex: `onKeyDown`). Chamar `component.onKeyDown(new KeyboardEvent('keydown', { key: 'Tab' }))` é
> a forma correta de testar teclas em unit tests — não é preciso disparar evento no DOM.

```typescript
  // ── load inicial (DEMO data — sem HTTP) ──────────────────────────────────────
  it('should load all master items from demo on init', waitForAsync(() => {
    fixture.detectChanges();
    return fixture.whenStable().then(() => {
      fixture.detectChanges();
      // Agente: ajustar .length para a quantidade de itens DEMO do componente
      expect(component.items().length).toBeGreaterThan(0);
      expect(component.masterAtual()).not.toBeNull();
    });
  }));

  // ── onMasterSelecionado → carrega detail ──────────────────────────────────────
  it('should load detail items for selected master', waitForAsync(() => {
    fixture.detectChanges();
    return fixture.whenStable().then(() => {
      fixture.detectChanges();
      // Agente: substituir items()[N] pelo índice com itens conhecidos
      component.onMasterSelecionado(component.items()[0]);
      return fixture.whenStable();
    }).then(() => {
      fixture.detectChanges();
      expect(component.detailItems().length).toBeGreaterThan(0);
    });
  }));

  // ── seleção / desseleção de item de detalhe ───────────────────────────────────
  it('should add and remove item from itensSelecionados', waitForAsync(() => {
    fixture.detectChanges();
    return fixture.whenStable().then(() => {
      fixture.detectChanges();
      const item = component.detailItems()[0];
      // Agente: substituir onItemSelecionado/onItemDeselecionado pelos métodos reais
      component.onItemSelecionado(item);
      expect(component.itensSelecionados()).toContain(item);
      component.onItemDeselecionado(item);
      expect(component.itensSelecionados()).not.toContain(item);
    });
  }));

  // ── selecionar todos / desselecionar todos ────────────────────────────────────
  it('should select and clear all detail items', waitForAsync(() => {
    fixture.detectChanges();
    return fixture.whenStable().then(() => {
      fixture.detectChanges();
      // Agente: substituir pelos métodos reais de select-all e deselect-all
      component.onTodosItensSelecionados();
      expect(component.itensSelecionados().length).toBe(component.detailItems().length);
      expect(component.podeConfirmar()).toBeTrue();
      component.onTodosItensDeselecionados();
      expect(component.itensSelecionados().length).toBe(0);
    });
  }));

  // ── aprovarItens / ação principal → notification.success ─────────────────────
  it('should call notification.success and clear selection on ação principal', waitForAsync(() => {
    const successSpy = spyOn(TestBed.inject(PoNotificationService), 'success');
    fixture.detectChanges();
    return fixture.whenStable().then(() => {
      fixture.detectChanges();
      component.onTodosItensSelecionados();
      // Agente: substituir aprovarItens() pelo método de confirmação real
      component.aprovarItens();
      return fixture.whenStable();
    }).then(() => {
      fixture.detectChanges();
      expect(successSpy).toHaveBeenCalled();
      expect(component.itensSelecionados().length).toBe(0);
    });
  }));

  // ── filtro + removerFiltro ─────────────────────────────────────────────────────
  it('should filter and restore items via buscar() and removerFiltro()', waitForAsync(() => {
    fixture.detectChanges();
    return fixture.whenStable().then(() => {
      fixture.detectChanges();
      const totalOriginal = component.items().length;
      // Agente: ajustar campo e valor para o filtro real do componente
      component.filtros.campo1 = component.items()[0].numero;
      component.buscar();
      return fixture.whenStable();
    }).then(() => {
      fixture.detectChanges();
      expect(component.items().length).toBe(1);
      expect(component.isFiltrado()).toBeTrue();
      component.removerFiltro();
      return fixture.whenStable();
    }).then(() => {
      fixture.detectChanges();
      expect(component.isFiltrado()).toBeFalse();
    });
  }));

  // ── Tab alterna activeBrowse master ↔ detail ──────────────────────────────────
  it('should switch activeBrowse on Tab key', waitForAsync(() => {
    fixture.detectChanges();
    return fixture.whenStable().then(() => {
      fixture.detectChanges();
      expect(component.activeBrowse()).toBe('master');
      // Agente: substituir onKeyDown pelo método HostListener real do componente
      component.onKeyDown(new KeyboardEvent('keydown', { key: 'Tab' }));
      return fixture.whenStable();
    }).then(() => {
      fixture.detectChanges();
      expect(component.activeBrowse()).toBe('detail');
      component.onKeyDown(new KeyboardEvent('keydown', { key: 'Tab' }));
      return fixture.whenStable();
    }).then(() => {
      fixture.detectChanges();
      expect(component.activeBrowse()).toBe('master');
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
- Para `notification.success`/`aprovarItens()`: o spy deve ser criado ANTES de executar a ação
- **Stacked-browse sem HTTP**: se `buscar()` e `_carregarItens()` usam DEMO data (chamadas ao service comentadas), não usar `httpMock.expectOne/match` nos cenários. O `afterEach(() => httpMock.verify())` ainda deve estar presente e passará sem erros. Incluir `provideHttpClient()` e `provideHttpClientTesting()` nos providers (DI do service).
- **`HostListener` via método direto**: `component.onKeyDown(new KeyboardEvent('keydown', { key: 'Tab' }))` — chamar o método diretamente é mais confiável que disparar evento no DOM em testes unitários
- **NÃO usar `fakeAsync`** com componentes PO-UI — registram `setTimeout` internos que causam "N timer(s) still in the queue"
- **po-table emite `(p-selected)` em cada CD** (stacked-browse): `po-table` com `[p-selectable]="true"` emite o evento `(p-selected)` a cada ciclo de CD Angular, não apenas quando o usuário interage. Isso chama `onMasterSelecionado` → `_carregarItens` → GET `/itens` em loop. Em testes que envolvem múltiplas iterações de `buscar()` (ex: filtro + removerFiltro), **spy em `(component as any).service.getItens`** para retornar `of([])` e evitar chain infinita: `spyOn((component as any).service, 'getItens').and.returnValue(of([]));` — adicionar `import { of } from 'rxjs'`.
