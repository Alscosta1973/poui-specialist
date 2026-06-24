# PO-UI Page Components

## po-page-list

Layout padrão para telas de consulta. Contém área de título, actions, filtro rápido e slot para conteúdo (normalmente `po-table`).

### Key Inputs

| Input | Type | Description |
|-------|------|-------------|
| `p-title` | `string` | Título da página |
| `p-actions` | `PoPageAction[]` | Botões de ação no cabeçalho |
| `p-filter` | `PoPageFilter` | Configuração do filtro rápido |
| `p-breadcrumb` | `PoBreadcrumb` | Trilha de navegação |

### PoPageAction

```typescript
interface PoPageAction {
  label: string;
  action?: () => void;
  disabled?: boolean | (() => boolean);
  icon?: string;
  type?: 'danger' | 'default';
  url?: string;
  visible?: boolean | (() => boolean);
}
```

### PoPageFilter

```typescript
interface PoPageFilter {
  action?: Function;
  advancedAction?: Function;
  placeholder?: string;
  width?: number;
}
```

### Usage Example

```typescript
readonly pageActions: PoPageAction[] = [
  { label: 'Novo', action: () => this.router.navigate(['novo']), icon: 'po-icon-plus' },
];

readonly filterSettings: PoPageFilter = {
  placeholder: 'Buscar por nome...',
  action: (q) => this.onSearch(q),
};
```

```html
<po-page-list
  p-title="Pedidos"
  [p-actions]="pageActions"
  [p-filter]="filterSettings">
  <po-table ...></po-table>
</po-page-list>
```

---

## po-page-edit

Layout padrão para telas de cadastro e edição. Contém título, botões Salvar/Cancelar e slot para formulário.

> **Import correto:** `PoPageModule` — não existe `PoPageEditModule` nem `PoPageEditActions` na biblioteca.

### Key Inputs

| Input | Type | Description |
|-------|------|-------------|
| `p-title` | `string` | Título da página |
| `p-breadcrumb` | `PoBreadcrumb` | Trilha de navegação |
| `p-disable-submit` | `boolean` | Desabilita os botões Salvar e Salvar e Novo |
| `p-literals` | `PoPageEditLiterals` | Customiza rótulos dos botões |
| `p-subtitle` | `string` | Subtítulo do header |

### Key Outputs (eventos — não `p-actions`)

| Output | Description |
|--------|-------------|
| `(p-save)` | Disparado ao clicar em "Salvar" — exibe o botão somente quando este evento está vinculado |
| `(p-cancel)` | Disparado ao clicar em "Cancelar" — exibe o botão somente quando este evento está vinculado |
| `(p-save-new)` | Disparado ao clicar em "Salvar e Novo" — exibe o botão somente quando este evento está vinculado |

> Os botões só são exibidos quando o respectivo output está vinculado no template.

### Usage Example

```typescript
// Não há PoPageEditActions — use eventos diretamente
import { PoPageModule } from '@po-ui/ng-components';

// Em @Component imports: [PoPageModule]

save(): void { /* ... */ }
goBack(): void { this.router.navigate(['..'], { relativeTo: this.route }); }
```

```html
<po-page-edit
  p-title="Novo Pedido"
  [p-disable-submit]="loading()"
  (p-save)="save()"
  (p-cancel)="goBack()">
  <form [formGroup]="form">
    <!-- campos aqui -->
  </form>
</po-page-edit>
```

---

## po-page-detail

Layout para telas de visualização (somente leitura).

> **Import correto:** `PoPageModule` — não existe `PoPageDetailModule` nem `PoPageDetailActions` na biblioteca.

### Key Inputs

| Input | Type | Description |
|-------|------|-------------|
| `p-title` | `string` | Título da página |
| `p-breadcrumb` | `PoBreadcrumb` | Trilha de navegação |
| `p-literals` | `PoPageDetailLiterals` | Customiza rótulos dos botões |
| `p-subtitle` | `string` | Subtítulo do header |

### Key Outputs (eventos — não `p-actions`)

| Output | Description |
|--------|-------------|
| `(p-edit)` | Disparado ao clicar em "Editar" — exibe o botão somente quando vinculado |
| `(p-remove)` | Disparado ao clicar em "Remover" — exibe o botão somente quando vinculado |
| `(p-back)` | Disparado ao clicar em "Voltar" — exibe o botão somente quando vinculado |

