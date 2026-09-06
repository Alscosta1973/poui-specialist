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
  it('offers oauth and apiKey without a remove option when nothing is stored', () => {
    const choices = buildCredentialChoices(false);
    assert.deepStrictEqual(choices.map((c) => c.action), ['oauth', 'apiKey']);
  });

  it('also offers remove when a credential is already stored', () => {
    const choices = buildCredentialChoices(true);
    assert.deepStrictEqual(choices.map((c) => c.action), ['oauth', 'apiKey', 'remove']);
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
  it('returns 30000', () => {
    assert.strictEqual(getValidationTimeoutMs(), 30000);
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
