import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  buildSmartxGenerateUserPrompt,
  buildSmartxMigrateUserPrompt,
  buildSmartxReviewUserPrompt,
  fieldPrefix,
  isValidAlias,
  isValidNamespace,
  isValidRoutineId,
  parseKeyFields,
  SMARTX_GENERATE_REFERENCE_FILES,
  SMARTX_MIGRATE_REFERENCE_FILES,
  SMARTX_REVIEW_REFERENCE_FILES,
  validateKeyFields,
} from '../../smartxPromptBuilder';

const SPEC = {
  routineId: 'ZA0CAD',
  description: 'Cadastro de Autores',
  namespaceBase: 'custom.cadastro.autor',
  alias: 'ZA0',
  keyFields: ['ZA0_FILIAL', 'ZA0_CODIGO'],
  launcher: 'ZA0CADSX',
  extras: 'grid ZA1 (titulos), legenda por ZA0_TIPO',
};

describe('smartxPromptBuilder — reference files', () => {
  it('generate/migrate/review load the agent plus the smartx skill files', () => {
    assert.deepStrictEqual(SMARTX_GENERATE_REFERENCE_FILES, ['code-generator-infra.md', 'templates-smartx.md', 'smartx-reference.md', 'smartx-rules.md']);
    assert.deepStrictEqual(SMARTX_MIGRATE_REFERENCE_FILES, ['code-generator-infra.md', 'templates-smartx-browse.md', 'smartx-browse-migration.md', 'smartx-rules.md']);
    assert.deepStrictEqual(SMARTX_REVIEW_REFERENCE_FILES, ['code-reviewer.md', 'smartx-rules.md', 'smartx-reference.md']);
  });

  it('every reference file is copied by scripts/sync-prompts.mjs', () => {
    const sync = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'scripts', 'sync-prompts.mjs'), 'utf8');
    const all = new Set([...SMARTX_GENERATE_REFERENCE_FILES, ...SMARTX_MIGRATE_REFERENCE_FILES, ...SMARTX_REVIEW_REFERENCE_FILES]);
    for (const file of all) {
      assert.ok(sync.includes(`'${file}']`), `${file} não está no sync-prompts.mjs`);
    }
  });
});

describe('smartxPromptBuilder — input validation', () => {
  it('routine id: letter first, up to 10 chars', () => {
    assert.ok(isValidRoutineId('ZA0CAD'));
    assert.ok(isValidRoutineId('mata110'));
    assert.ok(!isValidRoutineId('0ZA'));
    assert.ok(!isValidRoutineId('ZA0CADASTRO'));
    assert.ok(!isValidRoutineId('ZA0-CAD'));
  });

  it('namespace: lowercase dotted with at least two segments', () => {
    assert.ok(isValidNamespace('custom.cadastro.autor'));
    assert.ok(isValidNamespace('totvs.compras.solicitacao'));
    assert.ok(!isValidNamespace('custom'));
    assert.ok(!isValidNamespace('Custom.Cadastro'));
    assert.ok(!isValidNamespace('custom..autor'));
  });

  it('alias: 3 chars, letter first; field prefix drops the leading S of standard tables', () => {
    assert.ok(isValidAlias('ZA0'));
    assert.ok(isValidAlias('SB1'));
    assert.ok(!isValidAlias('ZA'));
    assert.ok(!isValidAlias('1A0'));
    assert.strictEqual(fieldPrefix('SB1'), 'B1');
    assert.strictEqual(fieldPrefix('ZA0'), 'ZA0');
  });

  it('key fields: comma/space separated, upper-cased, must include the branch field and use the alias prefix', () => {
    assert.deepStrictEqual(parseKeyFields(' za0_filial, ZA0_CODIGO ;ZA0_LOJA'), ['ZA0_FILIAL', 'ZA0_CODIGO', 'ZA0_LOJA']);
    assert.strictEqual(validateKeyFields('ZA0', ['ZA0_FILIAL', 'ZA0_CODIGO']), undefined);
    assert.strictEqual(validateKeyFields('SB1', ['B1_FILIAL', 'B1_COD']), undefined);
    assert.ok(validateKeyFields('ZA0', ['ZA0_CODIGO'])?.includes('ZA0_FILIAL'));
    assert.ok(validateKeyFields('ZA0', ['ZA0_FILIAL', 'ZA1_CODIGO'])?.includes('ZA1_CODIGO'));
    assert.ok(validateKeyFields('ZA0', [])?.length);
  });
});

describe('smartxPromptBuilder — user prompts', () => {
  it('generate prompt carries every input, the target folder and the no-Angular rule', () => {
    const p = buildSmartxGenerateUserPrompt(SPEC, 'protheus/cadastro');
    for (const trecho of [
      '`smartx`', 'ZA0CAD', 'Cadastro de Autores', 'custom.cadastro.autor.model', 'custom.cadastro.autor.interface',
      '{"ZA0_FILIAL", "ZA0_CODIGO"}', 'ZA0CADSX', 'grid ZA1', 'protheus/cadastro', 'templates-smartx.md', 'SX01', 'Angular',
    ]) {
      assert.ok(p.includes(trecho), `faltou "${trecho}"`);
    }
  });

  it('generate prompt says there are no extras when none were given', () => {
    const p = buildSmartxGenerateUserPrompt({ ...SPEC, extras: '' }, '.');
    assert.ok(p.includes('Sem grids, objetos 1:1, legenda ou PE adicionais'));
  });

  it('migrate prompt names the source, edits in place and points to the template', () => {
    const p = buildSmartxMigrateUserPrompt('protheus/ZA0BRW.prw');
    assert.ok(p.includes('`smartx-browse`'));
    assert.ok(p.includes('protheus/ZA0BRW.prw'));
    assert.ok(p.includes('in-place'));
    assert.ok(p.includes('templates-smartx-browse.md'));
  });

  it('review prompt is read-only and restricted to the SX/SXR rules', () => {
    const p = buildSmartxReviewUserPrompt('protheus');
    assert.ok(p.includes('--focus smartx'));
    assert.ok(p.includes('SX01'));
    assert.ok(p.includes('SXR'));
    assert.ok(p.includes('Não modifique nenhum arquivo'));
  });
});
