import * as assert from 'node:assert';
import { buildScreenshotUserPrompt, parseScreenshotManifest } from '../../screenshotPromptBuilder';

describe('buildScreenshotUserPrompt', () => {
  it('includes the image path and instructs reading it via the Read tool', () => {
    const prompt = buildScreenshotUserPrompt('C:\\prints\\tela-titulos.png');

    assert.ok(prompt.includes('C:\\prints\\tela-titulos.png'));
    assert.ok(prompt.toLowerCase().includes('read'));
  });

  it('asks for the structured manifest format keys, not the free-form laudo', () => {
    const prompt = buildScreenshotUserPrompt('/tmp/a.png');

    for (const key of ['TYPE:', 'MODULE:', 'ENTITY:', 'API_PATH:', 'FIELDS:', 'RULES:']) {
      assert.ok(prompt.includes(key), `expected the prompt to mention ${key}`);
    }
  });

  it('tells the model not to write any file during analysis', () => {
    const prompt = buildScreenshotUserPrompt('/tmp/a.png');

    assert.ok(prompt.toLowerCase().includes('não gere nenhum arquivo'));
  });
});

describe('parseScreenshotManifest', () => {
  it('parses a complete manifest', () => {
    const text = [
      'TYPE: page-list',
      'MODULE: financeiro/titulos',
      'ENTITY: Titulos',
      'API_PATH: /titulos',
      'FIELDS: codigo(req), nome, valor',
      'RULES: valor: formatar como moeda BRL; Ação customizada: "Aprovar" na tabela',
    ].join('\n');

    const manifest = parseScreenshotManifest(text);

    assert.deepStrictEqual(manifest, {
      type: 'page-list',
      module: 'financeiro/titulos',
      entity: 'Titulos',
      apiPath: '/titulos',
      fields: 'codigo(req), nome, valor',
      rules: 'valor: formatar como moeda BRL; Ação customizada: "Aprovar" na tabela',
    });
  });

  it('treats RULES as optional', () => {
    const text = ['TYPE: modal-crud', 'MODULE: compras/produtos', 'ENTITY: Produtos', 'API_PATH: /produtos', 'FIELDS: nome, preco'].join(
      '\n',
    );

    const manifest = parseScreenshotManifest(text);

    assert.strictEqual(manifest?.type, 'modal-crud');
    assert.strictEqual(manifest?.rules, undefined);
  });

  it('finds the manifest even surrounded by narration/tool-use log noise', () => {
    const text = [
      'Vou ler a imagem informada para identificar o layout.',
      '→ Read {"file_path":"/tmp/a.png"}',
      'A imagem mostra uma tabela com busca simples.',
      '',
      'TYPE: page-list',
      'MODULE: rh/funcionarios',
      'ENTITY: Funcionarios',
      'API_PATH: /funcionarios',
      'FIELDS: nome, cargo',
    ].join('\n');

    const manifest = parseScreenshotManifest(text);

    assert.strictEqual(manifest?.module, 'rh/funcionarios');
  });

  it('returns undefined when a required field is missing', () => {
    const text = ['TYPE: page-list', 'MODULE: financeiro/titulos', 'ENTITY: Titulos'].join('\n');

    assert.strictEqual(parseScreenshotManifest(text), undefined);
  });

  it('returns undefined for empty or unrelated text', () => {
    assert.strictEqual(parseScreenshotManifest(''), undefined);
    assert.strictEqual(parseScreenshotManifest('não consegui acessar a imagem'), undefined);
  });
});
