import * as assert from 'node:assert';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { assembleSystemPrompt } from '../../systemPromptAssembly';

describe('assembleSystemPrompt', () => {
  it('tells the model the real Node.js version detected by the extension host — no Bash access to run `node --version` itself', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'poui-system-prompt-'));
    await fs.writeFile(path.join(tmpDir, 'ref.md'), 'MARKER', 'utf8');

    const prompt = await assembleSystemPrompt(['ref.md'], tmpDir);

    assert.ok(
      prompt.includes(process.version),
      `expected the prompt to include the real Node.js version (${process.version})`,
    );
  });

  it('explicitly instructs ignoring a "wait for yes/no" gate embedded in a reference file (real bug: refactor\'s template has its own confirmation step that overrode the generic non-interactive preamble)', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'poui-system-prompt-'));
    await fs.writeFile(
      path.join(tmpDir, 'ref.md'),
      'Present the plan.\n\nConfirmar geração? (s/n)\n\nWait for a single yes/no.',
      'utf8',
    );

    const prompt = await assembleSystemPrompt(['ref.md'], tmpDir);
    const lower = prompt.toLowerCase();

    assert.ok(
      lower.includes('ignore') && lower.includes('confirma'),
      'expected the preamble to explicitly tell the model to ignore any confirmation gate found in a reference file below',
    );
  });
});
