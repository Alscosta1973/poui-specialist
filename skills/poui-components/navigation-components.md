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
```
