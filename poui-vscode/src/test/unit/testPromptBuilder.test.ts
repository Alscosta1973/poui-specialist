import * as assert from 'node:assert';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { buildTestSystemPrompt, buildTestUserPrompt, TEST_REFERENCE_FILES } from '../../testPromptBuilder';

async function writeFixtures(files: string[]): Promise<string> {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'poui-test-prompt-'));
  for (const file of files) {
    await fs.writeFile(path.join(tmpDir, file), `MARKER_${file}`, 'utf8');
  }
  return tmpDir;
}

describe('buildTestSystemPrompt', () => {
  it('concatenates all 8 poui-test reference files with source markers and a preamble', async () => {
    const tmpDir = await writeFixtures(TEST_REFERENCE_FILES);

    const prompt = await buildTestSystemPrompt(tmpDir);

    for (const file of TEST_REFERENCE_FILES) {
      assert.ok(prompt.includes(`MARKER_${file}`), `expected prompt to include the fixture for ${file}`);
    }
    assert.ok(
      prompt.toLowerCase().includes('não interativa'),
      'expected the preamble to declare the run as non-interactive',
    );
  });

  it('rejects when a reference file is missing', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'poui-test-prompt-missing-'));
    await assert.rejects(() => buildTestSystemPrompt(tmpDir));
  });
});

describe('buildTestUserPrompt', () => {
  it('includes the target file path and the derived spec path', () => {
    const prompt = buildTestUserPrompt('src/app/financeiro/financeiro-list/financeiro-list.component.ts');

    assert.ok(prompt.includes('src/app/financeiro/financeiro-list/financeiro-list.component.ts'));
    assert.ok(prompt.includes('src/app/financeiro/financeiro-list/financeiro-list.component.spec.ts'));
  });

  it('tells the model not to run ng test or any other command', () => {
    const prompt = buildTestUserPrompt('src/app/financeiro/financeiro.service.ts');

    assert.ok(prompt.toLowerCase().includes('não rode'));
    assert.ok(prompt.toLowerCase().includes('ng test'));
  });
});
