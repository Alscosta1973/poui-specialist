import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { CATALOG, findCatalogEntry } from '../../templateCatalog';

describe('CATALOG', () => {
  it('keeps every entry id unique across all groups', () => {
    const ids = CATALOG.flatMap((g) => g.entries.map((e) => e.id));
    assert.strictEqual(new Set(ids).size, ids.length);
  });

  it('points previewAsset at a file that actually exists under media/previews', () => {
    const previewsDir = path.join(__dirname, '..', '..', '..', 'media', 'previews');
    for (const group of CATALOG) {
      for (const entry of group.entries) {
        if (entry.previewAsset) {
          const fullPath = path.join(previewsDir, entry.previewAsset);
          assert.ok(fs.existsSync(fullPath), `missing preview asset for ${entry.id}: ${fullPath}`);
        }
      }
    }
  });

  it('gives every entry a non-empty description', () => {
    for (const group of CATALOG) {
      for (const entry of group.entries) {
        assert.ok(entry.description.length > 0, `${entry.id} has an empty description`);
      }
    }
  });
});

describe('findCatalogEntry', () => {
  it('finds an entry nested in a non-first group', () => {
    const entry = findCatalogEntry('page-list');
    assert.strictEqual(entry?.title, 'page-list');
  });

  it('returns undefined for an unknown id', () => {
    assert.strictEqual(findCatalogEntry('does-not-exist'), undefined);
  });
});
