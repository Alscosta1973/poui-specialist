import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot, provideRouter } from '@angular/router';
import { HasUnsavedChanges, unsavedChangesGuard } from './unsaved-changes.guard';

function makeComponent(dirty: boolean): HasUnsavedChanges {
  return { hasUnsavedChanges: () => dirty };
}

const mockRoute     = {} as ActivatedRouteSnapshot;
const mockNextState = {} as RouterStateSnapshot;

describe('unsavedChangesGuard', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([])],
    });
  });

  it('should allow navigation when component has no unsaved changes', () => {
    const result = TestBed.runInInjectionContext(() =>
      unsavedChangesGuard(makeComponent(false), mockRoute, mockNextState, mockNextState),
    );
    expect(result).toBeTrue();
  });

  it('should call window.confirm when there are unsaved changes', () => {
    spyOn(window, 'confirm').and.returnValue(true);
    TestBed.runInInjectionContext(() =>
      unsavedChangesGuard(makeComponent(true), mockRoute, mockNextState, mockNextState),
    );
    expect(window.confirm).toHaveBeenCalledWith('Há alterações não salvas. Deseja sair mesmo assim?');
  });

  it('should allow navigation if user confirms leaving', () => {
    spyOn(window, 'confirm').and.returnValue(true);
    const result = TestBed.runInInjectionContext(() =>
      unsavedChangesGuard(makeComponent(true), mockRoute, mockNextState, mockNextState),
    );
    expect(result).toBeTrue();
  });

  it('should block navigation if user cancels confirm', () => {
    spyOn(window, 'confirm').and.returnValue(false);
    const result = TestBed.runInInjectionContext(() =>
      unsavedChangesGuard(makeComponent(true), mockRoute, mockNextState, mockNextState),
    );
    expect(result).toBeFalse();
  });

  it('should not call confirm when there are no unsaved changes', () => {
    spyOn(window, 'confirm');
    TestBed.runInInjectionContext(() =>
      unsavedChangesGuard(makeComponent(false), mockRoute, mockNextState, mockNextState),
    );
    expect(window.confirm).not.toHaveBeenCalled();
  });
});
