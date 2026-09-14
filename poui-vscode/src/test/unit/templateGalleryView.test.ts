import * as assert from 'node:assert';
import * as vscode from 'vscode';
import { getGalleryChildren, buildGalleryTreeItem, GalleryNode } from '../../templateGalleryView';
import { CATALOG } from '../../templateCatalog';
import { GROUPS } from '../../menuLogic';

describe('getGalleryChildren', () => {
  it('root has "Exemplos de Comandos" first, then one node per menuLogic.GROUPS category, in order', () => {
    const children = getGalleryChildren(undefined);
    assert.strictEqual(children[0].kind, 'examples-root');
    assert.strictEqual(children.length, 1 + GROUPS.length);
    for (let i = 0; i < GROUPS.length; i++) {
      const node = children[i + 1];
      assert.strictEqual(node.kind, 'menu-group');
      assert.strictEqual((node as { kind: 'menu-group'; group: typeof GROUPS[number] }).group.label, GROUPS[i].label);
    }
  });

  it('"Exemplos de Comandos" expands into every CATALOG group, in order', () => {
    const children = getGalleryChildren({ kind: 'examples-root' });
    assert.strictEqual(children.length, CATALOG.length);
    assert.ok(children.every((c) => c.kind === 'catalog-group'));
    assert.deepStrictEqual(
      children.map((c) => (c as { kind: 'catalog-group'; group: typeof CATALOG[number] }).group.label),
      CATALOG.map((g) => g.label),
    );
  });

  it('a catalog group expands into its template entries', () => {
    const group = CATALOG.find((g) => g.entries.length > 1) ?? CATALOG[0];
    const children = getGalleryChildren({ kind: 'catalog-group', group });
    assert.strictEqual(children.length, group.entries.length);
    assert.ok(children.every((c) => c.kind === 'catalog-entry'));
  });

  it('a menu group (e.g. Configuração) expands into its command entries', () => {
    const group = GROUPS.find((g) => g.label === 'Configuração')!;
    const children = getGalleryChildren({ kind: 'menu-group', group });
    assert.strictEqual(children.length, group.entries.length);
    assert.ok(children.every((c) => c.kind === 'menu-entry'));
  });

  it('leaves (catalog-entry, menu-entry) have no children', () => {
    const catalogEntry: GalleryNode = { kind: 'catalog-entry', entry: CATALOG[0].entries[0] };
    const menuEntry: GalleryNode = { kind: 'menu-entry', entry: GROUPS[0].entries[0] };
    assert.deepStrictEqual(getGalleryChildren(catalogEntry), []);
    assert.deepStrictEqual(getGalleryChildren(menuEntry), []);
  });
});

describe('buildGalleryTreeItem', () => {
  it('gives "Exemplos de Comandos" a collapsed state and a matching icon', () => {
    const item = buildGalleryTreeItem({ kind: 'examples-root' });
    assert.strictEqual(item.label, 'Exemplos de Comandos');
    assert.strictEqual(item.collapsibleState, vscode.TreeItemCollapsibleState.Collapsed);
    assert.strictEqual((item.iconPath as vscode.ThemeIcon).id, 'preview');
  });

  it('gives every top-level menu group a distinct, non-fallback icon', () => {
    const seenIcons = new Set<string>();
    for (const group of GROUPS) {
      const item = buildGalleryTreeItem({ kind: 'menu-group', group });
      const iconId = (item.iconPath as vscode.ThemeIcon).id;
      assert.notStrictEqual(iconId, 'folder', `group "${group.label}" fell back to the generic folder icon`);
      seenIcons.add(iconId);
    }
    assert.strictEqual(seenIcons.size, GROUPS.length, 'expected every category to have its own distinct icon');
  });

  it('gives every catalog subgroup a distinct, non-fallback icon', () => {
    const seenIcons = new Set<string>();
    for (const group of CATALOG) {
      const item = buildGalleryTreeItem({ kind: 'catalog-group', group });
      const iconId = (item.iconPath as vscode.ThemeIcon).id;
      assert.notStrictEqual(iconId, 'folder', `catalog group "${group.label}" fell back to the generic folder icon`);
      seenIcons.add(iconId);
    }
    assert.strictEqual(seenIcons.size, CATALOG.length, 'expected every catalog subgroup to have its own distinct icon');
  });

  it('a catalog-entry leaf opens the internal template command with its id as the argument', () => {
    const entry = CATALOG[0].entries[0];
    const item = buildGalleryTreeItem({ kind: 'catalog-entry', entry });
    assert.strictEqual(item.collapsibleState, vscode.TreeItemCollapsibleState.None);
    assert.strictEqual(item.command?.command, 'poui.gallery.openTemplate');
    assert.deepStrictEqual(item.command?.arguments, [entry.id]);
    assert.strictEqual(item.tooltip, entry.description);
  });

  it('a menu-entry leaf runs its own command id directly (same as PO-UI: Menu)', () => {
    const entry = GROUPS[0].entries[0];
    const item = buildGalleryTreeItem({ kind: 'menu-entry', entry });
    assert.strictEqual(item.collapsibleState, vscode.TreeItemCollapsibleState.None);
    assert.strictEqual(item.command?.command, entry.commandId);
  });
});
