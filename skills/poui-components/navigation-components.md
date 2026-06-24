# PO-UI Navigation Components

## po-button

Botão de ação padrão do PO-UI — **componente mais usado em toda a biblioteca**.
Suporta quatro estilos visuais, loading integrado, ícone e type HTML.

### Key Inputs

| Input | Type | Description |
|-------|------|-------------|
| `p-label` | `string` | Texto exibido no botão |
| `p-icon` | `string` | Ícone PO (ex: `'po-icon-plus'`, `'po-icon-save'`, `'po-icon-delete'`) |
| `p-kind` | `'primary' \| 'secondary' \| 'tertiary' \| 'link'` | Estilo visual (default `'secondary'`) |
| `p-type` | `'button' \| 'submit' \| 'reset'` | Tipo HTML do botão (default `'button'`) |
| `p-disabled` | `boolean` | Desabilita o botão |
| `p-loading` | `boolean` | Exibe spinner e desabilita temporariamente |
| `p-size` | `'medium' \| 'large'` | Tamanho do botão (default `'medium'`) |
| `p-danger` | `boolean` | Aplica cor de perigo (vermelho) — combina com `p-kind="secondary"` |

### Key Outputs

| Output | Payload | Description |
|--------|---------|-------------|
| `(p-click)` | `void` | Emitido ao clicar no botão |

### PoButtonKind — estilos visuais

| Kind | Quando usar |
|------|-------------|
| `'primary'` | Ação principal da tela — apenas um por contexto |
| `'secondary'` | Ações secundárias e de confirmação (default) |
| `'tertiary'` | Ações de menor importância / destaque mínimo |
| `'link'` | Ação com aparência de link de texto |

### Exemplos

```typescript
import { PoButtonModule } from '@po-ui/ng-components';
// em imports do @Component: [PoButtonModule]
```

```html
<!-- Ação principal (submit do formulário) -->
<po-button
  p-label="Salvar"
  p-kind="primary"
  p-icon="po-icon-ok"
  p-type="submit"
  [p-loading]="saving()">
</po-button>

<!-- Ação secundária -->
<po-button
  p-label="Cancelar"
  p-kind="secondary"
  (p-click)="onCancel()">
</po-button>

<!-- Exclusão com estilo de perigo -->
<po-button
  p-label="Excluir"
  p-kind="secondary"
  p-icon="po-icon-delete"
  [p-danger]="true"
  (p-click)="onDelete()">
</po-button>
```

> **Dica:** Para ações em páginas (`po-page-edit`, `po-page-detail`), use `p-actions: PoPageAction[]`
> em vez de `po-button` manual — o PO-UI cuida do layout responsivo e do menu "Mais ações" automaticamente.

---

## po-search

Campo de busca com autocomplete e filtragem de objetos por chave — uso standalone, fora de `po-page-list`.

### Key Inputs

| Input | Type | Description |
|-------|------|-------------|
| `p-label` | `string` | Rótulo ou placeholder do campo |
| `p-placeholder` | `string` | Texto de ajuda (alternativa a `p-label`) |
| `p-items` | `any[] \| string[]` | Itens para autocomplete |
| `p-filter-keys` | `string[]` | Propriedades dos objetos usadas para filtrar |
| `p-search-type` | `'action' \| 'input'` | `'action'` = busca ao pressionar Enter · `'input'` = busca a cada keystroke (default `'action'`) |
| `p-disabled` | `boolean` | Desabilita o campo |

### Key Outputs

| Output | Payload | Description |
|--------|---------|-------------|
| `(p-change-model)` | `string` | Emitido ao digitar (`'input'`) ou ao submeter (`'action'`) |

### Exemplos

```typescript
import { PoSearchModule } from '@po-ui/ng-components';
// em imports: [PoSearchModule]

readonly termoBusca = signal('');

onSearch(termo: string): void {
  this.termoBusca.set(termo);
  this.carregarDados();
}
```

