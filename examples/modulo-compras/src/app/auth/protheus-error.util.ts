/**
 * @generated  poui-specialist v1.10.0
 * @author     Andre Costa <andre.andrelscosta@gmail.com>
 * @license    Uso permitido · redistribuição proibida sem autorização escrita
 * @see        https://github.com/Alscosta1973/poui-specialist
 */

/**
 * Decodifica o formato de erro REST do Protheus:
 * `{ errorMessage: JSON.stringify({ code, message, detailedMessage }) }`.
 *
 * As mensagens do Protheus chegam codificadas em Latin-1 (ISO-8859-1) e precisam
 * ser recodificadas para exibição correta em UTF-8. Também trata os status HTTP
 * mais comuns (401/403 de autenticação e 0 de falha de rede).
 *
 * Extraído de `login.component.ts` para reuso em `auth.interceptor.ts` e evitar
 * duplicar a lógica de parsing em múltiplos pontos da aplicação.
 */
export function parseProtheusError(err: unknown, options?: { authMessage?: string }): string {
  const status = (err as { status?: number })?.status;

  if (status === 401 || status === 403) {
    return options?.authMessage ?? 'Usuário ou senha inválidos.';
  }
  if (status === 0) {
    return 'Falha de conexão com o servidor. Verifique sua rede e tente novamente.';
  }

  try {
    const errObj = JSON.parse((err as any).error?.errorMessage ?? '{}');
    const decode = (s: string) =>
      new TextDecoder('iso-8859-1').decode(Uint8Array.from(s, (c) => c.charCodeAt(0)));
    const msg = decode(errObj.message ?? '');
    const detail = errObj.detailedMessage ? ` — ${decode(errObj.detailedMessage)}` : '';
    return msg ? `Erro ${errObj.code}: ${msg}${detail}` : 'Erro ao processar a requisição.';
  } catch {
    return (err as any)?.error?.message ?? `Erro ${status ?? ''}: Erro inesperado`.trim();
  }
}
