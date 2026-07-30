/**
 * @generated  poui-specialist v1.10.0
 * @author     Andre Costa <andre.andrelscosta@gmail.com>
 * @license    Uso permitido · redistribuição proibida sem autorização escrita
 * @see        https://github.com/Alscosta1973/poui-specialist
 */
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { LoginCredentials, LoginResponse } from './models/login.model';

@Injectable({ providedIn: 'root' })
export class LoginService {
  private readonly http = inject(HttpClient);

  // PLACEHOLDER — nenhum endpoint de autenticação foi descoberto/validado neste
  // projeto ainda (/poui-specialist:discover não foi executado para este contrato).
  // Ajuste conforme o backend real assim que definido. Alternativas comuns no Protheus:
  //   - '/rest/api/oauth2/v1/token'  → OAuth2 nativo do Protheus (password grant)
  //   - '/rest/api/custom/v1/login' → endpoint TLPP customizado
  private readonly baseUrl = '/rest/api/custom/v1/login';

  login(credentials: LoginCredentials): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(this.baseUrl, credentials);
  }
}
