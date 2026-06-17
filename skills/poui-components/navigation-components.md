# PO-UI Navigation Components

## po-menu

Menu lateral navegável com suporte a grupos, ícones, badges, filtro e colapso.
Normalmente declarado uma vez no shell/app component — **não** em cada tela.

### Key Inputs

| Input | Type | Description |
|-------|------|-------------|
| `p-menus` | `PoMenuItem[]` | Array de itens do menu |
| `p-collapsed` | `boolean` | Inicia o menu recolhido (default `false`) |
| `p-logo` | `string` | URL do logotipo exibido no topo |
| `p-logo-alt` | `string` | Texto alternativo para o logo |
| `p-filter` | `boolean` | Exibe campo de filtro para buscar itens |
| `p-short-logo` | `string` | Logo menor exibido quando o menu está recolhido |

### Key Outputs

| Output | Payload | Description |
|--------|---------|-------------|
| `(p-collapsed)` | `boolean` | Emitido ao colapsar/expandir |

### PoMenuItem

```typescript
interface PoMenuItem {
  label:       string;          // texto exibido no item
  link?:       string;          // rota Angular (ex: '/financeiro/pedidos') ou URL externa
  icon?:       string;          // ícone PO (ex: 'po-icon-home', 'po-icon-finance')
  shortLabel?: string;          // label curto exibido no modo recolhido
  subItems?:   PoMenuItem[];    // subitens — apenas 1 nível de aninhamento suportado
  badge?:      string;          // valor exibido como badge (ex: '3', 'Novo')
  badgeColor?: string;          // token de cor do badge (ex: 'color-07', 'color-11')
  divider?:    boolean;         // linha separadora acima deste item
  disabled?:   boolean;         // desabilita o item (visual cinza, sem clique)
  action?:     () => void;      // callback alternativo ao link (use um ou outro)
  shortcut?:   string;          // texto de atalho de teclado exibido (ex: 'Ctrl+N')
  type?:       'externalLink' | 'noLink';
  //   'externalLink' → abre link em nova aba
  //   'noLink'       → item não clicável (somente agrupador visual)
}
```

### Exemplo completo de menu lateral

```typescript
import { PoMenuModule, PoMenuItem } from '@po-ui/ng-components';

// em imports do @Component: [PoMenuModule]

readonly menuItems: PoMenuItem[] = [
  {
    label:      'Home',
    link:       '/home',
    icon:       'po-icon-home',
    shortLabel: 'Home',
  },
  {
    label:      'Financeiro',
    icon:       'po-icon-finance',
    shortLabel: 'Fin',
    subItems: [
      { label: 'Pedidos',      link: '/financeiro/pedidos' },
      { label: 'Parceiros',    link: '/financeiro/parceiros' },
      {
        label:      'Contas a Pagar',
        link:       '/financeiro/contas-pagar',
        badge:      '5',
        badgeColor: 'color-07',
      },
    ],
  },
  {
    label:      'Compras',
    icon:       'po-icon-buy',
    shortLabel: 'Cmp',
    subItems: [
      { label: 'Pedidos de Compra', link: '/compras/pedidos' },
      { label: 'Parceiros',         link: '/compras/parceiros' },
    ],
  },
  {
    label:      'Estoque',
    icon:       'po-icon-box',
    shortLabel: 'Est',
    subItems: [
      { label: 'Produtos', link: '/estoque/produtos' },
      { label: 'Entradas', link: '/estoque/entradas' },
      { label: 'Saídas',   link: '/estoque/saidas' },
    ],
  },
  {
    label:   'Configurações',
    link:    '/config',
    icon:    'po-icon-settings',
    divider: true,
  },
];
```

```html
<po-menu
  p-logo="/assets/logo.png"
  p-short-logo="/assets/logo-icon.png"
  [p-menus]="menuItems"
  [p-filter]="true">
</po-menu>

<router-outlet></router-outlet>
```

> **Nota:** `po-menu` usa `[routerLink]` internamente quando `link` é fornecido — requer `provideRouter()` no `app.config.ts`.

---

## po-toolbar

Barra de topo da aplicação com título, logo, perfil do usuário, notificações e ações customizadas.

### Key Inputs

| Input | Type | Description |
|-------|------|-------------|
| `p-title` | `string` | Título da aplicação |
| `p-logo` | `string` | URL do logo |
| `p-items` | `PoToolbarItem[]` | Ações adicionais (ícones com ação) |
| `p-profile` | `PoToolbarProfile` | Dados do usuário logado |
| `p-notification` | `PoToolbarNotification` | Configuração do ícone de notificações |

### PoToolbarItem

