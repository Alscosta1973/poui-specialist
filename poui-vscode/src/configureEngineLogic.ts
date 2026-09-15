import { EngineId, RunAgentOptions, GenerateResult } from './engineTypes';

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

const VALIDATION_TIMEOUT_MS = 30000;

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
  kind: 'success' | 'authError' | 'otherError';
  message: string;
}

export function interpretValidationResult(engineLabel: string, result: GenerateResult): ValidationOutcome {
  if (result.succeeded) {
    return { kind: 'success', message: `PO-UI: conexão com ${engineLabel} validada com sucesso.` };
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
