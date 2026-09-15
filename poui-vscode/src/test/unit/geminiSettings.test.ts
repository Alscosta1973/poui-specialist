import * as assert from 'node:assert';
import { withGeminiApiKeyAuthType } from '../../geminiSettings';

describe('withGeminiApiKeyAuthType', () => {
  it('creates a fresh settings object with gemini-api-key when there is no existing file', () => {
    const result = withGeminiApiKeyAuthType(undefined);
    assert.deepStrictEqual(JSON.parse(result), { security: { auth: { selectedType: 'gemini-api-key' } } });
  });

  it('overwrites a stale oauth-personal selection — real bug: this silently ignores GEMINI_API_KEY', () => {
    const existing = JSON.stringify({ security: { auth: { selectedType: 'oauth-personal' } } });
    const result = withGeminiApiKeyAuthType(existing);
    assert.deepStrictEqual(JSON.parse(result), { security: { auth: { selectedType: 'gemini-api-key' } } });
  });

  it('preserves unrelated existing keys (e.g. ide.hasSeenNudge) untouched', () => {
    const existing = JSON.stringify({ ide: { hasSeenNudge: true }, security: { auth: { selectedType: 'oauth-personal' } } });
    const result = withGeminiApiKeyAuthType(existing);
    assert.deepStrictEqual(JSON.parse(result), {
      ide: { hasSeenNudge: true },
      security: { auth: { selectedType: 'gemini-api-key' } },
    });
  });

  it('preserves other fields under security.auth alongside selectedType', () => {
    const existing = JSON.stringify({ security: { auth: { selectedType: 'oauth-personal', someOtherFlag: true } } });
    const result = withGeminiApiKeyAuthType(existing);
    assert.deepStrictEqual(JSON.parse(result), {
      security: { auth: { selectedType: 'gemini-api-key', someOtherFlag: true } },
    });
  });

  it('falls back to a fresh object when the existing file is corrupt JSON', () => {
    const result = withGeminiApiKeyAuthType('{ not valid json');
    assert.deepStrictEqual(JSON.parse(result), { security: { auth: { selectedType: 'gemini-api-key' } } });
  });

  it('is idempotent — already gemini-api-key stays gemini-api-key', () => {
    const existing = withGeminiApiKeyAuthType(undefined);
    const result = withGeminiApiKeyAuthType(existing);
    assert.strictEqual(result, existing);
  });
});
