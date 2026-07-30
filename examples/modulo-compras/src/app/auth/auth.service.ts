/**
 * @generated  poui-specialist v1.10.0
 * @author     Andre Costa <andre.andrelscosta@gmail.com>
 * @license    Uso permitido · redistribuição proibida sem autorização escrita
 * @see        https://github.com/Alscosta1973/poui-specialist
 */
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { LoginService } from './login.service';
import { LoginCredentials, LoginResponse } from './models/login.model';

const TOKEN_KEY = 'poui_token';

/**
 * Gerencia a sessão de autenticação da aplicação (fora do iframe do Protheus).
 *
 * Delega a chamada HTTP de login ao `LoginService` já existente neste projeto
 * e adiciona a camada de sessão: persistência do token e estado reativo
 * `isAuthenticated`, consumido por `authGuard` e `authInterceptor`.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly loginService = inject(LoginService);

  readonly isAuthenticated = signal(!!this.getToken());

  login(credentials: LoginCredentials): Observable<LoginResponse> {
    return this.loginService.login(credentials).pipe(
      tap((res) => {
        localStorage.setItem(TOKEN_KEY, res.token);
        this.isAuthenticated.set(true);
      })
    );
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    this.isAuthenticated.set(false);
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }
}
