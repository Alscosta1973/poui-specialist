import * as assert from 'node:assert';
import { getApiKey, setApiKey, SecretStorageLike } from '../../apiKey';

class FakeSecretStorage implements SecretStorageLike {
  private readonly store_ = new Map<string, string>();

  async get(key: string): Promise<string | undefined> {
    return this.store_.get(key);
  }

  async store(key: string, value: string): Promise<void> {
    this.store_.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.store_.delete(key);
  }
}

describe('apiKey', () => {
  it('returns undefined when no key was ever stored', async () => {
    const secrets = new FakeSecretStorage();
    assert.strictEqual(await getApiKey(secrets), undefined);
  });

  it('stores and retrieves a trimmed key', async () => {
    const secrets = new FakeSecretStorage();
    await setApiKey(secrets, '  sk-ant-fake-key  ');
    assert.strictEqual(await getApiKey(secrets), 'sk-ant-fake-key');
  });

  it('rejects an empty or whitespace-only key', async () => {
    const secrets = new FakeSecretStorage();
    await assert.rejects(() => setApiKey(secrets, '   '), /vazia/);
  });
});
