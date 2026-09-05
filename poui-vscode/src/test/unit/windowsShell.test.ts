import * as assert from 'node:assert';
import { buildPowerShellInvocation } from '../../windowsShell';

describe('buildPowerShellInvocation', () => {
  it('wraps the command and every argument in single quotes, joined with the call operator', () => {
    assert.strictEqual(
      buildPowerShellInvocation('gemini', ['--skip-trust', '--yolo']),
      "& 'gemini' '--skip-trust' '--yolo'",
    );
  });

  it('handles an argument containing a space with no special treatment beyond the quotes', () => {
    assert.strictEqual(buildPowerShellInvocation('gemini', ['-p', 'diga oi']), "& 'gemini' '-p' 'diga oi'");
  });

  it('preserves an embedded literal newline inside a single argument', () => {
    const multiline = 'linha um\nlinha dois\n\nlinha quatro';
    assert.strictEqual(
      buildPowerShellInvocation('gemini', ['-p', multiline]),
      "& 'gemini' '-p' 'linha um\nlinha dois\n\nlinha quatro'",
    );
  });

  it('doubles an embedded single quote (PowerShell single-quoted string escaping)', () => {
    assert.strictEqual(
      buildPowerShellInvocation('gemini', ['-p', "diga 'oi' com aspas simples"]),
      "& 'gemini' '-p' 'diga ''oi'' com aspas simples'",
    );
  });

  it('leaves a double quote inside the argument untouched (single-quoted strings do not treat it specially)', () => {
    assert.strictEqual(
      buildPowerShellInvocation('gemini', ['-p', 'diga "oi" com aspas duplas']),
      '& \'gemini\' \'-p\' \'diga "oi" com aspas duplas\'',
    );
  });

  it('quotes an empty-string argument as two single quotes', () => {
    assert.strictEqual(buildPowerShellInvocation('gemini', ['-p', '']), "& 'gemini' '-p' ''");
  });

  it('quotes a Windows path with backslashes with no special escaping needed', () => {
    assert.strictEqual(
      buildPowerShellInvocation('gemini', ['--system-prompt-file', 'C:\\Users\\andre\\prompt.txt']),
      "& 'gemini' '--system-prompt-file' 'C:\\Users\\andre\\prompt.txt'",
    );
  });
});
