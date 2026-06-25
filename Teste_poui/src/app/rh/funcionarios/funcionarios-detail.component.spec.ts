// @generated poui-specialist v1.0 - Task 3 Wave 2
// Testes: FuncionariosDetailComponent | Karma + Jasmine

import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { provideRouter, Router, ActivatedRoute } from '@angular/router';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { of, throwError } from 'rxjs';
import { PoNotificationService } from '@po-ui/ng-components';
import { FuncionariosDetailComponent } from './funcionarios-detail.component';
import { FuncionariosService } from '../services/funcionarios.service';
import { Funcionario } from '../models/funcionario.model';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const mockFuncionario: Funcionario = {
  matricula: '000001',
  nome: 'João da Silva',
  dataAdmissao: '2020-01-15',
  cargo: 'Analista',
  departamento: 'TI',
  situacao: 'A',
  salario: 5000,
  escolaridade: '9',
  deficiencia: '0',
  tipoContrato: 'CLT',
};

function makeRoute(mat: string | null = '000001') {
  return { snapshot: { paramMap: { get: () => mat } } };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('FuncionariosDetailComponent', () => {
  let component: FuncionariosDetailComponent;
  let fixture: ComponentFixture<FuncionariosDetailComponent>;
  let service: jasmine.SpyObj<FuncionariosService>;
  let notification: jasmine.SpyObj<PoNotificationService>;

  /**
   * Configura TestBed e cria a fixture, mas NÃO chama detectChanges.
   * Isso permite ao chamador instalar spies antes do ngOnInit disparar.
   */
  function configure(
    mat: string | null = '000001',
    serviceResult = of(mockFuncionario),
  ) {
    service = jasmine.createSpyObj('FuncionariosService', [
      'getById', 'create', 'update', 'remove',
    ]);
    notification = jasmine.createSpyObj('PoNotificationService', [
      'success', 'warning', 'error',
    ]);
    service.getById.and.returnValue(serviceResult);

    TestBed.configureTestingModule({
      imports: [FuncionariosDetailComponent],
      providers: [
        provideRouter([]),
        { provide: FuncionariosService,   useValue: service },
        { provide: PoNotificationService, useValue: notification },
        { provide: ActivatedRoute,        useValue: makeRoute(mat) },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    });
    fixture   = TestBed.createComponent(FuncionariosDetailComponent);
    component = fixture.componentInstance;
    // Não chama detectChanges aqui — cada teste decide quando disparar ngOnInit
  }

  /** Atalho para o caso comum: configura + detecta mudanças imediatamente. */
  function setup(
    mat: string | null = '000001',
    serviceResult = of(mockFuncionario),
  ) {
    configure(mat, serviceResult);
    fixture.detectChanges();
  }

  afterEach(() => TestBed.resetTestingModule());

  // -------------------------------------------------------------------------
  // Carregamento
  // -------------------------------------------------------------------------

  describe('carregamento', () => {
    it('deve instanciar o componente', () => {
      setup();
      expect(component).toBeTruthy();
    });

    it('deve chamar getById com a matrícula da rota', () => {
      setup('000001');
      expect(service.getById).toHaveBeenCalledWith('000001');
    });

    it('deve preencher o signal funcionario após carregamento', fakeAsync(() => {
      setup('000001');
      tick();
      expect(component.funcionario()).toEqual(mockFuncionario);
    }));

    it('isLoading deve ser false após carregamento com sucesso', fakeAsync(() => {
      setup('000001');
      tick();
      expect(component.isLoading()).toBeFalse();
    }));

    it('sem matrícula na rota deve exibir erro e navegar de volta', fakeAsync(() => {
      configure(null);
      const routerSpy = spyOn(TestBed.inject(Router), 'navigate').and.returnValue(Promise.resolve(true));
      fixture.detectChanges(); // dispara ngOnInit com spy já instalado
      tick();
      expect(notification.error).toHaveBeenCalled();
      expect(routerSpy).toHaveBeenCalledWith(['/rh/funcionarios']);
    }));

    it('erro na API deve exibir notificação e navegar de volta', fakeAsync(() => {
      configure('000001', throwError(() => new Error('fail')));
      const routerSpy = spyOn(TestBed.inject(Router), 'navigate').and.returnValue(Promise.resolve(true));
      fixture.detectChanges(); // dispara ngOnInit com spy já instalado
      tick();
      expect(notification.error).toHaveBeenCalled();
      expect(routerSpy).toHaveBeenCalledWith(['/rh/funcionarios']);
    }));

    it('isLoading deve ser false após erro da API', fakeAsync(() => {
      configure('000001', throwError(() => new Error('fail')));
      spyOn(TestBed.inject(Router), 'navigate').and.returnValue(Promise.resolve(true));
      fixture.detectChanges();
      tick();
      expect(component.isLoading()).toBeFalse();
    }));
  });

  // -------------------------------------------------------------------------
  // Breadcrumb
  // -------------------------------------------------------------------------

  describe('breadcrumb', () => {
    it('deve ter "Detalhe" no último item', () => {
      setup();
      expect(component.breadcrumb.items.at(-1)?.label).toBe('Detalhe');
    });
  });

  // -------------------------------------------------------------------------
  // Navegação
  // -------------------------------------------------------------------------

  describe('navegação', () => {
    it('navigateToEdit deve navegar para a rota de edição', fakeAsync(() => {
      setup('000001');
      tick(); // aguarda carregamento (matParam setado em ngOnInit)
      const routerSpy = spyOn(TestBed.inject(Router), 'navigate').and.returnValue(Promise.resolve(true));
      component.navigateToEdit();
      expect(routerSpy).toHaveBeenCalledWith([
        '/rh/funcionarios', '000001', 'editar',
      ]);
    }));

    it('goBack deve navegar para /rh/funcionarios', () => {
      setup('000001');
      const routerSpy = spyOn(TestBed.inject(Router), 'navigate').and.returnValue(Promise.resolve(true));
      component.goBack();
      expect(routerSpy).toHaveBeenCalledWith(['/rh/funcionarios']);
    });
  });

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  describe('helpers', () => {
    beforeEach(() => setup());

    it('label() deve retornar o rótulo do mapa', () => {
      expect(component.label('9', component.escolaridadeMap)).toBe('Mestrado');
    });

    it('label() deve retornar "—" para value undefined', () => {
      expect(component.label(undefined, component.escolaridadeMap)).toBe('—');
    });

    it('label() deve retornar o valor original quando não encontrado no mapa', () => {
      expect(component.label('XPTO', component.escolaridadeMap)).toBe('XPTO');
    });

    it('label() deve mapear situação corretamente', () => {
      expect(component.label('A', component.situacaoMap)).toBe('Ativo');
      expect(component.label('F', component.situacaoMap)).toBe('Afastado');
    });

    it('currency() deve formatar valor em BRL', () => {
      const result = component.currency(5000);
      expect(result).toContain('5.000');
    });

    it('currency() deve retornar "—" para undefined', () => {
      expect(component.currency(undefined)).toBe('—');
    });

    it('text() deve retornar "—" para undefined', () => {
      expect(component.text(undefined)).toBe('—');
    });

    it('text() deve retornar a string original', () => {
      expect(component.text('Analista')).toBe('Analista');
    });
  });
});
