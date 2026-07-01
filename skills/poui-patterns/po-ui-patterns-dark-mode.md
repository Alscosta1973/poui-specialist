# Padrão: Dark Mode com PoThemeService

Guia completo para adicionar suporte a tema claro/escuro em projetos PO-UI + Protheus.
Cobre: setup, toggle persistente, detecção de preferência do sistema, SCSS dark-safe e armadilhas.

---

## Como o Dark Mode funciona no PO-UI

`PoThemeService.changeCurrentTheme(PoThemeTypeEnum.dark)` aplica um atributo no elemento
`<body>` que altera variáveis CSS customizadas (`--color-*`). Todos os componentes PO-UI
usam essas variáveis internamente e adaptam automaticamente.

**O que muda:** apenas as variáveis CSS — nenhum arquivo adicional de CSS precisa ser carregado.

```
body[theme="default-dark"] {
  --color-neutral-dark-95: #f0f0f0;
  --color-neutral-mid-60:  #9a9a9a;
  /* ... */
}
```

> **Pré-requisito:** os arquivos CSS do tema PO-UI já devem estar configurados em `angular.json`
> (mesmo setup do tema claro — não é necessário arquivo extra para dark mode):
> ```json
> "styles": [
>   "node_modules/@totvs/po-theme/css/po-theme-default-variables.min.css",
>   "node_modules/@totvs/po-theme/css/po-theme-default.min.css",
>   "node_modules/@po-ui/style/css/po-theme-core.min.css",
>   "src/styles.scss"
> ]
> ```

---

## 1. ThemeService — singleton com persistência

Encapsule `PoThemeService` em um service próprio que persiste a preferência no `localStorage`
e detecta a preferência do sistema operacional na primeira visita:

```typescript
// src/app/core/services/theme.service.ts
import { Injectable, inject, signal } from '@angular/core';
import { PoThemeService, PoThemeTypeEnum } from '@po-ui/ng-components';

const STORAGE_KEY = 'app-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly poTheme = inject(PoThemeService);

  // Signal reativo para o estado atual: 'light' | 'dark'
  readonly mode = signal<'light' | 'dark'>('light');

  constructor() {
    this.applyInitialTheme();
  }

  toggle(): void {
    const next = this.mode() === 'light' ? 'dark' : 'light';
    this.apply(next);
  }

  setDark(): void  { this.apply('dark'); }
  setLight(): void { this.apply('light'); }

  private apply(mode: 'light' | 'dark'): void {
    const poMode = mode === 'dark' ? PoThemeTypeEnum.dark : PoThemeTypeEnum.light;
    this.poTheme.changeCurrentTheme(poMode);
    this.mode.set(mode);
    localStorage.setItem(STORAGE_KEY, mode);
  }

  private applyInitialTheme(): void {
    // 1. Preferência salva anteriormente pelo usuário
    const saved = localStorage.getItem(STORAGE_KEY) as 'light' | 'dark' | null;
    if (saved === 'light' || saved === 'dark') {
      this.apply(saved);
      return;
    }

    // 2. Preferência do sistema operacional (CSS media query)
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    this.apply(prefersDark ? 'dark' : 'light');
  }
}
```

---

## 2. Toggle no AppComponent

```typescript
// src/app/app.component.ts
import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {
  PoButtonModule,
  PoMenuModule,
  PoMenuItem,
  PoToolbarModule,
  PoToolbarAction,
} from '@po-ui/ng-components';
import { ProAppConfigService } from '@totvs/protheus-lib-core';
import { ThemeService } from './core/services/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, PoMenuModule, PoToolbarModule, PoButtonModule],
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  private readonly proConfig    = inject(ProAppConfigService);
  readonly         themeService = inject(ThemeService);

  // Ações da toolbar — botão de toggle de tema
  readonly toolbarActions: PoToolbarAction[] = [
    {
      icon:   'po-icon-light',
      label:  'Alternar tema',
      type:   'icon',
      action: () => this.themeService.toggle(),
    },
  ];

  readonly menus: PoMenuItem[] = [
    { label: 'Sair', shortLabel: 'Sair', icon: 'po-icon-exit', action: this.closeApp.bind(this) },
  ];

  private closeApp(): void {
    if (this.proConfig.insideProtheus()) {
      this.proConfig.callAppClose();
    }
  }
}
```