```html
<!-- Busca ao pressionar Enter (padrão) -->
<po-search
  p-label="Buscar Pedidos"
  p-search-type="action"
  (p-change-model)="onSearch($event)">
</po-search>

<!-- Busca em tempo real com autocomplete -->
<po-search
  p-label="Buscar Produto"
  p-search-type="input"
  [p-items]="produtos"
  [p-filter-keys]="['descricao', 'codigo']"
  (p-change-model)="onSearch($event)">
</po-search>
```

> **po-search vs p-quick-search:** Use `p-quick-search` no `po-page-list` para filtro integrado
> ao filtro avançado. Use `po-search` para busca standalone fora de uma `po-page-list`.

---

## po-menu

Menu lateral com grupos, ícones, badges e filtro. Declarado uma vez no shell — **não** em cada tela.

| Input | Type | Description |
|-------|------|-------------|
| `p-menus` | `PoMenuItem[]` | Array de itens |
| `p-collapsed` | `boolean` | Inicia recolhido (default `false`) |
| `p-logo` / `p-short-logo` | `string` | Logo normal / recolhido |
| `p-filter` | `boolean` | Campo de filtro |

Output: `(p-collapsed): boolean`.

```typescript
interface PoMenuItem {
  label: string; link?: string; icon?: string; shortLabel?: string;
  subItems?: PoMenuItem[];    // apenas 1 nível de aninhamento suportado
  badge?: string; badgeColor?: string;  // ex: 'color-07'
  divider?: boolean; disabled?: boolean;
  action?: () => void;        // callback alternativo ao link (use um ou outro)
  shortcut?: string; type?: 'externalLink' | 'noLink';
}
```

```typescript
import { PoMenuModule, PoMenuItem } from '@po-ui/ng-components';
// em imports: [PoMenuModule]

readonly menuItems: PoMenuItem[] = [
  { label: 'Home', link: '/home', icon: 'po-icon-home', shortLabel: 'Home' },
  {
    label: 'Financeiro', icon: 'po-icon-finance', shortLabel: 'Fin',
    subItems: [
      { label: 'Pedidos',        link: '/financeiro/pedidos' },
      { label: 'Contas a Pagar', link: '/financeiro/contas-pagar', badge: '5', badgeColor: 'color-07' },
    ],
  },
  { label: 'Configurações', link: '/config', icon: 'po-icon-settings', divider: true },
];
```

> `po-menu` usa `[routerLink]` internamente — requer `provideRouter()` no `app.config.ts`.

### [p-menu-header-template]

Projeta conteúdo customizado na área acima dos itens do menu. Sem context variable — o template acessa o escopo do componente pai diretamente.

```html
<po-menu [p-menus]="menuItems">
  <ng-template p-menu-header-template>
    <div class="po-pa-md po-display-flex po-align-items-center">
      <po-avatar [p-src]="user().foto" p-size="sm" class="po-mr-2"></po-avatar>
      <div>
        <strong>{{ user().nome }}</strong>
        <div><small>{{ user().email }}</small></div>
        <po-tag [p-value]="user().perfil" p-color="color-01"></po-tag>
      </div>
    </div>
  </ng-template>
</po-menu>
```

> Usos comuns: user card (avatar + nome + papel), logo dinâmico por filial, seletor de empresa.
> O template re-renderiza junto com o CD do componente pai — reatividade funciona normalmente com Signals.

---

## po-menu-panel

Painel de navegação lateral compacto com itens que podem ser ícone-only (recolhido) ou ícone + label (expandido).
Ideal quando o espaço horizontal é limitado ou para apps com poucos itens de menu.

### Key Inputs

| Input | Type | Description |
|-------|------|-------------|
| `p-items` | `PoMenuPanelItem[]` | Itens de navegação |
| `p-logo` | `string` | URL do logo exibido quando expandido |
| `p-short-logo` | `string` | URL do logo reduzido exibido quando recolhido |

