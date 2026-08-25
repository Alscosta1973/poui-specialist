import * as assert from 'node:assert';
import { addKarmaTestTarget, ensureJasmineTypes, ensureSpecReference, KARMA_CONFIG_CONTENT } from '../../karmaSetup';

describe('addKarmaTestTarget', () => {
  it('adds a "test" architect target reusing the build target\'s assets/styles', () => {
    const angularJson = JSON.stringify({
      projects: {
        app: {
          architect: {
            build: {
              builder: '@angular/build:application',
              options: {
                assets: [{ glob: '**/*', input: 'public' }],
                styles: ['src/styles.scss'],
              },
            },
          },
        },
      },
    });

    const updated = JSON.parse(addKarmaTestTarget(angularJson));
    const testTarget = updated.projects.app.architect.test;

    assert.ok(testTarget);
    assert.strictEqual(testTarget.builder, '@angular/build:karma');
    assert.strictEqual(testTarget.options.tsConfig, 'tsconfig.spec.json');
    assert.strictEqual(testTarget.options.karmaConfig, 'karma.conf.js');
    assert.deepStrictEqual(testTarget.options.polyfills, ['zone.js']);
    assert.deepStrictEqual(testTarget.options.assets, [{ glob: '**/*', input: 'public' }]);
    assert.deepStrictEqual(testTarget.options.styles, ['src/styles.scss']);
  });

  it('is a no-op for a project that already has a "test" target', () => {
    const angularJson = JSON.stringify({
      projects: {
        app: {
          architect: {
            build: { builder: '@angular/build:application', options: {} },
            test: { builder: '@angular/build:karma', options: { tsConfig: 'custom.json' } },
          },
        },
      },
    });

    const updated = JSON.parse(addKarmaTestTarget(angularJson));
    assert.strictEqual(updated.projects.app.architect.test.options.tsConfig, 'custom.json');
  });

  it('skips projects with no "build" target (e.g. a library)', () => {
    const angularJson = JSON.stringify({
      projects: {
        lib: { architect: { 'ng-packagr': { builder: '@angular/build:ng-packagr', options: {} } } },
      },
    });

    const updated = JSON.parse(addKarmaTestTarget(angularJson));
    assert.strictEqual(updated.projects.lib.architect.test, undefined);
  });
});

describe('ensureJasmineTypes', () => {
  it('replaces vitest/globals with jasmine', () => {
    const tsconfig = `{\n  "compilerOptions": {\n    "types": [\n      "vitest/globals"\n    ]\n  }\n}\n`;
    const updated = ensureJasmineTypes(tsconfig);
    assert.ok(/"types"\s*:\s*\[\s*"jasmine"\s*\]/.test(updated));
    assert.ok(!updated.includes('vitest'));
  });

  it('is a no-op when jasmine is already present', () => {
    const tsconfig = `{ "compilerOptions": { "types": ["jasmine"] } }`;
    assert.strictEqual(ensureJasmineTypes(tsconfig), tsconfig);
  });

  it('inserts a types array when compilerOptions has none', () => {
    const tsconfig = `{\n  "compilerOptions": {\n    "outDir": "./out-tsc/spec"\n  }\n}\n`;
    const updated = ensureJasmineTypes(tsconfig);
    assert.ok(/"types"\s*:\s*\[\s*"jasmine"\s*\]/.test(updated));
    assert.ok(updated.includes('"outDir": "./out-tsc/spec"'));
  });
});

describe('ensureSpecReference', () => {
  it('adds a reference to tsconfig.spec.json when missing', () => {
    const tsconfig = `{\n  "files": [],\n  "references": [\n    { "path": "./tsconfig.app.json" }\n  ]\n}\n`;
    const updated = ensureSpecReference(tsconfig);
    assert.ok(updated.includes('"./tsconfig.spec.json"'));
    assert.ok(updated.includes('"./tsconfig.app.json"'));
  });

  it('is a no-op when the reference already exists', () => {
    const tsconfig = `{\n  "references": [\n    { "path": "./tsconfig.app.json" },\n    { "path": "./tsconfig.spec.json" }\n  ]\n}\n`;
    assert.strictEqual(ensureSpecReference(tsconfig), tsconfig);
  });

  it('leaves the file unchanged when there is no "references" array at all', () => {
    const tsconfig = `{\n  "compilerOptions": {}\n}\n`;
    assert.strictEqual(ensureSpecReference(tsconfig), tsconfig);
  });
});

describe('KARMA_CONFIG_CONTENT', () => {
  it('does not reference karma-jasmine-html-reporter (real-world incompatibility with @angular/build:karma)', () => {
    assert.ok(!KARMA_CONFIG_CONTENT.includes('karma-jasmine-html-reporter'));
    assert.ok(!KARMA_CONFIG_CONTENT.includes('kjhtml'));
  });
});
