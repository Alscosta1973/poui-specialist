import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { PoNotificationService } from '@po-ui/ng-components';
import { FornecedoresComponent } from './fornecedores.component';
import { FornecedoresService } from './fornecedores.service';
import { Fornecedor } from './models/fornecedor.model';

// Wave 13 — refactor (gerado a partir de FORN001.prw / SA2)
// Valida geração PO-UI a partir de fonte ADVPL: page-dynamic-search, filtros, show-more.

const MOCK_FORN: Fornecedor[] = [
  { codigo: '000001', loja: '01', nome: 'Fornecedor Alpha',   tipo: 'J', cnpj: '12.345.678/0001-99', municipio: 'São Paulo',    estado: 'SP', bloqueado: ' ' },
  { codigo: '000002', loja: '01', nome: 'Fornecedor Beta',    tipo: 'F', cnpj: '987.654.321-00',     municipio: 'Rio de Janeiro', estado: 'RJ', bloqueado: 'S' },
];

describe('FornecedoresComponent (refactor from FORN001.prw)', () => {
  let fixture: ComponentFixture<FornecedoresComponent>;
  let component: FornecedoresComponent;
  let serviceSpy: jasmine.SpyObj<FornecedoresService>;
  let notifySpy: jasmine.SpyObj<PoNotificationService>;
  let router: Router;

  beforeEach(async () => {
    serviceSpy = jasmine.createSpyObj('FornecedoresService', ['getAll']);
    notifySpy  = jasmine.createSpyObj('PoNotificationService', ['error']);
    serviceSpy.getAll.and.returnValue(of({ items: MOCK_FORN, hasNext: false }));

    await TestBed.configureTestingModule({
      imports: [FornecedoresComponent],
      providers: [
        provideHttpClient(),
        provideRouter([{ path: 'compras/fornecedores/novo', children: [] }]),
        { provide: FornecedoresService, useValue: serviceSpy },
        { provide: PoNotificationService, useValue: notifySpy },
      ],
    }).compileComponents();

    fixture   = TestBed.createComponent(FornecedoresComponent);
    component = fixture.componentInstance;
    router    = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should create (smoke — gerado de FORN001.prw)', () => {
    expect(component).toBeTruthy();
  });

  it('should load fornecedores on init (page 1, sem query)', () => {
    expect(serviceSpy.getAll).toHaveBeenCalledWith(1, '');
    expect(component.items()).toEqual(MOCK_FORN);
  });

  it('should set loading false after successful load', () => {
    expect(component.loading()).toBeFalse();
  });

  it('should show error notification on HTTP error', () => {
    serviceSpy.getAll.and.returnValue(throwError(() => new Error('HTTP 500')));
    component.onSearch('x');
    expect(notifySpy.error).toHaveBeenCalledWith('Erro ao carregar fornecedores.');
    expect(component.loading()).toBeFalse();
  });

  it('should reset to page 1 and reload when onSearch is called', () => {
    serviceSpy.getAll.calls.reset();
    component.onSearch('Alpha');
    expect(serviceSpy.getAll).toHaveBeenCalledWith(1, 'Alpha');
  });

  it('should increment page and append items on onShowMore', () => {
    const page2: Fornecedor[] = [
      { codigo: '000003', loja: '01', nome: 'Gama Suprimentos', tipo: 'J', cnpj: '11.222.333/0001-00', municipio: 'BH', estado: 'MG', bloqueado: ' ' },
    ];
    serviceSpy.getAll.and.returnValue(of({ items: page2, hasNext: false }));
    component.onShowMore();
    expect(serviceSpy.getAll).toHaveBeenCalledWith(2, '');
    expect(component.items().length).toBe(3);
    expect(component.hasNext()).toBeFalse();
  });

  it('should navigate to /compras/fornecedores/novo on incluir action', () => {
    const navSpy = spyOn(router, 'navigate');
    const incluirAction = component.pageActions.find(a => a.label === 'Incluir');
    expect(incluirAction).toBeTruthy();
    (incluirAction!.action as () => void)();
    expect(navSpy).toHaveBeenCalledWith(['/compras/fornecedores/novo']);
  });

  it('should have cols with bloqueado as type label (mapeado de A2_MSBLQL)', () => {
    const col = component.cols.find(c => c.property === 'bloqueado');
    expect(col?.type).toBe('label');
    expect(col?.labels?.length).toBe(2);
  });

  it('should have 3 advanced filters matching SX1 perguntas from FORN001.prw', () => {
    expect(component.filters.length).toBe(3);
    expect(component.filters.map(f => f.property)).toEqual(['codigo', 'nome', 'tipo']);
  });

  it('should call cdr.detectChanges via setTimeout in ngAfterViewInit (Quirk #1)', fakeAsync(() => {
    const cdr = (component as any).cdr;
    spyOn(cdr, 'detectChanges');
    component.ngAfterViewInit();
    expect(cdr.detectChanges).not.toHaveBeenCalled();
    tick();
    expect(cdr.detectChanges).toHaveBeenCalled();
  }));
});
