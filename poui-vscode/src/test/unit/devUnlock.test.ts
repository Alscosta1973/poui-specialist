// poui-vscode/src/test/unit/devUnlock.test.ts
//
// Comando "PO-UI: Desbloquear Modo Dev" — chama POST /dev/unlock com uma
// senha; em caso de sucesso, busca o status real (/license/status) e
// persiste no cache local. Espelha o mesmo padrão de tratamento de erro e
// persistência de activateLicense.test.ts.
import * as assert from 'node:assert';
import type * as vscodeType from 'vscode';
import { resetVscodeStub, env, commandRegistry, shownErrorMessages, shownInfoMessages, setNextInputBox } from './vscodeStub';
import { reloadModule } from './reloadModule';

interface FakeContext extends vscodeType.ExtensionContext {
  __globalStateUpdates: Array<{ key: string; value: unknown }>;
}

function fakeContext(): FakeContext {
  const stateStore = new Map<string, unknown>();
  const updates: Array<{ key: string; value: unknown }> = [];
  return {
    globalState: {
      get: (key: string) => stateStore.get(key),
      update: async (key: string, value: unknown) => {
        stateStore.set(key, value);
        updates.push({ key, value });
      },
    },
    secrets: {
      store: async () => {},
      get: async () => undefined,
      delete: async () => {},
    },
    __globalStateUpdates: updates,
  } as unknown as FakeContext;
}

function fakeOutputChannel(): { appendLine: (s: string) => void; lines: string[] } {
  const lines: string[] = [];
  return { appendLine: (s: string) => lines.push(s), lines };
}

function freshDevUnlockModule(): typeof import('../../devUnlock') {
  reloadModule('../../requireLicense');
  return reloadModule<typeof import('../../devUnlock')>('../../devUnlock');
}

async function runUnlockFlow(): Promise<{
  context: FakeContext;
  outputChannel: ReturnType<typeof fakeOutputChannel>;
}> {
  const devUnlockModule = freshDevUnlockModule();
  const context = fakeContext();
  const outputChannel = fakeOutputChannel();
  devUnlockModule.registerDevUnlockCommand(context, outputChannel as unknown as vscodeType.OutputChannel);

  const callback = commandRegistry.get('poui.devUnlock');
  assert.ok(callback, 'esperava que poui.devUnlock fosse registrado');
  await callback!();

  return { context, outputChannel };
}

describe('devUnlock', () => {
  let originalFetch: typeof fetch;

  beforeEach(() => {
    resetVscodeStub();
    originalFetch = globalThis.fetch;
    env.machineId = 'dev-unlock-test-machine';
    setNextInputBox('senha-super-secreta');
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('does nothing when the password prompt is cancelled', async () => {
    setNextInputBox(undefined);
    globalThis.fetch = (async () => {
      throw new Error('should not be called');
    }) as unknown as typeof fetch;

    const { context } = await runUnlockFlow();

    assert.strictEqual(shownErrorMessages.length, 0);
    assert.strictEqual(shownInfoMessages.length, 0);
    assert.strictEqual(context.__globalStateUpdates.length, 0);
  });

  it('surfaces a friendly error instead of crashing when the network fails', async () => {
    globalThis.fetch = (async () => {
      throw new Error('network down');
    }) as unknown as typeof fetch;

    const { context } = await runUnlockFlow();

    assert.strictEqual(shownErrorMessages.length, 1);
    assert.match(shownErrorMessages[0], /falha ao desbloquear/);
    assert.match(shownErrorMessages[0], /network down/);
    assert.strictEqual(shownInfoMessages.length, 0);
    assert.strictEqual(context.__globalStateUpdates.length, 0);
  });

  it('surfaces the rejection reason when the server refuses the password (no throw)', async () => {
    globalThis.fetch = (async () => ({
      ok: true,
      status: 401,
      json: async () => ({ ok: false, reason: 'invalid_password' }),
    })) as unknown as typeof fetch;

    const { context } = await runUnlockFlow();

    assert.strictEqual(shownErrorMessages.length, 1);
    assert.match(shownErrorMessages[0], /invalid_password/);
    assert.strictEqual(shownInfoMessages.length, 0);
    assert.strictEqual(context.__globalStateUpdates.length, 0);
  });

  it('persists the paid status to globalState on success', async () => {
    globalThis.fetch = (async (input: unknown) => {
      const url = String(input);
      if (url.includes('/dev/unlock')) {
        return { ok: true, status: 200, json: async () => ({ ok: true }) };
      }
      if (url.includes('/license/status')) {
        return { ok: true, status: 200, json: async () => ({ tier: 'paid' }) };
      }
      throw new Error(`unexpected fetch: ${url}`);
    }) as unknown as typeof fetch;

    const { context, outputChannel } = await runUnlockFlow();

    assert.strictEqual(shownErrorMessages.length, 0);
    assert.strictEqual(shownInfoMessages.length, 1);
    assert.match(shownInfoMessages[0], /desbloqueada com sucesso/);

    const persisted = context.__globalStateUpdates.find(
      (u) => (u.value as { status?: { tier?: string } })?.status?.tier === 'paid',
    );
    assert.ok(persisted, 'esperava que o cache persistido (globalState) fosse atualizado com tier paid');
    assert.ok(outputChannel.lines.some((l) => l.includes('desbloqueada como dev com sucesso')));
  });

  it('still reports success when the unlock worked but the follow-up status fetch fails', async () => {
    globalThis.fetch = (async (input: unknown) => {
      const url = String(input);
      if (url.includes('/dev/unlock')) {
        return { ok: true, status: 200, json: async () => ({ ok: true }) };
      }
      throw new Error('status fetch network failure');
    }) as unknown as typeof fetch;

    const { context } = await runUnlockFlow();

    assert.strictEqual(shownErrorMessages.length, 0);
    assert.strictEqual(shownInfoMessages.length, 1);
    assert.strictEqual(context.__globalStateUpdates.length, 0, 'sem status real não há nada novo pra persistir');
  });
});
