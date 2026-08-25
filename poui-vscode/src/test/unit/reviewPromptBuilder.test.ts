import * as assert from 'node:assert';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { buildReviewSystemPrompt, buildReviewUserPrompt, REVIEW_REFERENCE_FILES } from '../../reviewPromptBuilder';

async function writeFixtures(files: string[]): Promise<string> {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'poui-review-prompt-'));
  for (const file of files) {
    await fs.writeFile(path.join(tmpDir, file), `MARKER_${file}`, 'utf8');
  }
  return tmpDir;
}

describe('buildReviewSystemPrompt', () => {
  it('concatenates the code-reviewer reference file with a preamble', async () => {
    const tmpDir = await writeFixtures(REVIEW_REFERENCE_FILES);
    const prompt = await buildReviewSystemPrompt(tmpDir);
    for (const file of REVIEW_REFERENCE_FILES) {
      assert.ok(prompt.includes(`MARKER_${file}`));
    }
    assert.ok(prompt.toLowerCase().includes('não interativa'));
  });

  it('rejects when the reference file is missing', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'poui-review-prompt-missing-'));
    await assert.rejects(() => buildReviewSystemPrompt(tmpDir));
  });
});

describe('buildReviewUserPrompt', () => {
  it('includes the target path and the "all" focus by default', () => {
    const prompt = buildReviewUserPrompt('src/app/financeiro');
    assert.ok(prompt.includes('src/app/financeiro'));
    assert.ok(prompt.toLowerCase().includes('todas as categorias'));
  });

  it('includes the chosen focus category', () => {
    const prompt = buildReviewUserPrompt('src/app/financeiro/x.component.ts', 'seguranca');
    assert.ok(prompt.includes('seguranca'));
  });

  it('tells the model not to modify any file, only report findings', () => {
    const prompt = buildReviewUserPrompt('src/app/financeiro');
    assert.ok(prompt.toLowerCase().includes('não modifique'));
  });

  it('tells the model not to offer applying the fixes itself (no write access, real-world coherence gap)', () => {
    const prompt = buildReviewUserPrompt('src/app/financeiro');
    assert.ok(prompt.toLowerCase().includes('não ofereça'));
  });
});