```typescript
interface PoToolbarItem {
  icon:     string;           // ícone PO (ex: 'po-icon-settings')
  tooltip?: string;           // tooltip ao passar o mouse
  type?:    'danger' | 'default';
  badge?: {
    value: number;            // quantidade no badge
    color?: string;           // token de cor
  };
  action?: () => void;        // callback ao clicar
}
```

### PoToolbarProfile

```typescript
interface PoToolbarProfile {
  avatar?:          string;                   // URL da foto do usuário
  title:            string;                   // nome do usuário logado
  subtitle?:        string;                   // cargo ou empresa
  profileActions?:  PoToolbarProfileAction[]; // itens do dropdown do perfil
}

interface PoToolbarProfileAction {
  label:      string;
  icon?:      string;
  action?:    () => void;
  url?:       string;
  separator?: boolean;        // linha separadora acima deste item
}
```

### Exemplo completo

```typescript
import { Router } from '@angular/router';
import {
  PoToolbarModule,
  PoToolbarItem,
  PoToolbarProfile,
} from '@po-ui/ng-components';

// em imports do @Component: [PoToolbarModule]

private readonly router = inject(Router);

readonly toolbarProfile: PoToolbarProfile = {
  title:    'Andre Costa',
  subtitle: 'Administrador',
  profileActions: [
    { label: 'Meu Perfil',    icon: 'po-icon-user',     url: '/perfil' },
    { label: 'Configurações', icon: 'po-icon-settings',  url: '/config' },
    {
      label:     'Sair',
      icon:      'po-icon-exit',
      action:    () => this.logout(),
      separator: true,
    },
  ],
};

readonly toolbarItems: PoToolbarItem[] = [
  {
    icon:    'po-icon-refresh',
    tooltip: 'Atualizar',
    action:  () => location.reload(),
  },
  {
    icon:    'po-icon-notification',
    tooltip: 'Notificações',
    badge:   { value: 3, color: 'color-08' },
    action:  () => this.openNotifications(),
  },
];

private logout(): void {
  this.router.navigate(['/login']);
}
```

```html
<po-toolbar
  p-title="Protheus ERP"
  p-logo="/assets/logo.png"
  [p-profile]="toolbarProfile"
  [p-items]="toolbarItems">
</po-toolbar>
```

### Shell padrão — toolbar + menu lateral + conteúdo

```html
<!-- app.component.html -->
<po-toolbar
  p-title="Meu App Protheus"
  p-logo="/assets/logo.png"
  [p-profile]="toolbarProfile"
  [p-items]="toolbarItems">
</po-toolbar>

<div class="po-wrapper">
  <po-menu [p-menus]="menuItems" [p-filter]="true"></po-menu>

  <div class="po-page-content">
    <router-outlet></router-outlet>
  </div>
</div>
```

```typescript
import {
  PoMenuModule,
  PoToolbarModule,
} from '@po-ui/ng-components';
import { RouterOutlet } from '@angular/router';

// em imports do AppComponent: [PoMenuModule, PoToolbarModule, RouterOutlet]
```

---

## PoBreadcrumb — Interface TypeScript completa

Interface consumida por `po-page-list`, `po-page-edit`, `po-page-detail` e `PoPageDynamic*`. Referência única:

```typescript
interface PoBreadcrumb {
  items:     PoBreadcrumbItem[];
  favorite?: string;       // URL para favoritar via PoFavoritesService
  params?:   any;          // parâmetros passados ao serviço de favoritos
}

interface PoBreadcrumbItem {
  label:   string;
  link?:   string;         // se ausente, item é não-clicável (convenção: último item da trilha)
  action?: () => void;     // callback alternativo ao link
}
```

```typescript
// Padrão em tela de edição (3 níveis)
readonly breadcrumb: PoBreadcrumb = {
  items: [
    { label: 'Financeiro',    link: '/financeiro' },
    { label: 'Pedidos',       link: '/financeiro/pedidos' },
    { label: 'Editar Pedido' },           // último — sem link
  ],
};

// Padrão em tela de lista (2 níveis)
readonly breadcrumb: PoBreadcrumb = {
  items: [
    { label: 'Financeiro', link: '/financeiro' },
    { label: 'Pedidos' },
  ],
};

---

## po-tabs

Navegação em abas dentro de uma página — útil para separar seções de um formulário ou
exibir dados relacionados em diferentes visões sem navegação de rota.

### Key Inputs

| Input | Type | Description |
|-------|------|-------------|
| `p-tabs` | `PoTab[]` | Definição das abas |

### PoTab

```typescript
interface PoTab {
  label:    string;           // texto exibido na aba
  id?:      string;           // identificador único
  disabled?: boolean;         // desabilita a aba
  icon?:    string;           // ícone PO antes do label
  badge?:   { value: number; color?: string }; // contador na aba
}
```

### Key Outputs

| Output | Payload | Description |
|--------|---------|-------------|
| `(p-activated)` | `PoTab` | Emitido ao ativar uma aba |

### Exemplo

```typescript
import { PoTabsModule, PoTab } from '@po-ui/ng-components';
// em imports do @Component: [PoTabsModule]

