import * as assert from 'node:assert';

describe('test harness smoke test', () => {
  it('runs a trivial assertion', () => {
    assert.strictEqual(1 + 1, 2);
  });
});