### PoMenuPanelItem

```typescript
interface PoMenuPanelItem {
  label:       string;
  icon:        string;   // po-icon-* ou URL de ícone
  link?:       string;   // rota Angular
  shortLabel?: string;
  selected?:   boolean;
}
```

### Exemplos

```typescript
import { PoMenuPanelModule, PoMenuPanelItem } from '@po-ui/ng-components';
// em imports: [PoMenuPanelModule]

readonly menuItems: PoMenuPanelItem[] = [
  { label: 'Dashboard',    icon: 'po-icon-home',      link: '/dashboard'    },
  { label: 'Pedidos',      icon: 'po-icon-document',  link: '/pedidos'      },
  { label: 'Fornecedores', icon: 'po-icon-user',       link: '/fornecedores' },
  { label: 'Relatórios',   icon: 'po-icon-chart-bar', link: '/relatorios'   },
  { label: 'Configurações',icon: 'po-icon-settings',  link: '/config'       },
];
```

```html
<po-menu-panel
  [p-items]="menuItems"
  p-logo="assets/logo.png"
  p-short-logo="assets/logo-icon.png">
</po-menu-panel>
```

> **po-menu vs po-menu-panel:** `po-menu` é o menu lateral completo com grupos, sub-itens,
> filtro e badges — adequado para apps complexos. `po-menu-panel` é navegação compacta ícone-based,
> ideal para painéis e apps com poucos itens de menu.

---

## po-toolbar

Barra de topo com título, logo, perfil e ações customizadas.

| Input | Type | Description |
|-------|------|-------------|
| `p-title` | `string` | Título da aplicação |
| `p-logo` | `string` | URL do logo |
| `p-items` | `PoToolbarItem[]` | Ações adicionais (ícones) |
| `p-profile` | `PoToolbarProfile` | Dados do usuário logado |
| `p-notification` | `PoToolbarNotification` | Ícone de notificações |

```typescript
interface PoToolbarItem {
  icon: string; tooltip?: string; type?: 'danger' | 'default';
  badge?: { value: number; color?: string }; action?: () => void;
}

interface PoToolbarProfile {
  title: string; avatar?: string; subtitle?: string;
  profileActions?: Array<{
    label: string; icon?: string; action?: () => void;
    url?: string; separator?: boolean;
  }>;
}
```

```typescript
import { PoToolbarModule, PoToolbarItem, PoToolbarProfile } from '@po-ui/ng-components';
// em imports: [PoToolbarModule]

readonly toolbarProfile: PoToolbarProfile = {
  title: 'Andre Costa', subtitle: 'Administrador',
  profileActions: [
    { label: 'Meu Perfil', icon: 'po-icon-user', url: '/perfil' },
    { label: 'Sair', icon: 'po-icon-exit', action: () => this.router.navigate(['/login']), separator: true },
  ],
};

readonly toolbarItems: PoToolbarItem[] = [
  { icon: 'po-icon-notification', tooltip: 'Notificações', badge: { value: 3, color: 'color-08' }, action: () => this.openNotifications() },
];
```

### Shell padrão — toolbar + menu + conteúdo

```html
<!-- app.component.html -->
<po-toolbar p-title="Meu App" p-logo="/assets/logo.png"
  [p-profile]="toolbarProfile" [p-items]="toolbarItems">
</po-toolbar>
<div class="po-wrapper">
  <po-menu p-logo="/assets/logo.png" [p-menus]="menuItems" [p-filter]="true"></po-menu>
  <div class="po-page-content"><router-outlet></router-outlet></div>
</div>
```

```typescript
// em imports do AppComponent:
import { PoMenuModule, PoToolbarModule } from '@po-ui/ng-components';
import { RouterOutlet } from '@angular/router';
```

---

## PoBreadcrumb — Interface TypeScript

