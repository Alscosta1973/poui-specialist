import * as assert from 'node:assert';
import type * as vscodeType from 'vscode';
import {
  resetVscodeStub,
  shownInfoMessages,
  shownWarningMessages,
  shownErrorMessages,
  openedExternalUrls,
  queueMessageChoice,
} from './vscodeStub';
import { runEnvironmentCheck } from '../../environmentCheckPrompt';
import { EnvCheckItem } from '../../environmentCheck';

function fakeContext(): vscodeType.ExtensionContext {
  return {
    extension: { packageJSON: { engines: { node: '>=18.19.0' } } },
  } as unknown as vscodeType.ExtensionContext;
}

function fakeOutputChannel(): { appendLine(v: string): void; lines: string[] } {
  const lines: string[] = [];
  return { appendLine: (v: string) => lines.push(v), lines };
}

const OK_ITEM = (id: EnvCheckItem['id'], label: string): EnvCheckItem => ({ id, label, required: id === 'node' || id === 'ng', ok: true });

describe('runEnvironmentCheck', () => {
  beforeEach(() => {
    resetVscodeStub();
  });

  it('shows one "tudo ok" info message and no warnings/errors when everything checks out', async () => {
    const items: EnvCheckItem[] = [
      OK_ITEM('node', 'Node.js'),
      OK_ITEM('ng', 'Angular CLI'),
      OK_ITEM('claude', 'Claude Code CLI'),
      OK_ITEM('git', 'Git'),
      OK_ITEM('7zip', '7-Zip'),
    ];
    await runEnvironmentCheck(fakeContext(), fakeOutputChannel(), {
      checkEnvironmentFn: async () => items,
      installAngularCliFn: async () => true,
    });
    assert.strictEqual(shownInfoMessages.length, 1);
    assert.match(shownInfoMessages[0], /ambiente ok/);
    assert.strictEqual(shownWarningMessages.length, 0);
    assert.strictEqual(shownErrorMessages.length, 0);
  });

  it('offers to install Angular CLI when missing, and runs the installer on "Instalar Angular CLI"', async () => {
    const items: EnvCheckItem[] = [
      OK_ITEM('node', 'Node.js'),
      { id: 'ng', label: 'Angular CLI', required: true, ok: false, npmInstallCommand: 'npm install -g @angular/cli' },
      OK_ITEM('claude', 'Claude Code CLI'),
      OK_ITEM('git', 'Git'),
      OK_ITEM('7zip', '7-Zip'),
    ];
    queueMessageChoice('Instalar Angular CLI');
    let installCalled = false;
    await runEnvironmentCheck(fakeContext(), fakeOutputChannel(), {
      checkEnvironmentFn: async () => items,
      installAngularCliFn: async () => {
        installCalled = true;
        return true;
      },
    });
    assert.strictEqual(shownWarningMessages.length, 1);
    assert.match(shownWarningMessages[0], /Angular CLI não encontrado/);
    assert.strictEqual(installCalled, true);
    assert.ok(shownInfoMessages.some((m) => /Angular CLI instalado/.test(m)));
  });

  it('does not install Angular CLI when the user dismisses the prompt', async () => {
    const items: EnvCheckItem[] = [
      OK_ITEM('node', 'Node.js'),
      { id: 'ng', label: 'Angular CLI', required: true, ok: false, npmInstallCommand: 'npm install -g @angular/cli' },
      OK_ITEM('claude', 'Claude Code CLI'),
      OK_ITEM('git', 'Git'),
      OK_ITEM('7zip', '7-Zip'),
    ];
    // fila vazia -> showWarningMessage resolve undefined (usuário fechou sem clicar)
    let installCalled = false;
    await runEnvironmentCheck(fakeContext(), fakeOutputChannel(), {
      checkEnvironmentFn: async () => items,
      installAngularCliFn: async () => {
        installCalled = true;
        return true;
      },
    });
    assert.strictEqual(installCalled, false);
  });

  it('shows an error with a download link for a missing required item with no npm fix (Node)', async () => {
    const items: EnvCheckItem[] = [
      { id: 'node', label: 'Node.js', required: true, ok: false, installUrl: 'https://nodejs.org/', detail: 'encontrado v16.0.0, mínimo exigido v18.19.0' },
      OK_ITEM('ng', 'Angular CLI'),
      OK_ITEM('claude', 'Claude Code CLI'),
      OK_ITEM('git', 'Git'),
      OK_ITEM('7zip', '7-Zip'),
    ];
    queueMessageChoice('Abrir site de instalação');
    await runEnvironmentCheck(fakeContext(), fakeOutputChannel(), {
      checkEnvironmentFn: async () => items,
      installAngularCliFn: async () => true,
    });
    assert.strictEqual(shownErrorMessages.length, 1);
    assert.match(shownErrorMessages[0], /Node\.js não encontrado/);
    assert.deepStrictEqual(openedExternalUrls, ['https://nodejs.org/']);
  });

  it('shows a soft info message (not a warning/error) for each missing optional item', async () => {
    const items: EnvCheckItem[] = [
      OK_ITEM('node', 'Node.js'),
      OK_ITEM('ng', 'Angular CLI'),
      { id: 'claude', label: 'Claude Code CLI', required: false, ok: false, installUrl: 'https://code.claude.com' },
      { id: 'git', label: 'Git', required: false, ok: false, installUrl: 'https://git-scm.com/' },
      { id: '7zip', label: '7-Zip', required: false, ok: false, installUrl: 'https://7-zip.org/' },
    ];
    await runEnvironmentCheck(fakeContext(), fakeOutputChannel(), {
      checkEnvironmentFn: async () => items,
      installAngularCliFn: async () => true,
    });
    // 3 opcionais faltando -> 3 mensagens informativas (nenhuma "tudo ok" combinada,
    // nenhuma error/warning já que são opcionais)
    assert.strictEqual(shownInfoMessages.length, 3);
    assert.ok(shownInfoMessages.every((m) => /opcional/.test(m)));
    assert.strictEqual(shownWarningMessages.length, 0);
    assert.strictEqual(shownErrorMessages.length, 0);
  });

  it('writes a full ✓/✗ report to the output channel regardless of outcome', async () => {
    const items: EnvCheckItem[] = [
      OK_ITEM('node', 'Node.js'),
      { id: 'ng', label: 'Angular CLI', required: true, ok: false, npmInstallCommand: 'npm install -g @angular/cli' },
      OK_ITEM('claude', 'Claude Code CLI'),
      OK_ITEM('git', 'Git'),
      OK_ITEM('7zip', '7-Zip'),
    ];
    const output = fakeOutputChannel();
    await runEnvironmentCheck(fakeContext(), output, {
      checkEnvironmentFn: async () => items,
      installAngularCliFn: async () => true,
    });
    assert.ok(output.lines.some((l) => l.includes('✓ Node.js')));
    assert.ok(output.lines.some((l) => l.includes('✗ Angular CLI')));
  });
});
