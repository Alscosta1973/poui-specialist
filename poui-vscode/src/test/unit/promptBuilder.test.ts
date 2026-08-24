import * as assert from 'node:assert';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { buildListSystemPrompt, buildListUserPrompt } from '../../promptBuilder';
import { deriveEntityNaming } from '../../naming';
import { getListComponentType } from '../../listTypes';

async function writeFixtures(files: string[]): Promise<string> {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'poui-prompt-'));
  for (const file of files) {
    await fs.writeFile(path.join(tmpDir, file), `MARKER_${file}`, 'utf8');
  }
  return tmpDir;
}

describe('buildListSystemPrompt', () => {
  it('concatenates all of page-list\'s 6 reference files with source markers and a preamble', async () => {
    const type = getListComponentType('page-list')!;
    const tmpDir = await writeFixtures(type.referenceFiles);

    const prompt = await buildListSystemPrompt(type, tmpDir);

    for (const file of type.referenceFiles) {
      assert.ok(prompt.includes(`MARKER_${file}`), `expected prompt to include the fixture for ${file}`);
    }
    assert.ok(
      prompt.toLowerCase().includes('não tente ler novamente'),
      'expected the preamble warning about not re-reading relative paths',
    );
    assert.ok(
      prompt.toLowerCase().includes('não interativa'),
      'expected the preamble to declare the run as non-interactive',
    );
    assert.ok(
      prompt.toLowerCase().includes('não peça confirmação'),
      'expected the preamble to forbid asking the user for confirmation',
    );
    assert.ok(
      prompt.includes('`skills/`, `agents/` ou `commands/`'),
      'expected the preamble to forbid creating the plugin-internal directories',
    );
  });

  it('concatenates a different type\'s reference files too (proves it is generic, not page-list-only)', async () => {
    const type = getListComponentType('stacked-browse')!;
    const tmpDir = await writeFixtures(type.referenceFiles);

    const prompt = await buildListSystemPrompt(type, tmpDir);

    for (const file of type.referenceFiles) {
      assert.ok(prompt.includes(`MARKER_${file}`), `expected prompt to include the fixture for ${file}`);
    }
    // page-list's own template must NOT leak into a stacked-browse prompt.
    assert.ok(!prompt.includes('templates-page-list.md'));
  });

  it('rejects when a reference file is missing', async () => {
    const type = getListComponentType('page-list')!;
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'poui-prompt-missing-'));
    await assert.rejects(() => buildListSystemPrompt(type, tmpDir));
  });
});

describe('buildListUserPrompt', () => {
  it('includes the type id/label, entity, module, endpoint and derived names', () => {
    const type = getListComponentType('stacked-browse')!;
    const naming = deriveEntityNaming('Pedidos');
    const prompt = buildListUserPrompt(type, naming, 'financeiro', '/rest/api/custom/v1/pedidos');

    assert.ok(prompt.includes('stacked-browse'));
    assert.ok(prompt.includes('Stacked Browse'));
    assert.ok(prompt.includes('Pedidos'));
    assert.ok(prompt.includes('financeiro'));
    assert.ok(prompt.includes('/rest/api/custom/v1/pedidos'));
    assert.ok(prompt.includes('PedidosListComponent'));
    assert.ok(prompt.includes('PedidosService'));
  });
});