Consumida por `po-page-list`, `po-page-edit`, `po-page-detail` e `PoPageDynamic*`.

```typescript
interface PoBreadcrumb {
  items:     PoBreadcrumbItem[];
  favorite?: string;       // URL para favoritar via PoFavoritesService
  params?:   any;
}

interface PoBreadcrumbItem {
  label:   string;
  link?:   string;         // ausente → item não-clicável (convenção: último item)
  action?: () => void;
}
```

```typescript
readonly breadcrumb: PoBreadcrumb = {
  items: [
    { label: 'Financeiro', link: '/financeiro' },
    { label: 'Pedidos',    link: '/financeiro/pedidos' },
    { label: 'Editar Pedido' },   // último — sem link
  ],
};
```

---

## po-breadcrumb — componente visual

Componente standalone que renderiza trilha de navegação. Recebe array de `PoBreadcrumbItem[]` diretamente.

| Input | Type | Descrição |
|-------|------|-----------|
| `p-items` | `PoBreadcrumbItem[]` | Items da trilha (obrigatório) |
| `p-params` | `any` | Parâmetros extras passados para os links |
| `p-favorite` | `string` | URL para favoritar via PoFavoritesService |

```typescript
import { PoBreadcrumbModule, PoBreadcrumbItem } from '@po-ui/ng-components';

// imports: [PoBreadcrumbModule]
readonly breadcrumbItems: PoBreadcrumbItem[] = [
  { label: 'Financeiro', link: '/financeiro' },
  { label: 'Pedidos',    link: '/financeiro/pedidos' },
  { label: 'Editar Pedido' },   // sem link → item atual, não-clicável
];
```

```html
<!-- Standalone -->
<po-breadcrumb [p-items]="breadcrumbItems"></po-breadcrumb>

<!-- Via p-breadcrumb no po-page-edit (gera breadcrumb automaticamente) -->
<po-page-edit p-title="Editar Pedido" [p-breadcrumb]="{ items: breadcrumbItems }">
  ...
</po-page-edit>
```

---

## po-tabs

Navegação em abas sem navegação de rota.

| Input | Type | Output | Payload |
|-------|------|--------|---------|
| `p-tabs` | `PoTab[]` | `(p-activated)` | `PoTab` |

```typescript
interface PoTab { label: string; id?: string; disabled?: boolean; icon?: string; badge?: { value: number; color?: string }; }
```

```typescript
import { PoTabsModule, PoTab } from '@po-ui/ng-components';
// em imports: [PoTabsModule]

readonly abas: PoTab[] = [
  { label: 'Dados Gerais', id: 'dados'    },
  { label: 'Endereço',     id: 'endereco' },
  { label: 'Histórico',    id: 'hist', disabled: true },
];
onTabChange(tab: PoTab): void { this.abaAtiva = tab.id ?? ''; }
```

```html
<po-tabs [p-tabs]="abas" (p-activated)="onTabChange($event)">
  <po-tab-content p-tab-id="dados"><!-- conteúdo --></po-tab-content>
</po-tabs>
```

---

## po-button-group

Grupo com estado selecionado — filtros exclusivos ou toggle de view.

| Input | Type | Description |
|-------|------|-------------|
| `p-buttons` | `PoButtonGroupItem[]` | Definição dos botões |
| `p-size` | `'medium' \| 'large'` | Tamanho (default `'medium'`) |

```typescript
interface PoButtonGroupItem {
  label: string; action?: (button: PoButtonGroupItem) => void;
  disabled?: boolean; icon?: string; selected?: boolean;
  tooltip?: string; type?: 'danger' | 'default' | 'primary' | 'link';
}
```

