// poui-vscode/src/test/unit/activateLicense.test.ts
//
// Regressão dos achados Importantes da revisão final de 2026-09-07 (branch
// license-gating): (1) ativação de licença sem tratamento de erro de rede —
// uma falha de fetch propagava sem feedback ao usuário; (2) ativação
// bem-sucedida só atualizava o cache em memória (sessionStatus), nunca o
// persistido em context.globalState — usado pela janela de graça offline —
// deixando um cliente pagante bloqueável se ficasse offline logo após ativar.
import * as assert from 'node:assert';
import type * as vscodeType from 'vscode';
import {
  resetVscodeStub,
  env,
  commandRegistry,
  shownErrorMessages,
  shownInfoMessages,
  setNextQuickPick,
  setNextInputBox,
} from './vscodeStub';
import { reloadModule } from './reloadModule';

interface FakeContext extends vscodeType.ExtensionContext {
  __globalStateUpdates: Array<{ key: string; value: unknown }>;
  __secrets: Map<string, string>;
}

function fakeContext(): FakeContext {
  const stateStore = new Map<string, unknown>();
  const updates: Array<{ key: string; value: unknown }> = [];
  const secrets = new Map<string, string>();
  return {
    globalState: {
      get: (key: string) => stateStore.get(key),
      update: async (key: string, value: unknown) => {
        stateStore.set(key, value);
        updates.push({ key, value });
      },
    },
    secrets: {
      store: async (key: string, value: string) => {
        secrets.set(key, value);
      },
      get: async (key: string) => secrets.get(key),
      delete: async (key: string) => {
        secrets.delete(key);
      },
    },
    __globalStateUpdates: updates,
    __secrets: secrets,
  } as unknown as FakeContext;
}

function fakeOutputChannel(): { appendLine: (s: string) => void; lines: string[] } {
  const lines: string[] = [];
  return { appendLine: (s: string) => lines.push(s), lines };
}

function freshActivateLicenseModule(): typeof import('../../activateLicense') {
  reloadModule('../../requireLicense');
  return reloadModule<typeof import('../../activateLicense')>('../../activateLicense');
}

async function runActivationFlow(): Promise<{
  context: FakeContext;
  outputChannel: ReturnType<typeof fakeOutputChannel>;
}> {
  const activateLicenseModule = freshActivateLicenseModule();
  const context = fakeContext();
  const outputChannel = fakeOutputChannel();
  activateLicenseModule.registerActivateLicenseCommand(context, outputChannel as unknown as vscodeType.OutputChannel);

  const callback = commandRegistry.get('poui.activateLicense');
  assert.ok(callback, 'esperava que poui.activateLicense fosse registrado');
  await callback!();

  return { context, outputChannel };
}

describe('activateLicense — network error handling and cache persistence (2026-09-07 fixes)', () => {
  let originalFetch: typeof fetch;

  beforeEach(() => {
    resetVscodeStub();
    originalFetch = globalThis.fetch;
    env.machineId = 'activate-test-machine';
    setNextQuickPick({ label: 'Já tenho uma chave de licença', action: 'activate' });
    setNextInputBox('POUI-TEST-KEY');
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('surfaces a friendly error instead of crashing when the network fails', async () => {
    globalThis.fetch = (async () => {
      throw new Error('network down');
    }) as unknown as typeof fetch;

    const { context } = await runActivationFlow();

    assert.strictEqual(shownErrorMessages.length, 1);
    assert.match(shownErrorMessages[0], /falha ao ativar a licença/);
    assert.match(shownErrorMessages[0], /network down/);
    assert.strictEqual(shownInfoMessages.length, 0);
    assert.strictEqual(context.__globalStateUpdates.length, 0, 'não deveria persistir nada em caso de falha de rede');
    assert.strictEqual(context.__secrets.size, 0);
  });

  it('surfaces the rejection reason when the server refuses the key (no throw)', async () => {
    globalThis.fetch = (async () => ({
      ok: true,
      status: 200,
      json: async () => ({ ok: false, reason: 'invalid_key' }),
    })) as unknown as typeof fetch;

    const { context } = await runActivationFlow();

    assert.strictEqual(shownErrorMessages.length, 1);
    assert.match(shownErrorMessages[0], /invalid_key/);
    assert.strictEqual(context.__globalStateUpdates.length, 0);
  });

  it('persists the confirmed status to globalState (not just in memory) on success', async () => {
    globalThis.fetch = (async () => ({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, tier: 'paid' }),
    })) as unknown as typeof fetch;

    const { context, outputChannel } = await runActivationFlow();

    assert.strictEqual(shownErrorMessages.length, 0);
    assert.strictEqual(shownInfoMessages.length, 1);
    assert.strictEqual(context.__secrets.get('poui.licenseKey'), 'POUI-TEST-KEY');

    const persisted = context.__globalStateUpdates.find(
      (u) => (u.value as { status?: { tier?: string } })?.status?.tier === 'paid',
    );
    assert.ok(persisted, 'esperava que o cache persistido (globalState) fosse atualizado, não só a memória');
    const value = persisted!.value as { status: { tier: string; licenseKey: string }; fetchedAt: string };
    assert.strictEqual(value.status.licenseKey, 'POUI-TEST-KEY');
    assert.ok(!Number.isNaN(Date.parse(value.fetchedAt)), 'fetchedAt deveria ser um ISO timestamp válido');
    assert.ok(outputChannel.lines.some((l) => l.includes('ativada com sucesso')));
  });
});