```html
<!-- app.component.html -->
<div class="po-wrapper">
  <po-toolbar
    p-title="Meu App"
    [p-actions]="toolbarActions">
  </po-toolbar>
  <po-menu [p-menus]="menus" [p-filter]="true" [p-collapsed]="true"></po-menu>
  <div class="container-fluid">
    <router-outlet></router-outlet>
  </div>
</div>
```

> **Ícone reativo:** para alternar o ícone conforme o modo atual, use `computed()`:
> ```typescript
> readonly themeIcon = computed(() =>
>   this.themeService.mode() === 'dark' ? 'po-icon-light' : 'po-icon-moon'
> );
> ```
> E referencie `themeIcon()` no `icon` da ação. Como `PoToolbarAction` é um array
> estático, use um método que o recria quando o signal muda — ou use um `<po-button>` dedicado.

---

## 3. Toggle como po-button dedicado (alternativa simples)

Quando a toolbar já está ocupada, um botão flutuante ou no menu lateral:

```html
<!-- Em qualquer template -->
<po-button
  [p-icon]="themeService.mode() === 'dark' ? 'po-icon-light' : 'po-icon-moon'"
  [p-label]="themeService.mode() === 'dark' ? 'Modo claro' : 'Modo escuro'"
  p-kind="secondary"
  (p-click)="themeService.toggle()">
</po-button>
```

```typescript
// Importar no componente:
imports: [..., PoButtonModule]
readonly themeService = inject(ThemeService);
```

---

## 4. Detectar mudança de preferência do sistema em tempo real

Se o usuário mudar a preferência do SO (ex: ligar dark mode automático ao anoitecer)
sem interagir com o app, detecte automaticamente:

```typescript
// Adicionar ao constructor do ThemeService:
constructor() {
  this.applyInitialTheme();
  this.watchSystemPreference();
}

private watchSystemPreference(): void {
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener('change', (e) => {
    // Só responder se o usuário não tiver preferência salva manualmente
    if (!localStorage.getItem(STORAGE_KEY)) {
      this.apply(e.matches ? 'dark' : 'light');
    }
  });
}
```

---

## 5. SCSS dark-safe — boas práticas

### ✅ Usar variáveis CSS do PO-UI em vez de hex hardcoded

```scss
// ❌ Não funciona em dark mode — cor fixa
.meu-card {
  background-color: #ffffff;
  color: #333333;
  border: 1px solid #dddddd;
}

// ✅ Adapta automaticamente com o tema
.meu-card {
  background-color: var(--color-neutral-light-00);   // branco no light, cinza escuro no dark
  color:            var(--color-neutral-dark-90);    // preto no light, quase branco no dark
  border:           1px solid var(--color-neutral-mid-40);
}
```

### Variáveis PO-UI mais usadas

| Variável CSS | Uso | Light | Dark (aprox.) |
|---|---|---|---|
| `--color-neutral-light-00` | Fundo de cards/páginas | `#fff` | `#1e1e1e` |
| `--color-neutral-light-05` | Fundo alternado de linhas | `#f2f2f2` | `#2a2a2a` |
| `--color-neutral-dark-90`  | Texto principal | `#1d1d1b` | `#e8e8e8` |
| `--color-neutral-mid-40`   | Bordas sutis | `#d0d0d0` | `#444` |
| `--color-neutral-mid-60`   | Texto secundário | `#9a9a9a` | `#888` |
| `--color-brand-01-dark`    | Cor primária dark | — | Variante escurecida |
| `--color-action-default`   | Cor de ações/links | azul padrão | azul mais claro |