```typescript
import { PoButtonGroupModule, PoButtonGroupItem } from '@po-ui/ng-components';
// em imports: [PoButtonGroupModule]

readonly viewButtons: PoButtonGroupItem[] = [
  { label: 'Grade', icon: 'po-icon-menu-grid',  selected: true,  action: () => this.setView('grid') },
  { label: 'Lista', icon: 'po-icon-menu-lines',  selected: false, action: () => this.setView('list') },
];

setView(mode: 'grid' | 'list'): void {
  this.viewButtons.forEach(b => b.selected = b.label.toLowerCase() === mode);
  this.viewMode.set(mode);
}
```

```html
<po-button-group [p-buttons]="viewButtons"></po-button-group>
```

---

## po-dropdown

Dropdown de ações — alternativa ao menu contextual.

| Input | Type | Description |
|-------|------|-------------|
| `p-items` | `PoDropdownItem[]` | Lista de itens |
| `p-label` | `string` | Texto do botão |
| `p-disabled` | `boolean` | Desabilita |

```typescript
interface PoDropdownItem {
  label: string; action?: () => void; disabled?: boolean;
  icon?: string; separator?: boolean; type?: 'danger' | 'default'; url?: string;
}
```

```typescript
import { PoDropdownModule, PoDropdownItem } from '@po-ui/ng-components';
// em imports: [PoDropdownModule]

readonly exportActions: PoDropdownItem[] = [
  { label: 'Exportar CSV', icon: 'po-icon-export', action: () => this.exportCsv() },
  { label: 'Exportar PDF', icon: 'po-icon-pdf',    action: () => this.exportPdf() },
  { separator: true, label: 'Imprimir', icon: 'po-icon-print', action: () => this.print() },
];
```

```html
<po-dropdown p-label="Exportar" [p-items]="exportActions"></po-dropdown>
```

---

## po-stepper + po-step

Divide um processo em passos numerados — ideal para wizards de cadastro com múltiplas etapas
que precisam ser completadas em sequência.

### Key Inputs (po-stepper)

| Input | Type | Description |
|-------|------|-------------|
| `p-step` | `number` | Índice do passo ativo (1-based) |
| `p-orientation` | `'horizontal' \| 'vertical'` | Layout do stepper (default `'horizontal'`) |
| `p-sequential` | `boolean` | Impede pular passos via clique no número (default `false`) |

### Key Outputs (po-stepper)

| Output | Payload | Description |
|--------|---------|-------------|
| `(p-change-step)` | `number` | Emitido ao navegar entre passos |

### Key Inputs (po-step)

| Input | Type | Description |
|-------|------|-------------|
| `p-label` | `string` | Rótulo do passo exibido no stepper |
| `p-status` | `PoStepperStatus` | Estado visual do passo |

### PoStepperStatus

```typescript
enum PoStepperStatus {
  Active   = 'active',    // passo atual
  Done     = 'done',      // passo concluído
  Default  = 'default',   // não iniciado
  Disabled = 'disabled',  // inacessível
  Error    = 'error',     // contém erro de validação
}
```

### Exemplo

```typescript
import { PoStepperModule } from '@po-ui/ng-components';
// em imports: [PoStepperModule]

readonly stepAtual = signal<number>(1);

avancar(): void { this.stepAtual.update(s => Math.min(s + 1, 3)); }
voltar():  void { this.stepAtual.update(s => Math.max(s - 1, 1)); }
```

