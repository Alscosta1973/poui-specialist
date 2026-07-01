/**
 * @generated  poui-specialist v1.7.0
 * @author     Andre Costa <andre.andrelscosta@gmail.com>
 * @license    Uso permitido · redistribuição proibida sem autorização escrita
 * @see        https://github.com/Alscosta1973/poui-specialist
 */
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { ProAppConfigService } from '@totvs/protheus-lib-core';

/**
 * Injeta headers de contexto Protheus em toda requisição HTTP.
 * X-App-Name: identifica o módulo chamador nos logs do backend.
 * Nota: a autenticação Bearer é tratada pela ProAuthInteceptor da lib.
 * Registrar em app.config.ts: provideHttpClient(withInterceptors([appContextInterceptor]))
 */
export const appContextInterceptor: HttpInterceptorFn = (req, next) => {
  const proConfig = inject(ProAppConfigService);

  if (!proConfig.insideProtheus()) {
    return next(req);
  }

  const appName = proConfig.nameApp || 'poui-app';

  const enrichedReq = req.clone({
    setHeaders: { 'X-App-Name': appName },
  });

  return next(enrichedReq);
};