### Usage Example

```typescript
import { PoPageModule } from '@po-ui/ng-components';
// em @Component imports: [PoPageModule]
```

```html
<po-page-detail
  p-title="Pedido: João Silva"
  [p-breadcrumb]="breadcrumb"
  (p-edit)="navigateToEdit()"
  (p-remove)="confirmDelete()"
  (p-back)="goBack()">
  <!-- po-dynamic-view ou po-info -->
</po-page-detail>
```

---

## po-page-default

Página sem ações de cabeçalho predefinidas — base para telas custom onde você controla
todos os botões e ações (ex: telas de parâmetros, dashboards, telas de configuração).

### Key Inputs

| Input | Type | Description |
|-------|------|-------------|
| `p-title` | `string` | Título da página |
| `p-breadcrumb` | `PoBreadcrumb` | Trilha de navegação (opcional) |

### Quando usar

| Componente | Use quando... |
|---|---|
| `po-page-list` | Tela de consulta com filtro rápido e botões de "Incluir" padrão |
| `po-page-edit` | Formulário de edição com botões "Salvar" / "Cancelar" padrão |
| `po-page-detail` | Visualização de detalhe com botões "Editar" / "Excluir" / "Voltar" |
| `po-page-default` | Qualquer outra tela — layout, parâmetros, dashboards, telas custom |

### Exemplo

```typescript
import { PoPageModule } from '@po-ui/ng-components';
// em imports do @Component: [PoPageModule]
// po-page-default usa PoPageModule — não existe PoPageDefaultModule separado
```

```html
<po-page-default p-title="Parâmetros do Sistema">

  <!-- Conteúdo totalmente livre — você controla botões e ações -->
  <div class="po-row">
    <po-button p-label="Salvar" p-kind="primary" (p-click)="save()"></po-button>
    <po-button p-label="Cancelar" p-kind="secondary" (p-click)="cancel()"></po-button>
  </div>

  <po-table [p-columns]="columns" [p-items]="items()" [p-height]="400"></po-table>

</po-page-default>
```

> **Quirk:** `po-page-default` usa `PoPageContentComponent` internamente — conteúdo inicia
> com `opacity: 0` e só torna-se visível após um `setTimeout`. Em componentes `OnPush` com
> dados síncronos, adicione `ngAfterViewInit() { setTimeout(() => this.cdr.markForCheck()); }`
> para garantir que o conteúdo apareça (ver Quirk #1 em `po-ui-quirks.md`).

---

## po-page-login

Template de página de login — pertence a `@po-ui/ng-templates`.

| Input | Type | Descrição |
|-------|------|-----------|
| `p-logo` | `string` | URL do logo exibido no card |
| `p-background` | `string` | URL da imagem de fundo |
| `p-hide-remember-user` | `boolean` | Oculta checkbox "Lembrar usuário" |
| `p-login-errors` | `string[]` | Mensagens de erro no campo login |
| `p-password-errors` | `string[]` | Mensagens de erro no campo senha |
| `p-literals` | `PoPageLoginLiterals` | Customiza labels (título, placeholder, botão) |
| `p-recovery` | `string \| Function` | URL ou callback para "esqueci minha senha" |
| `p-custom-field` | `PoPageLoginCustomField` | Campo extra (ex: filial/empresa) |
| `p-loading` | `boolean` | Exibe spinner no botão Entrar |

| Output | Payload | Descrição |
|--------|---------|-----------|
| `(p-login-submit)` | `{ login: string, password: string }` | Disparado ao clicar em Entrar |

```typescript
import { PoPageLoginModule } from '@po-ui/ng-templates';

@Component({
  imports: [PoPageLoginModule],
  template: `
    <po-page-login
      p-logo="/assets/logo.png"
      p-background="/assets/login-bg.jpg"
      [p-loading]="loading()"
      (p-login-submit)="onLogin($event)">
    </po-page-login>
  `,
})
export class LoginComponent {
  loading = signal(false);

  onLogin(event: { login: string; password: string }): void {
    this.loading.set(true);
    this.authService.login(event.login, event.password).subscribe({
      next: () => this.router.navigate(['/home']),
      error: () => this.loading.set(false),
    });
  }
}
```

> **Integração com Protheus:** Usar `login` como `cod_usuario` e `password` como senha do Protheus. Use `p-custom-field` para selecionar a filial/empresa antes do login.
