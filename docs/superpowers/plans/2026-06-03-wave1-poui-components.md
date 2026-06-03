# Wave 1 — PO-UI Component Gaps Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preencher os gaps de alta prioridade do plugin poui-specialist — componentes de modal/dialog, feedback visual, layout, e dois novos templates de geração (page-detail e stepper-form).

**Architecture:** Adições puras — nenhum arquivo existente é reescrito além dos índices SKILL.md. Cinco novos arquivos de referência/template + dois SKILL.md editados. Cada arquivo é autocontido com exemplos reais prontos para copiar.

**Tech Stack:** Markdown (plugin templates), Angular 17+ TypeScript, PO-UI v17+ (`@po-ui/ng-components`, `@po-ui/ng-templates`)

---

## Mapa de arquivos

| Arquivo | Ação | Responsabilidade |
|---------|------|-----------------|
| `skills/poui-components/modal-dialog.md` | Criar | `po-modal`, `PoDialogService`, `po-dynamic-view` |
| `skills/poui-components/feedback-components.md` | Criar | `po-tag`, `po-info`, `[p-tooltip]`, `po-progress` |
| `skills/poui-components/layout-components.md` | Criar | `po-container`, `po-accordion`, `po-list-view` |
| `skills/poui-code-generation/templates-page-detail.md` | Criar | Template completo tela de detalhe/visualização |
| `skills/poui-code-generation/templates-stepper-form.md` | Criar | Template formulário multi-etapas com `po-stepper` |
| `skills/poui-components/SKILL.md` | Editar | Adicionar referências aos 3 novos arquivos |
| `skills/poui-code-generation/SKILL.md` | Editar | Adicionar 2 novos templates na tabela |

---

## Task 1: Criar `modal-dialog.md`

**Files:**
- Create: `skills/poui-components/modal-dialog.md`

- [ ] **Criar o arquivo:**