```html
<po-stepper [p-step]="stepAtual()">

  <po-step p-label="Identificação">
    <div class="po-row">
      <po-input class="po-md-4" p-label="Código" formControlName="codigo" [p-required]="true"></po-input>
      <po-input class="po-md-8" p-label="Nome"   formControlName="nome"   [p-required]="true"></po-input>
    </div>
    <div class="po-row po-mt-2">
      <po-button p-label="Próximo" p-kind="primary" (p-click)="avancar()"></po-button>
    </div>
  </po-step>

  <po-step p-label="Endereço">
    <div class="po-row">
      <po-input class="po-md-3" p-label="CEP"        formControlName="cep" p-mask="99999-999"></po-input>
      <po-input class="po-md-9" p-label="Logradouro" formControlName="logradouro"></po-input>
    </div>
    <div class="po-row po-mt-2">
      <po-button p-label="Anterior" p-kind="secondary" (p-click)="voltar()"></po-button>
      <po-button p-label="Próximo"  p-kind="primary"   (p-click)="avancar()"></po-button>
    </div>
  </po-step>

  <po-step p-label="Confirmação">
    <po-dynamic-view [p-fields]="confirmFields" [p-value]="form.value"></po-dynamic-view>
    <div class="po-row po-mt-2">
      <po-button p-label="Anterior" p-kind="secondary" (p-click)="voltar()"></po-button>
      <po-button p-label="Salvar"   p-kind="primary"   p-type="submit" [p-loading]="saving()"></po-button>
    </div>
  </po-step>

</po-stepper>
```

> **p-sequential:** Use `[p-sequential]="true"` para bloquear o avanço por clique no número do passo —
> o usuário só navega pelos botões Próximo/Anterior, garantindo que cada etapa seja preenchida antes de prosseguir.

---

## po-divider

Separador horizontal com rótulo entre seções.

| Input | Type | Description |
|-------|------|-------------|
| `p-label` | `string` | Texto ao lado da linha |

```typescript
import { PoDividerModule } from '@po-ui/ng-components';
// em imports: [PoDividerModule]
```

```html
<po-divider p-label="Dados Fiscais"></po-divider>
<div class="po-row">
  <po-input class="po-md-4" p-label="CNPJ" formControlName="cnpj" p-mask="99.999.999/9999-99"></po-input>
  <po-input class="po-md-4" p-label="IE"   formControlName="ie"></po-input>
</div>
```

---

## po-tree-view + po-tree-view-item

Componente de árvore de navegação com nós expansíveis — ideal para hierarquias de categorias,
estruturas de menu dinâmico e seleção de itens em estrutura pai/filho.

### Key Inputs (po-tree-view)

| Input | Type | Description |
|-------|------|-------------|
| `p-items` | `PoTreeViewItem[]` | Array de nós raiz da árvore |

### Key Outputs (po-tree-view)

| Output | Payload | Description |
|--------|---------|-------------|
| `(p-selected)` | `PoTreeViewItem` | Emitido ao clicar em um nó |
| `(p-expanded)` | `PoTreeViewItem` | Emitido ao expandir um nó |
| `(p-collapsed)` | `PoTreeViewItem` | Emitido ao recolher um nó |

### PoTreeViewItem

```typescript
interface PoTreeViewItem {
  label:     string;
  value:     any;
  selected?: boolean;
  expanded?: boolean;
  subItems?: PoTreeViewItem[];
}
```

### Exemplos

```typescript
import { PoTreeViewModule, PoTreeViewItem } from '@po-ui/ng-components';
// em imports: [PoTreeViewModule]

readonly categorias: PoTreeViewItem[] = [
  {
    label: 'Eletrônicos', value: 'eletronicos', expanded: true,
    subItems: [
      {
        label: 'Computadores', value: 'computadores',
        subItems: [
          { label: 'Notebooks', value: 'notebooks' },
          { label: 'Desktops',  value: 'desktops'  },
        ],
      },
      { label: 'Celulares', value: 'celulares' },
    ],
  },
  { label: 'Vestuário',   value: 'vestuario'   },
  { label: 'Alimentos',   value: 'alimentos'   },
];

readonly categoriaSelecionada = signal<PoTreeViewItem | null>(null);

onSelect(item: PoTreeViewItem): void {
  this.categoriaSelecionada.set(item);
}
```

```html
<po-tree-view
  [p-items]="categorias"
  (p-selected)="onSelect($event)">
</po-tree-view>
```

> **Seleção e expansão:** `p-selected` e `p-expanded` nos itens do array controlam o estado inicial.
> Para seleção programática, atualize o array com `signal()` e re-renderize — não existe método `select()`.
