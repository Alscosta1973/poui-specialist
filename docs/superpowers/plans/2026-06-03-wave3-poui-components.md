# Wave 3 — PO-UI Navigation, Utilities, Reactive Forms & Master-Detail Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fechar os últimos gaps do plugin poui-specialist — componentes de navegação (po-menu, po-toolbar), utilitários (po-loading-overlay, po-widget, po-avatar, po-badge), padrões de Reactive Forms integrados com PO-UI, e template de geração master-detail.

**Architecture:** Adições puras — 4 arquivos novos + 2 edições de índice. Nenhum arquivo existente é reescrito. Cada arquivo tem responsabilidade única e é autocontido com exemplos completos copiáveis.

**Tech Stack:** Markdown (plugin templates), Angular 17+ TypeScript, `@po-ui/ng-components`, Angular Reactive Forms (`@angular/forms`)

---

## Mapa de arquivos

| Arquivo | Ação | Responsabilidade |
|---------|------|-----------------|
| `skills/poui-components/navigation-components.md` | Criar | po-menu (PoMenuItem, PoMenuFilter), po-toolbar (PoToolbarItem, PoToolbarProfile) |
| `skills/poui-components/utility-components.md` | Criar | po-loading-overlay, po-widget, po-avatar, po-badge |
| `skills/poui-patterns/reactive-forms.md` | Criar | FormGroup + FormBuilder com PO-UI, validação cruzada, FormArray, disable dinâmico |
| `skills/poui-code-generation/templates-master-detail.md` | Criar | Template po-table com detail expansion — itens de pedido, NF com itens |
| `skills/poui-components/SKILL.md` | Editar | Adicionar referências aos 2 novos arquivos de componentes |
| `skills/poui-patterns/SKILL.md` | Editar | Adicionar referência ao reactive-forms.md |
| `skills/poui-code-generation/SKILL.md` | Editar | Adicionar template master-detail na tabela |

---

## Task 1: Criar `navigation-components.md`

**Files:**
- Create: `skills/poui-components/navigation-components.md`

- [ ] **Criar o arquivo:**

```markdown
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
  label: string;           // texto exibido
  link?: string;           // rota Angular ou URL externa
  icon?: string;           // ícone PO (ex: 'po-icon-home', 'po-icon-finance')
  shortLabel?: string;     // label curto exibido no modo recolhido
  subItems?: PoMenuItem[]; // subitens (apenas 1 nível de aninhamento)
  badge?: string;          // valor do badge (ex: '3', 'Novo')
  badgeColor?: string;     // cor do badge (color token)
  divider?: boolean;       // linha divisória acima deste item
  disabled?: boolean;      // desabilita o item
  action?: () => void;     // callback alternativo ao link
  shortcut?: string;       // texto de atalho de teclado exibido
  type?: 'externalLink' | 'noLink';  // 'externalLink' abre em nova aba
}
```

### Exemplo completo de menu lateral

```typescript
import { PoMenuModule, PoMenuItem } from '@po-ui/ng-components';

// em imports do @Component: [PoMenuModule]

readonly menuItems: PoMenuItem[] = [
  {
    label: 'Home',
    link:  '/home',
    icon:  'po-icon-home',
    shortLabel: 'Home',
  },
  {
    label: 'Financeiro',
    icon:  'po-icon-finance',
    shortLabel: 'Fin',
    subItems: [
      { label: 'Clientes',     link: '/financeiro/clientes' },
      { label: 'Fornecedores', link: '/financeiro/fornecedores' },
      {
        label: 'Contas a Pagar',
        link:  '/financeiro/contas-pagar',
        badge: '5',
        badgeColor: 'color-07',
      },
    ],
  },
  {
    label: 'Estoque',
    icon:  'po-icon-box',
    shortLabel: 'Est',
    subItems: [
      { label: 'Produtos',  link: '/estoque/produtos' },
      { label: 'Entradas',  link: '/estoque/entradas' },
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
<!-- Em app.component.html / shell.component.html -->
<po-menu
  p-logo="/assets/logo.png"
  p-short-logo="/assets/logo-icon.png"
  [p-menus]="menuItems"
  [p-filter]="true">
</po-menu>

<router-outlet></router-outlet>
```

> **Nota de integração:** O `po-menu` gerencia a navegação Angular via `[routerLink]` internamente
> quando `link` é fornecido. Não é necessário adicionar `RouterModule` separadamente se o
> `provideRouter()` já está no `app.config.ts`.

---

## po-toolbar

Barra de topo da aplicação com suporte a título, logo, perfil do usuário, notificações e ações.

### Key Inputs

| Input | Type | Description |
|-------|------|-------------|
| `p-title` | `string` | Título da aplicação |
| `p-logo` | `string` | URL do logo |
| `p-items` | `PoToolbarItem[]` | Ações adicionais (ícones com ação) |
| `p-profile` | `PoToolbarProfile` | Dados do usuário logado |
| `p-notification` | `PoToolbarNotification` | Configuração de notificações |

