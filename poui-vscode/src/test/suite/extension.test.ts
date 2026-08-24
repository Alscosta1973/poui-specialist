import * as assert from 'node:assert';
import * as vscode from 'vscode';

describe('extension packaging', () => {
  it('is present in the extension host', () => {
    const ext = vscode.extensions.getExtension('andre-costa.poui-vscode');
    assert.ok(ext, 'expected the poui-vscode extension to be discoverable');
  });

  it('registers the poui.generate.listComponent command after activation', async () => {
    const ext = vscode.extensions.getExtension('andre-costa.poui-vscode');
    await ext?.activate();
    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes('poui.generate.listComponent'));
    assert.ok(!commands.includes('poui.generate.pageList'));
    assert.ok(!commands.includes('poui.setApiKey'));
  });
});
