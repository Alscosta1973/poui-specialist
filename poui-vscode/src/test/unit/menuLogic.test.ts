import * as assert from 'node:assert';
import { GROUPS, sortedGroupEntries } from '../../menuLogic';

describe('sortedGroupEntries', () => {
  it('sorts entries alphabetically (pt-BR) within a group', () => {
    const group = GROUPS.find((g) => g.label === 'Geração')!;
    const labels = sortedGroupEntries(group).map((e) => e.label);
    const expected = [...labels].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    assert.deepStrictEqual(labels, expected);
    // sanity: confirms the sort actually reordered the source (source is deliberately
    // authored out of alphabetical order — a no-op sort would silently pass the check above)
    assert.notDeepStrictEqual(
      labels,
      group.entries.map((e) => e.label),
    );
  });

  it('does not mutate the original group entries array', () => {
    const group = GROUPS.find((g) => g.label === 'Utilitários')!;
    const before = group.entries.map((e) => e.label);
    sortedGroupEntries(group);
    assert.deepStrictEqual(
      group.entries.map((e) => e.label),
      before,
    );
  });
});

describe('GROUPS', () => {
  it('keeps every command id unique across all groups', () => {
    const ids = GROUPS.flatMap((g) => g.entries.map((e) => e.commandId));
    assert.strictEqual(new Set(ids).size, ids.length);
  });
});
