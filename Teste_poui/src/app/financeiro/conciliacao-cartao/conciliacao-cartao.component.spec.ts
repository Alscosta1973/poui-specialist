/**
 * @generated  poui-specialist v1.0
 * @author     Andre Costa <andre.andrelscosta@gmail.com>
 */
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { ConciliacaoCartaoComponent } from './conciliacao-cartao.component';
import {
  ContaReceber,
  MovimentoAdquirente,
  StatusConciliacao,
} from './models/conciliacao-cartao.model';
import { ConciliacaoCartaoService } from './conciliacao-cartao.service';

describe('ConciliacaoCartaoComponent', () => {
  let component: ConciliacaoCartaoComponent;
  let fixture: ComponentFixture<ConciliacaoCartaoComponent>;
  let service: ConciliacaoCartaoService;
  let httpMock: HttpTestingController;

  const s = (v: string): StatusConciliacao => v as StatusConciliacao;

  const mockMovimentos: MovimentoAdquirente[] = [
    { id: 'M001', dtPagamento: '2025-01-10', titulo: '', numPedido: 'PED001', numParcela: '001', vlBruto: 1000.00, vlTaxa: 30.00, vlLiquido:  970.00, status: s('1'), lote: 'LOT001' },
    { id: 'M002', dtPagamento: '2025-01-12', titulo: '', numPedido: 'PED002', numParcela: '002', vlBruto: 2500.00, vlTaxa: 75.00, vlLiquido: 2425.00, status: s('1'), lote: 'LOT001' },
    { id: 'M003', dtPagamento: '2025-01-15', titulo: '', numPedido: 'PED003', numParcela: '003', vlBruto:  800.00, vlTaxa: 24.00, vlLiquido:  776.00, status: s('2'), lote: 'LOT001' },
  ];

  const mockTitulos: ContaReceber[] = [
    { id: 'R001', pedido: 'PED001', emissao: '2025-01-05', numTitulo: 'NF001', parcela: '001', valor: 1000.00, vlTaxa: 30.00, prefixo: 'NF', vlLiquido:  970.00, status: s('1') },
    { id: 'R002', pedido: 'PED002', emissao: '2025-01-08', numTitulo: 'NF002', parcela: '002', valor: 2500.00, vlTaxa: 75.00, prefixo: 'NF', vlLiquido: 2425.00, status: s('1') },
  ];

  // Inicializa o componente com dados síncronos (sem delay do service real)
  function flushInit(): Promise<void> {
    fixture.detectChanges(); // ngOnInit → carregar() → subscribe → dados carregados sincronamente
    return fixture.whenStable().then(() => { fixture.detectChanges(); });
  }

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [ConciliacaoCartaoComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture  = TestBed.createComponent(ConciliacaoCartaoComponent);
    component = fixture.componentInstance;
    service  = TestBed.inject(ConciliacaoCartaoService);
    httpMock = TestBed.inject(HttpTestingController);
    // Spy em todos os métodos de carregamento: elimina delay(700) e evita dados de produção
    spyOn(service, 'carregarMovimentos').and.returnValue(of([...mockMovimentos]));
    spyOn(service, 'carregarTitulos').and.returnValue(of([...mockTitulos]));
  });

  afterEach(() => {
    httpMock.verify(); // nenhum request HTTP é esperado (service usa of() mockado)
  });

  // ── smoke ─────────────────────────────────────────────────────────────────
  it('should create', waitForAsync(() =>
    flushInit().then(() => expect(component).toBeTruthy())
  ));

  // ── load inicial ──────────────────────────────────────────────────────────
  it('should load movimentos and titulos on init', waitForAsync(() =>
    flushInit().then(() => {
      expect(component.movimentos().length).toBe(3);
      expect(component.contasReceber().length).toBe(2);
      expect(component.loading()).toBeFalse();
    })
  ));

  // ── carregar() sem banco → warning, service não é chamado ─────────────────
  it('should warn and skip service when banco is empty', waitForAsync(() => {
    const warnSpy = spyOn((component as any).notification, 'warning');
    component.banco = '';
    fixture.detectChanges(); // ngOnInit → carregar() → warns and returns early
    return fixture.whenStable().then(() => {
      expect(warnSpy).toHaveBeenCalled();
      expect(service.carregarMovimentos).not.toHaveBeenCalled();
      expect(component.movimentos().length).toBe(0);
    });
  }));

  // ── onSelectAdq: status '1' → marca adquirente ────────────────────────────
  it('should set marcadoAdq on valid adquirente selection', waitForAsync(() =>
    flushInit().then(() => {
      component.onSelectAdq(component.movimentos()[0]);
      fixture.detectChanges();
      expect(component.marcadoAdq()?.id).toBe('M001');
    })
  ));

  // ── onSelectAdq: status != '1' → warning + rejeita + setTimeout(0) ────────
  // Spy em notification.warning ANTES do flushInit para capturar warning do banco (se hover)
  it('should warn and reject onSelectAdq when status is not "1"', waitForAsync(() => {
    const warnSpy = spyOn((component as any).notification, 'warning');
    return flushInit().then(() => {
      component.onSelectAdq(component.movimentos()[2]); // M003 status '2'
      return fixture.whenStable();
    }).then(() => {
      fixture.detectChanges();
      expect(warnSpy).toHaveBeenCalled();
      expect(component.marcadoAdq()).toBeNull();
    });
  }));

  // ── onUnselectAdq: limpa marcadoAdq ───────────────────────────────────────
  it('should clear marcadoAdq on onUnselectAdq', waitForAsync(() =>
    flushInit().then(() => {
      component.onSelectAdq(component.movimentos()[0]);
      component.onUnselectAdq(component.movimentos()[0]);
      fixture.detectChanges();
      expect(component.marcadoAdq()).toBeNull();
    })
  ));

  // ── onSelectRec sem marcadoAdq → warning ─────────────────────────────────
  it('should warn on onSelectRec when no adquirente is selected', waitForAsync(() => {
    const warnSpy = spyOn((component as any).notification, 'warning');
    return flushInit().then(() => {
      component.onSelectRec(component.contasReceber()[0]);
      return fixture.whenStable();
    }).then(() => {
      fixture.detectChanges();
      expect(warnSpy).toHaveBeenCalled();
      expect(component.marcadoRec()).toBeNull();
    });
  }));

  // ── onSelectRec: parcela não coincide → warning ───────────────────────────
  it('should warn on onSelectRec when parcela does not match', waitForAsync(() => {
    const warnSpy = spyOn((component as any).notification, 'warning');
    return flushInit().then(() => {
      component.onSelectAdq(component.movimentos()[0]); // parcela '001'
      component.onSelectRec(component.contasReceber()[1]); // parcela '002'
      return fixture.whenStable();
    }).then(() => {
      fixture.detectChanges();
      expect(warnSpy).toHaveBeenCalled();
      expect(component.marcadoRec()).toBeNull();
    });
  }));

  // ── onSelectRec: diferença de valor > tolerância → warning ───────────────
  it('should warn on onSelectRec when valor difference exceeds tolerancia', waitForAsync(() => {
    const warnSpy = spyOn((component as any).notification, 'warning');
    return flushInit().then(() => {
      // M001: vlBruto 1000. Cria título com valor muito diferente (mesma parcela)
      component.onSelectAdq(component.movimentos()[0]); // parcela '001', vlBruto 1000
      const tituloIncompativel: ContaReceber = {
        ...mockTitulos[0], id: 'R999', valor: 1500, // diferença 500 >> tolerância 0.01
      };
      component.onSelectRec(tituloIncompativel);
      return fixture.whenStable();
    }).then(() => {
      fixture.detectChanges();
      expect(warnSpy).toHaveBeenCalled();
      expect(component.marcadoRec()).toBeNull();
    });
  }));

  // ── seleção válida nos dois painéis → marcações setadas ──────────────────
  it('should link both panels when selection is valid', waitForAsync(() =>
    flushInit().then(() => {
      component.onSelectAdq(component.movimentos()[0]); // M001 parcela '001' vlBruto 1000
      component.onSelectRec(component.contasReceber()[0]); // R001 parcela '001' valor 1000
      fixture.detectChanges();
      expect(component.marcadoAdq()?.id).toBe('M001');
      expect(component.marcadoRec()?.id).toBe('R001');
    })
  ));

  // ── confirmar() incompleto → warning ─────────────────────────────────────
  it('should warn on confirmar() when selection is incomplete', waitForAsync(() => {
    const warnSpy = spyOn((component as any).notification, 'warning');
    return flushInit().then(() => {
      component.confirmar();
      fixture.detectChanges();
      expect(warnSpy).toHaveBeenCalled();
    });
  }));

  // ── confirmar() completo → status '3', marcações limpas ──────────────────
  it('should mark both items status "3" and clear selection on confirmar()', waitForAsync(() => {
    const successSpy = spyOn((component as any).notification, 'success');
    spyOn(service, 'confirmar').and.returnValue(of(undefined));
    return flushInit().then(() => {
      component.onSelectAdq(component.movimentos()[0]);
      component.onSelectRec(component.contasReceber()[0]);
      component.confirmar();
      return fixture.whenStable();
    }).then(() => {
      fixture.detectChanges();
      expect(successSpy).toHaveBeenCalled();
      expect(component.marcadoAdq()).toBeNull();
      expect(component.marcadoRec()).toBeNull();
      expect(component.movimentos().find(m => m.id === 'M001')?.status).toBe('3');
      expect(component.contasReceber().find(r => r.id === 'R001')?.status).toBe('3');
    });
  }));

  // ── automatico() → movimentos e títulos marcados com status '2' ──────────
  it('should mark conciliated items as status "2" after automatico()', waitForAsync(() => {
    const successSpy = spyOn((component as any).notification, 'success');
    spyOn(service, 'automatico').and.returnValue(of({ movimentos: ['M001'], titulos: ['R001'] }));
    return flushInit().then(() => {
      component.automatico();
      return fixture.whenStable();
    }).then(() => {
      fixture.detectChanges();
      expect(successSpy).toHaveBeenCalled();
      expect(component.movimentos().find(m => m.id === 'M001')?.status).toBe('2');
      expect(component.contasReceber().find(r => r.id === 'R001')?.status).toBe('2');
      expect(component.movimentos().find(m => m.id === 'M002')?.status).toBe('1');
    });
  }));

  // ── cancelar() → limpa todos os campos e sinais ───────────────────────────
  it('should clear all state on cancelar()', waitForAsync(() =>
    flushInit().then(() => {
      component.onSelectAdq(component.movimentos()[0]);
      component.cancelar();
      fixture.detectChanges();
      expect(component.movimentos().length).toBe(0);
      expect(component.contasReceber().length).toBe(0);
      expect(component.marcadoAdq()).toBeNull();
      expect(component.marcadoRec()).toBeNull();
      expect(component.banco).toBe('');
    })
  ));

  // ── totalMovimentos computed ───────────────────────────────────────────────
  it('should compute totalMovimentos as sum of vlLiquido', waitForAsync(() =>
    flushInit().then(() => {
      const expected = mockMovimentos.reduce((s, m) => s + m.vlLiquido, 0);
      expect(component.totalMovimentos()).toBeCloseTo(expected, 2);
    })
  ));
});
