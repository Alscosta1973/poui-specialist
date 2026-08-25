import * as assert from 'node:assert';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { buildE2eSystemPrompt, buildE2eUserPrompt, E2E_REFERENCE_FILES } from '../../e2ePromptBuilder';

async function writeFixtures(files: string[]): Promise<string> {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'poui-e2e-prompt-'));
  for (const file of files) {
    await fs.writeFile(path.join(tmpDir, file), `MARKER_${file}`, 'utf8');
  }
  return tmpDir;
}

describe('buildE2eSystemPrompt', () => {
  it('concatenates the poui-e2e and poui-test reference files with a preamble', async () => {
    const tmpDir = await writeFixtures(E2E_REFERENCE_FILES);
    const prompt = await buildE2eSystemPrompt(tmpDir);
    for (const file of E2E_REFERENCE_FILES) {
      assert.ok(prompt.includes(`MARKER_${file}`));
    }
    assert.ok(prompt.toLowerCase().includes('não interativa'));
  });

  it('rejects when a reference file is missing', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'poui-e2e-prompt-missing-'));
    await assert.rejects(() => buildE2eSystemPrompt(tmpDir));
  });
});

describe('buildE2eUserPrompt', () => {
  it('includes the target file path and the live preview URL', () => {
    const prompt = buildE2eUserPrompt(
      'src/app/financeiro/fornecedores-list/fornecedores-list.component.ts',
      'http://localhost:4200/financeiro/fornecedores-list',
    );
    assert.ok(prompt.includes('src/app/financeiro/fornecedores-list/fornecedores-list.component.ts'));
    assert.ok(prompt.includes('http://localhost:4200/financeiro/fornecedores-list'));
  });

  it('includes the derived e2e spec path', () => {
    const prompt = buildE2eUserPrompt(
      'src/app/financeiro/fornecedores-list/fornecedores-list.component.ts',
      'http://localhost:4200/financeiro/fornecedores-list',
    );
    assert.ok(prompt.includes('e2e/fornecedores-list.e2e.spec.ts'));
  });

  it('tells the model to use real selectors discovered via browser_snapshot, never invented ones', () => {
    const prompt = buildE2eUserPrompt('src/app/x/x.component.ts', 'http://localhost:4200/x');
    assert.ok(prompt.toLowerCase().includes('browser_snapshot'));
    assert.ok(prompt.toLowerCase().includes('nunca invente'));
  });

  it('tells the model not to run the generated spec itself', () => {
    const prompt = buildE2eUserPrompt('src/app/x/x.component.ts', 'http://localhost:4200/x');
    assert.ok(prompt.toLowerCase().includes('não rode'));
  });
});
