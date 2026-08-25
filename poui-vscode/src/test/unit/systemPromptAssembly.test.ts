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
});