### PoToolbarItem

```typescript
interface PoToolbarItem {
  icon:     string;         // ícone PO (ex: 'po-icon-settings')
  tooltip?: string;         // tooltip ao passar o mouse
  badge?: {
    value: number;          // quantidade exibida no badge
    color?: string;
  };
  type?:    'danger' | 'default';
  action?:  () => void;     // callback ao clicar
}
```

### PoToolbarProfile

```typescript
interface PoToolbarProfile {
  avatar?: string;          // URL da foto do usuário
  title:   string;          // nome do usuário
  subtitle?: string;        // cargo ou empresa
  profileActions?: PoToolbarProfileAction[];
}

interface PoToolbarProfileAction {
  label:   string;
  icon?:   string;
  action?: () => void;
  url?:    string;
  separator?: boolean;
}
```

### Exemplo completo

```typescript
import { PoToolbarModule, PoToolbarItem, PoToolbarProfile } from '@po-ui/ng-components';

// em imports do @Component: [PoToolbarModule]

readonly toolbarProfile: PoToolbarProfile = {
  title:    'Andre Costa',
  subtitle: 'Administrador',
  profileActions: [
    { label: 'Meu Perfil', icon: 'po-icon-user',   url: '/perfil' },
    { label: 'Sair',       icon: 'po-icon-exit',   action: () => this.logout(), separator: true },
  ],
};

readonly toolbarItems: PoToolbarItem[] = [
  {
    icon:    'po-icon-settings',
    tooltip: 'Configurações',
    action:  () => this.router.navigate(['/config']),
  },
  {
    icon:    'po-icon-notification',
    tooltip: 'Notificações',
    badge:   { value: 3, color: 'color-08' },
    action:  () => this.openNotifications(),
  },
];
```

```html
<po-toolbar
  p-title="Ortobom ERP"
  p-logo="/assets/logo.png"
  [p-profile]="toolbarProfile"
  [p-items]="toolbarItems">
</po-toolbar>
```

### Shell padrão — menu lateral + toolbar

```html
<!-- app.component.html -->
<po-toolbar
  p-title="Meu App Protheus"
  [p-profile]="toolbarProfile">
</po-toolbar>

<div class="po-wrapper">
  <po-menu [p-menus]="menuItems" [p-filter]="true"></po-menu>

  <div class="po-page-content">
    <router-outlet></router-outlet>
  </div>
</div>
```

```typescript
import { PoMenuModule, PoToolbarModule } from '@po-ui/ng-components';
// em imports do AppComponent: [PoMenuModule, PoToolbarModule, RouterOutlet]
```

---

## PoBreadcrumb — Interface TypeScript

O `PoBreadcrumb` é usado em todas as telas mas vale registrar a interface completa:

```typescript
interface PoBreadcrumb {
  items: PoBreadcrumbItem[];
  favorite?: string;         // URL para favoritar a página
  params?: any;
}

interface PoBreadcrumbItem {
  label: string;
  link?:  string;            // se ausente, item é não-clicável (último item da trilha)
  action?: () => void;
}
```

```typescript
// Exemplo típico em tela de edição
readonly breadcrumb: PoBreadcrumb = {
  items: [
    { label: 'Financeiro',    link: '/financeiro' },
    { label: 'Clientes',      link: '/financeiro/clientes' },
    { label: 'Editar Cliente' },       // último item — sem link
  ],
};
```
```

- [ ] **Verificar:**

```powershell
Test-Path "skills\poui-components\navigation-components.md"
```

- [ ] **Commit:**

```bash
git add skills/poui-components/navigation-components.md
git commit -m "docs(plugin): add navigation-components reference — po-menu, po-toolbar, PoBreadcrumb"
```

---

## Task 2: Criar `utility-components.md`

**Files:**
- Create: `skills/poui-components/utility-components.md`

- [ ] **Criar o arquivo:**

```markdown
# PO-UI Utility Components

## po-loading-overlay

Sobreposição de carregamento com texto — bloqueia a UI durante operações assíncronas.
Usado diretamente no template com `@if (loading())`.

### Key Inputs

| Input | Type | Description |
|-------|------|-------------|
| `p-text` | `string` | Texto exibido abaixo do spinner |
| `p-screen-lock` | `boolean` | Bloqueia a tela inteira (não apenas o componente pai) |

### Exemplo

```typescript
import { PoLoadingModule } from '@po-ui/ng-components';
// em imports: [PoLoadingModule]

readonly loading = signal(false);
```

