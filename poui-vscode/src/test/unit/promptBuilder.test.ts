import * as assert from 'node:assert';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { buildGeneratorSystemPrompt, buildGeneratorUserPrompt, generatorReferenceFiles } from '../../promptBuilder';
import { deriveEntityNaming } from '../../naming';
import { getGeneratorType } from '../../generatorTypes';

async function writeFixtures(files: string[]): Promise<string> {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'poui-prompt-'));
  for (const file of files) {
    await fs.writeFile(path.join(tmpDir, file), `MARKER_${file}`, 'utf8');
  }
  return tmpDir;
}

describe('buildGeneratorSystemPrompt', () => {
  it('concatenates all of page-list\'s 6 reference files with source markers and a preamble', async () => {
    const type = getGeneratorType('page-list')!;
    const tmpDir = await writeFixtures(type.referenceFiles);

    const prompt = await buildGeneratorSystemPrompt(type, tmpDir);

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

  it('concatenates a Formulários type\'s reference files too (proves it is generic across families)', async () => {
    const type = getGeneratorType('page-edit')!;
    const tmpDir = await writeFixtures(type.referenceFiles);

    const prompt = await buildGeneratorSystemPrompt(type, tmpDir);

    for (const file of type.referenceFiles) {
      assert.ok(prompt.includes(`MARKER_${file}`), `expected prompt to include the fixture for ${file}`);
    }
    // page-list's own template must NOT leak into a page-edit prompt.
    assert.ok(!prompt.includes('templates-page-list.md'));
  });

  it('concatenates an Infraestrutura type\'s reference files too', async () => {
    const type = getGeneratorType('auth-login')!;
    const tmpDir = await writeFixtures(type.referenceFiles);

    const prompt = await buildGeneratorSystemPrompt(type, tmpDir);

    for (const file of type.referenceFiles) {
      assert.ok(prompt.includes(`MARKER_${file}`), `expected prompt to include the fixture for ${file}`);
    }
  });

  it('rejects when a reference file is missing', async () => {
    const type = getGeneratorType('page-list')!;
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'poui-prompt-missing-'));
    await assert.rejects(() => buildGeneratorSystemPrompt(type, tmpDir));
  });
});

describe('buildGeneratorUserPrompt', () => {
  it('includes the type id/label, entity, module, endpoint and derived names', () => {
    const type = getGeneratorType('stacked-browse')!;
    const naming = deriveEntityNaming('Pedidos');
    const prompt = buildGeneratorUserPrompt(type, naming, 'financeiro', '/rest/api/custom/v1/pedidos');

    assert.ok(prompt.includes('stacked-browse'));
    assert.ok(prompt.includes('Stacked Browse'));
    assert.ok(prompt.includes('Pedidos'));
    assert.ok(prompt.includes('financeiro'));
    assert.ok(prompt.includes('/rest/api/custom/v1/pedidos'));
    assert.ok(prompt.includes('PedidosListComponent'));
    assert.ok(prompt.includes('PedidosService'));
  });

  it('tells the model to prefer the type-specific naming convention over the generic suggestion', () => {
    const type = getGeneratorType('page-edit')!;
    const naming = deriveEntityNaming('PedidoEdit');
    const prompt = buildGeneratorUserPrompt(type, naming, 'financeiro', '/rest/api/custom/v1/pedidos');

    assert.ok(prompt.includes('page-edit'));
    assert.ok(prompt.toLowerCase().includes('convenção de nomenclatura específica do tipo'));
  });

  it('includes the source file path when provided (refactor)', () => {
    const type = getGeneratorType('refactor')!;
    const naming = deriveEntityNaming('Pedido');
    const prompt = buildGeneratorUserPrompt(
      type,
      naming,
      'financeiro',
      '/rest/api/custom/v1/pedidos',
      'C:\\totvs\\FATA001.prw',
    );

    assert.ok(prompt.includes('C:\\totvs\\FATA001.prw'));
  });

  it('omits any source file line when not provided', () => {
    const type = getGeneratorType('page-edit')!;
    const naming = deriveEntityNaming('Pedido');
    const prompt = buildGeneratorUserPrompt(type, naming, 'financeiro', '/rest/api/custom/v1/pedidos');

    assert.ok(!prompt.toLowerCase().includes('arquivo fonte'));
  });

  it('asks for the oData list filter (FWAdapterBaseV2) when odata is true', () => {
    const type = getGeneratorType('tlpp-contract')!;
    const naming = deriveEntityNaming('Pedido');
    const prompt = buildGeneratorUserPrompt(type, naming, 'financeiro', '/rest/api/custom/v1/pedidos', undefined, { kind: 'odata' });

    assert.ok(prompt.includes('oData'));
    assert.ok(prompt.includes('FWAdapterBaseV2'));
    assert.ok(prompt.includes('Filtro oData (opcional)'));
  });

  it('does not mention oData by default (simple filter stays the default)', () => {
    const type = getGeneratorType('tlpp-contract')!;
    const naming = deriveEntityNaming('Pedido');
    const prompt = buildGeneratorUserPrompt(type, naming, 'financeiro', '/rest/api/custom/v1/pedidos');

    assert.ok(!prompt.includes('oData'));
  });

  it('asks for the FWRestModel resource and service when the backend is an existing MVC routine', () => {
    const type = getGeneratorType('page-edit')!;
    const naming = deriveEntityNaming('Produto');
    const prompt = buildGeneratorUserPrompt(type, naming, 'estoque', '/rest/fwmodel/produtos', undefined, { kind: 'mvc', source: 'MATA010' });

    assert.ok(prompt.includes('MATA010'));
    assert.ok(prompt.includes('templates-mvc-rest.md'));
    assert.ok(prompt.includes('RM_MATA010.prw'));
    assert.ok(prompt.includes('ProtheusMvcService'));
    assert.ok(!prompt.includes('oData'));
  });

  it('read-only MVC backend asks only for list/get and keeps an existing RM_ resource', () => {
    const type = getGeneratorType('two-panel-detail')!;
    const naming = deriveEntityNaming('MonitorLotes');
    const prompt = buildGeneratorUserPrompt(type, naming, 'integracao', '/fwmodel/lotes', undefined, {
      kind: 'mvc',
      source: 'F0000001',
      readonly: true,
    });

    assert.ok(prompt.includes('--mvc F0000001 --readonly'));
    assert.ok(prompt.includes('Modo somente leitura'));
    assert.ok(prompt.includes('só se ele ainda não existir'));
    assert.ok(prompt.includes('Flags do tipo: --detail'));
    assert.ok(generatorReferenceFiles(type, { kind: 'mvc', source: 'F0000001', readonly: true }).includes('templates-mvc-rest.md'));
  });

  it('types without flags do not mention them', () => {
    const type = getGeneratorType('page-edit')!;
    const prompt = buildGeneratorUserPrompt(type, deriveEntityNaming('Produto'), 'estoque', '/rest/produtos');
    assert.ok(!prompt.includes('Flags do tipo'));
  });

  it('adds the MVC template to the system prompt files only for the mvc backend', () => {
    const type = getGeneratorType('page-edit')!;
    assert.ok(generatorReferenceFiles(type, { kind: 'mvc', source: 'MATA010' }).includes('templates-mvc-rest.md'));
    assert.ok(!generatorReferenceFiles(type, { kind: 'simple' }).includes('templates-mvc-rest.md'));
    assert.deepStrictEqual(generatorReferenceFiles(type), type.referenceFiles);
  });
});
