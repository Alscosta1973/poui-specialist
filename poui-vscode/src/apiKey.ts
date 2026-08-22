const SECRET_KEY = 'poui.anthropicApiKey';

export interface SecretStorageLike {
  get(key: string): Thenable<string | undefined>;
  store(key: string, value: string): Thenable<void>;
  delete(key: string): Thenable<void>;
}

export async function getApiKey(secrets: SecretStorageLike): Promise<string | undefined> {
  return secrets.get(SECRET_KEY);
}

export async function setApiKey(secrets: SecretStorageLike, value: string): Promise<void> {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error('API key vazia.');
  }
  await secrets.store(SECRET_KEY, trimmed);
}
