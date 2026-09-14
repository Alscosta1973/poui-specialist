import * as vscode from 'vscode';
import { CATALOG, CatalogEntry, CatalogGroup, findCatalogEntry } from './templateCatalog';
import { GROUPS, MenuEntry, MenuGroup } from './menuLogic';
import { openTemplateDetailPanel } from './templateDetailPanel';

const EXAMPLES_LABEL = 'Exemplos de Comandos';
const OPEN_TEMPLATE_COMMAND = 'poui.gallery.openTemplate';

/** Ícone por categoria de topo — puramente cosmético, mas ajuda a escanear a
 * árvore de relance (cada "pasta" com um símbolo condizente com o que tem
 * dentro). Nomes vêm do conjunto de codicons embutido no VS Code — não
 * precisa de nenhum asset. */
const CATEGORY_ICONS: Record<string, string> = {
  [EXAMPLES_LABEL]: 'preview',
  'Geração': 'wand',
  'Integração e Deploy': 'plug',
  'Qualidade e Revisão': 'checklist',
  'Utilitários': 'tools',
  'Configuração': 'gear',
};

/** Ícone por subgrupo do catálogo de templates (dentro de "Exemplos de
 * Comandos") — mesma ideia, um símbolo que remete à família de tela. */
const CATALOG_GROUP_ICONS: Record<string, string> = {
  'Reconciliação / conciliação': 'git-compare',
  'Master-detail ERP': 'type-hierarchy',
  'Listas': 'list-unordered',
  'Formulários': 'edit',
  'Outros': 'ellipsis',
};

export type GalleryNode =
  | { kind: 'examples-root' }
  | { kind: 'menu-group'; group: MenuGroup }
  | { kind: 'catalog-group'; group: CatalogGroup }
  | { kind: 'catalog-entry'; entry: CatalogEntry }
  | { kind: 'menu-entry'; entry: MenuEntry };

/** Estrutura da árvore, pura (sem `vscode.TreeDataProvider` no meio) — pra
 * ser testável com mocha puro. Raiz: "Exemplos de Comandos" (o catálogo de
 * 22 tipos geráveis, com preview) seguido de uma pasta por grupo de
 * `menuLogic.GROUPS` (Geração, Integração e Deploy, Qualidade e Revisão,
 * Utilitários, Configuração) — mesmas categorias do `PO-UI: Menu`, agora
 * navegáveis na sidebar sem abrir a paleta de comandos. */
export function getGalleryChildren(node?: GalleryNode): GalleryNode[] {
  if (!node) {
    return [{ kind: 'examples-root' }, ...GROUPS.map((group) => ({ kind: 'menu-group' as const, group }))];
  }
  switch (node.kind) {
    case 'examples-root':
      return CATALOG.map((group) => ({ kind: 'catalog-group' as const, group }));
    case 'menu-group':
      return node.group.entries.map((entry) => ({ kind: 'menu-entry' as const, entry }));
    case 'catalog-group':
      return node.group.entries.map((entry) => ({ kind: 'catalog-entry' as const, entry }));
    case 'catalog-entry':
    case 'menu-entry':
      return [];
  }
}

export function buildGalleryTreeItem(node: GalleryNode): vscode.TreeItem {
  switch (node.kind) {
    case 'examples-root': {
      const item = new vscode.TreeItem(EXAMPLES_LABEL, vscode.TreeItemCollapsibleState.Collapsed);
      item.iconPath = new vscode.ThemeIcon(CATEGORY_ICONS[EXAMPLES_LABEL]);
      item.contextValue = 'poui.gallery.category';
      return item;
    }
    case 'menu-group': {
      const item = new vscode.TreeItem(node.group.label, vscode.TreeItemCollapsibleState.Collapsed);
      item.iconPath = new vscode.ThemeIcon(CATEGORY_ICONS[node.group.label] ?? 'folder');
      item.contextValue = 'poui.gallery.category';
      return item;
    }
    case 'catalog-group': {
      const item = new vscode.TreeItem(node.group.label, vscode.TreeItemCollapsibleState.Collapsed);
      item.iconPath = new vscode.ThemeIcon(CATALOG_GROUP_ICONS[node.group.label] ?? 'folder');
      item.contextValue = 'poui.gallery.subgroup';
      return item;
    }
    case 'catalog-entry': {
      const item = new vscode.TreeItem(node.entry.title, vscode.TreeItemCollapsibleState.None);
      item.tooltip = node.entry.description;
      item.command = { command: OPEN_TEMPLATE_COMMAND, title: 'Ver exemplo', arguments: [node.entry.id] };
      item.contextValue = 'poui.gallery.template';
      return item;
    }
    case 'menu-entry': {
      const item = new vscode.TreeItem(node.entry.label, vscode.TreeItemCollapsibleState.None);
      item.command = { command: node.entry.commandId, title: node.entry.label };
      item.contextValue = 'poui.gallery.command';
      return item;
    }
  }
}

class GalleryTreeDataProvider implements vscode.TreeDataProvider<GalleryNode> {
  getTreeItem(element: GalleryNode): vscode.TreeItem {
    return buildGalleryTreeItem(element);
  }
  getChildren(element?: GalleryNode): GalleryNode[] {
    return getGalleryChildren(element);
  }
}

export function registerTemplateGalleryView(context: vscode.ExtensionContext): vscode.Disposable {
  const treeDisposable = vscode.window.registerTreeDataProvider('poui.examplesView', new GalleryTreeDataProvider());
  // Comando interno — só existe pra dar ao `TreeItem` de um template algo
  // pra chamar no clique (a API de árvore não aceita passar `context`
  // direto). Não entra em `contributes.commands`, então não polui a paleta.
  const openDisposable = vscode.commands.registerCommand(OPEN_TEMPLATE_COMMAND, (id: string) => {
    const entry = findCatalogEntry(id);
    if (entry) {
      openTemplateDetailPanel(context, entry);
    }
  });
  return vscode.Disposable.from(treeDisposable, openDisposable);
}
