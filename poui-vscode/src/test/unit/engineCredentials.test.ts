import * as assert from 'node:assert';
import {
  getCredentialEnv,
  storeCredential,
  deleteCredential,
  hasCredential,
  CredentialContext,
  SecretStorage,
} from '../../engineCredentials';

class FakeSecretStorage implements SecretStorage {
  private readonly values = new Map<string, string>();
  async get(key: string): Promise<string | undefined> {
    return this.values.get(key);
  }
  async store(key: string, value: string): Promise<void> {
    this.values.set(key, value);
  }
  async delete(key: string): Promise<void> {
    this.values.delete(key);
  }
}

function makeContext(): CredentialContext {
  return { secrets: new FakeSecretStorage() };
}

describe('engineCredentials', () => {
  it('getCredentialEnv returns {} when nothing is stored', async () => {
    assert.deepStrictEqual(await getCredentialEnv(makeContext(), 'gemini'), {});
  });

  it('getCredentialEnv returns GEMINI_API_KEY for gemini after storeCredential', async () => {
    const context = makeContext();
    await storeCredential(context, 'gemini', 'gk-123');
    assert.deepStrictEqual(await getCredentialEnv(context, 'gemini'), { GEMINI_API_KEY: 'gk-123' });
  });

  it('getCredentialEnv returns OPENAI_API_KEY for codex after storeCredential', async () => {
    const context = makeContext();
    await storeCredential(context, 'codex', 'ok-456');
    assert.deepStrictEqual(await getCredentialEnv(context, 'codex'), { OPENAI_API_KEY: 'ok-456' });
  });

  it('getCredentialEnv always returns {} for claude, even if something were stored under its key', async () => {
    const context = makeContext();
    await context.secrets.store('poui.credential.claude', 'irrelevant');
    assert.deepStrictEqual(await getCredentialEnv(context, 'claude'), {});
  });

  it('deleteCredential removes a stored key', async () => {
    const context = makeContext();
    await storeCredential(context, 'gemini', 'gk-123');
    await deleteCredential(context, 'gemini');
    assert.deepStrictEqual(await getCredentialEnv(context, 'gemini'), {});
  });

  it('hasCredential reflects whether a key is stored', async () => {
    const context = makeContext();
    assert.strictEqual(await hasCredential(context, 'codex'), false);
    await storeCredential(context, 'codex', 'ok-456');
    assert.strictEqual(await hasCredential(context, 'codex'), true);
  });
});
