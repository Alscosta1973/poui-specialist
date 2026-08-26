import * as assert from 'node:assert';
import { buildConnectUserPrompt, ConnectParams } from '../../connectPromptBuilder';

const baseParams: ConnectParams = {
  componentPath: 'src/app/financeiro/titulos-list/titulos-list.component.ts',
  module: 'financeiro/titulos-list',
  apiPrefix: '/rest/api/custom/v1',
  endpoint: { kind: 'existing', path: '/rest/api/custom/v1/titulos' },
  extraActions: undefined,
  interceptorHandling: 'remove',
};

describe('buildConnectUserPrompt', () => {
  it('includes the component path, module and endpoint', () => {
    const prompt = buildConnectUserPrompt(baseParams);

    assert.ok(prompt.includes(baseParams.componentPath));
    assert.ok(prompt.includes('financeiro/titulos-list'));
    assert.ok(prompt.includes('/rest/api/custom/v1/titulos'));
  });

  it('tells the model proxy.conf.json is already configured and must not be touched', () => {
    const prompt = buildConnectUserPrompt(baseParams);

    assert.ok(prompt.toLowerCase().includes('proxy.conf.json'));
    assert.ok(prompt.toLowerCase().includes('já'));
  });

  it('asks for TLPP contract generation when the endpoint does not exist yet, including the business rules', () => {
    const prompt = buildConnectUserPrompt({
      ...baseParams,
      endpoint: { kind: 'new', businessRules: 'Filtrar por filial e período; sem soft delete' },
    });

    assert.ok(prompt.includes('Filtrar por filial e período; sem soft delete'));
    assert.ok(prompt.toLowerCase().includes('tlpp'));
  });

  it('includes extra actions when provided', () => {
    const prompt = buildConnectUserPrompt({ ...baseParams, extraActions: 'POST confirmar, DELETE cancelar' });
    assert.ok(prompt.includes('POST confirmar, DELETE cancelar'));
  });

  it('tells the model which interceptor-handling option was chosen', () => {
    const removePrompt = buildConnectUserPrompt({ ...baseParams, interceptorHandling: 'remove' });
    const deactivatePrompt = buildConnectUserPrompt({ ...baseParams, interceptorHandling: 'deactivate' });

    assert.notStrictEqual(removePrompt, deactivatePrompt);
  });

  it('never accepts or includes credentials — the signature has no field for them', () => {
    // Compile-time guarantee: ConnectParams has no username/password/token/authHeader
    // field at all, so there is nothing a caller could pass through by mistake.
    const prompt = buildConnectUserPrompt(baseParams);
    for (const secretLike of ['senha', 'password', 'token', 'Authorization', 'Basic ', 'Bearer ']) {
      assert.ok(!prompt.includes(secretLike), `prompt should never mention "${secretLike}"`);
    }
  });
});
