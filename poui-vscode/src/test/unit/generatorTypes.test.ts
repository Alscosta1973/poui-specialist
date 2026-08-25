import * as assert from 'node:assert';
import { GENERATOR_TYPES, getGeneratorType } from '../../generatorTypes';

describe('GENERATOR_TYPES', () => {
  it('has exactly the 24 plugin types, each well-formed', () => {
    const ids = GENERATOR_TYPES.map((t) => t.id);
    assert.deepStrictEqual(ids, [
      'page-list',
      'page-dynamic-search',
      'stacked-browse',
      'two-panel-browse',
      'action-list',
      'master-detail',
      'page-dynamic',
      'infinite-scroll',
      'po-tree',
      'page-edit',
      'page-detail',
      'modal-crud',
      'stepper-form',
      'service',
      'dashboard',
      'tlpp-contract',
      'auth-login',
      'module',
      'models',
      'refactor',
      'http-interceptor',
      'route-guard',
      'standalone-migrate',
      'upload',
    ]);
    for (const type of GENERATOR_TYPES) {
      assert.ok(type.label.length > 0, `${type.id} needs a label`);
      assert.ok(type.description.length > 0, `${type.id} needs a description`);
      assert.ok(type.referenceFiles.length > 0, `${type.id} needs at least one reference file`);
      assert.ok(
        ['Lista/Browse', 'Formulários', 'Infraestrutura'].includes(type.family),
        `${type.id} needs a valid family`,
      );
    }
  });

  it('has no duplicate ids', () => {
    const ids = GENERATOR_TYPES.map((t) => t.id);
    assert.strictEqual(new Set(ids).size, ids.length);
  });

  it('points every Lista/Browse type at the list agent file', () => {
    const listTypes = GENERATOR_TYPES.filter((t) => t.family === 'Lista/Browse');
    assert.strictEqual(listTypes.length, 9);
    for (const type of listTypes) {
      assert.ok(type.referenceFiles.includes('code-generator-list.md'));
      assert.strictEqual(type.requiresModule, true);
    }
  });

  it('points every Formulários type at the forms agent file', () => {
    const formTypes = GENERATOR_TYPES.filter((t) => t.family === 'Formulários');
    assert.strictEqual(formTypes.length, 4);
    for (const type of formTypes) {
      assert.ok(type.referenceFiles.includes('code-generator-forms.md'));
      assert.strictEqual(type.requiresModule, true);
    }
  });

  it('points every Infraestrutura type at the infra agent file', () => {
    const infraTypes = GENERATOR_TYPES.filter((t) => t.family === 'Infraestrutura');
    assert.strictEqual(infraTypes.length, 11);
    for (const type of infraTypes) {
      assert.ok(type.referenceFiles.includes('code-generator-infra.md'));
    }
  });

  it('marks auth-login as not requiring a module, with a fixed target', () => {
    const authLogin = getGeneratorType('auth-login')!;
    assert.strictEqual(authLogin.requiresModule, false);
    assert.strictEqual(authLogin.fixedModule, 'auth');
  });

  it('marks module as not requiring a module input and without a fixed target (derives from entity name instead)', () => {
    const moduleType = getGeneratorType('module')!;
    assert.strictEqual(moduleType.requiresModule, false);
    assert.strictEqual(moduleType.fixedModule, undefined);
  });

  it('marks refactor as requiring a source file, unlike every other type', () => {
    const refactor = getGeneratorType('refactor')!;
    assert.strictEqual(refactor.requiresSourceFile, true);
    const others = GENERATOR_TYPES.filter((t) => t.id !== 'refactor');
    for (const type of others) {
      assert.notStrictEqual(type.requiresSourceFile, true, `${type.id} should not require a source file`);
    }
  });
});

describe('getGeneratorType', () => {
  it('returns the matching type by id', () => {
    const type = getGeneratorType('page-edit');
    assert.strictEqual(type?.id, 'page-edit');
    assert.ok(type?.referenceFiles.includes('templates-page-edit.md'));
  });

  it('returns undefined for an unknown id', () => {
    assert.strictEqual(getGeneratorType('not-a-real-type'), undefined);
  });
});
