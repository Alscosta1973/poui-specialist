import * as assert from 'node:assert';
import { buildWindowsCommandLine } from '../../windowsShell';

describe('buildWindowsCommandLine', () => {
  it('leaves plain arguments without spaces/tabs/quotes unquoted', () => {
    assert.strictEqual(buildWindowsCommandLine('gemini', ['--skip-trust', '--yolo']), 'gemini --skip-trust --yolo');
  });

  it('quotes an argument containing a space', () => {
    assert.strictEqual(buildWindowsCommandLine('gemini', ['-p', 'diga oi']), 'gemini -p "diga oi"');
  });

  it('escapes an embedded double quote inside a quoted argument', () => {
    assert.strictEqual(
      buildWindowsCommandLine('gemini', ['-p', 'diga "oi" com aspas']),
      'gemini -p "diga \\"oi\\" com aspas"',
    );
  });

  it('preserves a lone backslash not adjacent to a quote or the string end', () => {
    assert.strictEqual(
      buildWindowsCommandLine('gemini', ['-p', 'caminho\\ com "aspas"']),
      'gemini -p "caminho\\ com \\"aspas\\""',
    );
  });

  it('doubles a trailing backslash right before the closing quote', () => {
    assert.strictEqual(
      buildWindowsCommandLine('gemini', ['--system-prompt-file', 'C:\\Program Files\\']),
      'gemini --system-prompt-file "C:\\Program Files\\\\"',
    );
  });

  it('quotes an empty-string argument as two double quotes', () => {
    assert.strictEqual(buildWindowsCommandLine('gemini', ['-p', '']), 'gemini -p ""');
  });

  it('leaves a Windows path with backslashes but no spaces unquoted', () => {
    assert.strictEqual(
      buildWindowsCommandLine('gemini', ['--system-prompt-file', 'C:\\Users\\andre\\prompt.txt']),
      'gemini --system-prompt-file C:\\Users\\andre\\prompt.txt',
    );
  });
});
