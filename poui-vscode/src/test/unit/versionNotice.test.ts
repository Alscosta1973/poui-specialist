import * as assert from 'node:assert';
import { shouldShowWhatsNew } from '../../versionNotice';

describe('shouldShowWhatsNew', () => {
  it('does not show on first install (no version seen yet)', () => {
    assert.strictEqual(shouldShowWhatsNew(undefined, '1.2.0'), false);
  });

  it('shows when the seen version differs from the current one', () => {
    assert.strictEqual(shouldShowWhatsNew('1.1.1', '1.2.0'), true);
  });

  it('does not show again for the same version', () => {
    assert.strictEqual(shouldShowWhatsNew('1.2.0', '1.2.0'), false);
  });
});
