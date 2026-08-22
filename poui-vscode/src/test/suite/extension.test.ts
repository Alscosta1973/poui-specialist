import * as assert from 'node:assert';
import * as vscode from 'vscode';

describe('extension packaging', () => {
  it('is present in the extension host', () => {
    const ext = vscode.extensions.getExtension('andre-costa.poui-vscode');
    assert.ok(ext, 'expected the poui-vscode extension to be discoverable');
  });
});
