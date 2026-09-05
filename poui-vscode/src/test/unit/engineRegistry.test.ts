import * as assert from 'node:assert';
import { getEngineAdapter } from '../../engineRegistry';
import { claudeAdapter } from '../../claudeAdapter';
import { codexAdapter } from '../../codexAdapter';
import { geminiAdapter } from '../../geminiAdapter';
import { EngineId } from '../../engineTypes';

describe('getEngineAdapter', () => {
  it('returns the claude adapter for "claude"', () => {
    assert.strictEqual(getEngineAdapter('claude'), claudeAdapter);
  });

  it('returns the codex adapter for "codex"', () => {
    assert.strictEqual(getEngineAdapter('codex'), codexAdapter);
  });

  it('returns the gemini adapter for "gemini"', () => {
    assert.strictEqual(getEngineAdapter('gemini'), geminiAdapter);
  });

  it('falls back to the claude adapter for an invalid/unknown engine id', () => {
    assert.strictEqual(getEngineAdapter('bogus' as EngineId), claudeAdapter);
  });
});
