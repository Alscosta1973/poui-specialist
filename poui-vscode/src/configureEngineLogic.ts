import { EngineId, RunAgentOptions, GenerateResult } from './engineTypes';
import { TIMEOUT_ERROR_MESSAGE } from './runAgentForCommand';

export interface EngineChoice {
  label: string;
  description: string;
  engineId: EngineId;
}

export const ENGINE_LABELS: Record<EngineId, string> = {
  claude: 'Claude',
  codex: 'Codex',
  gemini: 'Gemini',
};

export function buildEngineChoices(activeEngineId: EngineId): EngineChoice[] {
  return (['claude', 'codex', 'gemini'] as EngineId[]).map((engineId) => ({
    label: ENGINE_LABELS[engineId],
    description: engineId === activeEngineId ? '(motor ativo)' : '',
    engineId,
  }));
}

export type CredentialAction = 'oauth' | 'apiKey' | 'remove';

export interface CredentialChoice {
  label: string;
  action: CredentialAction;
}

/** Gemini não oferece `oauth` — achado real confirmado em 2026-09-15: o
 * Google descontinuou "Gemini Code Assist for individuals" (a única forma
 * de login gratuito que o `gemini` CLI abria), migrando pro produto novo
 * "Antigravity" (`https://antigravity.google`). Tentar essa opção agora só
 * resulta em "Failed to sign in" — e o modo headless que a extensão usa já
 * exigia `GEMINI_API_KEY`/`GOOGLE_API_KEY` mesmo antes disso (ver
 * `geminiAdapter.ts`), então API key sempre foi o caminho real pra esse
 * motor. Codex não tem esse problema confirmado, mantém as duas opções. */
export function buildCredentialChoices(engineId: EngineId, hasStoredCredential: boolean): CredentialChoice[] {
  const choices: CredentialChoice[] =
    engineId === 'gemini'
      ? [{ label: 'Tenho uma API key', action: 'apiKey' }]
      : [
          { label: 'Login gratuito (abre navegador)', action: 'oauth' },
          { label: 'Tenho uma API key', action: 'apiKey' },
        ];
  if (hasStoredCredential) {
    choices.push({ label: 'Remover credencial salva', action: 'remove' });
  }
  return choices;
}

// Achado real (2026-09-15): 30s era curto demais — o Gemini CLI faz
// retry-with-backoff sozinho em erros 503 transitórios do servidor
// ("high demand"), e a 4ª tentativa já passa dos 30s. 60s dá folga pra
// algumas rodadas de backoff sem deixar o usuário esperando pra sempre
// (a geração de verdade, fora deste teste de conexão, não tem teto).
const VALIDATION_TIMEOUT_MS = 60000;

export function buildValidationOptions(cwd: string): RunAgentOptions {
  return {
    cwd,
    systemPrompt: 'Você está validando uma credencial de API. Responda apenas com a palavra OK, nada mais.',
    userPrompt: 'Responda apenas OK.',
  };
}

export function getValidationTimeoutMs(): number {
  return VALIDATION_TIMEOUT_MS;
}

export interface ValidationOutcome {
  kind: 'success' | 'authError' | 'timeout' | 'otherError';
  message: string;
}

export function interpretValidationResult(engineLabel: string, result: GenerateResult): ValidationOutcome {
  if (result.succeeded) {
    return { kind: 'success', message: `PO-UI: conexão com ${engineLabel} validada com sucesso.` };
  }
  // Distinguido de 'otherError' pra `configureEngine.ts` poder oferecer
  // "Continuar mesmo assim" — achado real: um timeout aqui costuma ser o
  // servidor do provedor sobrecarregado (ver TIMEOUT_ERROR_MESSAGE), não
  // uma credencial errada, e a geração de verdade não tem esse teto de
  // tempo — não faz sentido bloquear o usuário de escolher o motor só
  // porque esse teste rápido esbarrou num 503 temporário.
  if (result.errorMessage === TIMEOUT_ERROR_MESSAGE) {
    return { kind: 'timeout', message: `PO-UI: falha ao testar ${engineLabel} — ${result.errorMessage}` };
  }
  if (result.isAuthError) {
    return {
      kind: 'authError',
      message: `PO-UI: credencial inválida ou sem permissão para ${engineLabel}. Tente novamente.`,
    };
  }
  return {
    kind: 'otherError',
    message: `PO-UI: falha ao testar ${engineLabel} — ${result.errorMessage ?? 'erro desconhecido'}.`,
  };
}
