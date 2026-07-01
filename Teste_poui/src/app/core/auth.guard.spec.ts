import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { ProAppConfigService } from '@totvs/protheus-lib-core';
import { PoNotificationService } from '@po-ui/ng-components';
import { authGuard } from './auth.guard';

function setup(insideProtheus: boolean) {
  const notifySpy = jasmine.createSpyObj<PoNotificationService>('PoNotificationService', ['error']);
  const proSpy    = jasmine.createSpyObj<ProAppConfigService>('ProAppConfigService', ['insideProtheus']);
  proSpy.insideProtheus.and.returnValue(insideProtheus);

  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: '**', children: [] }]),
      { provide: ProAppConfigService, useValue: proSpy },
      { provide: PoNotificationService, useValue: notifySpy },
    ],
  });

  return { proSpy, notifySpy, router: TestBed.inject(Router) };
}

const mockRoute = {} as ActivatedRouteSnapshot;
const mockState = {} as RouterStateSnapshot;

describe('authGuard', () => {
  it('should allow navigation when inside Protheus', () => {
    setup(true);
    const result = TestBed.runInInjectionContext(() => authGuard(mockRoute, mockState));
    expect(result).toBeTrue();
  });

  it('should return a UrlTree redirecting to root when not inside Protheus', () => {
    setup(false);
    const result = TestBed.runInInjectionContext(() => authGuard(mockRoute, mockState));
    expect(result instanceof UrlTree).toBeTrue();
    expect((result as UrlTree).toString()).toBe('/');
  });

  it('should show error notification when access is denied', () => {
    const { notifySpy } = setup(false);
    TestBed.runInInjectionContext(() => authGuard(mockRoute, mockState));
    expect(notifySpy.error).toHaveBeenCalledWith('Acesso negado. Execute o módulo dentro do Protheus.');
  });

  it('should not show notification when access is allowed', () => {
    const { notifySpy } = setup(true);
    TestBed.runInInjectionContext(() => authGuard(mockRoute, mockState));
    expect(notifySpy.error).not.toHaveBeenCalled();
  });
});
