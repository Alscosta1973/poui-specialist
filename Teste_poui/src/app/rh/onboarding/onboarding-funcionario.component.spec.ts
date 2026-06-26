import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { PoNotificationService } from '@po-ui/ng-components';
import { TENANT_ID } from '../rh.tokens';
import { FuncionarioForm } from '../models/funcionario.model';
import { OnboardingFuncionarioComponent } from './onboarding-funcionario.component';

describe('OnboardingFuncionarioComponent', () => {
  let component: OnboardingFuncionarioComponent;
  let fixture: ComponentFixture<OnboardingFuncionarioComponent>;
  let httpMock: HttpTestingController;
  let router: Router;

  const mockForm: FuncionarioForm = {
    nome:           'João Silva',
    cpf:            '12345678901',
    dataNascimento: '1990-01-01',
    escolaridade:   '9',
    deficiencia:    '0',
    cargo:          'Analista',
    departamento:   '001',
    centroCusto:    '0001',
    dataAdmissao:   '2024-01-15',
    tipoContrato:   'CLT',
    turno:          '1',
    salario:        5000,
    cep:            '01310100',
    endereco:       'Av. Paulista, 1000',
    bairro:         'Bela Vista',
    municipio:      'São Paulo',
    estado:         'SP',
    banco:          '341',
    agencia:        '1234',
    conta:          '12345-6',
  } as FuncionarioForm;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [OnboardingFuncionarioComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: TENANT_ID, useValue: 'T1' },
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(OnboardingFuncionarioComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    router  = TestBed.inject(Router);
  });

  afterEach(() => {
    httpMock.verify();
  });

  // ── smoke ─────────────────────────────────────────────────────────────────

  it('should create', waitForAsync(() => {
    fixture.detectChanges();
    return fixture.whenStable().then(() => {
      fixture.detectChanges();
      expect(component).toBeTruthy();
    });
  }));

  // ── estado inicial ────────────────────────────────────────────────────────

  it('should start at step 1 with 4 steps defined', waitForAsync(() => {
    fixture.detectChanges();
    return fixture.whenStable().then(() => {
      expect(component.currentStep()).toBe(1);
      expect(component.steps().length).toBe(4);
    });
  }));

  it('should have isFirstStep true and isLastStep false on step 1', waitForAsync(() => {
    fixture.detectChanges();
    return fixture.whenStable().then(() => {
      expect(component.isFirstStep()).toBeTrue();
      expect(component.isLastStep()).toBeFalse();
    });
  }));

  it('should render step 1 fields (nome, cpf, dataNascimento)', waitForAsync(() => {
    fixture.detectChanges();
    return fixture.whenStable().then(() => {
      const fields = component.currentFields();
      const props = fields.map(f => f.property);
      expect(props).toContain('nome');
      expect(props).toContain('cpf');
      expect(props).toContain('dataNascimento');
    });
  }));

  // ── navegação entre steps ─────────────────────────────────────────────────

  it('should advance to step 2 on next()', waitForAsync(() => {
    fixture.detectChanges();
    return fixture.whenStable().then(() => {
      component.next();
      fixture.detectChanges();
      expect(component.currentStep()).toBe(2);
      expect(component.isFirstStep()).toBeFalse();
      expect(component.isLastStep()).toBeFalse();
    });
  }));

  it('should render step 2 fields (cargo, departamento) after next()', waitForAsync(() => {
    fixture.detectChanges();
    return fixture.whenStable().then(() => {
      component.next();
      fixture.detectChanges();
      const fields = component.currentFields();
      const props = fields.map(f => f.property);
      expect(props).toContain('cargo');
      expect(props).toContain('departamento');
    });
  }));

  it('should go back from step 2 to step 1', waitForAsync(() => {
    fixture.detectChanges();
    return fixture.whenStable().then(() => {
      component.next();
      fixture.detectChanges();
      component.back();
      fixture.detectChanges();
      expect(component.currentStep()).toBe(1);
      expect(component.isFirstStep()).toBeTrue();
    });
  }));

  it('should reset done status on back — step 2 returns to default after back', waitForAsync(() => {
    fixture.detectChanges();
    return fixture.whenStable().then(() => {
      component.next(); // step 1→2
      component.back(); // step 2→1
      fixture.detectChanges();
      const step2Status = component.steps()[1].status;
      expect(step2Status).toBe('default');
      const step1Status = component.steps()[0].status;
      expect(step1Status).toBe('active');
    });
  }));

  it('should not go back from step 1', waitForAsync(() => {
    fixture.detectChanges();
    return fixture.whenStable().then(() => {
      component.back();
      fixture.detectChanges();
      expect(component.currentStep()).toBe(1);
    });
  }));

  it('should advance all the way to step 4 (last)', waitForAsync(() => {
    fixture.detectChanges();
    return fixture.whenStable().then(() => {
      component.next(); component.next(); component.next();
      fixture.detectChanges();
      expect(component.currentStep()).toBe(4);
      expect(component.isLastStep()).toBeTrue();
      expect(component.isFirstStep()).toBeFalse();
    });
  }));

  it('should not advance past last step', waitForAsync(() => {
    fixture.detectChanges();
    return fixture.whenStable().then(() => {
      component.next(); component.next(); component.next(); component.next();
      fixture.detectChanges();
      expect(component.currentStep()).toBe(4);
    });
  }));

  it('should update currentStep via onStepChange (p-change-step event)', waitForAsync(() => {
    fixture.detectChanges();
    return fixture.whenStable().then(() => {
      component.onStepChange(3);
      fixture.detectChanges();
      expect(component.currentStep()).toBe(3);
    });
  }));

  // ── acumulação de dados entre steps ──────────────────────────────────────

  it('should merge form values preserving previous step data', waitForAsync(() => {
    fixture.detectChanges();
    return fixture.whenStable().then(() => {
      component.onFormChange({ nome: 'João', cpf: '12345678901' });
      component.onFormChange({ cargo: 'Analista' });
      fixture.detectChanges();
      expect(component.formData['nome']).toBe('João');
      expect(component.formData['cargo']).toBe('Analista');
    });
  }));

  it('should not overwrite existing data with null/undefined from form change', waitForAsync(() => {
    fixture.detectChanges();
    return fixture.whenStable().then(() => {
      component.onFormChange({ nome: 'João' });
      component.onFormChange({ nome: null as unknown as string, cargo: 'Analista' });
      fixture.detectChanges();
      expect(component.formData['nome']).toBe('João');
    });
  }));

  // ── submit (save) ─────────────────────────────────────────────────────────

  it('should call POST on save()', waitForAsync(() => {
    spyOn(router, 'navigate');
    spyOn(TestBed.inject(PoNotificationService), 'success');
    fixture.detectChanges();
    return fixture.whenStable().then(() => {
      component.formData = mockForm as Partial<FuncionarioForm>;
      component.save();
      fixture.detectChanges();

      const req = httpMock.expectOne(r =>
        r.url.includes('/rh/funcionarios') && r.method === 'POST'
      );
      expect(req.request.body).toBeTruthy();
      req.flush(mockForm);
      return fixture.whenStable();
    }).then(() => {
      fixture.detectChanges();
      expect(component.isLoading()).toBeFalse();
    });
  }));

  it('should show success notification and navigate after save', waitForAsync(() => {
    const notifSpy = spyOn(TestBed.inject(PoNotificationService), 'success');
    const navSpy   = spyOn(router, 'navigate');
    fixture.detectChanges();
    return fixture.whenStable().then(() => {
      component.formData = mockForm as Partial<FuncionarioForm>;
      component.save();
      fixture.detectChanges();

      httpMock.expectOne(r =>
        r.url.includes('/rh/funcionarios') && r.method === 'POST'
      ).flush(mockForm);
      return fixture.whenStable();
    }).then(() => {
      fixture.detectChanges();
      expect(notifSpy).toHaveBeenCalled();
      expect(navSpy).toHaveBeenCalledWith(['/rh/funcionarios']);
    });
  }));

  it('should show error notification on save failure', waitForAsync(() => {
    const notifSpy = spyOn(TestBed.inject(PoNotificationService), 'error');
    fixture.detectChanges();
    return fixture.whenStable().then(() => {
      component.formData = mockForm as Partial<FuncionarioForm>;
      component.save();
      fixture.detectChanges();

      httpMock.expectOne(r =>
        r.url.includes('/rh/funcionarios') && r.method === 'POST'
      ).flush('Server error', { status: 500, statusText: 'Internal Server Error' });
      return fixture.whenStable();
    }).then(() => {
      fixture.detectChanges();
      expect(notifSpy).toHaveBeenCalled();
      expect(component.isLoading()).toBeFalse();
    });
  }));

  it('should set isLoading to true during save and false after', waitForAsync(() => {
    spyOn(router, 'navigate');
    spyOn(TestBed.inject(PoNotificationService), 'success');
    fixture.detectChanges();
    return fixture.whenStable().then(() => {
      component.formData = mockForm as Partial<FuncionarioForm>;
      component.save();
      fixture.detectChanges();
      expect(component.isLoading()).toBeTrue();

      httpMock.expectOne(r =>
        r.url.includes('/rh/funcionarios') && r.method === 'POST'
      ).flush(mockForm);
      return fixture.whenStable();
    }).then(() => {
      fixture.detectChanges();
      expect(component.isLoading()).toBeFalse();
    });
  }));

  // ── cancel ────────────────────────────────────────────────────────────────

  it('should navigate to /rh/funcionarios on cancel', waitForAsync(() => {
    const navSpy = spyOn(router, 'navigate');
    fixture.detectChanges();
    return fixture.whenStable().then(() => {
      component.cancel();
      expect(navSpy).toHaveBeenCalledWith(['/rh/funcionarios']);
    });
  }));
});
