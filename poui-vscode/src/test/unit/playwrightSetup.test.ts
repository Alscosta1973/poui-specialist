import * as assert from 'node:assert';
import { PLAYWRIGHT_CONFIG_CONTENT, buildGitignoreAdditions } from '../../playwrightSetup';

describe('PLAYWRIGHT_CONFIG_CONTENT', () => {
  it('points testDir at ./e2e and honors PO_E2E_BASE_URL', () => {
    assert.ok(PLAYWRIGHT_CONFIG_CONTENT.includes(`testDir: './e2e'`));
    assert.ok(PLAYWRIGHT_CONFIG_CONTENT.includes('PO_E2E_BASE_URL'));
  });
});

describe('buildGitignoreAdditions', () => {
  it('returns the ephemeral Playwright artifact patterns not yet present', () => {
    const additions = buildGitignoreAdditions('');
    assert.ok(additions.includes('/test-results'));
    assert.ok(additions.includes('/.playwright-mcp'));
  });

  it('returns an empty string when every pattern is already present', () => {
    const existing = ['/test-results', '/playwright-report', '/.playwright-mcp', '/blob-report', '/playwright/.cache'].join('\n');
    assert.strictEqual(buildGitignoreAdditions(existing), '');
  });
});
