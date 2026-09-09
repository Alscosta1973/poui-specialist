// poui-vscode/src/test/unit/requireLicense.test.ts
//
// Regressão do achado Crítico da revisão final de 2026-09-07 (branch
// license-gating): requireLicense() lia sessionStatus sem esperar o fetch
// fire-and-forget de initializeLicenseStatus terminar — então o primeiro
// comando pago rodado numa instalação nova podia ser bloqueado por engano,
// mesmo com trial/licença válida do lado do servidor.
import * as assert from 'node:assert';
import type * as vscodeType from 'vscode';
import { resetVscodeStub, env } from './vscodeStub';
import { reloadModule } from './reloadModule';

function fakeContext(): vscodeType.ExtensionContext {
  const store = new Map<string, unknown>();
  return {
    globalState: {
      get: (key: string) => store.get(key),
      update: async (key: string, value: unknown) => {
        store.set(key, value);
      },
    },
  } as unknown as vscodeType.ExtensionContext;
}

function fakeOutputChannel(): vscodeType.OutputChannel {
  return { appendLine: () => undefined } as unknown as vscodeType.OutputChannel;
}

describe('requireLicense — cold-start init race (2026-09-07 critical fix)', () => {
  let originalFetch: typeof fetch;

  beforeEach(() => {
    resetVscodeStub();
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('blocks on the pending init fetch instead of deciding on empty status', async () => {
    const events: string[] = [];
    let resolveFetch!: (body: unknown) => void;
    const deferred = new Promise<unknown>((resolve) => {
      resolveFetch = resolve;
    });

    globalThis.fetch = (async () => {
      const body = await deferred;
      events.push('fetch-resolved');
      return { ok: true, status: 200, json: async () => body };
    }) as unknown as typeof fetch;

    env.machineId = 'race-test-machine';

    const mod = reloadModule<typeof import('../../requireLicense')>('../../requireLicense');
    const context = fakeContext();
    const outputChannel = fakeOutputChannel();

    // status inicial 'paid' pra não disparar reportCreditUsage (só roda pra
    // trial) e simplificar o teste ao comportamento sob teste: a espera.
    const initPromise = mod.initializeLicenseStatus(context);
    const accessPromise = mod.requireLicense(context, outputChannel).then((allowed) => {
      events.push(`access-resolved:${allowed}`);
      return allowed;
    });

    // dá tempo pro event loop rodar — se requireLicense não esperasse o
    // init, já teria resolvido aqui, antes do fetch terminar
    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.deepStrictEqual(events, [], 'requireLicense resolveu antes do fetch de init terminar');

    resolveFetch({ tier: 'paid', licenseKey: 'POUI-TEST' });
    const allowed = await accessPromise;
    await initPromise;

    assert.deepStrictEqual(events, ['fetch-resolved', 'access-resolved:true']);
    assert.strictEqual(allowed, true);
  });

  it('resolves immediately once init has already completed (no regression on the common path)', async () => {
    globalThis.fetch = (async () => ({
      ok: true,
      status: 200,
      json: async () => ({ tier: 'paid', licenseKey: 'POUI-TEST' }),
    })) as unknown as typeof fetch;

    const mod = reloadModule<typeof import('../../requireLicense')>('../../requireLicense');
    const context = fakeContext();
    const outputChannel = fakeOutputChannel();

    await mod.initializeLicenseStatus(context);
    const allowed = await mod.requireLicense(context, outputChannel);

    assert.strictEqual(allowed, true);
  });
});
