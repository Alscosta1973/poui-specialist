import * as assert from 'node:assert';
import { LIST_COMPONENT_TYPES, getListComponentType } from '../../listTypes';

describe('LIST_COMPONENT_TYPES', () => {
  it('has exactly the 6 Fase 1 list-family types, each with an id/label/description/referenceFiles', () => {
    const ids = LIST_COMPONENT_TYPES.map((t) => t.id);
    assert.deepStrictEqual(
      ids,
      ['page-list', 'page-dynamic-search', 'stacked-browse', 'two-panel-browse', 'action-list', 'master-detail'],
    );
    for (const type of LIST_COMPONENT_TYPES) {
      assert.ok(type.label.length > 0, `${type.id} needs a label`);
      assert.ok(type.description.length > 0, `${type.id} needs a description`);
      assert.ok(type.referenceFiles.length > 0, `${type.id} needs at least one reference file`);
      assert.ok(
        type.referenceFiles.includes('code-generator-list.md'),
        `${type.id} must include the shared agent file`,
      );
    }
  });

  it('has no duplicate ids', () => {
    const ids = LIST_COMPONENT_TYPES.map((t) => t.id);
    assert.strictEqual(new Set(ids).size, ids.length);
  });
});

describe('getListComponentType', () => {
  it('returns the matching type by id', () => {
    const type = getListComponentType('stacked-browse');
    assert.strictEqual(type?.id, 'stacked-browse');
    assert.ok(type?.referenceFiles.includes('templates-stacked-browse.md'));
  });

  it('returns undefined for an unknown id', () => {
    assert.strictEqual(getListComponentType('not-a-real-type'), undefined);
  });
});
