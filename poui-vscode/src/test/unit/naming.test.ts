import * as assert from 'node:assert';
import { deriveEntityNaming, isValidModuleName, resolveFixedModuleName } from '../../naming';

describe('deriveEntityNaming', () => {
  it('derives all conventions from a PascalCase plural name', () => {
    const naming = deriveEntityNaming('Pedidos');
    assert.strictEqual(naming.entityPascal, 'Pedidos');
    assert.strictEqual(naming.entityKebab, 'pedidos');
    assert.strictEqual(naming.entityKebabPlural, 'pedidos');
    assert.strictEqual(naming.componentClass, 'PedidosListComponent');
    assert.strictEqual(naming.selector, 'app-pedidos-list');
    assert.strictEqual(naming.serviceClass, 'PedidosService');
    assert.strictEqual(naming.serviceFileBase, 'pedidos.service');
    assert.strictEqual(naming.defaultApiPath, '/rest/api/custom/v1/pedidos');
    assert.strictEqual(naming.wasAutoCorrected, false);
  });

  it('auto-corrects a lowercase-first name to PascalCase and flags it', () => {
    const naming = deriveEntityNaming('fornecedores');
    assert.strictEqual(naming.entityPascal, 'Fornecedores');
    assert.strictEqual(naming.wasAutoCorrected, true);
  });

  it('splits multi-word input and kebab-cases it', () => {
    const naming = deriveEntityNaming('Nota Fiscal');
    assert.strictEqual(naming.entityPascal, 'NotaFiscal');
    assert.strictEqual(naming.entityKebab, 'nota-fiscal');
    assert.strictEqual(naming.entityKebabPlural, 'nota-fiscals');
    assert.strictEqual(naming.componentClass, 'NotaFiscalListComponent');
  });

  it('throws on an empty name', () => {
    assert.throws(() => deriveEntityNaming('   '), /não pode ser vazio/);
  });
});

describe('resolveFixedModuleName', () => {
  it('uses the fixed module when the type declares one (e.g. auth-login → auth)', () => {
    assert.strictEqual(resolveFixedModuleName('auth', 'faturamento'), 'auth');
  });

  it('falls back to the derived entity kebab name when there is no fixed module (e.g. module type)', () => {
    assert.strictEqual(resolveFixedModuleName(undefined, 'faturamento'), 'faturamento');
  });
});

describe('isValidModuleName', () => {
  it('accepts lowercase kebab module names', () => {
    assert.strictEqual(isValidModuleName('financeiro'), true);
    assert.strictEqual(isValidModuleName('contas-a-pagar'), true);
  });

  it('rejects names with spaces, uppercase, or a leading digit', () => {
    assert.strictEqual(isValidModuleName('Financeiro'), false);
    assert.strictEqual(isValidModuleName('contas a pagar'), false);
    assert.strictEqual(isValidModuleName('1financeiro'), false);
  });
});
