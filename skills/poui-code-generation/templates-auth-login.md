# Template: Autenticação — po-page-login + Protheus

Template completo de tela de login com `po-page-login` integrado ao `ProAppConfigService` do Protheus.

## Quando usar

- App Angular que precisa de login próprio (fora do Protheus iframe)
- App web acessado diretamente por URL (não embutido no Protheus)

> **Se o app roda DENTRO do Protheus** (iframe): o Protheus já autentica o usuário — não use este template.

---

## Arquivos gerados

| Arquivo | Descrição |
|---------|-----------|
| `src/app/auth/login/login.component.ts` | Componente standalone po-page-login |
| `src/app/auth/auth.service.ts` | Service de autenticação Protheus |
| `src/app/auth/auth.guard.ts` | Guard funcional CanActivate |

---

## login.component.ts

```typescript
import {
  ChangeDetectionStrategy, Component, inject, signal
} from '@angular/core';
import { Router } from '@angular/router';
import {
  PoPageLoginComponent, PoPageLoginLiterals,
  PoNotificationService
} from '@po-ui/ng-components';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PoPageLoginComponent],
  template: `
    <po-page-login
      p-product-name="{{projectName}}"
      p-logo="assets/logo.png"
      [p-loading]="loading()"
      [p-literals]="literals"
      (p-login-submit)="onSubmit($event)">
    </po-page-login>
  `,
})
export class LoginComponent {
  private readonly auth   = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notify = inject(PoNotificationService);

  readonly loading = signal(false);

  readonly literals: PoPageLoginLiterals = {
    loginPlaceholder: 'Código do usuário Protheus',
    passwordPlaceholder: 'Senha',
    submitLabel: 'Entrar',
  };

  onSubmit(event: { login: string; password: string }): void {
    this.loading.set(true);
    this.auth.login(event.login, event.password).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/inicio']);
      },
      error: (err) => {
        this.loading.set(false);
        this.notify.error({
          message: err?.error?.message ?? 'Usuário ou senha inválidos',
        });
      },
    });
  }
}
```

---

## auth.service.ts

```typescript
import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

interface AuthResponse {
  access_token: string;
  expires_in:   number;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly TOKEN_KEY = 'poui_token';

  readonly isAuthenticated = signal(!!this.getToken());

  login(usuario: string, senha: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>('/rest/api/auth/v1/login', { usuario, senha }).pipe(
      tap(res => {
        localStorage.setItem(this.TOKEN_KEY, res.access_token);
        this.isAuthenticated.set(true);
      })
    );
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    this.isAuthenticated.set(false);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }
}
```

---

## auth.guard.ts

```typescript
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) return true;

  router.navigate(['/login']);
  return false;
};
```

---

## app.routes.ts — adicionar rotas de auth

```typescript
import { Routes } from '@angular/router';
import { authGuard } from './auth/auth.guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./auth/login/login.component').then(m => m.LoginComponent) },
  { path: '',      redirectTo: 'inicio', pathMatch: 'full' },
  { path: 'inicio', canActivate: [authGuard], loadComponent: () => import('./home/home.component').then(m => m.HomeComponent) },
  { path: '**',    redirectTo: 'login' },
];
```

---

## interceptor de token (adicionar ao http.interceptors)

```typescript
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth/auth.service';

export const tokenInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthService).getToken();
  if (!token) return next(req);

  return next(req.clone({
    setHeaders: { Authorization: `Bearer ${token}` }
  }));
};
```

Registrar em `app.config.ts`:
```typescript
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { tokenInterceptor } from './auth/token.interceptor';

// providers:
provideHttpClient(withInterceptors([tokenInterceptor]))
```

---

## Backend TLPP — endpoint de login

```tlpp
@Rest Description('Autenticação de usuário') EndPoint('/api/auth/v1/login') Produces(APPLICATION_JSON)
Class AuthAPI
  @Post Description('Login com usuário e senha Protheus')
  Public Method Post() As Logical
EndClass

Method Post() Class AuthAPI
  Local oBody    := JsonObject():New()
  Local cUsuario := ""
  Local cSenha   := ""
  Local lAuth    := .F.

  oBody:FromJson(Self:oRest:getBodyRequest())
  cUsuario := oBody:GetJsonText('usuario')
  cSenha   := oBody:GetJsonText('senha')

  // Validar com tabela de usuários Protheus (SYS_USR / SR8)
  lAuth := ExistUser(cUsuario, cSenha) // sua função de validação

  If !lAuth
    Self:oRest:setResponseCode(401)
    Self:oRest:setResponse('{"message":"Usuário ou senha inválidos"}')
    Return .F.
  EndIf

  Local oResp := JsonObject():New()
  oResp:SetJsonText('access_token', GenerateToken(cUsuario)) // sua função de token
  oResp:SetJsonNumber('expires_in', 3600)
  Self:oRest:setResponse(oResp:Serialize())
Return .T.
```
