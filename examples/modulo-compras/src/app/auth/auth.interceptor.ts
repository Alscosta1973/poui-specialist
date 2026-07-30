/**
 * @generated  poui-specialist v1.10.0
 * @author     Andre Costa <andre.andrelscosta@gmail.com>
 * @license    Uso permitido · redistribuição proibida sem autorização escrita
 * @see        https://github.com/Alscosta1973/poui-specialist
 */
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { PoNotificationService } from '@po-ui/ng-components';
import { catchError, finalize, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { LoadingService } from './loading.service';
import { parseProtheusError } from './protheus-error.util';

/**
 * Interceptor único de infraestrutura para as requisições HTTP da aplicação,
 * consolidando 3 responsabilidades (substitui o antigo `token.interceptor.ts`,
 * que cobria somente a primeira):
 *
 * 1. Auth token — injeta `Authorization: Bearer <token>` quando há sessão ativa.
 * 2. Tradução de erros Protheus — decodifica Latin-1 e exibe via PoNotificationService.
 * 3. Loading overlay — aciona `LoadingService` durante o ciclo de vida da requisição.
 *
 * Sessão expirada (401/403): só força logout + redirecionamento para `/auth/login`
 * quando a requisição que falhou já carregava um token (ou seja, era uma chamada
 * autenticada). Chamadas anônimas — como o POST de login — não possuem token neste
 * ponto, então o 401/403 nelas é deixado passar para o `catchError` local de
 * `login.component.ts`, que já trata esse caso com a mensagem "Usuário ou senha
 * inválidos." Isso evita duplicar notificação de erro e evita redirecionar a tela
 * de login para ela mesma.
 *
 * Registrar em app.config.ts: provideHttpClient(withInterceptors([authInterceptor]))
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const notification = inject(PoNotificationService);
  const loadingService = inject(LoadingService);

  const token = auth.getToken();
  const authorizedReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  // Permitir que requisições individuais suprimam o overlay via header
  const skipLoading = authorizedReq.headers.has('X-Skip-Loading');
  const outgoingReq = skipLoading
    ? authorizedReq.clone({ headers: authorizedReq.headers.delete('X-Skip-Loading') })
    : authorizedReq;

  if (!skipLoading) {
    loadingService.show();
  }

  return next(outgoingReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if ((error.status === 401 || error.status === 403) && token) {
        auth.logout();
        notification.warning('Sessão expirada. Faça login novamente.');
        router.navigate(['/auth/login']);
        return throwError(() => error);
      }

      notification.error(parseProtheusError(error));
      return throwError(() => error);
    }),
    finalize(() => {
      if (!skipLoading) {
        loadingService.hide();
      }
    })
  );
};
