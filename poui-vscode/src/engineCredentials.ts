import { EngineId } from './engineTypes';

export interface SecretStorage {
  get(key: string): Thenable<string | undefined>;
  store(key: string, value: string): Thenable<void>;
  delete(key: string): Thenable<void>;
}

export interface CredentialContext {
  secrets: SecretStorage;
}

/** Só Codex e Gemini têm credencial gerenciada pela extensão — Claude
 * depende só do login próprio do `claude` CLI, fora deste mecanismo. */
const CREDENTIAL_ENV_VAR: Partial<Record<EngineId, string>> = {
  codex: 'OPENAI_API_KEY',
  gemini: 'GEMINI_API_KEY',
};

function secretKey(engineId: EngineId): string {
  return `poui.credential.${engineId}`;
}

export async function getCredentialEnv(
  context: CredentialContext,
  engineId: EngineId,
): Promise<Record<string, string>> {
  const envVar = CREDENTIAL_ENV_VAR[engineId];
  if (!envVar) {
    return {};
  }
  const value = await context.secrets.get(secretKey(engineId));
  return value ? { [envVar]: value } : {};
}

export async function storeCredential(
  context: CredentialContext,
  engineId: EngineId,
  value: string,
): Promise<void> {
  await context.secrets.store(secretKey(engineId), value);
}

export async function deleteCredential(context: CredentialContext, engineId: EngineId): Promise<void> {
  await context.secrets.delete(secretKey(engineId));
}

export async function hasCredential(context: CredentialContext, engineId: EngineId): Promise<boolean> {
  const value = await context.secrets.get(secretKey(engineId));
  return value !== undefined;
}