```html
<!-- Bloqueia o conteúdo do componente pai -->
@if (loading()) {
  <po-loading-overlay p-text="Carregando..."></po-loading-overlay>
}

<!-- Bloqueia a tela inteira (ex: durante um save) -->
@if (saving()) {
  <po-loading-overlay p-text="Salvando registro..." [p-screen-lock]="true"></po-loading-overlay>
}
```

> **Uso correto:** Coloque `po-loading-overlay` dentro do componente cujo conteúdo deve ser bloqueado.
> A posição CSS do pai deve ser `relative` (PO-UI já cuida disso em `po-page-*`).

---

## po-widget

Card de KPI para dashboards — exibe título, conteúdo livre, e ações primária/secundária opcionais.
Usado no template `dashboard` do plugin.

### Key Inputs

| Input | Type | Description |
|-------|------|-------------|
| `p-title` | `string` | Título do card |
| `p-help` | `string` | Ícone de ajuda com tooltip |
| `p-type` | `'normal' \| 'danger' \| 'info' \| 'success' \| 'warning'` | Variante de cor (default `'normal'`) |
| `p-primary-label` | `string` | Rótulo do botão primário |
| `p-secondary-label` | `string` | Rótulo do botão secundário |
| `p-disabled` | `boolean` | Desabilita ações |

### Key Outputs

| Output | Payload | Description |
|--------|---------|-------------|
| `(p-primary-action)` | `void` | Clique no botão primário |
| `(p-secondary-action)` | `void` | Clique no botão secundário |

### Exemplos

```typescript
import { PoWidgetModule } from '@po-ui/ng-components';
// em imports: [PoWidgetModule]
```

```html
<!-- KPI simples com valor grande e descrição -->
<div class="po-row">
  <po-widget class="po-md-4 po-lg-3" p-title="Pedidos Pendentes" p-type="warning">
    <div class="po-font-display po-text-center">{{ pedidosPendentes() }}</div>
    <div class="po-text-center po-font-text-small">últimas 24h</div>
  </po-widget>

  <po-widget class="po-md-4 po-lg-3" p-title="Faturamento do Mês" p-type="success">
    <div class="po-font-title po-text-center">
      {{ faturamentoMes() | currency:'BRL' }}
    </div>
  </po-widget>

  <po-widget
    class="po-md-4 po-lg-3"
    p-title="Tarefas Vencidas"
    p-type="danger"
    p-primary-label="Ver todas"
    (p-primary-action)="router.navigate(['/tarefas'])">
    <div class="po-font-display po-text-center">{{ tarefasVencidas() }}</div>
  </po-widget>
</div>
```

---

## po-avatar

Exibe uma imagem circular de perfil com fallback para iniciais.

### Key Inputs

| Input | Type | Description |
|-------|------|-------------|
| `p-src` | `string` | URL da imagem |
| `p-size` | `'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl' \| 'xxl'` | Tamanho do avatar (default `'md'`) |
| `p-loading` | `'eager' \| 'lazy'` | Estratégia de carregamento da imagem |

### Key Outputs

| Output | Payload | Description |
|--------|---------|-------------|
| `(p-click)` | `void` | Clique no avatar |

### Exemplo

```typescript
import { PoAvatarModule } from '@po-ui/ng-components';
// em imports: [PoAvatarModule]
```

```html
<!-- Avatar no perfil de usuário -->
<po-avatar
  [p-src]="user().fotoUrl"
  p-size="lg"
  (p-click)="openProfile()">
</po-avatar>

<!-- Avatar em lista de registros -->
@for (contato of contatos(); track contato.id) {
  <div class="po-row po-align-items-center">
    <po-avatar [p-src]="contato.foto" p-size="sm"></po-avatar>
    <span class="po-ml-1">{{ contato.nome }}</span>
  </div>
}
```

---

## po-badge

Exibe um contador ou indicador de status sobre qualquer elemento.

### Key Inputs

| Input | Type | Description |
|-------|------|-------------|
| `p-value` | `number` | Número exibido (exibe "9+" acima de 9) |
| `p-status` | `'positive' \| 'negative' \| 'warning' \| 'info' \| 'disabled'` | Variante semântica |
| `p-color` | `string` | Token de cor customizado |
| `p-size` | `'small' \| 'medium' \| 'large'` | Tamanho (default `'medium'`) |

### Exemplo

```typescript
import { PoBadgeModule } from '@po-ui/ng-components';
// em imports: [PoBadgeModule]
```

```html
<!-- Badge sobre um ícone de notificação -->
<div class="po-relative po-d-inline-block">
  <span class="po-icon po-icon-notification po-font-subtitle"></span>
  <po-badge [p-value]="notificacoesCount()" p-status="negative"></po-badge>
</div>

<!-- Badge de status em card -->
<po-badge [p-value]="errosCount()" p-status="negative" p-size="small"></po-badge>
<po-badge [p-value]="alertasCount()" p-status="warning" p-size="small"></po-badge>
<po-badge [p-value]="okCount()" p-status="positive" p-size="small"></po-badge>
```

