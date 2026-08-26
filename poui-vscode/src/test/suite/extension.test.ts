import * as assert from 'node:assert';
import * as vscode from 'vscode';

describe('extension packaging', () => {
  it('is present in the extension host', () => {
    const ext = vscode.extensions.getExtension('andre-costa.poui-vscode');
    assert.ok(ext, 'expected the poui-vscode extension to be discoverable');
  });

  it('registers the poui.generate.component command after activation', async () => {
    const ext = vscode.extensions.getExtension('andre-costa.poui-vscode');
    await ext?.activate();
    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes('poui.generate.component'));
    assert.ok(!commands.includes('poui.generate.listComponent'));
    assert.ok(!commands.includes('poui.generate.pageList'));
    assert.ok(!commands.includes('poui.setApiKey'));
  });

  it('registers the poui.generate.test command after activation', async () => {
    const ext = vscode.extensions.getExtension('andre-costa.poui-vscode');
    await ext?.activate();
    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes('poui.generate.test'));
  });

  it('registers the poui.lint and poui.quality commands after activation', async () => {
    const ext = vscode.extensions.getExtension('andre-costa.poui-vscode');
    await ext?.activate();
    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes('poui.lint'));
    assert.ok(commands.includes('poui.quality'));
  });

  it('registers the poui.review command after activation', async () => {
    const ext = vscode.extensions.getExtension('andre-costa.poui-vscode');
    await ext?.activate();
    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes('poui.review'));
  });

  it('registers the poui.preview command after activation', async () => {
    const ext = vscode.extensions.getExtension('andre-costa.poui-vscode');
    await ext?.activate();
    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes('poui.preview'));
  });

  it('registers the poui.generate.e2e command after activation', async () => {
    const ext = vscode.extensions.getExtension('andre-costa.poui-vscode');
    await ext?.activate();
    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes('poui.generate.e2e'));
  });

  it('registers the poui.undo command after activation', async () => {
    const ext = vscode.extensions.getExtension('andre-costa.poui-vscode');
    await ext?.activate();
    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes('poui.undo'));
  });

  it('registers the poui.generate.screenshot command after activation', async () => {
    const ext = vscode.extensions.getExtension('andre-costa.poui-vscode');
    await ext?.activate();
    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes('poui.generate.screenshot'));
  });

  it('registers the poui.package command after activation', async () => {
    const ext = vscode.extensions.getExtension('andre-costa.poui-vscode');
    await ext?.activate();
    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes('poui.package'));
  });

  it('registers the poui.connect command after activation', async () => {
    const ext = vscode.extensions.getExtension('andre-costa.poui-vscode');
    await ext?.activate();
    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes('poui.connect'));
  });
});
