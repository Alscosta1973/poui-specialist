// src/app/rh/funcionarios/funcionarios-edit.component.spec.ts
import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { provideRouter, Router, ActivatedRoute } from '@angular/router';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { of, throwError } from 'rxjs';
import { PoNotificationService } from '@po-ui/ng-components';
import { FuncionariosEditComponent } from './funcionarios-edit.component';
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
};

function makeRoute(mat: string | null = null) {
  return { snapshot: { paramMap: { get: () => mat } } };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('FuncionariosEditComponent', () => {
  let component: FuncionariosEditComponent;
  let fixture: ComponentFixture<FuncionariosEditComponent>;
  let service: jasmine.SpyObj<FuncionariosService>;
  let notificationSpy: jasmine.SpyObj<PoNotificationService>;

  function setup(
    mat: string | null = null,
    getByIdResult = of(mockFuncionario),
  ) {
    service = jasmine.createSpyObj('FuncionariosService', [
      'getById', 'create', 'update', 'remove',
    ]);
    service.getById.and.returnValue(getByIdResult);

    notificationSpy = jasmine.createSpyObj('PoNotificationService', [
      'success', 'warning', 'error',
    ]);

    TestBed.configureTestingModule({
      imports: [FuncionariosEditComponent, ReactiveFormsModule],
      providers: [
        provideRouter([]),
        { provide: FuncionariosService,   useValue: service },
        { provide: ActivatedRoute,        useValue: makeRoute(mat) },
        { provide: PoNotificationService, useValue: notificationSpy },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    });
    fixture   = TestBed.createComponent(FuncionariosEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges(); // dispara ngOnInit
  }

  afterEach(() => TestBed.resetTestingModule());

  // -------------------------------------------------------------------------
  // Modo criar
  // -------------------------------------------------------------------------

  describe('modo criar (sem matrícula na rota)', () => {
    beforeEach(() => setup(null));

    it('deve instanciar o componente', () => {
      expect(component).toBeTruthy();
    });

    it('isEdit deve ser false', () => {
      expect(component.isEdit()).toBeFalse();
    });

    it('não deve chamar getById', () => {
      expect(service.getById).not.toHaveBeenCalled();
    });

    it('breadcrumb deve conter "Novo" no último item', () => {
      expect(component.breadcrumb.items.at(-1)?.label).toBe('Novo');
    });
  });

  // -------------------------------------------------------------------------
  // Modo editar
  // -------------------------------------------------------------------------

  describe('modo editar (com matrícula na rota)', () => {
    beforeEach(() => setup('000001'));

    it('isEdit deve ser true', () => {
      expect(component.isEdit()).toBeTrue();
    });

    it('deve chamar getById com a matrícula da rota', () => {
      expect(service.getById).toHaveBeenCalledWith('000001');
    });

    it('deve preencher o form com os dados carregados', fakeAsync(() => {
      tick();
      expect(component.form.get('nome')?.value).toBe('João da Silva');
    }));

    it('breadcrumb deve conter "Editar" no último item', () => {
      expect(component.breadcrumb.items.at(-1)?.label).toBe('Editar');
    });
  });

  // -------------------------------------------------------------------------
  // Erro no carregamento
  // -------------------------------------------------------------------------

  describe('erro no carregamento em modo editar', () => {
    beforeEach(() =>
      setup('000001', throwError(() => new Error('fail'))),
    );

    it('deve exibir notificação de erro', fakeAsync(() => {
      tick();
      expect(notificationSpy.error).toHaveBeenCalledWith(
        'Erro ao carregar dados do funcionário.',
      );
    }));

    it('isLoading deve ser false após o erro', fakeAsync(() => {
      tick();
      expect(component.isLoading()).toBeFalse();
    }));
  });

  // -------------------------------------------------------------------------
  // save()
  // -------------------------------------------------------------------------

  describe('save()', () => {
    it('deve exibir warning quando o form é inválido', () => {
      setup(null);
      component.save();
      expect(notificationSpy.warning).toHaveBeenCalledWith(
        'Preencha todos os campos obrigatórios.',
      );
    });

    it('deve chamar service.create e notificar sucesso em modo criar', fakeAsync(() => {
      setup(null);
      const routerSpy = spyOn(TestBed.inject(Router), 'navigate').and.returnValue(Promise.resolve(true));
      service.create.and.returnValue(of(mockFuncionario));
      component.form.patchValue({
        matricula: '000002',
        nome: 'Maria Souza',
        dataAdmissao: '2024-01-01',
      });
      component.save();
      tick();
      expect(service.create).toHaveBeenCalled();
      expect(notificationSpy.success).toHaveBeenCalledWith(
        'Funcionário criado com sucesso.',
      );
      expect(routerSpy).toHaveBeenCalledWith(['/rh/funcionarios']);
    }));

    it('deve exibir erro quando create falha', fakeAsync(() => {
      setup(null);
      service.create.and.returnValue(throwError(() => new Error('fail')));
      component.form.patchValue({
        matricula: '000002',
        nome: 'Maria Souza',
        dataAdmissao: '2024-01-01',
      });
      component.save();
      tick();
      expect(notificationSpy.error).toHaveBeenCalledWith('Erro ao criar funcionário.');
    }));

    it('deve chamar service.update e notificar sucesso em modo editar', fakeAsync(() => {
      setup('000001');
      const routerSpy = spyOn(TestBed.inject(Router), 'navigate').and.returnValue(Promise.resolve(true));
      service.update.and.returnValue(of(mockFuncionario));
      tick(); // aguarda loadFuncionario
      component.form.patchValue({ nome: 'João Editado', dataAdmissao: '2020-01-15' });
      component.save();
      tick();
      expect(service.update).toHaveBeenCalledWith(
        '000001',
        jasmine.objectContaining({ nome: 'João Editado' }),
      );
      expect(notificationSpy.success).toHaveBeenCalledWith(
        'Funcionário atualizado com sucesso.',
      );
      expect(routerSpy).toHaveBeenCalledWith(['/rh/funcionarios']);
    }));
  });

  // -------------------------------------------------------------------------
  // goBack()
  // -------------------------------------------------------------------------

  describe('goBack()', () => {
    beforeEach(() => setup(null));

    it('deve navegar para /rh/funcionarios', () => {
      const routerSpy = spyOn(TestBed.inject(Router), 'navigate').and.returnValue(Promise.resolve(true));
      component.goBack();
      expect(routerSpy).toHaveBeenCalledWith(['/rh/funcionarios']);
    });
  });
});
