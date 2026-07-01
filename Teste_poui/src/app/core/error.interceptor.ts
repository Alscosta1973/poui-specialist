/**
 * @generated  poui-specialist v1.7.0
 * @author     Andre Costa <andre.andrelscosta@gmail.com>
 * @license    Uso permitido · redistribuição proibida sem autorização escrita
 * @see        https://github.com/Alscosta1973/poui-specialist
 */
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { PoNotificationService } from '@po-ui/ng-components';

/**
 * Intercepta erros HTTP e traduz mensagens do Protheus (Latin-1 → UTF-8).
 * Exibe notificação de erro via PoNotificationService.
 * Registrar em app.config.ts: provideHttpClient(withInterceptors([errorInterceptor]))
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const notification = inject(PoNotificationService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const msg = parseProtheusError(error);
      notification.error(msg);
      return throwError(() => error);
    }),
  );
};

function parseProtheusError(error: HttpErrorResponse): string {
  try {
    if (error.error?.errorMessage) {
      return decodeProtheusLatin1(error.error.errorMessage);
    }
    if (error.error?.message) {
      return error.error.message;
    }
  } catch {
    // fallback
  }
  return `Erro ${error.status}: ${error.statusText || 'Erro inesperado'}`;
}

function decodeProtheusLatin1(raw: string): string {
  try {
    const bytes = Uint8Array.from(raw.split('').map(c => c.charCodeAt(0)));
    return new TextDecoder('iso-8859-1').decode(bytes);
  } catch {
    return raw;
  }
}
