import * as assert from 'node:assert';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { buildPageListSystemPrompt, buildPageListUserPrompt } from '../../promptBuilder';
import { deriveEntityNaming } from '../../naming';

describe('buildPageListSystemPrompt', () => {
  it('concatenates all 6 reference files with source markers and a preamble', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'poui-prompt-'));
    const fixtures: Record<string, string> = {
      'code-generator-list.md': 'MARKER_AGENT',
      'templates-page-list.md': 'MARKER_TEMPLATE_PAGE_LIST',
      'templates-service.md': 'MARKER_TEMPLATE_SERVICE',
      'table-components.md': 'MARKER_TABLE_COMPONENTS',
      'po-ui-quirks-table.md': 'MARKER_QUIRKS_TABLE',
      'po-ui-quirks-onpush.md': 'MARKER_QUIRKS_ONPUSH',
    };
    for (const [file, content] of Object.entries(fixtures)) {
      await fs.writeFile(path.join(tmpDir, file), content, 'utf8');
    }

    const prompt = await buildPageListSystemPrompt(tmpDir);

    for (const marker of Object.values(fixtures)) {
      assert.ok(prompt.includes(marker), `expected prompt to include ${marker}`);
    }
    assert.ok(
      prompt.toLowerCase().includes('não tente ler novamente'),
      'expected the preamble warning about not re-reading relative paths',
    );
  });

  it('rejects when a reference file is missing', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'poui-prompt-missing-'));
    await assert.rejects(() => buildPageListSystemPrompt(tmpDir));
  });
});

describe('buildPageListUserPrompt', () => {
  it('includes entity, module, endpoint and derived names', () => {
    const naming = deriveEntityNaming('Pedidos');
    const prompt = buildPageListUserPrompt(naming, 'financeiro', '/rest/api/custom/v1/pedidos');

    assert.ok(prompt.includes('Pedidos'));
    assert.ok(prompt.includes('financeiro'));
    assert.ok(prompt.includes('/rest/api/custom/v1/pedidos'));
    assert.ok(prompt.includes('PedidosListComponent'));
    assert.ok(prompt.includes('PedidosService'));
  });
});
