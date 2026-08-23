import * as assert from 'node:assert';
import { checkClaudeCliAvailable, RunVersionCheck } from '../../cliCheck';

describe('checkClaudeCliAvailable', () => {
  it('reports available with the trimmed version when the command succeeds', async () => {
    const run: RunVersionCheck = async () => ({ stdout: '2.1.238 (Claude Code)\n' });
    const result = await checkClaudeCliAvailable(run);
    assert.deepStrictEqual(result, { available: true, version: '2.1.238 (Claude Code)' });
  });

  it('reports unavailable with the error message when the command is not found', async () => {
    const run: RunVersionCheck = async () => {
      throw new Error("spawn claude ENOENT");
    };
    const result = await checkClaudeCliAvailable(run);
    assert.strictEqual(result.available, false);
    assert.strictEqual(result.errorMessage, 'spawn claude ENOENT');
  });

  it('invokes the real command name and version flag by default', async () => {
    let capturedCommand: string | undefined;
    let capturedArgs: string[] | undefined;
    const run: RunVersionCheck = async (command, args) => {
      capturedCommand = command;
      capturedArgs = args;
      return { stdout: '2.1.238' };
    };
    await checkClaudeCliAvailable(run);
    assert.strictEqual(capturedCommand, 'claude');
    assert.deepStrictEqual(capturedArgs, ['--version']);
  });
});
