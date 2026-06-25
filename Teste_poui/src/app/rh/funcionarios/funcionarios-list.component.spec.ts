// @generated poui-specialist v1.0 - Task 8 Wave 1
// Testes: FuncionariosListComponent | Karma + Jasmine

import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
  flush,
} from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { PoDialogService, PoNotificationService } from '@po-ui/ng-components';

import { FuncionariosListComponent } from './funcionarios-list.component';
import { FuncionariosService } from '../services/funcionarios.service';
import {
  Funcionario,
  FuncionariosResponse,
} from '../models/funcionario.model';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const mockFuncionario: Funcionario = {
  matricula: '000001',
  nome: 'Joao da Silva',
  dataAdmissao: '2020-01-15',
  cargo: 'Analista',
  departamento: 'TI',
  situacao: 'A',
};

const mockFuncionario2: Funcionario = {
  matricula: '000002',
  nome: 'Maria Souza',
  dataAdmissao: '2021-03-10',
  cargo: 'Desenvolvedora',
  departamento: 'TI',
  situacao: 'A',
};

const mockResponse: FuncionariosResponse = {
  items: [mockFuncionario],
  hasNext: false,
  page: 1,
  pageSize: 10,
  total: 1,
};

const mockResponsePage2: FuncionariosResponse = {
  items: [mockFuncionario2],
  hasNext: false,
  page: 2,
  pageSize: 10,
  total: 2,
};

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('FuncionariosListComponent', () => {
  let component: FuncionariosListComponent;
  let fixture: ComponentFixture<FuncionariosListComponent>;
  let serviceSpy: jasmine.SpyObj<FuncionariosService>;
  let dialogSpy: jasmine.SpyObj<PoDialogService>;
  let notificationSpy: jasmine.SpyObj<PoNotificationService>;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    serviceSpy = jasmine.createSpyObj('FuncionariosService', [
      'getAll',
      'getById',
      'create',
      'update',
      'remove',
    ]);
    dialogSpy = jasmine.createSpyObj('PoDialogService', ['confirm', 'alert']);
    notificationSpy = jasmine.createSpyObj('PoNotificationService', [
      'success',
      'error',
      'warning',
      'information',
    ]);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    // Default response for getAll
    serviceSpy.getAll.and.returnValue(of(mockResponse));

    await TestBed.configureTestingModule({
      imports: [FuncionariosListComponent, HttpClientTestingModule],
      providers: [
        { provide: FuncionariosService, useValue: serviceSpy },
        { provide: PoDialogService, useValue: dialogSpy },
        { provide: PoNotificationService, useValue: notificationSpy },
        { provide: Router, useValue: routerSpy },
      ],
      // NO_ERRORS_SCHEMA ignores PO-UI subcomponents in template rendering
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideProvider(PoDialogService, { useValue: dialogSpy })
      .overrideProvider(PoNotificationService, { useValue: notificationSpy })
      .compileComponents();

    fixture = TestBed.createComponent(FuncionariosListComponent);
    component = fixture.componentInstance;
  });

  // -------------------------------------------------------------------------
  // ngOnInit / load()
  // -------------------------------------------------------------------------

  describe('ngOnInit()', () => {
    it('deve chamar load() e popular items ao inicializar', fakeAsync(() => {
      fixture.detectChanges(); // triggers ngOnInit
      tick();
      fixture.detectChanges();

      expect(serviceSpy.getAll).toHaveBeenCalledTimes(1);
      expect(component.items()).toEqual([mockFuncionario]);
      flush(); // drain PO-UI internal timers
    }));

    it('deve definir loading=false apos carga', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      expect(component.loading()).toBeFalse();
      flush();
    }));

    it('deve definir hasNext de acordo com a resposta', fakeAsync(() => {
      serviceSpy.getAll.and.returnValue(
        of({ ...mockResponse, hasNext: true })
      );
      fixture.detectChanges();
      tick();

      expect(component.hasNext()).toBeTrue();
      flush();
    }));
  });

  // -------------------------------------------------------------------------
  // onQuickSearch()
  // -------------------------------------------------------------------------

  describe('onQuickSearch()', () => {
    it('deve filtrar por nome e chamar load()', fakeAsync(() => {
      fixture.detectChanges();
      tick();
      serviceSpy.getAll.calls.reset();
      serviceSpy.getAll.and.returnValue(of(mockResponse));

      component.onQuickSearch('Joao');
      tick();

      expect(serviceSpy.getAll).toHaveBeenCalledTimes(1);
      const callArgs = serviceSpy.getAll.calls.mostRecent().args[0] as any;
      expect(callArgs.nome).toBe('Joao');
      flush();
    }));

    it('deve limpar filtros quando termo vazio', fakeAsync(() => {
      fixture.detectChanges();
      tick();
      serviceSpy.getAll.calls.reset();
      serviceSpy.getAll.and.returnValue(of(mockResponse));

      component.onQuickSearch('');
      tick();

      const callArgs = serviceSpy.getAll.calls.mostRecent().args[0] as any;
      expect(callArgs.nome).toBeUndefined();
      flush();
    }));

    it('deve resetar para pagina 1 antes de carregar', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      // advance to page 2
      serviceSpy.getAll.and.returnValue(of(mockResponsePage2));
      component.onShowMore();
      tick();
      serviceSpy.getAll.calls.reset();

      serviceSpy.getAll.and.returnValue(of(mockResponse));
      component.onQuickSearch('teste');
      tick();

      const callArgs = serviceSpy.getAll.calls.mostRecent().args[0] as any;
      expect(callArgs.page).toBe(1);
      flush();
    }));
  });

  // -------------------------------------------------------------------------
  // onAdvancedSearch()
  // -------------------------------------------------------------------------

  describe('onAdvancedSearch()', () => {
    it('deve mapear filtros e chamar load()', fakeAsync(() => {
      fixture.detectChanges();
      tick();
      serviceSpy.getAll.calls.reset();
      serviceSpy.getAll.and.returnValue(of(mockResponse));

      component.onAdvancedSearch({ departamento: 'TI', situacao: 'A' });
      tick();

      expect(serviceSpy.getAll).toHaveBeenCalledTimes(1);
      const callArgs = serviceSpy.getAll.calls.mostRecent().args[0] as any;
      expect(callArgs.departamento).toBe('TI');
      expect(callArgs.situacao).toBe('A');
      flush();
    }));

    it('deve mapear nome do filtro avancado', fakeAsync(() => {
      fixture.detectChanges();
      tick();
      serviceSpy.getAll.calls.reset();
      serviceSpy.getAll.and.returnValue(of(mockResponse));

      component.onAdvancedSearch({ nome: 'Maria' });
      tick();

      const callArgs = serviceSpy.getAll.calls.mostRecent().args[0] as any;
      expect(callArgs.nome).toBe('Maria');
      flush();
    }));

    it('deve ignorar campos nao fornecidos (undefined)', fakeAsync(() => {
      fixture.detectChanges();
      tick();
      serviceSpy.getAll.calls.reset();
      serviceSpy.getAll.and.returnValue(of(mockResponse));

      component.onAdvancedSearch({ nome: 'Joao' });
      tick();

      const callArgs = serviceSpy.getAll.calls.mostRecent().args[0] as any;
      expect(callArgs.situacao).toBeUndefined();
      flush();
    }));

    it('deve resetar para pagina 1', fakeAsync(() => {
      fixture.detectChanges();
      tick();
      serviceSpy.getAll.calls.reset();
      serviceSpy.getAll.and.returnValue(of(mockResponse));

      component.onAdvancedSearch({ nome: 'Maria' });
      tick();

      const callArgs = serviceSpy.getAll.calls.mostRecent().args[0] as any;
      expect(callArgs.page).toBe(1);
      flush();
    }));
  });

  // -------------------------------------------------------------------------
  // confirmDelete()
  // -------------------------------------------------------------------------

  describe('confirmDelete()', () => {
    it('deve abrir dialog.confirm ao chamar confirmDelete', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      component.confirmDelete(mockFuncionario);

      expect(dialogSpy.confirm).toHaveBeenCalledTimes(1);
      const confirmArgs = dialogSpy.confirm.calls.mostRecent().args[0] as any;
      expect(confirmArgs.title).toContain('Excluir');
      expect(confirmArgs.message).toContain(mockFuncionario.nome);
      flush();
    }));

    it('dialog.confirm deve receber callback confirm', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      component.confirmDelete(mockFuncionario);

      const confirmArgs = dialogSpy.confirm.calls.mostRecent().args[0] as any;
      expect(typeof confirmArgs.confirm).toBe('function');
      flush();
    }));
  });

  // -------------------------------------------------------------------------
  // deleteRecord() - via callback do dialog.confirm
  // -------------------------------------------------------------------------

  describe('deleteRecord() - via confirmDelete', () => {
    it('deve chamar service.remove() e notificar sucesso', fakeAsync(() => {
      fixture.detectChanges();
      tick();
      serviceSpy.getAll.calls.reset();
      serviceSpy.remove = jasmine.createSpy('remove').and.returnValue(of(void 0));
      serviceSpy.getAll.and.returnValue(of(mockResponse));

      component.confirmDelete(mockFuncionario);
      const confirmArgs = dialogSpy.confirm.calls.mostRecent().args[0] as any;
      confirmArgs.confirm();
      tick();

      expect(serviceSpy.remove).toHaveBeenCalledWith(mockFuncionario.matricula);
      expect(notificationSpy.success).toHaveBeenCalled();
      flush();
    }));

    it('deve recarregar a lista apos exclusao bem-sucedida', fakeAsync(() => {
      fixture.detectChanges();
      tick();
      serviceSpy.getAll.calls.reset();
      serviceSpy.remove = jasmine.createSpy('remove').and.returnValue(of(void 0));
      serviceSpy.getAll.and.returnValue(of(mockResponse));

      component.confirmDelete(mockFuncionario);
      const confirmArgs = dialogSpy.confirm.calls.mostRecent().args[0] as any;
      confirmArgs.confirm();
      tick();

      // After deletion, load() should be called again
      expect(serviceSpy.getAll).toHaveBeenCalled();
      flush();
    }));

    it('deve notificar erro quando service.remove() falhar', fakeAsync(() => {
      fixture.detectChanges();
      tick();
      const error = { error: { message: 'Erro de servidor' } };
      serviceSpy.remove = jasmine
        .createSpy('remove')
        .and.returnValue(throwError(() => error));

      component.confirmDelete(mockFuncionario);
      const confirmArgs = dialogSpy.confirm.calls.mostRecent().args[0] as any;
      confirmArgs.confirm();
      tick();

      expect(notificationSpy.error).toHaveBeenCalled();
      flush();
    }));
  });

  // -------------------------------------------------------------------------
  // onShowMore()
  // -------------------------------------------------------------------------

  describe('onShowMore()', () => {
    it('deve incrementar a pagina e fazer append dos itens', fakeAsync(() => {
      fixture.detectChanges();
      tick();
      serviceSpy.getAll.calls.reset();
      serviceSpy.getAll.and.returnValue(of(mockResponsePage2));

      component.onShowMore();
      tick();

      // Original items (mockFuncionario) + new items (mockFuncionario2)
      expect(component.items().length).toBe(2);
      expect(component.items()).toContain(mockFuncionario);
      expect(component.items()).toContain(mockFuncionario2);
      flush();
    }));

    it('deve chamar getAll com page=2 na segunda carga', fakeAsync(() => {
      fixture.detectChanges();
      tick();
      serviceSpy.getAll.calls.reset();
      serviceSpy.getAll.and.returnValue(of(mockResponsePage2));

      component.onShowMore();
      tick();

      const callArgs = serviceSpy.getAll.calls.mostRecent().args[0] as any;
      expect(callArgs.page).toBe(2);
      flush();
    }));

    it('deve atualizar hasNext apos show more', fakeAsync(() => {
      fixture.detectChanges();
      tick();
      serviceSpy.getAll.calls.reset();
      serviceSpy.getAll.and.returnValue(
        of({ ...mockResponsePage2, hasNext: true })
      );

      component.onShowMore();
      tick();

      expect(component.hasNext()).toBeTrue();
      flush();
    }));
  });

  // -------------------------------------------------------------------------
  // Erro em load()
  // -------------------------------------------------------------------------

  describe('load() - tratamento de erro', () => {
    it('deve notificar erro quando getAll() falhar', fakeAsync(() => {
      serviceSpy.getAll.and.returnValue(throwError(() => new Error('Network error')));

      fixture.detectChanges();
      tick();

      expect(notificationSpy.error).toHaveBeenCalled();
      flush();
    }));

    it('deve definir loading=false mesmo com erro', fakeAsync(() => {
      serviceSpy.getAll.and.returnValue(throwError(() => new Error('fail')));

      fixture.detectChanges();
      tick();

      expect(component.loading()).toBeFalse();
      flush();
    }));
  });
});