```markdown
# PO-UI Modal, Dialog e Dynamic View

## po-modal

Componente de diálogo modal. Controlado via `@ViewChild` + métodos `open()` / `close()`.

### Key Inputs

| Input | Type | Description |
|-------|------|-------------|
| `p-title` | `string` | Título exibido no cabeçalho |
| `p-size` | `'sm' \| 'md' \| 'lg' \| 'xl' \| 'auto'` | Largura do modal (default `'md'`) |
| `p-primary-action` | `PoModalAction` | Botão primário (confirmar/salvar) |
| `p-secondary-action` | `PoModalAction` | Botão secundário (cancelar/fechar) |
| `p-hide-close` | `boolean` | Oculta o X de fechar |

### PoModalAction

```typescript
interface PoModalAction {
  label: string;
  action: () => void;
  danger?: boolean;
  disabled?: boolean | (() => boolean);
  loading?: boolean;
}
```

### Uso com @ViewChild

```typescript
import {
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import {
  PoModalAction,
  PoModalComponent,
  PoModalModule,
} from '@po-ui/ng-components';

@Component({
  standalone: true,
  imports: [PoModalModule, PoDynamicModule],
  ...
})
export class MeuComponent {
  @ViewChild(PoModalComponent) private modal!: PoModalComponent;

  readonly formValues = signal<Partial<MinhaEntidade>>({});

  readonly primaryAction: PoModalAction = {
    label: 'Salvar',
    action: () => this.save(),
  };

  readonly secondaryAction: PoModalAction = {
    label: 'Cancelar',
    action: () => this.modal.close(),
  };

  openNew(): void {
    this.formValues.set({});
    this.modal.open();
  }

  openEdit(row: MinhaEntidade): void {
    this.formValues.set({ ...row });
    this.modal.open();
  }

  private save(): void {
    // lógica de salvar
    this.modal.close();
  }
}
```

```html
<po-modal
  p-title="Novo Registro"
  p-size="md"
  [p-primary-action]="primaryAction"
  [p-secondary-action]="secondaryAction">

  <po-dynamic-form
    [p-fields]="fields"
    [(p-value)]="formValues">
  </po-dynamic-form>

</po-modal>
```

---

## PoDialogService

Serviço para diálogos de confirmação e alerta — sem componente no template.

### confirm

```typescript
import { PoDialogService } from '@po-ui/ng-components';

private readonly dialog = inject(PoDialogService);

confirmDelete(row: MinhaEntidade): void {
  this.dialog.confirm({
    title: 'Excluir registro',
    message: `Deseja realmente excluir "${row.nome}"? Esta ação não pode ser desfeita.`,
    confirm: () => this.delete(row),
    cancel:  () => {},               // opcional
    confirmLabel: 'Excluir',         // opcional — default 'Confirmar'
    cancelLabel:  'Manter',          // opcional — default 'Cancelar'
  });
}
```

### alert

```typescript
showAlert(msg: string): void {
  this.dialog.alert({
    title: 'Atenção',
    message: msg,
    ok: () => {},  // callback ao fechar — opcional
  });
}
```

> **Nota:** `PoDialogService` NÃO precisa de `po-dialog` no template. Ele cria o diálogo programaticamente. Injete apenas no constructor/inject().

---

## po-dynamic-view

Exibe campos de um objeto em layout de grade — ideal para telas de detalhe/visualização.

### Key Inputs

| Input | Type | Description |
|-------|------|-------------|
| `p-fields` | `PoDynamicViewField[]` | Definição dos campos exibidos |
| `p-value` | `object` | Objeto com os valores a exibir |

### PoDynamicViewField

```typescript
interface PoDynamicViewField {
  property: string;            // nome da propriedade no objeto
  label?: string;              // rótulo exibido
  type?: 'string' | 'number' | 'currency' | 'date' | 'dateTime'
       | 'boolean' | 'link' | 'subtitle';
  format?: string;             // ex: 'dd/MM/yyyy' para datas
  gridColumns?: number;        // 1-12 (responsive grid, default 6)
  concatLinesLimit?: number;   // para arrays de string
  tag?: boolean;               // exibe como po-tag
  color?: string;              // cor do valor (color token)
}
```

### Exemplo

```typescript
readonly viewFields: PoDynamicViewField[] = [
  { property: 'codigo',      label: 'Código',       gridColumns: 3 },
  { property: 'nome',        label: 'Nome',         gridColumns: 9 },
  { property: 'email',       label: 'E-mail',       gridColumns: 6 },
  { property: 'dataEmissao', label: 'Emissão',      type: 'date', format: 'dd/MM/yyyy', gridColumns: 3 },
  { property: 'valorTotal',  label: 'Valor Total',  type: 'currency', gridColumns: 3 },
  { property: 'ativo',       label: 'Ativo',        type: 'boolean', gridColumns: 3 },
];
```

```html
<po-dynamic-view
  [p-fields]="viewFields"
  [p-value]="record()">
</po-dynamic-view>
```

```typescript
import { PoDynamicModule } from '@po-ui/ng-components';

// em imports do @Component:
imports: [PoDynamicModule]
```
```

- [ ] **Verificar criação:**

```powershell
Test-Path "skills\poui-components\modal-dialog.md"
```

- [ ] **Commit:**

```bash
git add skills/poui-components/modal-dialog.md
git commit -m "docs(plugin): add modal-dialog reference — po-modal, PoDialogService, po-dynamic-view"
```

---

## Task 2: Criar `feedback-components.md`

**Files:**
- Create: `skills/poui-components/feedback-components.md`

- [ ] **Criar o arquivo:**

```markdown
# PO-UI Feedback e Status Components

## po-tag

Etiqueta visual para status, categorias e indicadores coloridos.

### Key Inputs

| Input | Type | Description |
|-------|------|-------------|
| `p-value` | `string` | Texto exibido |
| `p-kind` | `'default' \| 'success' \| 'warning' \| 'danger' \| 'disabled' \| 'neutral'` | Variante de cor semântica |
| `p-color` | `string` | Token de cor customizado (ex: `'color-08'`) |
| `p-icon` | `string` | Ícone PO (`'po-icon-ok'`, etc.) |
| `p-removable` | `boolean` | Exibe botão X para remover |
| `p-inverse` | `boolean` | Inverte cor de fundo/texto |

### Outputs

| Output | Type | Description |
|--------|------|-------------|
| `(p-remove)` | `void` | Emitido ao clicar no X de remoção |

### Exemplos

```html
<!-- Status semântico -->
<po-tag p-value="Ativo"    p-kind="success"></po-tag>
<po-tag p-value="Pendente" p-kind="warning"></po-tag>
<po-tag p-value="Inativo"  p-kind="danger"></po-tag>

<!-- Tag removível (ex: filtros ativos) -->
<po-tag
  *ngFor="let tag of activeTags"
  [p-value]="tag.label"
  [p-removable]="true"
  (p-remove)="removeTag(tag)">
</po-tag>
```

```typescript
import { PoTagModule } from '@po-ui/ng-components';
// em imports: [PoTagModule]
```

---

## po-info

Exibe um par rótulo/valor em layout compacto — padrão para telas de detalhe com `po-page-detail`.

### Key Inputs

| Input | Type | Description |
|-------|------|-------------|
| `p-label` | `string` | Rótulo do campo |
| `p-value` | `string \| number` | Valor exibido |
| `p-orientation` | `'horizontal' \| 'vertical'` | Layout (default `'horizontal'`) |
| `p-url` | `string` | Valor como link clicável |

### Exemplo

```html
<!-- Em uma tela de detalhe -->
<div class="po-row">
  <po-info class="po-md-3" p-label="Código"   [p-value]="record().codigo"></po-info>
  <po-info class="po-md-9" p-label="Nome"     [p-value]="record().nome"></po-info>
  <po-info class="po-md-6" p-label="E-mail"   [p-value]="record().email" [p-url]="'mailto:' + record().email"></po-info>
  <po-info class="po-md-3" p-label="Emissão"  [p-value]="record().dataEmissao"></po-info>
</div>
```

```typescript
import { PoInfoModule } from '@po-ui/ng-components';
// em imports: [PoInfoModule]
```

---

## [p-tooltip] — Diretiva

Exibe tooltip ao passar o mouse ou focar em qualquer elemento.

### Key Inputs

| Input | Type | Description |
|-------|------|-------------|
| `p-tooltip` | `string` | Texto do tooltip |
| `p-tooltip-position` | `'top' \| 'bottom' \| 'left' \| 'right' \| 'top-left' \| 'top-right' \| 'bottom-left' \| 'bottom-right'` | Posição (default `'top'`) |
| `p-hide-arrow` | `boolean` | Oculta seta direcional |
| `p-inner-html` | `boolean` | Permite HTML no texto do tooltip |

### Exemplos

```html
<!-- Botão com tooltip -->
<po-button
  p-label="Excluir"
  p-kind="danger"
  p-tooltip="Remove permanentemente este registro"
  p-tooltip-position="top">
</po-button>

<!-- Ícone de ajuda com tooltip -->
<span
  class="po-icon po-icon-info"
  p-tooltip="CNPJ deve estar no formato 00.000.000/0000-00"
  p-tooltip-position="right">
</span>
```

```typescript
import { PoTooltipModule } from '@po-ui/ng-components';
// em imports: [PoTooltipModule]
```

---

## po-progress

Barra de progresso linear ou circular.

### Key Inputs

| Input | Type | Description |
|-------|------|-------------|
| `p-value` | `number` | Percentual de 0 a 100 |
| `p-kind` | `'linear' \| 'circular'` | Estilo visual (default `'linear'`) |
| `p-show-percentage` | `boolean` | Exibe o percentual numericamente |
| `p-status` | `'default' \| 'success' \| 'error'` | Estado de cor |
| `p-text` | `string` | Texto abaixo da barra (só linear) |
| `p-size` | `'medium' \| 'thin'` | Espessura (só linear) |

### Exemplos

```html
<!-- Progresso de importação -->
<po-progress
  [p-value]="uploadProgress()"
  p-kind="linear"
  [p-show-percentage]="true"
  [p-status]="uploadError() ? 'error' : 'default'"
  p-text="Enviando arquivo...">
</po-progress>

<!-- Indicador circular em card KPI -->
<po-progress [p-value]="metaAtingida()" p-kind="circular" [p-show-percentage]="true"></po-progress>
```

```typescript
import { PoProgressModule } from '@po-ui/ng-components';
// em imports: [PoProgressModule]
```
```

- [ ] **Verificar criação:**

```powershell
Test-Path "skills\poui-components\feedback-components.md"
```

- [ ] **Commit:**

```bash
git add skills/poui-components/feedback-components.md
git commit -m "docs(plugin): add feedback-components reference — po-tag, po-info, p-tooltip, po-progress"
```

---

## Task 3: Criar `layout-components.md`

**Files:**
- Create: `skills/poui-components/layout-components.md`

- [ ] **Criar o arquivo:**

```markdown
# PO-UI Layout Components

## po-container

Agrupa conteúdo com borda, título e espaçamento interno — ideal para seções de formulário.

### Key Inputs

| Input | Type | Description |
|-------|------|-------------|
| `p-title` | `string` | Título exibido no topo |
| `p-no-border` | `boolean` | Remove a borda |
| `p-no-padding` | `boolean` | Remove o padding interno |
| `p-height` | `number` | Altura fixa em pixels |

### Exemplo

```html
<!-- Seção de endereço em formulário -->
<po-container p-title="Endereço">
  <div class="po-row">
    <po-input class="po-md-3" p-label="CEP"     formControlName="cep"     p-mask="99999-999"></po-input>
    <po-input class="po-md-6" p-label="Logradouro" formControlName="logradouro"></po-input>
    <po-input class="po-md-3" p-label="Número"  formControlName="numero"></po-input>
    <po-input class="po-md-4" p-label="Cidade"  formControlName="cidade"></po-input>
    <po-select class="po-md-2" p-label="UF"     formControlName="uf" [p-options]="ufOptions"></po-select>
  </div>
</po-container>

<!-- Seção sem borda (apenas espaçamento) -->
<po-container [p-no-border]="true">
  <po-dynamic-view [p-fields]="fields" [p-value]="record()"></po-dynamic-view>
</po-container>
```

```typescript
import { PoContainerModule } from '@po-ui/ng-components';
// em imports: [PoContainerModule]
```

---

## po-accordion + po-accordion-item

Agrupa conteúdo em seções retráteis — útil para formulários longos ou detalhe com múltiplas seções.

### po-accordion — Key Inputs

| Input | Type | Description |
|-------|------|-------------|
| `p-show-manager-accordion` | `boolean` | Exibe botões "Expandir todos / Recolher todos" |
| `p-allow-expand-all-items` | `boolean` | Permite múltiplas seções abertas simultaneamente |
| `p-size` | `'medium' \| 'large'` | Tamanho visual (default `'medium'`) |

### po-accordion-item — Key Inputs

| Input | Type | Description |
|-------|------|-------------|
| `p-label` | `string` | Rótulo do item / título da seção |
| `p-disabled` | `boolean` | Desabilita o item |

### Métodos em @ViewChildren

```typescript
// po-accordion
expandAllItems(): void
collapseAllItems(): void

// po-accordion-item
expand(): void
collapse(): void
```

### Exemplo

```html
<po-accordion [p-show-manager-accordion]="true" [p-allow-expand-all-items]="true">

  <po-accordion-item p-label="Dados Principais">
    <div class="po-row">
      <po-input class="po-md-6" p-label="Código" formControlName="codigo"></po-input>
      <po-input class="po-md-6" p-label="Nome"   formControlName="nome"></po-input>
    </div>
  </po-accordion-item>

  <po-accordion-item p-label="Dados de Contato">
    <div class="po-row">
      <po-input class="po-md-6" p-label="E-mail"   formControlName="email"></po-input>
      <po-input class="po-md-6" p-label="Telefone" formControlName="telefone" p-mask="(99) 99999-9999"></po-input>
    </div>
  </po-accordion-item>

  <po-accordion-item p-label="Endereço">
    <app-endereco-form formGroupName="endereco"></app-endereco-form>
  </po-accordion-item>

</po-accordion>
```

```typescript
import { PoAccordionModule } from '@po-ui/ng-components';
// em imports: [PoAccordionModule]
```

---

## po-list-view

Lista card-style com templates customizáveis — alternativa ao `po-table` para dados mais visuais.

### Key Inputs

| Input | Type | Description |
|-------|------|-------------|
| `p-items` | `any[]` | Dados da lista |
| `p-property-title` | `string` | Propriedade usada como título de cada item |
| `p-property-link` | `string` | Propriedade usada como URL de link |
| `p-loading` | `boolean` | Indicador de carregamento |
| `p-show-more-disabled` | `boolean` | Desabilita "Mostrar mais" |
| `p-selectable` | `boolean` | Habilita seleção de itens |
| `p-hide-select-all` | `boolean` | Oculta checkbox "Selecionar todos" |

### Key Outputs

| Output | Type | Description |
|--------|------|-------------|
| `(p-show-more)` | `void` | Carregar mais itens |
| `(p-selected)` | `any[]` | Itens selecionados |

### Diretivas de template

```html
<!-- Conteúdo customizado de cada item -->
<ng-template p-list-view-content-template let-item let-index="index">
  <div>{{ item.nome }}</div>
</ng-template>

<!-- Detalhe expandível de cada item -->
<ng-template p-list-view-detail-template let-item let-index="index">
  <po-info p-label="CNPJ" [p-value]="item.cnpj"></po-info>
</ng-template>
```

### Exemplo completo

```typescript
import {
  PoListViewModule,
  PoInfoModule,
} from '@po-ui/ng-components';

// em imports: [PoListViewModule, PoInfoModule]
```

```html
<po-list-view
  [p-items]="items()"
  p-property-title="nome"
  [p-loading]="loading()"
  [p-show-more-disabled]="!hasNext()"
  (p-show-more)="onShowMore()">

  <ng-template p-list-view-content-template let-item>
    <div class="po-row po-mt-1">
      <po-info class="po-md-3" p-label="Código"  [p-value]="item.codigo"></po-info>
      <po-info class="po-md-3" p-label="CNPJ"    [p-value]="item.cnpj"></po-info>
      <po-tag  class="po-md-2" [p-value]="item.ativo === 'S' ? 'Ativo' : 'Inativo'"
               [p-kind]="item.ativo === 'S' ? 'success' : 'danger'">
      </po-tag>
    </div>
  </ng-template>

  <ng-template p-list-view-detail-template let-item>
    <div class="po-row">
      <po-info class="po-md-6" p-label="E-mail"   [p-value]="item.email"></po-info>
      <po-info class="po-md-6" p-label="Telefone" [p-value]="item.telefone"></po-info>
    </div>
  </ng-template>

</po-list-view>
```
```

- [ ] **Verificar criação:**

```powershell
Test-Path "skills\poui-components\layout-components.md"
```

- [ ] **Commit:**

```bash
git add skills/poui-components/layout-components.md
git commit -m "docs(plugin): add layout-components reference — po-container, po-accordion, po-list-view"
```

---

## Task 4: Criar `templates-page-detail.md`

**Files:**
- Create: `skills/poui-code-generation/templates-page-detail.md`

- [ ] **Criar o arquivo:**

```markdown
# Template: page-detail

Generates a standalone `po-page-detail` component for read-only record visualization.
Uses `po-dynamic-view` for field display, loads by route param `:id`.

> **When to use:**
> Use `page-detail` when the entity has a dedicated detail route and needs
> a read-only view before allowing edit. For inline view inside a modal, use `po-dynamic-view` directly inside `po-modal`.

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
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs/operators';
import {
  PoBreadcrumb,
  PoDynamicModule,
  PoDynamicViewField,
  PoNotificationService,
  PoPageDetailActions,
  PoPageDetailModule,
} from '@po-ui/ng-components';
import { {{ServiceClass}} } from '../{{serviceFile}}';
import { {{ModelInterface}} } from '../models/{{modelFile}}.model';

@Component({
  selector: '{{selector}}',
  standalone: true,
  imports: [PoPageDetailModule, PoDynamicModule],
  templateUrl: './{{kebab-name}}.component.html',
  styleUrl: './{{kebab-name}}.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class {{ComponentClass}} implements OnInit {
  private readonly service      = inject({{ServiceClass}});
  private readonly router       = inject(Router);
  private readonly route        = inject(ActivatedRoute);
  private readonly notification = inject(PoNotificationService);
  private readonly destroyRef   = inject(DestroyRef);

  readonly loading = signal(false);
  readonly record  = signal<{{ModelInterface}} | null>(null);
  private recordId = '';

  readonly breadcrumb: PoBreadcrumb = {
    items: [
      { label: '{{ModuleName}}', link: '/{{moduleName}}' },
      { label: '{{ModelInterface}}', link: '../' },
      { label: 'Detalhe' },
    ],
  };

  // TODO: define view fields matching {{ModelInterface}} properties.
  // gridColumns 1-12; type: 'currency' | 'date' | 'dateTime' | 'boolean' | 'link'
  readonly viewFields: PoDynamicViewField[] = [
    { property: 'codigo',     label: 'Código',      gridColumns: 3 },
    { property: 'nome',       label: 'Nome',        gridColumns: 9 },
    // { property: 'email',      label: 'E-mail',      gridColumns: 6 },
    // { property: 'dataEmissao', label: 'Emissão',    type: 'date', format: 'dd/MM/yyyy', gridColumns: 3 },
    // { property: 'valorTotal', label: 'Valor Total', type: 'currency', gridColumns: 3 },
    // { property: 'ativo',      label: 'Ativo',       type: 'boolean', gridColumns: 3 },
  ];

  readonly pageActions: PoPageDetailActions = {
    edit:   { label: 'Editar',  action: () => this.router.navigate(['../', this.recordId, 'editar'], { relativeTo: this.route }) },
    back:   { label: 'Voltar',  action: () => this.router.navigate(['../'], { relativeTo: this.route }) },
    remove: {
      label: 'Excluir',
      action: () => this.delete(),
    },
  };

  ngOnInit(): void {
    this.recordId = this.route.snapshot.paramMap.get('id') ?? '';
    this.load();
  }

  private load(): void {
    if (!this.recordId) return;
    this.loading.set(true);
    this.service.getById(this.recordId)
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next:  (data) => this.record.set(data),
        error: ()     => this.notification.error('Erro ao carregar registro.'),
      });
  }

  private delete(): void {
    this.loading.set(true);
    this.service.delete(this.recordId)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => {
          this.notification.success('Registro excluído com sucesso.');
          this.router.navigate(['../'], { relativeTo: this.route });
        },
        error: (err) => this.notification.error(this.parseProtheusError(err)),
      });
  }

  private parseProtheusError(err: any): string {
    try {
      const obj    = JSON.parse(err.error?.errorMessage ?? '{}');
      const msg    = decodeURIComponent(escape(obj.message ?? ''));
      const detail = obj.detailedMessage ? ` — ${decodeURIComponent(escape(obj.detailedMessage))}` : '';
      return `Erro ${obj.code}: ${msg}${detail}`;
    } catch {
      return err.error?.message ?? 'Erro ao processar a requisição.';
    }
  }
}
```

## {{kebab-name}}.component.html

```html
<po-page-detail
  p-title="Detalhe — {{ModelInterface}}"
  [p-breadcrumb]="breadcrumb"
  [p-actions]="pageActions">

  @if (loading()) {
    <po-loading-overlay p-text="Carregando..."></po-loading-overlay>
  }

  @if (record(); as rec) {
    <po-dynamic-view
      [p-fields]="viewFields"
      [p-value]="rec">
    </po-dynamic-view>
  }

</po-page-detail>
```

## {{kebab-name}}.component.scss

```scss
// Add component-specific styles here
```

## Route configuration

```typescript
// In your feature routes file
{
  path: ':id/detalhe',
  loadComponent: () =>
    import('./{{kebab-name}}/{{kebab-name}}.component')
      .then(m => m.{{ComponentClass}}),
},
```
```

- [ ] **Verificar criação:**

```powershell
Test-Path "skills\poui-code-generation\templates-page-detail.md"
```

- [ ] **Commit:**

```bash
git add skills/poui-code-generation/templates-page-detail.md
git commit -m "feat(plugin): add page-detail template — po-page-detail with po-dynamic-view, route-based load"
```

---

## Task 5: Criar `templates-stepper-form.md`

**Files:**
- Create: `skills/poui-code-generation/templates-stepper-form.md`

- [ ] **Criar o arquivo:**

```markdown
# Template: stepper-form

Generates a standalone multi-step form using `po-stepper` — the standard PO-UI pattern for wizards and onboarding flows.

> **When to use:**
> Use `stepper-form` when the entity registration has 3 or more logically distinct steps
> (e.g., dados pessoais → endereço → documentos → confirmação).
> For 1-2 sections, prefer `page-edit` with `divider` headers.

## {{kebab-name}}.component.ts

```typescript
import {
  Component,
  ChangeDetectionStrategy,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs/operators';
import {
  PoButtonModule,
  PoDynamicFormField,
  PoDynamicModule,
  PoNotificationService,
  PoPageDefaultModule,
  PoStepperModule,
  PoStepperItem,
  PoStepperStatus,
} from '@po-ui/ng-components';
import { {{ServiceClass}} } from '../{{serviceFile}}';
import { {{ModelInterface}} } from '../models/{{modelFile}}.model';

@Component({
  selector: '{{selector}}',
  standalone: true,
  imports: [
    PoPageDefaultModule,
    PoStepperModule,
    PoDynamicModule,
    PoButtonModule,
  ],
  templateUrl: './{{kebab-name}}.component.html',
  styleUrl: './{{kebab-name}}.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class {{ComponentClass}} {
  private readonly service      = inject({{ServiceClass}});
  private readonly router       = inject(Router);
  private readonly route        = inject(ActivatedRoute);
  private readonly notification = inject(PoNotificationService);
  private readonly destroyRef   = inject(DestroyRef);

  readonly loading      = signal(false);
  readonly currentStep  = signal(1);           // 1-based index

  // Dados acumulados de cada step — mesclados no submit final
  readonly stepData = signal<Partial<{{ModelInterface}}>>({});

  // TODO: define one PoDynamicFormField[] array per step
  readonly step1Fields: PoDynamicFormField[] = [
    {
      property: 'codigo',
      label: 'Código',
      divider: 'Identificação',
      required: true,
      maxLength: 6,
      gridColumns: 4,
    },
    {
      property: 'nome',
      label: 'Nome / Razão Social',
      required: true,
      maxLength: 40,
      gridColumns: 8,
    },
  ];

  readonly step2Fields: PoDynamicFormField[] = [
    {
      property: 'email',
      label: 'E-mail',
      divider: 'Contato',
      required: false,
      regex: '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$',
      errorMessage: 'Informe um e-mail válido',
      gridColumns: 8,
    },
    {
      property: 'telefone',
      label: 'Telefone',
      mask: '(99) 99999-9999',
      gridColumns: 4,
    },
  ];

  readonly step3Fields: PoDynamicFormField[] = [
    {
      property: 'observacoes',
      label: 'Observações',
      divider: 'Complemento',
      gridColumns: 12,
    },
  ];

  // Steps do po-stepper
  readonly steps: PoStepperItem[] = [
    { label: 'Identificação' },
    { label: 'Contato' },
    { label: 'Complemento' },
    { label: 'Confirmação' },
  ];

  get isFirstStep(): boolean { return this.currentStep() === 1; }
  get isLastStep():  boolean { return this.currentStep() === this.steps.length; }
  get isConfirmStep(): boolean { return this.currentStep() === this.steps.length; }

  // Campos do step atual para exibição dinâmica
  get currentFields(): PoDynamicFormField[] {
    switch (this.currentStep()) {
      case 1: return this.step1Fields;
      case 2: return this.step2Fields;
      case 3: return this.step3Fields;
      default: return [];
    }
  }

  onStepChange(step: number): void {
    this.currentStep.set(step);
  }

  next(): void {
    if (this.currentStep() < this.steps.length) {
      this.currentStep.update(s => s + 1);
    }
  }

  back(): void {
    if (this.currentStep() > 1) {
      this.currentStep.update(s => s - 1);
    }
  }

  onFormChange(values: Partial<{{ModelInterface}}>): void {
    this.stepData.update(prev => ({ ...prev, ...values }));
  }

  submit(): void {
    this.loading.set(true);
    const payload = this.stepData() as {{ModelInterface}};
    this.service.create(payload)
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.notification.success('Registro incluído com sucesso.');
          this.router.navigate(['../'], { relativeTo: this.route });
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
      const detail = obj.detailedMessage ? ` — ${decodeURIComponent(escape(obj.detailedMessage))}` : '';
      return `Erro ${obj.code}: ${msg}${detail}`;
    } catch {
      return err.error?.message ?? 'Erro ao processar a requisição.';
    }
  }
}
```

## {{kebab-name}}.component.html

```html
<po-page-default p-title="Novo {{ModelInterface}}">

  @if (loading()) {
    <po-loading-overlay p-text="Salvando..."></po-loading-overlay>
  }

  <!-- Stepper navegação -->
  <po-stepper
    [p-steps]="steps"
    [p-current-active-step]="currentStep()"
    (p-current-active-step)="onStepChange($event)">
  </po-stepper>

  <!-- Formulário do step atual (steps 1-3) -->
  @if (!isConfirmStep) {
    <po-dynamic-form
      [p-fields]="currentFields"
      [p-value]="stepData()"
      (p-value-change)="onFormChange($event)">
    </po-dynamic-form>
  }

  <!-- Step de confirmação: exibe resumo somente leitura -->
  @if (isConfirmStep) {
    <p class="po-mt-2 po-mb-1">Confirme os dados antes de salvar:</p>
    <po-dynamic-view
      [p-fields]="[...step1Fields, ...step2Fields, ...step3Fields]"
      [p-value]="stepData()">
    </po-dynamic-view>
  }

  <!-- Botões de navegação -->
  <div class="po-row po-mt-3">
    <div class="po-md-12">
      <po-button
        p-label="Cancelar"
        p-kind="secondary"
        (p-click)="cancel()">
      </po-button>

      @if (!isFirstStep) {
        <po-button
          p-label="Anterior"
          p-kind="secondary"
          (p-click)="back()"
          class="po-ml-1">
        </po-button>
      }

      @if (!isLastStep) {
        <po-button
          p-label="Próximo"
          p-kind="primary"
          (p-click)="next()"
          class="po-ml-1">
        </po-button>
      }

      @if (isLastStep) {
        <po-button
          p-label="Salvar"
          p-kind="primary"
          [p-loading]="loading()"
          (p-click)="submit()"
          class="po-ml-1">
        </po-button>
      }
    </div>
  </div>

</po-page-default>
```

## {{kebab-name}}.component.scss

```scss
// Add component-specific styles here
```

## Route configuration

```typescript
// In your feature routes file
{
  path: 'novo-wizard',
  loadComponent: () =>
    import('./{{kebab-name}}/{{kebab-name}}.component')
      .then(m => m.{{ComponentClass}}),
},
```
```

- [ ] **Verificar criação:**

```powershell
Test-Path "skills\poui-code-generation\templates-stepper-form.md"
```

- [ ] **Commit:**

```bash
git add skills/poui-code-generation/templates-stepper-form.md
git commit -m "feat(plugin): add stepper-form template — po-stepper multi-step with po-dynamic-form"
```

---

## Task 6: Editar `poui-components/SKILL.md`

**Files:**
- Modify: `skills/poui-components/SKILL.md`

- [ ] **Substituir o bloco `## Component Reference Files` atual por:**

```markdown
## Component Reference Files

- **Page layout components** (po-page-list, po-page-edit, po-page-detail): see `page-components.md`
- **Data table** (po-table, PoTableColumn, PoTableAction): see `table-components.md`
- **Form fields** (po-input, po-select, po-lookup, po-datepicker, etc.): see `form-fields.md`
- **Modal, Dialog, Dynamic View** (po-modal, PoDialogService, po-dynamic-view): see `modal-dialog.md`
- **Feedback & Status** (po-tag, po-info, [p-tooltip], po-progress): see `feedback-components.md`
- **Layout** (po-container, po-accordion, po-list-view): see `layout-components.md`
```

- [ ] **Commit:**

```bash
git add skills/poui-components/SKILL.md
git commit -m "docs(plugin): update poui-components SKILL.md index with 3 new reference files"
```

---

## Task 7: Editar `poui-code-generation/SKILL.md`

**Files:**
- Modify: `skills/poui-code-generation/SKILL.md`

- [ ] **Na tabela `### Edit pages`, adicionar `page-detail` e `stepper-form`:**

Substituir:
```markdown
### Edit pages

| Template | File | When to use |
|----------|------|-------------|
| **page-edit** | `templates-page-edit.md` | Complex form with many fields, sections, navigates via route |
| **modal-crud** | `templates-modal-crud.md` | All-in-one list + modal add/edit (simpler entities, up to ~10 fields) |
```

Por:
```markdown
### Edit pages

| Template | File | When to use |
|----------|------|-------------|
| **page-edit** | `templates-page-edit.md` | Complex form with many fields, sections, navigates via route |
| **modal-crud** | `templates-modal-crud.md` | All-in-one list + modal add/edit (simpler entities, up to ~10 fields) |
| **page-detail** | `templates-page-detail.md` | Read-only detail view with po-page-detail + po-dynamic-view, route-based load |
| **stepper-form** | `templates-stepper-form.md` | Multi-step wizard form with po-stepper (3+ distinct sections) |
```

- [ ] **Commit:**

```bash
git add skills/poui-code-generation/SKILL.md
git commit -m "docs(plugin): register page-detail and stepper-form templates in SKILL.md index"
```

---

## Task 8: Verificação final

- [ ] **Listar arquivos criados:**

```powershell
Get-ChildItem -Recurse "skills" -Filter "*.md" | Where-Object { $_.Name -match "modal|feedback|layout|page-detail|stepper" } | Select-Object Name
```

Esperado — deve aparecer:
```
modal-dialog.md
feedback-components.md
layout-components.md
templates-page-detail.md
templates-stepper-form.md
```

- [ ] **Confirmar commits:**

```bash
git log --oneline -8
```

Esperado: 7 commits `docs/feat(plugin): ...` mais recentes.

- [ ] **Status limpo:**

```bash
git status
```

Esperado: `nothing to commit, working tree clean`
