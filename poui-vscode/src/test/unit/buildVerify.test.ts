import * as assert from 'node:assert';
import { parseBuildErrors, runBuild, RunBuildFn } from '../../buildVerify';

describe('parseBuildErrors', () => {
  it('parses an error with a file/line/column location', () => {
    const output = [
      "X [ERROR] TS2322: Type 'string' is not assignable to type 'number'. [plugin angular-compiler]",
      '',
      '    src/app/financeiro/financeiro-edit/financeiro-edit.component.ts:82:6:',
      "      82 │       regex: 'x',",
      '         ╵       ~~~~~',
      '',
    ].join('\n');

    const errors = parseBuildErrors(output);

    assert.strictEqual(errors.length, 1);
    assert.strictEqual(errors[0].file, 'src/app/financeiro/financeiro-edit/financeiro-edit.component.ts');
    assert.strictEqual(errors[0].line, 82);
    assert.strictEqual(errors[0].column, 6);
    assert.ok(errors[0].message.includes('TS2322'));
  });

  it('parses an error with no file/line location (e.g. bundle budget)', () => {
    const output =
      'X [ERROR] bundle initial exceeded maximum budget. Budget 1.00 MB was not met by 2.14 MB with a total of 3.14 MB.\n';
    const errors = parseBuildErrors(output);
    assert.strictEqual(errors.length, 1);
    assert.strictEqual(errors[0].file, undefined);
    assert.ok(errors[0].message.includes('bundle initial exceeded maximum budget'));
  });

  it('parses multiple errors from the same output without cross-attributing locations', () => {
    const output = [
      'X [ERROR] TS2322: first error. [plugin angular-compiler]',
      '',
      '    src/app/a.component.ts:1:1:',
      '',
      'X [ERROR] TS2353: second error. [plugin angular-compiler]',
      '',
      '    src/app/b.component.ts:2:2:',
      '',
    ].join('\n');

    const errors = parseBuildErrors(output);
    assert.strictEqual(errors.length, 2);
    assert.strictEqual(errors[0].file, 'src/app/a.component.ts');
    assert.strictEqual(errors[0].line, 1);
    assert.strictEqual(errors[1].file, 'src/app/b.component.ts');
    assert.strictEqual(errors[1].line, 2);
  });

  it('does not attach a later, unrelated file:line:col to an error that has none', () => {
    const output = [
      'X [ERROR] bundle initial exceeded maximum budget.',
      '',
      'Some unrelated log line.',
      '',
      '    src/app/a.component.ts:1:1:',
      '',
    ].join('\n');

    const errors = parseBuildErrors(output);
    assert.strictEqual(errors.length, 1);
    assert.strictEqual(errors[0].file, undefined);
  });

  it('returns an empty array for output with no errors', () => {
    const output = 'Application bundle generation complete. [3.9 seconds]\n';
    assert.deepStrictEqual(parseBuildErrors(output), []);
  });

  it('strips ANSI color codes before matching', () => {
    const output =
      '\x1b[31m\x1b[1mX [ERROR] TS2322: colored error. [plugin angular-compiler]\x1b[39m\x1b[22m\n\n    src/app/a.component.ts:1:1:\n';
    const errors = parseBuildErrors(output);
    assert.strictEqual(errors.length, 1);
    assert.ok(errors[0].message.includes('TS2322'));
    assert.ok(!errors[0].message.includes('\x1b'));
  });
});

describe('runBuild', () => {
  it('reports success when the injected runner resolves with success', async () => {
    const run: RunBuildFn = async () => ({ success: true, output: 'Application bundle generation complete.' });
    const result = await runBuild('/tmp/workspace', run);
    assert.strictEqual(result.success, true);
  });

  it('reports failure with captured output when the injected runner resolves with failure', async () => {
    const run: RunBuildFn = async () => ({ success: false, output: 'X [ERROR] ...' });
    const result = await runBuild('/tmp/workspace', run);
    assert.strictEqual(result.success, false);
    assert.ok(result.output.includes('[ERROR]'));
  });
});
