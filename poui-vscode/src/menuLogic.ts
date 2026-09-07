export interface MenuEntry {
  label: string;
  commandId: string;
  paid: boolean;
}

export interface MenuGroup {
  label: string;
  entries: MenuEntry[];
}

export const GROUPS: MenuGroup[] = [
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

export function sortedGroupEntries(group: MenuGroup): MenuEntry[] {
  return [...group.entries].sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
}
