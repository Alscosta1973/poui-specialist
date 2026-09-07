import * as vscode from 'vscode';
import { CatalogEntry } from './templateCatalog';
import { getCachedLicenseStatus } from './requireLicense';
import { formatPaidBadge } from './licenseCheck';

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);
}

function buildHtml(entry: CatalogEntry, webview: vscode.Webview, extensionUri: vscode.Uri): string {
  const preview = entry.previewAsset
    ? `<img class="preview" src="${webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'previews', entry.previewAsset)).toString()}" alt="Exemplo da tela gerada por ${escapeHtml(entry.title)}" />`
    : `<p class="no-preview">Este tipo não gera uma tela — não há exemplo visual, só a descrição acima.</p>`;
  const badge = formatPaidBadge(getCachedLicenseStatus());
  const badgeHtml = badge ? `<span class="badge">${escapeHtml(badge)}</span>` : '';
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<style>
  body { font-family: var(--vscode-font-family); padding: 24px; color: var(--vscode-foreground); max-width: 900px; margin: 0 auto; }
  h1 { font-family: var(--vscode-editor-font-family, monospace); font-size: 22px; margin-bottom: 4px; }
  p.description { font-size: 14px; opacity: 0.85; margin-bottom: 20px; }
  .preview { max-width: 100%; border-radius: 6px; border: 1px solid var(--vscode-widget-border, #444); display: block; margin-bottom: 20px; }
  .no-preview { font-style: italic; opacity: 0.7; }
  .actions { display: flex; align-items: center; gap: 10px; }
  button { background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; padding: 8px 16px; border-radius: 3px; cursor: pointer; font-size: 13px; }
  button:hover { background: var(--vscode-button-hoverBackground); }
  .badge { font-size: 12px; opacity: 0.85; }
</style>
</head>
<body>
  <h1>${escapeHtml(entry.title)}</h1>
  <p class="description">${escapeHtml(entry.description)}</p>
  ${preview}
  <div class="actions">
    <button id="generate">Gerar Componente</button>
    ${badgeHtml}
  </div>
<script>
  const vscode = acquireVsCodeApi();
  document.getElementById('generate').addEventListener('click', () => {
    vscode.postMessage({ command: 'generate' });
  });
</script>
</body>
</html>`;
}

// Painel singleton — reaproveita a mesma aba ao trocar de tipo em vez de
// empilhar uma aba nova por clique (mesmo padrão do exemplo oficial de
// webview panel da API do VS Code).
let currentPanel: vscode.WebviewPanel | undefined;

export function openTemplateDetailPanel(context: vscode.ExtensionContext, entry: CatalogEntry): void {
  if (currentPanel) {
    currentPanel.title = `PO-UI: ${entry.title}`;
    currentPanel.webview.html = buildHtml(entry, currentPanel.webview, context.extensionUri);
    currentPanel.reveal(vscode.ViewColumn.Active);
    return;
  }

  currentPanel = vscode.window.createWebviewPanel(
    'poui.templateDetail',
    `PO-UI: ${entry.title}`,
    vscode.ViewColumn.Active,
    {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'media', 'previews')],
    },
  );
  currentPanel.webview.html = buildHtml(entry, currentPanel.webview, context.extensionUri);
  currentPanel.webview.onDidReceiveMessage((message: { command?: string }) => {
    if (message.command === 'generate') {
      void vscode.commands.executeCommand('poui.generate.component');
    }
  });
  currentPanel.onDidDispose(() => {
    currentPanel = undefined;
  });
}
