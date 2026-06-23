import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { PoNotificationService } from '@po-ui/ng-components';
import { PedidoCompraStackedComponent } from './pedido-compra-stacked.component';

describe('PedidoCompraStackedComponent', () => {
  let component: PedidoCompraStackedComponent;
  let fixture: ComponentFixture<PedidoCompraStackedComponent>;
  let httpMock: HttpTestingController;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [PedidoCompraStackedComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PedidoCompraStackedComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  // ── smoke ────────────────────────────────────────────────────────────────────
  it('should create', waitForAsync(() => {
    fixture.detectChanges();
    return fixture.whenStable().then(() => {
      fixture.detectChanges();
      expect(component).toBeTruthy();
    });
  }));

  // ── load inicial com DEMO data (5 pedidos) ───────────────────────────────────
  it('should load all master items from demo on init', waitForAsync(() => {
    fixture.detectChanges();
    return fixture.whenStable().then(() => {
      fixture.detectChanges();
      expect(component.items().length).toBe(5);
      expect(component.masterAtual()).not.toBeNull();
    });
  }));

  // ── primeiro item selecionado automaticamente em ngOnInit ─────────────────────
  it('should auto-select first master item after buscar()', waitForAsync(() => {
    fixture.detectChanges();
    return fixture.whenStable().then(() => {
      fixture.detectChanges();
      expect(component.masterAtual()?.numero).toBe('000001');
      expect(component.detailItems().length).toBeGreaterThan(0);
    });
  }));

  // ── onMasterSelecionado → carrega detail do pedido ───────────────────────────
  it('should load detail items for selected master', waitForAsync(() => {
    fixture.detectChanges();
    return fixture.whenStable().then(() => {
      fixture.detectChanges();
      component.onMasterSelecionado(component.items()[1]); // numero '000002' → 2 itens
      return fixture.whenStable();
    }).then(() => {
      fixture.detectChanges();
      expect(component.masterAtual()?.numero).toBe('000002');
      expect(component.detailItems().length).toBe(2);
    });
  }));

  // ── onItemSelecionado → itensSelecionados cresce ──────────────────────────────
  it('should add item to itensSelecionados on onItemSelecionado', waitForAsync(() => {
    fixture.detectChanges();
    return fixture.whenStable().then(() => {
      fixture.detectChanges();
      const item = component.detailItems()[0];
      component.onItemSelecionado(item);
      expect(component.itensSelecionados()).toContain(item);
      expect(component.qtdSelecionados()).toBe(1);
      expect(component.podeConfirmar()).toBeTrue();
    });
  }));

  // ── onItemDeselecionado → remove do itensSelecionados ────────────────────────
  it('should remove item from itensSelecionados on onItemDeselecionado', waitForAsync(() => {
    fixture.detectChanges();
    return fixture.whenStable().then(() => {
      fixture.detectChanges();
      const item = component.detailItems()[0];
      component.onItemSelecionado(item);
      component.onItemDeselecionado(item);
      expect(component.itensSelecionados()).not.toContain(item);
      expect(component.qtdSelecionados()).toBe(0);
      expect(component.podeConfirmar()).toBeFalse();
    });
  }));

  // ── onTodosItensSelecionados → todos os detailItems selecionados ──────────────
  it('should select all detail items on onTodosItensSelecionados', waitForAsync(() => {
    fixture.detectChanges();
    return fixture.whenStable().then(() => {
      fixture.detectChanges();
      component.onTodosItensSelecionados();
      expect(component.itensSelecionados().length).toBe(component.detailItems().length);
      expect(component.podeConfirmar()).toBeTrue();
    });
  }));

  // ── onTodosItensDeselecionados → limpa seleção ───────────────────────────────
  it('should clear all selections on onTodosItensDeselecionados', waitForAsync(() => {
    fixture.detectChanges();
    return fixture.whenStable().then(() => {
      fixture.detectChanges();
      component.onTodosItensSelecionados();
      component.onTodosItensDeselecionados();
      expect(component.itensSelecionados().length).toBe(0);
      expect(component.podeConfirmar()).toBeFalse();
    });
  }));

  // ── totalSelecionado computed ─────────────────────────────────────────────────
  it('should compute totalSelecionado from selected items', waitForAsync(() => {
    fixture.detectChanges();
    return fixture.whenStable().then(() => {
      fixture.detectChanges();
      component.onTodosItensSelecionados();
      // '000001' tem 3 itens: 27500 + 10680 + 10770.90 = 48950.90
      expect(component.totalSelecionado()).toBeCloseTo(48950.90, 2);
    });
  }));

  // ── aprovarItens → notification.success + limpa seleção ──────────────────────
  it('should call notification.success and clear itensSelecionados on aprovarItens', waitForAsync(() => {
    const successSpy = spyOn(TestBed.inject(PoNotificationService), 'success');
    fixture.detectChanges();
    return fixture.whenStable().then(() => {
      fixture.detectChanges();
      component.onTodosItensSelecionados();
      component.aprovarItens();
      return fixture.whenStable();
    }).then(() => {
      fixture.detectChanges();
      expect(successSpy).toHaveBeenCalled();
      expect(component.itensSelecionados().length).toBe(0);
    });
  }));

  // ── buscar() com filtro por campo1 (número) ──────────────────────────────────
  it('should filter items by numero on buscar() with campo1', waitForAsync(() => {
    fixture.detectChanges();
    return fixture.whenStable().then(() => {
      fixture.detectChanges();
      component.filtros.campo1 = '000003';
      component.buscar();
      return fixture.whenStable();
    }).then(() => {
      fixture.detectChanges();
      expect(component.items().length).toBe(1);
      expect(component.items()[0].numero).toBe('000003');
      expect(component.isFiltrado()).toBeTrue();
    });
  }));

  // ── removerFiltro → restaura todos os 5 pedidos ──────────────────────────────
  it('should restore all 5 items on removerFiltro()', waitForAsync(() => {
    fixture.detectChanges();
    return fixture.whenStable().then(() => {
      fixture.detectChanges();
      component.filtros.campo1 = '000003';
      component.buscar();
      return fixture.whenStable();
    }).then(() => {
      fixture.detectChanges();
      component.removerFiltro();
      return fixture.whenStable();
    }).then(() => {
      fixture.detectChanges();
      expect(component.items().length).toBe(5);
      expect(component.isFiltrado()).toBeFalse();
    });
  }));

  // ── Tab alterna activeBrowse de master para detail ────────────────────────────
  it('should switch activeBrowse from master to detail on Tab key', waitForAsync(() => {
    fixture.detectChanges();
    return fixture.whenStable().then(() => {
      fixture.detectChanges();
      expect(component.activeBrowse()).toBe('master');
      component.onKeyDown(new KeyboardEvent('keydown', { key: 'Tab' }));
      return fixture.whenStable();
    }).then(() => {
      fixture.detectChanges();
      expect(component.activeBrowse()).toBe('detail');
    });
  }));

  // ── Tab de detail volta para master ──────────────────────────────────────────
  it('should switch activeBrowse back to master on second Tab key', waitForAsync(() => {
    fixture.detectChanges();
    return fixture.whenStable().then(() => {
      fixture.detectChanges();
      component.onKeyDown(new KeyboardEvent('keydown', { key: 'Tab' }));
      return fixture.whenStable();
    }).then(() => {
      fixture.detectChanges();
      component.onKeyDown(new KeyboardEvent('keydown', { key: 'Tab' }));
      return fixture.whenStable();
    }).then(() => {
      fixture.detectChanges();
      expect(component.activeBrowse()).toBe('master');
    });
  }));
});
