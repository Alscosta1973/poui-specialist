import * as vscode from 'vscode';
import { CATALOG, findCatalogEntry } from './templateCatalog';
import { openTemplateDetailPanel } from './templateDetailPanel';

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);
}

function buildHtml(): string {
  const groups = CATALOG.map((group) => {
    const rows = group.entries
      .map((entry) => `<div class="entry" data-id="${escapeHtml(entry.id)}">${escapeHtml(entry.title)}</div>`)
      .join('\n');
    return `<h3 class="group">${escapeHtml(group.label)}</h3>${rows}`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<style>
  body { font-family: var(--vscode-font-family); padding: 4px 8px; color: var(--vscode-foreground); }
  h3.group { font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; opacity: 0.7; margin: 14px 0 4px 0; }
  .entry { padding: 5px 8px; font-size: 13px; font-family: var(--vscode-editor-font-family, monospace); border-radius: 3px; cursor: pointer; }
  .entry:hover { background: var(--vscode-list-hoverBackground); }
</style>
</head>
<body>
${groups}
<script>
  const vscode = acquireVsCodeApi();
  document.querySelectorAll('.entry[data-id]').forEach((el) => {
    el.addEventListener('click', () => {
      vscode.postMessage({ id: el.getAttribute('data-id') });
    });
  });
</script>
</body>
</html>`;
}

export function registerTemplateGalleryView(context: vscode.ExtensionContext): vscode.Disposable {
  const provider: vscode.WebviewViewProvider = {
    resolveWebviewView(webviewView) {
      webviewView.webview.options = { enableScripts: true };
      webviewView.webview.html = buildHtml();
      webviewView.webview.onDidReceiveMessage((message: { id?: string }) => {
        const entry = message.id ? findCatalogEntry(message.id) : undefined;
        if (entry) {
          openTemplateDetailPanel(context, entry);
        }
      });
    },
  };
  return vscode.window.registerWebviewViewProvider('poui.examplesView', provider);
}
