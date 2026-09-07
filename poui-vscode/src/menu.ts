import * as vscode from 'vscode';
import { getCachedLicenseStatus } from './requireLicense';

interface MenuEntry {
  label: string;
  commandId: string;
  paid: boolean;
}

interface MenuGroup {
  label: string;
  entries: MenuEntry[];
}

const GROUPS: MenuGroup[] = [
  {
    label: 'Geração',
    entries: [
      { label: 'Gerar Componente', commandId: 'poui.generate.component', paid: true },
      { label: 'Gerar Teste Unitário', commandId: 'poui.generate.test', paid: true },
      { label: 'Gerar Teste E2E (Playwright)', commandId: 'poui.generate.e2e', paid: true },
      { label: 'Gerar a partir de Screenshot', commandId: 'poui.generate.screenshot', paid: true },
      { label: 'Criar Novo Projeto (Scaffold)', commandId: 'poui.scaffold', paid: true },
    ],
  },
  {
    label: 'Integração e Deploy',
    entries: [
      { label: 'Conectar ao Protheus', commandId: 'poui.connect', paid: true },
      { label: 'Empacotar Projeto (.app)', commandId: 'poui.package', paid: true },
    ],
  },
  {
    label: 'Qualidade e Revisão',
    entries: [
      { label: 'Lint de Componentes', commandId: 'poui.lint', paid: false },
      { label: 'Auditoria de Qualidade', commandId: 'poui.quality', paid: false },
      { label: 'Revisar Código', commandId: 'poui.review', paid: true },
    ],
  },
  {
    label: 'Utilitários',
    entries: [
      { label: 'Preview no Browser', commandId: 'poui.preview', paid: false },
      { label: 'Reverter Componente Gerado', commandId: 'poui.undo', paid: false },
      { label: 'Consultar Documentação de Componente', commandId: 'poui.docs', paid: false },
    ],
  },
  {
    label: 'Configuração',
    entries: [
      { label: 'Configurar Motor de IA', commandId: 'poui.configureEngine', paid: false },
      { label: 'Ativar Licença', commandId: 'poui.activateLicense', paid: false },
    ],
  },
];

interface MenuQuickPickItem extends vscode.QuickPickItem {
  commandId?: string;
}

function buildPaidBadge(): string {
  const status = getCachedLicenseStatus();
  if (status?.tier === 'paid') {
    return '';
  }
  if (status?.tier === 'trial' && typeof status.daysLeft === 'number') {
    return `🔒 trial — ${status.daysLeft} dia(s)`;
  }
  return '🔒 requer licença';
}

export function buildMenuItems(): MenuQuickPickItem[] {
  const paidBadge = buildPaidBadge();
  const items: MenuQuickPickItem[] = [];
  for (const group of GROUPS) {
    items.push({ label: group.label, kind: vscode.QuickPickItemKind.Separator });
    for (const entry of group.entries) {
      items.push({
        label: entry.label,
        description: entry.paid ? paidBadge : undefined,
        commandId: entry.commandId,
      });
    }
  }
  return items;
}

export function registerMenuCommand(
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel,
): vscode.Disposable {
  return vscode.commands.registerCommand('poui.menu', async () => {
    const choice = await vscode.window.showQuickPick(buildMenuItems(), {
      placeHolder: 'O que você quer fazer?',
    });
    if (!choice?.commandId) {
      return;
    }
    await vscode.commands.executeCommand(choice.commandId);
  });
}
