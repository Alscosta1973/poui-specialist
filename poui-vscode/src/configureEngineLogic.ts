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

export function buildCredentialChoices(hasStoredCredential: boolean): CredentialChoice[] {
  const choices: CredentialChoice[] = [
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
