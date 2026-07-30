/**
 * @generated  poui-specialist v1.10.0
 * @author     Andre Costa <andre.andrelscosta@gmail.com>
 * @license    Uso permitido · redistribuição proibida sem autorização escrita
 * @see        https://github.com/Alscosta1973/poui-specialist
 */

/** Credenciais informadas no formulário de login. */
export interface LoginCredentials {
  usuario: string;
  senha: string;
}

/**
 * Contrato de resposta do endpoint de autenticação — PLACEHOLDER.
 *
 * Nenhum endpoint REST de login foi descoberto/validado neste projeto ainda
 * (não foi executado `/poui-specialist:discover` para este contrato). Ajuste
 * este contrato assim que o backend real for definido. Alternativas comuns
 * no Protheus:
 *
 *  - POST /rest/api/oauth2/v1/token  → OAuth2 nativo do Protheus (password grant).
 *    Resposta padrão: { access_token, token_type, expires_in, refresh_token, scope }.
 *  - POST /rest/api/custom/v1/login  → endpoint TLPP customizado (ver login.service.ts).
 */
export interface LoginResponse {
  token: string;
  expiresIn?: number;
}
