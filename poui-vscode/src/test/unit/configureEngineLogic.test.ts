import * as assert from 'node:assert';
import {
  buildEngineChoices,
  buildCredentialChoices,
  buildValidationOptions,
  getValidationTimeoutMs,
  interpretValidationResult,
} from '../../configureEngineLogic';

describe('buildEngineChoices', () => {
  it('lists claude, codex and gemini, marking the active engine', () => {
    const choices = buildEngineChoices('codex');
    assert.deepStrictEqual(
      choices.map((c) => [c.engineId, c.description]),
      [
        ['claude', ''],
        ['codex', '(motor ativo)'],
        ['gemini', ''],
      ],
    );
  });
});

describe('buildCredentialChoices', () => {
  it('offers oauth and apiKey without a remove option when nothing is stored (codex)', () => {
    const choices = buildCredentialChoices('codex', false);
    assert.deepStrictEqual(choices.map((c) => c.action), ['oauth', 'apiKey']);
  });

  it('also offers remove when a credential is already stored (codex)', () => {
    const choices = buildCredentialChoices('codex', true);
    assert.deepStrictEqual(choices.map((c) => c.action), ['oauth', 'apiKey', 'remove']);
  });

  it('never offers oauth for gemini — Google discontinued individual login for the gemini CLI (2026-09-15)', () => {
    const choices = buildCredentialChoices('gemini', false);
    assert.deepStrictEqual(choices.map((c) => c.action), ['apiKey']);
  });

  it('still offers remove for gemini when a credential is already stored, just no oauth', () => {
    const choices = buildCredentialChoices('gemini', true);
    assert.deepStrictEqual(choices.map((c) => c.action), ['apiKey', 'remove']);
  });
});

describe('buildValidationOptions', () => {
  it('builds a minimal RunAgentOptions with a short OK-only prompt', () => {
    const options = buildValidationOptions('/tmp/workspace');
    assert.strictEqual(options.cwd, '/tmp/workspace');
    assert.strictEqual(options.userPrompt, 'Responda apenas OK.');
    assert.strictEqual(options.tools, undefined);
    assert.strictEqual(options.addDir, undefined);
    assert.strictEqual(options.mcpConfig, undefined);
  });
});

describe('getValidationTimeoutMs', () => {
  it('returns 60000 — 30s was too short for gemini-cli\'s own retry-with-backoff on transient 503s', () => {
    assert.strictEqual(getValidationTimeoutMs(), 60000);
  });
});

describe('interpretValidationResult', () => {
  it('returns a success outcome when succeeded is true', () => {
    const outcome = interpretValidationResult('Gemini', { filesWritten: [], succeeded: true });
    assert.strictEqual(outcome.kind, 'success');
  });

  it('returns an authError outcome when isAuthError is true', () => {
    const outcome = interpretValidationResult('Gemini', {
      filesWritten: [],
      succeeded: false,
      isAuthError: true,
      errorMessage: 'nope',
    });
    assert.strictEqual(outcome.kind, 'authError');
  });

  it('returns an otherError outcome with the raw error message otherwise', () => {
    const outcome = interpretValidationResult('Gemini', {
      filesWritten: [],
      succeeded: false,
      errorMessage: 'network down',
    });
    assert.strictEqual(outcome.kind, 'otherError');
    assert.ok(outcome.message.includes('network down'));
  });
});