readonly abas: PoTab[] = [
  { label: 'Dados Gerais',  id: 'dados'    },
  { label: 'Endereço',      id: 'endereco' },
  { label: 'Financeiro',    id: 'fin'      },
  { label: 'Histórico',     id: 'hist',   disabled: true },
];

abaAtiva = 'dados';

onTabChange(tab: PoTab): void {
  this.abaAtiva = tab.id ?? '';
}
```

```html
<po-tabs [p-tabs]="abas" (p-activated)="onTabChange($event)">

  <po-tab-content p-tab-id="dados">
    <!-- conteúdo da aba Dados Gerais -->
  </po-tab-content>

  <po-tab-content p-tab-id="endereco">
    <!-- conteúdo da aba Endereço -->
  </po-tab-content>

</po-tabs>
```

---

## po-button-group

Grupo de botões com estado selecionado — útil para filtros mutuamente exclusivos,
toggle de visualização (grade/lista), ou seleção de período.

### Key Inputs

| Input | Type | Description |
|-------|------|-------------|
| `p-buttons` | `PoButtonGroupItem[]` | Definição dos botões |
| `p-size` | `'medium' \| 'large'` | Tamanho dos botões (default `'medium'`) |

### PoButtonGroupItem

```typescript
interface PoButtonGroupItem {
  label:     string;
  action?:   (button: PoButtonGroupItem) => void;
  disabled?: boolean;
  icon?:     string;
  selected?: boolean;         // estado inicial selecionado
  tooltip?:  string;
  type?:     'danger' | 'default' | 'primary' | 'link';
}
```

### Exemplo

```typescript
import { PoButtonGroupModule, PoButtonGroupItem } from '@po-ui/ng-components';
// em imports: [PoButtonGroupModule]

readonly viewButtons: PoButtonGroupItem[] = [
  { label: 'Grade',  icon: 'po-icon-menu-grid',  selected: true,  action: () => this.setView('grid')  },
  { label: 'Lista',  icon: 'po-icon-menu-lines',  selected: false, action: () => this.setView('list')  },
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

Menu de dropdown com lista de ações — alternativa ao menu contextual para ações
em massa ou ações de cabeçalho quando há muitas opções que não cabem como botões.

### Key Inputs

| Input | Type | Description |
|-------|------|-------------|
| `p-items` | `PoDropdownItem[]` | Lista de itens do dropdown |
| `p-label` | `string` | Texto do botão que abre o dropdown |
| `p-disabled` | `boolean` | Desabilita o dropdown |

### PoDropdownItem

```typescript
interface PoDropdownItem {
  label:      string;
  action?:    () => void;
  disabled?:  boolean;
  icon?:      string;
  separator?: boolean;        // linha separadora antes deste item
  type?:      'danger' | 'default';
  url?:       string;
}
```

### Exemplo

```typescript
import { PoDropdownModule, PoDropdownItem } from '@po-ui/ng-components';
// em imports: [PoDropdownModule]

readonly exportActions: PoDropdownItem[] = [
  { label: 'Exportar CSV',  icon: 'po-icon-export', action: () => this.exportCsv()  },
  { label: 'Exportar PDF',  icon: 'po-icon-pdf',    action: () => this.exportPdf()  },
  { separator: true, label: 'Imprimir', icon: 'po-icon-print', action: () => this.print() },
];
```

```html
<po-dropdown p-label="Exportar" [p-items]="exportActions"></po-dropdown>
```

---

## po-divider

Separador visual horizontal com rótulo opcional — usado para demarcar seções dentro
de formulários, modais ou containers sem criar estrutura extra.

### Key Inputs

| Input | Type | Description |
|-------|------|-------------|
| `p-label` | `string` | Texto exibido ao lado da linha separadora |

### Exemplos

```typescript
import { PoDividerModule } from '@po-ui/ng-components';
// em imports do @Component: [PoDividerModule]
```

```html
<!-- Separador simples (linha horizontal) -->
<po-divider></po-divider>

<!-- Separador com label de seção -->
<po-divider p-label="Dados de Endereço"></po-divider>

<!-- Uso típico dentro de formulário -->
<po-divider p-label="Dados Fiscais"></po-divider>
<div class="po-row">
  <po-input class="po-md-4" p-label="CNPJ" formControlName="cnpj" p-mask="99.999.999/9999-99"></po-input>
  <po-input class="po-md-4" p-label="IE"   formControlName="ie"></po-input>
</div>
```
```
