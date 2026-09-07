import * as assert from 'node:assert';
import { buildPurchaseMailto, PURCHASE_EMAIL } from '../../purchaseLink';

describe('buildPurchaseMailto', () => {
  it('builds a mailto: URL to the purchase email with subject and body set', () => {
    const url = buildPurchaseMailto();
    assert.ok(url.startsWith(`mailto:${PURCHASE_EMAIL}?`));
    assert.ok(url.includes('subject='));
    assert.ok(url.includes('body='));
  });

  it('percent-encodes the subject and body (no raw spaces or accented characters)', () => {
    const url = buildPurchaseMailto();
    assert.ok(!/[ áãçéê]/.test(url), 'expected the query string to be fully percent-encoded');
  });
});
