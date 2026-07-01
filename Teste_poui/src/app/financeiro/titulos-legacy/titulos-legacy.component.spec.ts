import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { PoNotificationService } from '@po-ui/ng-components';
import { TitulosLegacyComponent } from './titulos-legacy.component';
import { TitulosLegacyService } from './titulos-legacy.service';
import { TituloLegacy } from './models/titulo-legacy.model';

// Wave 12 — standalone-migrate
// Valida que o componente migrado de NgModule para standalone funciona corretamente.
// Padrões testados: inject(), signal(), input(), output(), takeUntilDestroyed(), OnPush + Quirk #1.

const MOCK_ITEMS: TituloLegacy[] = [
  { codigo: 'T001', emissao: '2026-01-10', vencimento: '2026-02-10', valor: 1500, cliente: 'Empresa A', status: 'A' },
  { codigo: 'T002', emissao: '2026-01-15', vencimento: '2026-03-15', valor: 2800, cliente: 'Empresa B', status: 'P' },
];

describe('TitulosLegacyComponent (standalone-migrate)', () => {
  let fixture: ComponentFixture<TitulosLegacyComponent>;
  let component: TitulosLegacyComponent;
  let serviceSpy: jasmine.SpyObj<TitulosLegacyService>;
  let notifySpy: jasmine.SpyObj<PoNotificationService>;

  beforeEach(async () => {
    serviceSpy = jasmine.createSpyObj('TitulosLegacyService', ['getAll']);
    notifySpy  = jasmine.createSpyObj('PoNotificationService', ['error']);
    serviceSpy.getAll.and.returnValue(of({ items: MOCK_ITEMS, hasNext: true }));

    await TestBed.configureTestingModule({
      imports: [TitulosLegacyComponent],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        { provide: TitulosLegacyService, useValue: serviceSpy },
        { provide: PoNotificationService, useValue: notifySpy },
      ],
    }).compileComponents();

    fixture   = TestBed.createComponent(TitulosLegacyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create (smoke — standalone component)', () => {
    expect(component).toBeTruthy();
  });

  it('should call service.getAll on init', () => {
    expect(serviceSpy.getAll).toHaveBeenCalledOnceWith('');
  });

  it('should populate items signal from service response', () => {
    expect(component.items()).toEqual(MOCK_ITEMS);
  });

  it('should set hasNext signal from service response', () => {
    expect(component.hasNext()).toBeTrue();
  });

  it('should set loading false after successful load', () => {
    expect(component.loading()).toBeFalse();
  });

  it('should show error notification and clear loading on HTTP error', () => {
    serviceSpy.getAll.and.returnValue(throwError(() => new Error('HTTP 500')));
    component.onSearch('x');
    expect(notifySpy.error).toHaveBeenCalledWith('Erro ao carregar títulos.');
    expect(component.loading()).toBeFalse();
  });

  it('should reload with query when onSearch is called', () => {
    component.onSearch('empresa');
    expect(serviceSpy.getAll).toHaveBeenCalledWith('empresa');
  });

  it('should emit acaoExecutada output when onAcao is called', () => {
    spyOn(component.acaoExecutada, 'emit');
    component.onAcao('incluir');
    expect(component.acaoExecutada.emit).toHaveBeenCalledWith('incluir');
  });

  it('should reflect titulo via signal input (fixture.componentRef.setInput)', () => {
    fixture.componentRef.setInput('titulo', 'Títulos Vencidos');
    expect(component.titulo()).toBe('Títulos Vencidos');
  });

  it('should call cdr.detectChanges after setTimeout in ngAfterViewInit (Quirk #1)', fakeAsync(() => {
    const cdr = (component as any).cdr;
    spyOn(cdr, 'detectChanges');
    component.ngAfterViewInit();
    expect(cdr.detectChanges).not.toHaveBeenCalled();
    tick();
    expect(cdr.detectChanges).toHaveBeenCalled();
  }));
});