> **po-badge vs po-tag:** Use `po-badge` para contadores numéricos e indicadores de estado
> sobre elementos. Use `po-tag` para rótulos textuais de status em listas e tabelas.
```

- [ ] **Verificar:**

```powershell
Test-Path "skills\poui-components\utility-components.md"
```

- [ ] **Commit:**

```bash
git add skills/poui-components/utility-components.md
git commit -m "docs(plugin): add utility-components reference — po-loading-overlay, po-widget, po-avatar, po-badge"
```

---

## Task 3: Criar `reactive-forms.md`

**Files:**
- Create: `skills/poui-patterns/reactive-forms.md`

- [ ] **Criar o arquivo:**

```markdown
# Reactive Forms com PO-UI

Padrões para usar Angular Reactive Forms com campos PO-UI em telas `po-page-edit`.

> **Quando usar Reactive Forms vs PoDynamicForm:**
> - **Reactive Forms** → validação cruzada entre campos, lógica de disable dinâmica, FormArray,
>   controle preciso sobre o modelo de dados.
> - **PoDynamicForm** → campos simples sem dependências, prototipagem rápida, menos código.

---

## Setup básico — FormGroup + FormBuilder

```typescript
import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs/operators';
import {
  PoInputModule,
  PoSelectModule,
  PoDecimalModule,
  PoDatepickerModule,
  PoSwitchModule,
  PoNotificationService,
  PoPageEditModule,
  PoPageEditActions,
} from '@po-ui/ng-components';
import { ClientesService } from '../clientes.service';
import { Cliente } from '../models/cliente.model';

@Component({
  standalone: true,
  imports: [
    ReactiveFormsModule,
    PoPageEditModule,
    PoInputModule,
    PoSelectModule,
    PoDecimalModule,
    PoDatepickerModule,
    PoSwitchModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './clientes-edit.component.html',
})
export class ClientesEditComponent implements OnInit {
  private readonly fb           = inject(FormBuilder);
  private readonly service      = inject(ClientesService);
  private readonly router       = inject(Router);
  private readonly route        = inject(ActivatedRoute);
  private readonly notification = inject(PoNotificationService);
  private readonly destroyRef   = inject(DestroyRef);

  readonly loading = signal(false);
  readonly isEdit  = signal(false);
  private recordId = '';

  // Definição do FormGroup
  readonly form: FormGroup = this.fb.group({
    codigo:      [''  , [Validators.required, Validators.maxLength(6)]],
    loja:        ['01', [Validators.required, Validators.maxLength(2)]],
    nome:        [''  , [Validators.required, Validators.minLength(3), Validators.maxLength(40)]],
    cnpj:        [''  , Validators.required],
    email:       [''  , Validators.email],
    limiteCredito: [0 , [Validators.required, Validators.min(0)]],
    situacao:    ['S' , Validators.required],
    observacoes: [''  ],
  });

  readonly editActions: PoPageEditActions = {
    save:   { label: 'Salvar',   action: () => this.save() },
    cancel: { label: 'Cancelar', action: () => this.cancel() },
  };

  ngOnInit(): void {
    this.recordId = this.route.snapshot.paramMap.get('id') ?? '';
    if (this.recordId) {
      this.isEdit.set(true);
      this.loadRecord();
    }
  }

  private loadRecord(): void {
    this.loading.set(true);
    this.service.getById(this.recordId)
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next:  (data) => this.form.patchValue(data),
        error: ()     => this.notification.error('Erro ao carregar registro.'),
      });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notification.warning('Corrija os campos inválidos antes de salvar.');
      return;
    }
    this.loading.set(true);
    const payload: Cliente = this.form.getRawValue();
    const request$ = this.isEdit()
      ? this.service.update(this.recordId, payload)
      : this.service.create(payload);

    request$
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => {
          this.notification.success(`Registro ${this.isEdit() ? 'alterado' : 'incluído'} com sucesso.`);
          this.cancel();
        },
        error: (err) => this.notification.error(this.parseProtheusError(err)),
      });
  }

  cancel(): void {
    this.router.navigate(['../'], { relativeTo: this.route });
  }

  private parseProtheusError(err: any): string {
    try {
      const obj    = JSON.parse(err.error?.errorMessage ?? '{}');
      const msg    = decodeURIComponent(escape(obj.message ?? ''));
      const detail = obj.detailedMessage
        ? ` — ${decodeURIComponent(escape(obj.detailedMessage))}`
        : '';
      return `Erro ${obj.code}: ${msg}${detail}`;
    } catch {
      return err.error?.message ?? 'Erro ao processar a requisição.';
    }
  }
}
```

