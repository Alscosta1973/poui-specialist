import * as assert from 'node:assert';
import { checkEngineAvailable, RunVersionCheck } from '../../cliCheck';

describe('checkEngineAvailable', () => {
  it('reports available with the trimmed version when the command succeeds', async () => {
    const run: RunVersionCheck = async () => ({ stdout: '2.1.238 (Claude Code)\n' });
    const result = await checkEngineAvailable('claude', run);
    assert.deepStrictEqual(result, { available: true, version: '2.1.238 (Claude Code)' });
  });

  it('reports unavailable with the error message when the command is not found', async () => {
    const run: RunVersionCheck = async () => {
      throw new Error('spawn claude ENOENT');
    };
    const result = await checkEngineAvailable('claude', run);
    assert.strictEqual(result.available, false);
    assert.strictEqual(result.errorMessage, 'spawn claude ENOENT');
  });

  it('invokes the claude binary and --version flag for engine "claude"', async () => {
    let capturedCommand: string | undefined;
    let capturedArgs: string[] | undefined;
    const run: RunVersionCheck = async (command, args) => {
      capturedCommand = command;
      capturedArgs = args;
      return { stdout: '2.1.238' };
    };
    await checkEngineAvailable('claude', run);
    assert.strictEqual(capturedCommand, 'claude');
    assert.deepStrictEqual(capturedArgs, ['--version']);
  });

  it('invokes the codex binary and --version flag for engine "codex"', async () => {
    let capturedCommand: string | undefined;
    const run: RunVersionCheck = async (command) => {
      capturedCommand = command;
      return { stdout: 'codex-cli 1.0.0' };
    };
    await checkEngineAvailable('codex', run);
    assert.strictEqual(capturedCommand, 'codex');
  });

  it('invokes the gemini binary and --version flag for engine "gemini"', async () => {
    let capturedCommand: string | undefined;
    const run: RunVersionCheck = async (command) => {
      capturedCommand = command;
      return { stdout: '0.5.0' };
    };
    await checkEngineAvailable('gemini', run);
    assert.strictEqual(capturedCommand, 'gemini');
  });
});
