import * as assert from 'node:assert';
import {
  readProjectName,
  needsOutputPathFix,
  fixOutputPath,
  buildPackageGitignoreAdditions,
  findSevenZip,
  verifyZipHasProjectRoot,
} from '../../packaging';

describe('readProjectName', () => {
  it('returns the first project key declared in angular.json', () => {
    const angularJson = { projects: { 'meu-projeto': { architect: {} } } };
    assert.strictEqual(readProjectName(angularJson), 'meu-projeto');
  });

  it('throws when angular.json has no projects', () => {
    assert.throws(() => readProjectName({ projects: {} }), /nenhum projeto/i);
  });
});

describe('needsOutputPathFix', () => {
  it('needs a fix when outputPath is a plain string', () => {
    assert.strictEqual(needsOutputPathFix('dist/meu-projeto'), true);
  });

  it('needs a fix when outputPath is an object without browser: ""', () => {
    assert.strictEqual(needsOutputPathFix({ base: 'dist/meu-projeto' }), true);
  });

  it('does not need a fix when outputPath already has browser: ""', () => {
    assert.strictEqual(needsOutputPathFix({ base: 'dist/meu-projeto', browser: '' }), false);
  });
});

describe('fixOutputPath', () => {
  it('rewrites outputPath to { base, browser: "" } for the given project, leaving the rest of angular.json untouched', () => {
    const angularJson = {
      projects: {
        'meu-projeto': {
          architect: { build: { options: { outputPath: 'dist/meu-projeto', assets: ['src/favicon.ico'] } } },
        },
      },
      version: 1,
    };

    const fixed = fixOutputPath(angularJson, 'meu-projeto');

    assert.deepStrictEqual(fixed.projects['meu-projeto'].architect.build.options.outputPath, {
      base: 'dist/meu-projeto',
      browser: '',
    });
    assert.deepStrictEqual(fixed.projects['meu-projeto'].architect.build.options.assets, ['src/favicon.ico']);
    assert.strictEqual(fixed.version, 1);
  });
});

describe('buildPackageGitignoreAdditions', () => {
  it('returns the packaging artifact patterns not yet present', () => {
    const additions = buildPackageGitignoreAdditions('node_modules/\n');
    assert.ok(additions.includes('dist/'));
    assert.ok(additions.includes('*.zip'));
    assert.ok(additions.includes('Resource/'));
  });

  it('returns an empty string when every pattern is already present', () => {
    const additions = buildPackageGitignoreAdditions('dist/\n*.zip\nResource/\n');
    assert.strictEqual(additions, '');
  });
});

describe('findSevenZip', () => {
  it('finds 7z.exe in a PATH directory', () => {
    const found = findSevenZip('C:\\tools\\x;C:\\Program Files\\7-Zip', (p) => p === 'C:\\Program Files\\7-Zip\\7z.exe');
    assert.strictEqual(found, 'C:\\Program Files\\7-Zip\\7z.exe');
  });

  it('falls back to the default install locations when not on PATH', () => {
    const found = findSevenZip('C:\\tools\\x', (p) => p === 'C:\\Program Files\\7-Zip\\7z.exe');
    assert.strictEqual(found, 'C:\\Program Files\\7-Zip\\7z.exe');
  });

  it('returns undefined when 7z.exe is nowhere to be found', () => {
    assert.strictEqual(findSevenZip('C:\\tools\\x', () => false), undefined);
  });
});

describe('verifyZipHasProjectRoot', () => {
  it('recognizes the project folder as the zip root from a 7z listing', () => {
    const listing = [
      'Scanning the drive for archives:',
      '',
      'Listing archive: meu-projeto.zip',
      '',
      '   Date      Time    Attr         Size   Compressed  Name',
      '------------------- ----- ------------ ------------  ------------------------',
      '2026-08-26 12:00:00 D....            0            0  meu-projeto',
      '2026-08-26 12:00:00 .....         1234          500  meu-projeto/index.html',
      '------------------- ----- ------------ ------------  ------------------------',
    ].join('\n');

    assert.strictEqual(verifyZipHasProjectRoot(listing, 'meu-projeto'), true);
  });

  it('returns false when the zip is flattened (no project folder root)', () => {
    const listing = [
      'Listing archive: meu-projeto.zip',
      '   Date      Time    Attr         Size   Compressed  Name',
      '------------------- ----- ------------ ------------  ------------------------',
      '2026-08-26 12:00:00 .....         1234          500  index.html',
    ].join('\n');

    assert.strictEqual(verifyZipHasProjectRoot(listing, 'meu-projeto'), false);
  });
});