```html
<po-page-edit
  p-title="Cliente"
  [p-actions]="editActions"
  [p-disable-submit]="form.invalid || loading()">

  @if (loading()) {
    <po-loading-overlay p-text="Carregando..."></po-loading-overlay>
  }

  <form [formGroup]="form">
    <div class="po-row">
      <po-input    class="po-md-4" p-label="Código"         formControlName="codigo"   [p-required]="true" [p-maxlength]="6"></po-input>
      <po-input    class="po-md-2" p-label="Loja"           formControlName="loja"     [p-required]="true" [p-maxlength]="2"></po-input>
      <po-input    class="po-md-6" p-label="Nome"           formControlName="nome"     [p-required]="true" [p-maxlength]="40"></po-input>
      <po-input    class="po-md-4" p-label="CNPJ"           formControlName="cnpj"     p-type="cnpj" [p-required]="true"></po-input>
      <po-input    class="po-md-4" p-label="E-mail"         formControlName="email"></po-input>
      <po-decimal  class="po-md-4" p-label="Limite Crédito" formControlName="limiteCredito" [p-decimals-length]="2" [p-min]="0"></po-decimal>
      <po-select   class="po-md-3" p-label="Situação"       formControlName="situacao" [p-options]="situacaoOptions"></po-select>
      <po-textarea class="po-md-9" p-label="Observações"    formControlName="observacoes" [p-rows]="3"></po-textarea>
    </div>
  </form>

</po-page-edit>
```

---

## Validação cruzada (cross-field validator)

```typescript
import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

// Validator: confirmar senha
export function passwordMatchValidator(): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const senha   = group.get('senha')?.value;
    const confirma = group.get('confirmarSenha')?.value;
    return senha && confirma && senha !== confirma
      ? { passwordMismatch: true }
      : null;
  };
}

// Uso no FormGroup
readonly form = this.fb.group(
  {
    senha:          ['', [Validators.required, Validators.minLength(8)]],
    confirmarSenha: ['', Validators.required],
  },
  { validators: passwordMatchValidator() },
);

// No template: exibir erro cross-field
// <span *ngIf="form.hasError('passwordMismatch')">As senhas não coincidem.</span>
```

---

## Disable dinâmico por valor de outro campo

```typescript
ngOnInit(): void {
  // Habilita 'inscricaoEstadual' somente quando tipoContribuinte === 'CL'
  this.form.get('tipoContribuinte')!.valueChanges
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe((tipo: string) => {
      const ctrl = this.form.get('inscricaoEstadual')!;
      if (tipo === 'CL') {
        ctrl.enable();
      } else {
        ctrl.disable();
        ctrl.reset('');
      }
    });
}
```

```html
<!-- p-disabled recebe o estado do controle via form.get().disabled -->
<po-input
  class="po-md-4"
  p-label="Inscrição Estadual"
  formControlName="inscricaoEstadual"
  [p-disabled]="form.get('inscricaoEstadual')!.disabled">
</po-input>
```

---

## FormArray — linhas dinâmicas (ex: itens de pedido)

```typescript
import { FormArray, FormControl } from '@angular/forms';

// Getter tipado para o FormArray
get itens(): FormArray {
  return this.form.get('itens') as FormArray;
}

// FormGroup do pedido com array de itens
readonly form = this.fb.group({
  numeroPedido: ['', Validators.required],
  dataEmissao:  ['', Validators.required],
  itens: this.fb.array([]),    // começa vazio
});

// Adicionar item ao array
addItem(): void {
  const itemGroup = this.fb.group({
    produto:    ['', Validators.required],
    quantidade: [1,  [Validators.required, Validators.min(1)]],
    valorUnit:  [0,  [Validators.required, Validators.min(0)]],
    total:      [{ value: 0, disabled: true }],  // calculado, não editável
  });

  // Recalcula total ao mudar quantidade ou valor
  itemGroup.get('quantidade')!.valueChanges
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe(() => this.recalcItem(itemGroup));

  itemGroup.get('valorUnit')!.valueChanges
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe(() => this.recalcItem(itemGroup));

  this.itens.push(itemGroup);
}

removeItem(index: number): void {
  this.itens.removeAt(index);
}

private recalcItem(group: FormGroup): void {
  const qty   = group.get('quantidade')!.value ?? 0;
  const price = group.get('valorUnit')!.value  ?? 0;
  group.get('total')!.setValue(qty * price, { emitEvent: false });
}
```

