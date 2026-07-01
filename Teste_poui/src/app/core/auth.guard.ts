/**
 * @generated  poui-specialist v1.7.0
 * @author     Andre Costa <andre.andrelscosta@gmail.com>
 * @license    Uso permitido · redistribuição proibida sem autorização escrita
 * @see        https://github.com/Alscosta1973/poui-specialist
 */
import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { ProAppConfigService } from '@totvs/protheus-lib-core';
import { PoNotificationService } from '@po-ui/ng-components';

export const authGuard: CanActivateFn = (_route, _state) => {
  const proConfig = inject(ProAppConfigService);
  const router    = inject(Router);
  const notify    = inject(PoNotificationService);

  if (proConfig.insideProtheus()) {
    return true;
  }

  notify.error('Acesso negado. Execute o módulo dentro do Protheus.');
  return router.createUrlTree(['/']);
};
