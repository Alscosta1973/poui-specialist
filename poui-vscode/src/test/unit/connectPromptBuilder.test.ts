import * as assert from 'node:assert';
import { buildConnectUserPrompt, connectReferenceFiles, ConnectParams } from '../../connectPromptBuilder';

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

  it('tells the model the proxy (proxy.conf.js + secret) is already configured and must not be touched', () => {
    const prompt = buildConnectUserPrompt(baseParams);

    assert.ok(prompt.includes('proxy.conf.js'));
    assert.ok(prompt.includes('protheus-dev.secret'));
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

  it('omits the "Ação de interceptor escolhida" instruction when none was found for this component (no unnecessary QuickPick answer to relay)', () => {
    const prompt = buildConnectUserPrompt({ ...baseParams, interceptorHandling: undefined });
    assert.ok(!prompt.includes('Ação de interceptor escolhida'));
  });

  it('never accepts or includes credentials — the signature has no field for them', () => {
    // Compile-time guarantee: ConnectParams has no username/password/token/authHeader
    // field at all, so there is nothing a caller could pass through by mistake.
    const prompt = buildConnectUserPrompt(baseParams);
    for (const secretLike of ['senha', 'password', 'token', 'Authorization', 'Basic ', 'Bearer ']) {
      assert.ok(!prompt.includes(secretLike), `prompt should never mention "${secretLike}"`);
    }
  });

  it('asks for the oData filter (helper + filter param) when filterStyle is odata', () => {
    const prompt = buildConnectUserPrompt({ ...baseParams, filterStyle: 'odata' });
    assert.ok(prompt.includes('oData'));
    assert.ok(prompt.includes('toODataFilter'));
    assert.ok(prompt.includes('Variante oData'));
  });

  it('keeps the simple filter (no oData instruction) when filterStyle is simple or absent', () => {
    assert.ok(!buildConnectUserPrompt({ ...baseParams, filterStyle: 'simple' }).includes('oData'));
    assert.ok(!buildConnectUserPrompt(baseParams).includes('oData'));
  });
});

describe('buildConnectUserPrompt (MVC)', () => {
  it('asks for the Variante MVC with the routine source, never the TLPP contract', () => {
    const prompt = buildConnectUserPrompt({ ...baseParams, endpoint: { kind: 'mvc', source: 'MATA010' } });
    assert.ok(prompt.includes('MATA010'));
    assert.ok(prompt.includes('Variante MVC'));
    assert.ok(prompt.includes('RM_MATA010.prw'));
    assert.ok(!prompt.includes('Passo 7'));
  });
});

describe('connectReferenceFiles', () => {
  it('loads only the connect skill and REST patterns for an existing endpoint with simple filter', () => {
    assert.deepStrictEqual(connectReferenceFiles(false, false), ['poui-connect-skill.md', 'protheus-rest.md']);
  });

  it('adds the tlpp-contract template for a new endpoint', () => {
    assert.ok(connectReferenceFiles(true, false).includes('templates-tlpp-contract.md'));
  });

  it('adds the tlpp-contract template (oData helper) for oData even when the endpoint exists', () => {
    assert.ok(connectReferenceFiles(false, true).includes('templates-tlpp-contract.md'));
  });

  it('never lists the template twice', () => {
    const files = connectReferenceFiles(true, true);
    assert.strictEqual(files.filter((f) => f === 'templates-tlpp-contract.md').length, 1);
  });

  it('loads the MVC template when the backend is an existing MVC routine', () => {
    const files = connectReferenceFiles(false, false, true);
    assert.ok(files.includes('templates-mvc-rest.md'));
    assert.ok(!files.includes('templates-tlpp-contract.md'));
  });
});