```html
<!-- Template: FormArray com po-table manual ou divs repetidos -->
<po-container p-title="Itens do Pedido">
  <div formArrayName="itens">
    @for (item of itens.controls; track $index; let i = $index) {
      <div class="po-row" [formGroupName]="i">
        <po-combo   class="po-md-4" p-label="Produto"    formControlName="produto"
                    [p-options]="produtoOptions" [p-required]="true"></po-combo>
        <po-number  class="po-md-2" p-label="Qtde"       formControlName="quantidade" [p-min]="1"></po-number>
        <po-decimal class="po-md-2" p-label="Vlr Unit."  formControlName="valorUnit"  [p-decimals-length]="2"></po-decimal>
        <po-decimal class="po-md-2" p-label="Total"      formControlName="total"      [p-decimals-length]="2" [p-disabled]="true"></po-decimal>
        <div class="po-md-2 po-flex po-align-items-end">
          <po-button p-label="Remover" p-kind="danger" p-icon="po-icon-delete"
                     (p-click)="removeItem(i)"></po-button>
        </div>
      </div>
    }
  </div>
  <po-button p-label="Adicionar Item" p-icon="po-icon-plus" (p-click)="addItem()"></po-button>
</po-container>
```

---

## patchValue vs setValue vs getRawValue

| Método | Comportamento |
|--------|--------------|
| `form.patchValue(obj)` | Atualiza apenas os campos presentes em `obj`; campos ausentes mantêm valor atual |
| `form.setValue(obj)` | Exige que `obj` contenha **todos** os campos do form; erro se faltar algum |
| `form.getRawValue()` | Retorna **todos** os campos incluindo os `disabled`; use em vez de `form.value` no submit |
| `form.value` | Retorna apenas campos **enabled**; campos `disabled` são omitidos — não usar no submit |
| `form.markAllAsTouched()` | Ativa exibição de erros em todos os campos — chamar antes de exibir warning de formulário inválido |
```

- [ ] **Verificar:**

```powershell
Test-Path "skills\poui-patterns\reactive-forms.md"
```

- [ ] **Commit:**

```bash
git add skills/poui-patterns/reactive-forms.md
git commit -m "docs(plugin): add reactive-forms pattern — FormGroup, cross-field validation, FormArray with PO-UI"
```

---

## Task 4: Criar `templates-master-detail.md`

**Files:**
- Create: `skills/poui-code-generation/templates-master-detail.md`

- [ ] **Criar o arquivo:**

```markdown
# Template: master-detail

Generates a `po-table` with expandable detail rows — the standard pattern for ERP entities
with embedded child records (order items, invoice lines, stock movements).

> **When to use:**
> Use `master-detail` when the parent record has a child list displayed inline (expanded rows).
> For a separate child entity with its own CRUD route, use `page-list` + `page-edit` instead.

## {{kebab-name}}.component.ts