### ✅ Estilo específico por modo (quando necessário)

```scss
// Se precisar de estilo exclusivo para dark mode:
:host {
  .meu-elemento { background: var(--color-neutral-light-00); }
}

// Sobrescrever apenas no dark mode
body[theme="default-dark"] {
  :host .meu-elemento {
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.5); // sombra mais intensa no dark
  }
}
```

---

## 6. Tema customizado compatível com dark mode

Ao definir uma brand color customizada, forneça variantes light e dark:

```typescript
import { PoTheme, PoThemeTypeEnum } from '@po-ui/ng-components';

const meuTema: PoTheme = {
  name: 'MeuTema',
  type: {
    active: PoThemeTypeEnum.light,
    light: {
      color: {
        'brand-01': { h: 210, s: '70%', l: '40%' },   // azul corporativo
        'brand-02': { h: 210, s: '60%', l: '30%' },
        'brand-03': { h: 210, s: '50%', l: '20%' },
      },
    },
    dark: {
      color: {
        'brand-01': { h: 210, s: '60%', l: '55%' },   // mais claro no dark (acessibilidade)
        'brand-02': { h: 210, s: '50%', l: '45%' },
        'brand-03': { h: 210, s: '40%', l: '35%' },
      },
    },
  },
};

// Aplicar no AppComponent:
this.poTheme.changeTheme(meuTema);
```

---

## 7. Armadilhas comuns

### ❌ `background-color` hardcoded em componente custom

Componentes PO-UI adaptam automaticamente, mas seus próprios componentes não.
Qualquer `#hex` ou `rgb()` hardcoded em `.component.scss` vai parecer errado no dark mode.
**Fix:** substituir por `var(--color-*)`.

### ❌ Imagens e SVGs sem variante dark

Logotipos brancos somem no dark mode (fundo claro → fundo escuro inverte o contexto).
**Fix:** usar `filter: invert(1)` condicionalmente ou fornecer variante da imagem:
```scss
body[theme="default-dark"] img.logo { filter: brightness(2); }
```

### ❌ `localStorage` não disponível em SSR

Se o projeto usar Angular Universal / SSR, `window.matchMedia` e `localStorage` quebram
no servidor. Envolva com verificação:
```typescript
if (typeof window !== 'undefined') {
  this.applyInitialTheme();
}
```

### ❌ `PoThemeTypeEnum` não importado corretamente

```typescript
// ❌ Importar de lugar errado
import { PoThemeTypeEnum } from '@po-ui/ng-templates'; // ERRADO

// ✅
import { PoThemeTypeEnum } from '@po-ui/ng-components'; // CORRETO
```

### ❌ Toggle sem persistência

Ao navegar entre rotas, `PoThemeService` mantém o tema na memória — mas ao recarregar
a página, volta ao padrão. **Sempre usar `localStorage`** para persistir a preferência
(como mostrado no `ThemeService` da Seção 1).

---

## 8. Integração com Protheus (contexto embarcado)

Quando o app roda dentro do Protheus (iframe), o usuário não tem acesso às configurações
do SO. O comportamento recomendado:

- Se o Protheus tiver API de preferência de tema → usar
- Caso contrário → iniciar sempre em **modo claro** (default Protheus)
- Expor o toggle apenas quando `!proAppConfigService.insideProtheus()`

```typescript
private applyInitialTheme(): void {
  // Dentro do Protheus: sempre light (sem persistência)
  if (this.proConfig.insideProtheus?.()) {
    this.apply('light');
    return;
  }

  // Fora do Protheus: respeitar localStorage → sistema
  const saved = localStorage.getItem(STORAGE_KEY) as 'light' | 'dark' | null;
  if (saved) { this.apply(saved); return; }
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  this.apply(prefersDark ? 'dark' : 'light');
}
```
