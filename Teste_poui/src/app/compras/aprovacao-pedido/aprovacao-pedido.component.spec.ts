/**
 * @generated  poui-specialist v1.0
 * @author     Andre Costa <andre.andrelscosta@gmail.com>
 */
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AprovacaoPedidoComponent } from './aprovacao-pedido.component';
import { PedidoAprovacao, ItemPedidoAprovacao } from './models/aprovacao-pedido.model';

describe('AprovacaoPedidoComponent', () => {
  let component: AprovacaoPedidoComponent;
  let fixture: ComponentFixture<AprovacaoPedidoComponent>;
  let httpMock: HttpTestingController;

  const API = '/rest/api/custom/v1/aprovacaopedido';

  const mockMasterItems: PedidoAprovacao[] = [
    { numero: '000010', emissao: '2026-06-10', fornecedor: 'FORNECEDOR ABC LTDA',   loja: '01', valorTotal:  5500, status: 'P' },
    { numero: '000011', emissao: '2026-06-12', fornecedor: 'DISTRIBUIDORA XYZ S/A', loja: '02', valorTotal: 12000, status: 'P' },
  ];

  const mockDetailItems: ItemPedidoAprovacao[] = [
    { item: '001', produto: 'PROD010', descricao: 'Parafuso M8x25',   unidade: 'CX', quantidade: 10, valorUnit: 150, valorTotal: 1500 },
    { item: '002', produto: 'PROD011', descricao: 'Arruela Lisa 3/8', unidade: 'KG', quantidade: 20, valorUnit: 100, valorTotal: 2000 },
  ];

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [AprovacaoPedidoComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture  = TestBed.createComponent(AprovacaoPedidoComponent);
    component = fixture.componentInstance;
    httpMock  = TestBed.inject(HttpTestingController);
  });

  afterEach(() => { httpMock.verify(); });

  // Inicializa com HTTP de sucesso: flush getAll → whenStable (setTimeout onMasterSelecionado) → flush getItens
  function flushInit(): Promise<void> {
    fixture.detectChanges();
    httpMock
      .expectOne(r => r.url.startsWith(API) && !r.url.includes('/itens') && !r.url.includes('/aprovar'))
      .flush({ items: mockMasterItems, hasNext: false });
    return fixture.whenStable().then(() => {
      httpMock.match(r => r.url.includes('/itens')).forEach(r => r.flush(mockDetailItems));
      return fixture.whenStable();
    }).then(() => { fixture.detectChanges(); });
  }

  // ── smoke ────────────────────────────────────────────────────────────────
  it('should create', waitForAsync(() =>
    flushInit().then(() => expect(component).toBeTruthy())
  ));

  // ── load inicial ─────────────────────────────────────────────────────────
  it('should load master items on init', waitForAsync(() =>
    flushInit().then(() => {
      expect(component.items().length).toBe(2);
      expect(component.masterAtual()?.numero).toBe('000010');
      expect(component.loading()).toBeFalse();
    })
  ));

  // ── detail carregado automaticamente ao inicializar ───────────────────
  it('should load detail items for first master after init', waitForAsync(() =>
    flushInit().then(() => {
      expect(component.detailItems().length).toBeGreaterThan(0);
      expect(component.masterAtual()).not.toBeNull();
    })
  ));

  // ── onMasterSelecionado → muda masterAtual e carrega novos itens ──────
  it('should update masterAtual and reload detail on onMasterSelecionado', waitForAsync(() =>
    flushInit().then(() => {
      component.onMasterSelecionado(mockMasterItems[1]);
      return fixture.whenStable();
    }).then(() => {
      httpMock.match(r => r.url.includes('/000011/itens')).forEach(r => r.flush([]));
      return fixture.whenStable();
    }).then(() => {
      fixture.detectChanges();
      expect(component.masterAtual()?.numero).toBe('000011');
    })
  ));

  // ── seleção / desseleção de item de detalhe ───────────────────────────
  it('should add and remove item from itensSelecionados', waitForAsync(() =>
    flushInit().then(() => {
      const item = component.detailItems()[0];

      component.onItemSelecionado(item);
      expect(component.itensSelecionados()).toContain(item);

      component.onItemDeselecionado(item);
      expect(component.itensSelecionados()).not.toContain(item);
    })
  ));

  // ── selecionar todos / desselecionar todos ────────────────────────────
  it('should select and clear all detail items', waitForAsync(() =>
    flushInit().then(() => {
      component.onTodosItensSelecionados();
      expect(component.itensSelecionados().length).toBe(component.detailItems().length);
      expect(component.podeConfirmar()).toBeTrue();

      component.onTodosItensDeselecionados();
      expect(component.itensSelecionados().length).toBe(0);
    })
  ));

  // ── confirmar() → PATCH → sucesso → notification.success + status A ───
  it('should call notification.success and set status to A on confirmar()', waitForAsync(() => {
    const successSpy = spyOn((component as any).notification, 'success');
    return flushInit().then(() => {
      component.confirmar();
      httpMock.expectOne(r => r.url.includes('/000010/aprovar') && r.method === 'PATCH').flush({});
      return fixture.whenStable();
    }).then(() => {
      fixture.detectChanges();
      expect(successSpy).toHaveBeenCalled();
      expect(component.masterAtual()?.status).toBe('A');
      expect(component.itensSelecionados().length).toBe(0);
    });
  }));

  // ── confirmar() → PATCH → erro HTTP → notification.error ─────────────
  it('should call notification.error on confirmar() HTTP failure', waitForAsync(() => {
    const errorSpy = spyOn((component as any).notification, 'error');
    return flushInit().then(() => {
      component.confirmar();
      httpMock.expectOne(r => r.url.includes('/000010/aprovar') && r.method === 'PATCH')
        .flush('Server error', { status: 500, statusText: 'Internal Server Error' });
      return fixture.whenStable();
    }).then(() => {
      fixture.detectChanges();
      expect(errorSpy).toHaveBeenCalled();
      expect(component.masterAtual()?.status).toBe('P');
    });
  }));

  // ── podeConfirmar: falso quando status = A ────────────────────────────
  it('should return false for podeConfirmar when status is A', waitForAsync(() =>
    flushInit().then(() => {
      component.masterAtual.update(m => m ? { ...m, status: 'A' as const } : m);
      fixture.detectChanges();
      expect(component.podeConfirmar()).toBeFalse();
    })
  ));

  // ── filtro buscar() + removerFiltro ───────────────────────────────────
  // Spy em getItens para evitar chain infinita de GETs /itens:
  // po-table emite (p-selected) em cada ciclo de CD, chamando onMasterSelecionado →
  // _carregarItens → getItens. Com o spy, não há request HTTP — o foco é isFiltrado + items.
  it('should filter and restore items via buscar() and removerFiltro()', waitForAsync(() => {
    spyOn((component as any).service, 'getItens').and.returnValue(of([]));
    const isGetAll = (url: string) =>
      url.startsWith(API) && !url.includes('/itens') && !url.includes('/aprovar');

    fixture.detectChanges();
    httpMock.expectOne(r => isGetAll(r.url)).flush({ items: mockMasterItems, hasNext: false });
    return fixture.whenStable().then(() => {
      fixture.detectChanges();
      expect(component.items().length).toBe(2);

      component.filtros.campo1 = '000010';
      component.buscar();
      httpMock.expectOne(r => isGetAll(r.url)).flush({ items: [mockMasterItems[0]], hasNext: false });
      return fixture.whenStable();
    }).then(() => {
      fixture.detectChanges();
      expect(component.items().length).toBe(1);
      expect(component.isFiltrado()).toBeTrue();

      component.removerFiltro();
      httpMock.expectOne(r => isGetAll(r.url)).flush({ items: mockMasterItems, hasNext: false });
      return fixture.whenStable();
    }).then(() => {
      fixture.detectChanges();
      expect(component.isFiltrado()).toBeFalse();
      expect(component.items().length).toBe(2);
    });
  }));

  // ── Tab alterna activeBrowse master ↔ detail ──────────────────────────
  it('should switch activeBrowse on Tab key', waitForAsync(() =>
    flushInit().then(() => {
      expect(component.activeBrowse()).toBe('master');
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
    })
  ));

  // ── buscar() HTTP error → DEMO_MASTER fallback ────────────────────────
  it('should fall back to DEMO_MASTER on buscar() HTTP error', waitForAsync(() => {
    const errorSpy = spyOn((component as any).notification, 'error');
    fixture.detectChanges();
    httpMock.expectOne(r => r.url.startsWith(API) && !r.url.includes('/itens') && !r.url.includes('/aprovar'))
      .flush('error', { status: 500, statusText: 'Server Error' });
    return fixture.whenStable().then(() => {
      httpMock.match(r => r.url.includes('/itens'))
        .forEach(r => r.flush('error', { status: 500, statusText: 'Server Error' }));
      return fixture.whenStable();
    }).then(() => {
      fixture.detectChanges();
      expect(errorSpy).toHaveBeenCalled();
      expect(component.items().length).toBeGreaterThan(0);
    });
  }));
});