```typescript
import {
  Component,
  ChangeDetectionStrategy,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs/operators';
import {
  PoDialogService,
  PoLoadingModule,
  PoNotificationService,
  PoPageListModule,
  PoPageAction,
  PoPageFilter,
  PoTableModule,
  PoTableAction,
  PoTableColumn,
  PoTableDetail,
} from '@po-ui/ng-components';
import { {{ServiceClass}} } from '../{{serviceFile}}';
import { {{ModelInterface}}, {{DetailInterface}} } from '../models/{{modelFile}}.model';

@Component({
  selector: '{{selector}}',
  standalone: true,
  imports: [PoPageListModule, PoTableModule, PoLoadingModule],
  templateUrl: './{{kebab-name}}.component.html',
  styleUrl: './{{kebab-name}}.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class {{ComponentClass}} implements OnInit {
  private readonly service      = inject({{ServiceClass}});
  private readonly router       = inject(Router);
  private readonly route        = inject(ActivatedRoute);
  private readonly notification = inject(PoNotificationService);
  private readonly dialog       = inject(PoDialogService);
  private readonly destroyRef   = inject(DestroyRef);

  readonly items   = signal<{{ModelInterface}}[]>([]);
  readonly loading = signal(false);
  readonly hasNext = signal(false);

  private currentPage = 1;
  private readonly pageSize = 10;
  private lastSearch = '';

  // ── Colunas do master (cabeçalho do pedido / NF) ──
  // TODO: ajuste para os campos de {{ModelInterface}}
  readonly columns: PoTableColumn[] = [
    { property: 'numero',     label: 'Número',   width: '10%', sortable: true },
    { property: 'dataEmissao', label: 'Emissão', type: 'date', format: 'dd/MM/yyyy', width: '12%' },
    { property: 'fornecedor', label: 'Fornecedor' },
    { property: 'valorTotal', label: 'Total',    type: 'currency', width: '12%' },
    {
      property: 'status',
      label:    'Status',
      type:     'label',
      width:    '10%',
      labels: [
        { value: 'A', label: 'Aberto',     color: 'color-08' },
        { value: 'F', label: 'Faturado',   color: 'color-11' },
        { value: 'C', label: 'Cancelado',  color: 'color-07' },
      ],
    },
    // Coluna especial que expande o detail — OBRIGATÓRIA para master-detail
    {
      property: 'itens',
      label:    'Itens',
      type:     'detail',
      detail:   this.buildDetailConfig(),
    },
  ];

  readonly tableActions: PoTableAction[] = [
    {
      label:  'Editar',
      icon:   'po-icon-edit',
      action: (row: {{ModelInterface}}) =>
        this.router.navigate([row['numero']], { relativeTo: this.route }),
    },
    {
      label:     'Cancelar',
      icon:      'po-icon-close',
      type:      'danger',
      separator: true,
      disabled:  (row: {{ModelInterface}}) => row['status'] !== 'A',
      action:    (row: {{ModelInterface}}) => this.confirmCancel(row),
    },
  ];

  readonly pageActions: PoPageAction[] = [
    {
      label:  'Incluir',
      icon:   'po-icon-plus',
      action: () => this.router.navigate(['novo'], { relativeTo: this.route }),
    },
  ];

  readonly filterSettings: PoPageFilter = {
    placeholder: 'Buscar por número ou fornecedor...',
    action:      (q: string) => this.onSearch(q),
  };

  ngOnInit(): void {
    this.load();
  }

  onSearch(q: string): void {
    this.currentPage = 1;
    this.lastSearch  = q;
    this.load(q);
  }

  onShowMore(): void {
    this.currentPage++;
    this.loading.set(true);
    this.service
      .getAll({ page: this.currentPage, pageSize: this.pageSize, q: this.lastSearch })
      .pipe(finalize(() => this.loading.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.items.update(prev => [...prev, ...res.items]);
          this.hasNext.set(res.hasNext);
        },
        error: () => this.notification.error('Erro ao carregar mais registros.'),
      });
  }

  private load(q = ''): void {
    this.loading.set(true);
    this.service
      .getAll({ page: this.currentPage, pageSize: this.pageSize, q })
      .pipe(finalize(() => this.loading.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.items.set(res.items);
          this.hasNext.set(res.hasNext);
        },
        error: () => this.notification.error('Erro ao carregar registros.'),
      });
  }

  private confirmCancel(row: {{ModelInterface}}): void {
    this.dialog.confirm({
      title:   'Cancelar registro',
      message: `Confirma o cancelamento do registro ${row['numero']}?`,
      confirm: () => this.cancelRecord(row),
    });
  }

  private cancelRecord(row: {{ModelInterface}}): void {
    // TODO: implementar chamada de cancelamento no service
    this.notification.warning('Cancelamento não implementado.');
  }

  // ── Configuração das colunas de detalhe ──
  // TODO: ajuste para os campos de {{DetailInterface}}
  private buildDetailConfig(): PoTableDetail {
    return {
      columns: [
        { property: 'sequencia',  label: 'Seq',      width: '8%' },
        { property: 'produto',    label: 'Produto',   width: '15%' },
        { property: 'descricao',  label: 'Descrição' },
        { property: 'quantidade', label: 'Qtde',      type: 'number',   width: '10%' },
        { property: 'valorUnit',  label: 'Vlr Unit.', type: 'currency', width: '12%' },
        { property: 'valorTotal', label: 'Total',     type: 'currency', width: '12%' },
      ],
      typeHeader: 'inline',   // 'inline' | 'top' | 'none'
    };
  }
}
```

## {{kebab-name}}.component.html

```html
<po-page-list
  p-title="{{ModelInterface}}"
  [p-actions]="pageActions"
  [p-filter]="filterSettings">

  @if (loading()) {
    <po-loading-overlay p-text="Carregando..."></po-loading-overlay>
  }

  <po-table
    [p-columns]="columns"
    [p-items]="items()"
    [p-loading]="loading()"
    [p-actions]="tableActions"
    [p-show-more-disabled]="!hasNext()"
    (p-show-more)="onShowMore()">
  </po-table>

</po-page-list>
```

## {{kebab-name}}.component.scss

```scss
// Add component-specific styles here
```

## models/{{modelFile}}.model.ts

```typescript
export interface {{DetailInterface}} {
  sequencia:   number;
  produto:     string;
  descricao:   string;
  quantidade:  number;
  valorUnit:   number;
  valorTotal:  number;
}

export interface {{ModelInterface}} {
  numero:      string;
  dataEmissao: string;      // ISO 8601
  fornecedor:  string;
  valorTotal:  number;
  status:      'A' | 'F' | 'C';
  itens:       {{DetailInterface}}[];   // array embutido — retornado pelo GET lista
}
```

## PoTableDetail — campos disponíveis

```typescript
interface PoTableDetail {
  columns:     PoTableColumn[];   // colunas do detalhe — mesmos tipos do master
  typeHeader?: 'inline' | 'top' | 'none';
  //   'inline' → cabeçalho dentro das células do master (padrão)
  //   'top'    → cabeçalho fixo acima de todos os detalhe
  //   'none'   → sem cabeçalho
}
```

## API contract

O endpoint de listagem deve retornar o array de itens **embutido** no objeto master:

```json
{
  "items": [
    {
      "numero": "000001",
      "dataEmissao": "2026-06-03",
      "fornecedor": "Fornecedor ABC",
      "valorTotal": 1500.00,
      "status": "A",
      "itens": [
        { "sequencia": 1, "produto": "PROD001", "descricao": "Produto A", "quantidade": 10, "valorUnit": 100.00, "valorTotal": 1000.00 },
        { "sequencia": 2, "produto": "PROD002", "descricao": "Produto B", "quantidade": 5,  "valorUnit": 100.00, "valorTotal":  500.00 }
      ]
    }
  ],
  "hasNext": false
}
```

O `po-table` lê automaticamente a propriedade `itens` da coluna `type: 'detail'` e exibe as linhas expandidas.
```

- [ ] **Verificar:**

```powershell
Test-Path "skills\poui-code-generation\templates-master-detail.md"
```

- [ ] **Commit:**

```bash
git add skills/poui-code-generation/templates-master-detail.md
git commit -m "feat(plugin): add master-detail template — po-table detail expansion for ERP child records"
```

---

## Task 5: Editar os 3 SKILL.md indexes

**Files:**
- Modify: `skills/poui-components/SKILL.md`
- Modify: `skills/poui-patterns/SKILL.md`
- Modify: `skills/poui-code-generation/SKILL.md`

- [ ] **Em `poui-components/SKILL.md`, adicionar após a linha de `dynamic-form-fields.md`:**

Substituir:
```markdown
- **Dynamic Form & View Fields** (PoDynamicFormField completo, PoDynamicViewField, mapeamento tipo→componente): see `dynamic-form-fields.md`
```

Por:
```markdown
- **Dynamic Form & View Fields** (PoDynamicFormField completo, PoDynamicViewField, mapeamento tipo→componente): see `dynamic-form-fields.md`
- **Navigation** (po-menu com PoMenuItem, po-toolbar com PoToolbarProfile, PoBreadcrumb): see `navigation-components.md`
- **Utilities** (po-loading-overlay, po-widget, po-avatar, po-badge): see `utility-components.md`
```

- [ ] **Em `poui-patterns/SKILL.md`, adicionar referência ao reactive-forms:**

Substituir:
```markdown
## Contents

- **Angular 17+ module structure** (standalone, lazy routing, app.config): see `module-structure.md`
- **Protheus REST integration** (response contract, pagination, error handling): see `protheus-rest.md`
```

Por:
```markdown
## Contents

- **Angular 17+ module structure** (standalone, lazy routing, app.config): see `module-structure.md`
- **Protheus REST integration** (response contract, pagination, error handling): see `protheus-rest.md`
- **Reactive Forms with PO-UI** (FormGroup, FormBuilder, cross-field validation, FormArray): see `reactive-forms.md`
```

- [ ] **Em `poui-code-generation/SKILL.md`, adicionar `master-detail` na tabela de List pages:**

Substituir:
```markdown
| **page-dynamic** | `templates-page-dynamic.md` | Zero-boilerplate list using PoPageDynamicTableComponent (API must follow plugin contract) |
```

Por:
```markdown
| **page-dynamic** | `templates-page-dynamic.md` | Zero-boilerplate list using PoPageDynamicTableComponent (API must follow plugin contract) |
| **master-detail** | `templates-master-detail.md` | List with expandable child rows (order items, invoice lines) via po-table detail |
```

- [ ] **Commit:**

```bash
git add skills/poui-components/SKILL.md skills/poui-patterns/SKILL.md skills/poui-code-generation/SKILL.md
git commit -m "docs(plugin): update SKILL.md indexes — navigation, utilities, reactive-forms, master-detail (Wave 3)"
```

---

## Task 6: Verificação final

- [ ] **Listar arquivos criados na Wave 3:**

```powershell
Get-ChildItem -Recurse "skills" -Filter "*.md" | Where-Object {
  $_.Name -match "navigation|utility|reactive|master-detail"
} | Select-Object Name
```

Esperado:
```
navigation-components.md
utility-components.md
reactive-forms.md
templates-master-detail.md
```

- [ ] **Confirmar referências nos SKILL.md:**

```powershell
Select-String -Path "skills\poui-components\SKILL.md"   -Pattern "navigation" -Quiet
Select-String -Path "skills\poui-patterns\SKILL.md"     -Pattern "reactive"   -Quiet
Select-String -Path "skills\poui-code-generation\SKILL.md" -Pattern "master-detail" -Quiet
```

Esperado: 3x `True`

- [ ] **Log dos commits Wave 3:**

```bash
git log --oneline -6
```

Esperado: 5 commits `docs/feat(plugin): ...`

- [ ] **Status limpo:**

```bash
git status --short | grep -v Teste_poui
```

Esperado: vazio.
