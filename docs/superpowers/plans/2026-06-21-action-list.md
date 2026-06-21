# Feature 6 — action-list Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar o tipo `action-list` ao plugin poui-specialist — um componente `po-page-list` com múltiplas ações procedurais Protheus, cada uma com modal de confirmação, loading isolado por botão e tratamento de resposta estruturada por linha.

**Architecture:** Novo tipo de componente com template dedicado (`templates-action-list.md`). Um único `po-modal` de confirmação dirigido pelo signal `currentAction`, mais um `po-modal` de resultados para sucesso parcial. Actions `single` viram `PoTableAction`; actions `multi` viram `PoPageAction` via `computed()` para disabled reativo. Integração nas três referências existentes do plugin sem alterar templates já existentes.

**Tech Stack:** Angular 17+ Signals, PO-UI (`PoModalModule`, `PoTableModule`, `PoPageModule`), TypeScript 5, plugin poui-specialist (markdown templates com placeholders `{{kebab-name}}`).

## Global Constraints

- Angular 17+ standalone components com `ChangeDetectionStrategy.OnPush`
- Ícones: sempre `po-icon-*` — nunca `an an-*` ou `ph ph-*`
- Nenhum template existente é alterado (`templates-page-list.md` etc.)
- `(p-selected-rows)` não existe no `po-table` — acumulação manual via `(p-selected-row)` + `(p-unselected-row)` + `(p-all-selected)` + `(p-all-unselected)`
- `PoPageAction.disabled` aceita `boolean` — usar `computed()` para reatividade
- Commits em português, sem co-author Claude

---

## Mapa de arquivos

| Ação | Arquivo |
|---|---|
| **Criar** | `skills/poui-code-generation/templates-action-list.md` |
| **Modificar** | `skills/poui-code-generation/SKILL.md` (linhas 22-27 e 73-96) |
| **Modificar** | `skills/poui-generate-batch/SKILL.md` (linha 44 e nova seção ACOES) |
| **Modificar** | `commands/generate.md` (tabela List pages, linhas 15-23) |
| **Criar** | `Teste_poui/src/app/financeiro/titulos-list/` (4 arquivos — validação) |
| **Modificar** | `Teste_poui/src/app/app.routes.ts` (nova rota) |
| **Modificar** | `Teste_poui/src/app/app.component.ts` (novo menu item) |

---

## Task 1: Criar `templates-action-list.md`

**Files:**
- Create: `skills/poui-code-generation/templates-action-list.md`

**Interfaces:**
- Produces: template com placeholders `{{ComponentClass}}`, `{{kebab-name}}`, `{{selector}}`, `{{ModelInterface}}`, `{{modelFile}}`, `{{ServiceClass}}`, `{{serviceFile}}`, `{{title}}`, `{{campoChave}}`

- [ ] **Step 1: Criar o arquivo de template**

Criar `skills/poui-code-generation/templates-action-list.md` com o conteúdo abaixo **exatamente como está** (os `{{placeholders}}` são preenchidos pelo gerador no momento da geração):

````markdown
# Template: action-list

Gera um componente standalone `po-page-list` com `po-table`, múltiplas ações procedurais Protheus, modal de confirmação dinâmica, loading isolado por ação e tratamento de resposta estruturada por linha.

> **Regra de ícones:** Sempre use nomes `po-icon-*`. Nunca `an an-*` ou `ph ph-*`.
>
> **Quando usar:** Tela de lista onde o usuário seleciona registros e dispara operações de negócio no Protheus que exigem confirmação e retornam resultado por linha (baixar título, processar NF, confirmar pedido). Para CRUD simples sem ação procedural, use `page-list`.

---

## {{kebab-name}}.component.ts

```typescript
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs/operators';
import {
  PoModalAction,
  PoModalComponent,
  PoModalModule,
  PoNotificationService,
  PoPageAction,
  PoPageFilter,
  PoPageModule,
  PoTableAction,
  PoTableColumn,
  PoTableModule,
} from '@po-ui/ng-components';
import { {{ServiceClass}} } from '../{{serviceFile}}.service';
import {
  {{ModelInterface}},
  ActionConfig,
  ActionDraft,
  ActionResponse,
  ActionResultSummary,
} from './{{modelFile}}.model';

@Component({
  selector: '{{selector}}',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PoPageModule, PoTableModule, PoModalModule],
  templateUrl: './{{kebab-name}}.component.html',
  styleUrl: './{{kebab-name}}.component.scss',
})
export class {{ComponentClass}} implements OnInit {
  @ViewChild('confirmModal') private confirmModal!: PoModalComponent;
  @ViewChild('resultsModal') private resultsModal!: PoModalComponent;

  private readonly service      = inject({{ServiceClass}});
  private readonly notification = inject(PoNotificationService);
  private readonly destroyRef   = inject(DestroyRef);

  // chave primária do modelo — substitua pelo primeiro campo do manifesto
  private readonly chaveUnica = '{{campoChave}}' as keyof {{ModelInterface}};

  // ── list state ──────────────────────────────────────────────────────────
  readonly title        = '{{title}}';
  readonly items        = signal<{{ModelInterface}}[]>([]);
  readonly loading      = signal(false);
  readonly hasNext      = signal(false);
  readonly selectedRows = signal<{{ModelInterface}}[]>([]);

  private currentPage = 1;
  private readonly pageSize = 10;
  private lastSearch = '';

  // ── action state ─────────────────────────────────────────────────────────
  readonly currentAction = signal<ActionDraft<{{ModelInterface}}> | null>(null);
  readonly actionLoading = signal<Record<string, boolean>>({});
  readonly actionResults = signal<ActionResultSummary | null>(null);
  readonly errorRows     = signal<Set<string>>(new Set());

  // ── action config — preencher com as ações do manifesto ──────────────────
  readonly actions: ActionConfig[] = [
    // Exemplo single:
    // {
    //   id: 'baixar',
    //   label: 'Baixar Título',
    //   icon: 'po-icon-ok',
    //   mode: 'single',
    //   endpoint: '/financeiro/titulos/baixar',
    //   modalTitle: 'Confirmar Baixo',
    //   modalMessage: 'Confirma o baixo do título {{numero}} de {{parceiro}}?',
    //   campoChave: 'numero',
    //   danger: false,
    // },
    // Exemplo multi:
    // {
    //   id: 'cancelar',
    //   label: 'Cancelar',
    //   icon: 'po-icon-close',
    //   mode: 'multi',
    //   endpoint: '/financeiro/titulos/cancelar',
    //   modalTitle: 'Cancelar Títulos',
    //   modalMessage: 'Confirma o cancelamento de {{_count}} título(s)?',
    //   campoChave: 'numero',
    //   danger: true,
    // },
  ];

  // ── derived actions ───────────────────────────────────────────────────────
  readonly tableActions: PoTableAction[] = this.actions
    .filter(a => a.mode === 'single')
    .map(a => ({
      label: a.label,
      icon: a.icon,
      ...(a.danger ? { type: 'danger' as const } : {}),
      action: (row: {{ModelInterface}}) => this.openAction(a, [row]),
    }));

  readonly pageActions = computed<PoPageAction[]>(() =>
    this.actions
      .filter(a => a.mode === 'multi')
      .map(a => ({
        label: a.label,
        icon: a.icon,
        ...(a.danger ? { type: 'danger' as const } : {}),
        disabled: this.selectedRows().length === 0,
        action: () => this.openAction(a, this.selectedRows()),
      }))
  );

  // ── columns — substitua pelos campos do manifesto ─────────────────────────
  readonly columns: PoTableColumn[] = [
    // { property: 'numero',   label: 'Número',   width: '10%' },
    // { property: 'parceiro', label: 'Parceiro'               },
    // { property: 'valor',    label: 'Valor', type: 'currency', format: 'BRL' },
    // { property: 'venc',     label: 'Vencimento', type: 'date' },
  ];

  // ── filter ────────────────────────────────────────────────────────────────
  readonly filterSettings: PoPageFilter = {
    placeholder: 'Buscar...',
    action: (q: string) => this.onQuickSearch(q),
  };

  // ── modal de confirmação ──────────────────────────────────────────────────
  readonly confirmPrimary = computed<PoModalAction>(() => {
    const draft     = this.currentAction();
    const isLoading = draft ? (this.actionLoading()[draft.config.id] ?? false) : false;
    return {
      label: 'Confirmar',
      action: () => this.executeAction(),
      loading: isLoading,
      disabled: isLoading,
    };
  });

  readonly confirmSecondary: PoModalAction = {
    label: 'Cancelar',
    action: () => {
      this.currentAction.set(null);
      this.confirmModal.close();
    },
  };

  // ── modal de resultados ───────────────────────────────────────────────────
  readonly resultsPrimary: PoModalAction = {
    label: 'Fechar',
    action: () => {
      this.actionResults.set(null);
      this.resultsModal.close();
    },
  };

  readonly resultsColumns: PoTableColumn[] = [
    { property: 'id',       label: 'Registro', width: '30%' },
    {
      property: 'status', label: 'Status', width: '100px',
      type: 'label',
      labels: [
        { value: 'ok',   label: 'OK',   color: 'color-10' },
        { value: 'erro', label: 'Erro', color: 'color-07' },
      ],
    },
    { property: 'mensagem', label: 'Mensagem' },
  ];

  // ── lifecycle ─────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.load();
  }

  // ── list methods ──────────────────────────────────────────────────────────
  onQuickSearch(q: string): void {
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

  onRowSelected(row: {{ModelInterface}}): void {
    this.selectedRows.update(prev =>
      prev.some(r => r[this.chaveUnica] === row[this.chaveUnica]) ? prev : [...prev, row]
    );
  }

  onRowUnselected(row: {{ModelInterface}}): void {
    this.selectedRows.update(prev =>
      prev.filter(r => r[this.chaveUnica] !== row[this.chaveUnica])
    );
  }

  onAllSelected(): void {
    this.selectedRows.set([...this.items()]);
  }

  onAllUnselected(): void {
    this.selectedRows.set([]);
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

  // ── action methods ────────────────────────────────────────────────────────
  openAction(config: ActionConfig, rows: {{ModelInterface}}[]): void {
    const resolvedMessage = this.interpolateMessage(config.modalMessage, config.mode, rows);
    this.currentAction.set({ config, rows, resolvedMessage });
    this.confirmModal.open();
  }

  executeAction(): void {
    const draft = this.currentAction();
    if (!draft) return;

    const { config, rows } = draft;
    this.actionLoading.update(m => ({ ...m, [config.id]: true }));

    const payload = config.mode === 'single'
      ? { id: String(rows[0][this.chaveUnica]) }
      : { ids: rows.map(r => String(r[this.chaveUnica])) };

    this.service.executarAcao(config.endpoint, payload)
      .pipe(
        finalize(() => this.actionLoading.update(m => ({ ...m, [config.id]: false }))),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (res) => this.handleActionResponse(res, config.label),
        error: (err) => {
          this.notification.error(this.parseProtheusError(err));
          this.currentAction.set(null);
          this.confirmModal.close();
        },
      });
  }

  private handleActionResponse(res: ActionResponse, actionLabel: string): void {
    this.currentAction.set(null);
    this.confirmModal.close();
    this.currentPage = 1;
    this.load();

    if (res.falha === 0) {
      this.notification.success(`${res.sucesso} registro(s) processado(s) com sucesso.`);
      return;
    }

    const erroIds = new Set(res.itens.filter(i => i.status === 'erro').map(i => i.id));
    this.errorRows.set(erroIds);
    this.actionResults.set({ ...res, actionLabel });
    this.resultsModal.open();
  }

  private interpolateMessage(
    template: string,
    mode: 'single' | 'multi',
    rows: {{ModelInterface}}[],
  ): string {
    if (mode === 'multi') {
      return template.replace(/\{\{_count\}\}/g, String(rows.length));
    }
    const row = rows[0] as Record<string, unknown>;
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(row[key] ?? ''));
  }

  private parseProtheusError(err: unknown): string {
    try {
      const e      = err as { error?: { errorMessage?: string; message?: string } };
      const errObj = JSON.parse(e.error?.errorMessage ?? '{}') as {
        code?: number; message?: string; detailedMessage?: string;
      };
      const msg    = decodeURIComponent(escape(errObj.message ?? ''));
      const detail = errObj.detailedMessage
        ? ` — ${decodeURIComponent(escape(errObj.detailedMessage))}`
        : '';
      return `Erro ${errObj.code}: ${msg}${detail}`;
    } catch {
      return (err as { error?: { message?: string } }).error?.message
        ?? 'Erro ao processar a requisição.';
    }
  }
}
```

---

## {{kebab-name}}.component.html

```html
<po-page-list
  [p-title]="title"
  [p-actions]="pageActions()"
  [p-filter]="filterSettings">

  <po-table
    [p-columns]="columns"
    [p-items]="items()"
    [p-loading]="loading()"
    [p-actions]="tableActions"
    [p-checkbox]="true"
    [p-show-more-disabled]="!hasNext()"
    (p-show-more)="onShowMore()"
    (p-selected-row)="onRowSelected($event)"
    (p-unselected-row)="onRowUnselected($event)"
    (p-all-selected)="onAllSelected()"
    (p-all-unselected)="onAllUnselected()">
  </po-table>

</po-page-list>

<!-- Modal de confirmação -->
<po-modal
  #confirmModal
  [p-title]="currentAction()?.config?.modalTitle ?? ''"
  [p-primary-action]="confirmPrimary()"
  [p-secondary-action]="confirmSecondary">
  <p>{{ currentAction()?.resolvedMessage }}</p>
</po-modal>

<!-- Modal de resultados (abre apenas quando falha > 0) -->
<po-modal
  #resultsModal
  [p-title]="'Resultado — ' + (actionResults()?.actionLabel ?? '')"
  [p-primary-action]="resultsPrimary"
  p-size="lg">
  <p>
    <strong>{{ actionResults()?.sucesso }}</strong> processado(s) com sucesso ·
    <strong>{{ actionResults()?.falha }}</strong> com erro
  </p>
  <po-table
    [p-columns]="resultsColumns"
    [p-items]="actionResults()?.itens ?? []">
  </po-table>
</po-modal>
```

---

## {{kebab-name}}.component.scss

```scss
// Adicione estilos específicos do componente aqui
```

---

## {{modelFile}}.model.ts

```typescript
export interface {{ModelInterface}} {
  // TODO: campos do manifesto — ex: numero, parceiro, valor, venc
}

export interface ActionConfig {
  id: string;
  label: string;
  icon: string;
  mode: 'single' | 'multi';
  endpoint: string;
  modalTitle: string;
  modalMessage: string;
  campoChave: string;
  danger?: boolean;
}

export interface ActionDraft<T> {
  config: ActionConfig;
  rows: T[];
  resolvedMessage: string;
}

export interface ActionResponse {
  sucesso: number;
  falha: number;
  itens: ActionItemResult[];
}

export interface ActionItemResult {
  id: string;
  status: 'ok' | 'erro';
  mensagem?: string;
}

export interface ActionResultSummary extends ActionResponse {
  actionLabel: string;
}
```

---

## {{serviceFile}}.service.ts — método adicional

Adicionar ao service existente (gerado por `service` no manifesto) o método abaixo. **Não substituir o service inteiro** — apenas incluir o método após os métodos CRUD.

```typescript
// Adicionar import se ainda não existir:
// import { Observable } from 'rxjs';

executarAcao(
  endpoint: string,
  payload: { id: string } | { ids: string[] },
): Observable<ActionResponse> {
  return this.http.post<ActionResponse>(`${this.apiUrl}${endpoint}`, payload);
}
```

> `ActionResponse` deve ser importado de `./{{modelFile}}.model`.
````

- [ ] **Step 2: Verificar estrutura do arquivo criado**

```powershell
$file = "skills\poui-code-generation\templates-action-list.md"
$content = Get-Content $file -Raw
$checks = @(
  "Template: action-list",
  "{{kebab-name}}.component.ts",
  "{{kebab-name}}.component.html",
  "{{kebab-name}}.component.scss",
  "{{modelFile}}.model.ts",
  "ActionConfig",
  "ActionDraft",
  "ActionResponse",
  "currentAction",
  "actionLoading",
  "actionResults",
  "confirmPrimary",
  "executeAction",
  "handleActionResponse",
  "interpolateMessage",
  "confirmModal",
  "resultsModal",
  "executarAcao"
)
$failed = $checks | Where-Object { $content -notmatch [regex]::Escape($_) }
if ($failed) { Write-Host "FALHOU: $($failed -join ', ')" } else { Write-Host "OK — todas as 18 seções verificadas" }
```

Saída esperada: `OK — todas as 18 seções verificadas`

- [ ] **Step 3: Commit**

```powershell
git add skills/poui-code-generation/templates-action-list.md
git commit -m "feat(template): adicionar templates-action-list — lista com acoes procedurais Protheus"
```

---

## Task 2: Integrar `action-list` nas referências do plugin

**Files:**
- Modify: `skills/poui-code-generation/SKILL.md`
- Modify: `skills/poui-generate-batch/SKILL.md`
- Modify: `commands/generate.md`

**Interfaces:**
- Consumes: `templates-action-list.md` criado na Task 1
- Produces: `action-list` reconhecido como tipo válido em todos os pontos de entrada do plugin

- [ ] **Step 1: Atualizar SKILL.md do poui-code-generation — algoritmo de seleção de tipo**

No arquivo `skills/poui-code-generation/SKILL.md`, localizar o bloco do item 4 da lista (escolha de tipo para tela de lista). Ele começa em:

```
4. If the request is for a list screen:
```

Inserir a seguinte regra como **primeiro item** dentro do bloco, antes da linha `two-panel-browse`:

```
   - If the screen is a **list where users select records and trigger a Protheus procedural operation** (baixar título, processar NF, confirmar pedido) that requires explicit confirmation, returns a per-row result, and may have partial success, choose `action-list`.
```

Resultado esperado da seção após a edição:

```
4. If the request is for a list screen:
   - If the screen is a **list where users select records and trigger a Protheus procedural operation** (baixar título, processar NF, confirmar pedido) that requires explicit confirmation, returns a per-row result, and may have partial success, choose `action-list`.
   - If the screen shows **two browse panels side by side** ...
```

- [ ] **Step 2: Atualizar SKILL.md do poui-code-generation — tabela de templates**

No mesmo arquivo, localizar a seção de tabela de templates (que contém `| **page-list** |`). Inserir a linha abaixo **antes** da linha `| **page-list** |`:

```
| **action-list** | `templates-action-list.md` | List with multiple independent Protheus procedural actions; each action has a confirmation modal with field interpolation, per-action loading spinner, and structured per-row response with partial-success results modal. |
```

- [ ] **Step 3: Atualizar SKILL.md do poui-code-generation — frontmatter description**

Na linha 3 do arquivo (campo `description:`), acrescentar `action-list` à lista de tipos já mencionados, após `two-panel-browse`:

Antes:
```
description: Use when generating PO-UI Angular code — complete ready-to-adapt templates for page-list, page-dynamic-search, page-edit, page-detail, modal-crud, stepper-form, page-dynamic, master-detail, stacked-browse, two-panel-browse, service, module, and dashboard artifacts for Protheus integration | © Andre Costa ...
```

Depois:
```
description: Use when generating PO-UI Angular code — complete ready-to-adapt templates for page-list, page-dynamic-search, page-edit, page-detail, modal-crud, stepper-form, page-dynamic, master-detail, stacked-browse, two-panel-browse, action-list, service, module, and dashboard artifacts for Protheus integration | © Andre Costa ...
```

- [ ] **Step 4: Atualizar SKILL.md do poui-generate-batch — tipos válidos**

No arquivo `skills/poui-generate-batch/SKILL.md`, localizar a linha 44:

```
`page-list` · `page-edit` · `page-detail` · `page-dynamic-search` · `page-dynamic` · `modal-crud` · `stepper-form` · `master-detail` · `stacked-browse` · `two-panel-browse` · `service` · `dashboard`
```

Substituir por:

```
`page-list` · `page-edit` · `page-detail` · `page-dynamic-search` · `page-dynamic` · `modal-crud` · `stepper-form` · `master-detail` · `stacked-browse` · `two-panel-browse` · `action-list` · `service` · `dashboard`
```

- [ ] **Step 5: Atualizar SKILL.md do poui-generate-batch — documentar seção ACOES:**

No mesmo arquivo, após a seção `## Convenções` (que termina com a tabela de `REGRAS:`), inserir a seção:

```markdown
## Seção ACOES: (obrigatória para `action-list`)

Quando o manifesto contém um componente do tipo `action-list`, a seção `ACOES:` define cada ação procedural:

```
ACOES:
- id: <id-unico> | label: <Rótulo> | icon: <po-icon-*> | mode: <single|multi> | campoChave: <campo>
  endpoint: <endpoint-relativo>
  modal_title: <Título do Modal>
  modal_message: <Mensagem com {{campo}} ou {{_count}}>
  danger: <true|false>
```

| Campo | Descrição |
|---|---|
| `id` | Chave única da ação (usada no `actionLoading` map) |
| `label` | Rótulo do botão |
| `icon` | Ícone PO-UI (`po-icon-*`) |
| `mode` | `single` = opera na linha clicada (vira `PoTableAction`); `multi` = opera na seleção (vira `PoPageAction`) |
| `campoChave` | Campo primário do modelo para montar o payload do POST |
| `endpoint` | Endpoint relativo ao `API_BASE` para o POST |
| `modal_title` | Título do `po-modal` de confirmação |
| `modal_message` | Mensagem com interpolação: `{{campo}}` = valor da linha; `{{_count}}` = número de linhas selecionadas (somente `multi`) |
| `danger` | `true` aplica `type: 'danger'` no botão |

A seção `ACOES:` é passada integralmente no bloco `Regras de negócio:` do prompt do subagente.
```

- [ ] **Step 6: Atualizar commands/generate.md — tabela List pages**

No arquivo `commands/generate.md`, localizar a tabela de tipos de lista que começa com `| \`page-list\``. Inserir a linha abaixo como **última linha** da seção "List pages" (antes da linha `### Edit / Detail pages`):

```
| `action-list` | `*.component.ts/html/scss` + model | Yes | Lista com N ações procedurais Protheus — cada ação tem modal de confirmação com interpolação de campos, loading isolado por botão, resposta estruturada por linha com modal de resultados para sucesso parcial |
```

- [ ] **Step 7: Verificar as três modificações**

```powershell
# SKILL.md poui-code-generation
$s1 = Get-Content "skills\poui-code-generation\SKILL.md" -Raw
if ($s1 -match "action-list" -and $s1 -match "templates-action-list") { Write-Host "OK poui-code-generation" } else { Write-Host "FALHOU poui-code-generation" }

# SKILL.md poui-generate-batch
$s2 = Get-Content "skills\poui-generate-batch\SKILL.md" -Raw
if ($s2 -match "action-list" -and $s2 -match "ACOES:") { Write-Host "OK poui-generate-batch" } else { Write-Host "FALHOU poui-generate-batch" }

# commands/generate.md
$s3 = Get-Content "commands\generate.md" -Raw
if ($s3 -match "action-list") { Write-Host "OK generate.md" } else { Write-Host "FALHOU generate.md" }
```

Saída esperada (3 linhas):
```
OK poui-code-generation
OK poui-generate-batch
OK generate.md
```

- [ ] **Step 8: Commit**

```powershell
git add skills/poui-code-generation/SKILL.md skills/poui-generate-batch/SKILL.md commands/generate.md
git commit -m "feat(plugin): integrar action-list como tipo valido nas referencias do plugin"
```

---

## Task 3: Gerar componente de validação e verificar compilação

**Files:**
- Create: `Teste_poui/src/app/financeiro/titulos-list/titulos-list.component.ts`
- Create: `Teste_poui/src/app/financeiro/titulos-list/titulos-list.component.html`
- Create: `Teste_poui/src/app/financeiro/titulos-list/titulos-list.component.scss`
- Create: `Teste_poui/src/app/financeiro/titulos-list/titulo.model.ts`
- Modify: `Teste_poui/src/app/app.routes.ts`
- Modify: `Teste_poui/src/app/app.component.ts`

**Interfaces:**
- Consumes: `templates-action-list.md` (Task 1), `TitulosService` (gerado aqui, se não existir)

Esta task gera um componente concreto a partir do template para provar que o template produz código Angular válido. Se houver erro de compilação, o template deve ser corrigido **antes** de commitar.

- [ ] **Step 1: Criar `titulo.model.ts`**

Criar `Teste_poui/src/app/financeiro/titulos-list/titulo.model.ts`:

```typescript
export interface Titulo {
  numero: string;
  parceiro: string;
  valor: number;
  venc: string;
  situacao: string;
}

export interface ActionConfig {
  id: string;
  label: string;
  icon: string;
  mode: 'single' | 'multi';
  endpoint: string;
  modalTitle: string;
  modalMessage: string;
  campoChave: string;
  danger?: boolean;
}

export interface ActionDraft<T> {
  config: ActionConfig;
  rows: T[];
  resolvedMessage: string;
}

export interface ActionResponse {
  sucesso: number;
  falha: number;
  itens: ActionItemResult[];
}

export interface ActionItemResult {
  id: string;
  status: 'ok' | 'erro';
  mensagem?: string;
}

export interface ActionResultSummary extends ActionResponse {
  actionLabel: string;
}
```

- [ ] **Step 2: Criar `titulos.service.ts` (se não existir)**

Criar `Teste_poui/src/app/financeiro/titulos.service.ts`:

```typescript
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Titulo, ActionResponse } from './titulos-list/titulo.model';

export interface TitulosListResponse {
  items: Titulo[];
  hasNext: boolean;
}

@Injectable({ providedIn: 'root' })
export class TitulosService {
  private readonly http   = inject(HttpClient);
  private readonly apiUrl = '/rest/api/custom/v1/financeiro/titulos';

  getAll(params: { page: number; pageSize: number; q: string }): Observable<TitulosListResponse> {
    const p = new HttpParams()
      .set('page',     String(params.page))
      .set('pageSize', String(params.pageSize))
      .set('q',        params.q);
    return this.http.get<TitulosListResponse>(this.apiUrl, { params: p });
  }

  executarAcao(
    endpoint: string,
    payload: { id: string } | { ids: string[] },
  ): Observable<ActionResponse> {
    return this.http.post<ActionResponse>(`/rest/api/custom/v1${endpoint}`, payload);
  }
}
```

- [ ] **Step 3: Criar `titulos-list.component.ts`**

Criar `Teste_poui/src/app/financeiro/titulos-list/titulos-list.component.ts` aplicando os placeholders do template:

```typescript
/**
 * @generated  poui-specialist v1.3 — action-list
 * @author     Andre Costa <andre.andrelscosta@gmail.com>
 */
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs/operators';
import {
  PoModalAction,
  PoModalComponent,
  PoModalModule,
  PoNotificationService,
  PoPageAction,
  PoPageFilter,
  PoPageModule,
  PoTableAction,
  PoTableColumn,
  PoTableModule,
} from '@po-ui/ng-components';
import { TitulosService } from '../titulos.service';
import {
  Titulo,
  ActionConfig,
  ActionDraft,
  ActionResponse,
  ActionResultSummary,
} from './titulo.model';

@Component({
  selector: 'app-titulos-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PoPageModule, PoTableModule, PoModalModule],
  templateUrl: './titulos-list.component.html',
  styleUrl: './titulos-list.component.scss',
})
export class TitulosListComponent implements OnInit {
  @ViewChild('confirmModal') private confirmModal!: PoModalComponent;
  @ViewChild('resultsModal') private resultsModal!: PoModalComponent;

  private readonly service      = inject(TitulosService);
  private readonly notification = inject(PoNotificationService);
  private readonly destroyRef   = inject(DestroyRef);

  private readonly chaveUnica = 'numero' as keyof Titulo;

  readonly title        = 'Títulos a Receber';
  readonly items        = signal<Titulo[]>([]);
  readonly loading      = signal(false);
  readonly hasNext      = signal(false);
  readonly selectedRows = signal<Titulo[]>([]);

  private currentPage = 1;
  private readonly pageSize = 10;
  private lastSearch = '';

  readonly currentAction = signal<ActionDraft<Titulo> | null>(null);
  readonly actionLoading = signal<Record<string, boolean>>({});
  readonly actionResults = signal<ActionResultSummary | null>(null);
  readonly errorRows     = signal<Set<string>>(new Set());

  readonly actions: ActionConfig[] = [
    {
      id: 'baixar',
      label: 'Baixar Título',
      icon: 'po-icon-ok',
      mode: 'single',
      endpoint: '/financeiro/titulos/baixar',
      modalTitle: 'Confirmar Baixo',
      modalMessage: 'Confirma o baixo do título {{numero}} de {{parceiro}}?',
      campoChave: 'numero',
      danger: false,
    },
    {
      id: 'cancelar',
      label: 'Cancelar Selecionados',
      icon: 'po-icon-close',
      mode: 'multi',
      endpoint: '/financeiro/titulos/cancelar',
      modalTitle: 'Cancelar Títulos',
      modalMessage: 'Confirma o cancelamento de {{_count}} título(s) selecionado(s)?',
      campoChave: 'numero',
      danger: true,
    },
  ];

  readonly tableActions: PoTableAction[] = this.actions
    .filter(a => a.mode === 'single')
    .map(a => ({
      label: a.label,
      icon: a.icon,
      ...(a.danger ? { type: 'danger' as const } : {}),
      action: (row: Titulo) => this.openAction(a, [row]),
    }));

  readonly pageActions = computed<PoPageAction[]>(() =>
    this.actions
      .filter(a => a.mode === 'multi')
      .map(a => ({
        label: a.label,
        icon: a.icon,
        ...(a.danger ? { type: 'danger' as const } : {}),
        disabled: this.selectedRows().length === 0,
        action: () => this.openAction(a, this.selectedRows()),
      }))
  );

  readonly columns: PoTableColumn[] = [
    { property: 'numero',   label: 'Número',    width: '10%' },
    { property: 'parceiro', label: 'Parceiro'               },
    { property: 'valor',    label: 'Valor',     type: 'currency', format: 'BRL' },
    { property: 'venc',     label: 'Vencimento' },
    {
      property: 'situacao', label: 'Situação', width: '110px',
      type: 'label',
      labels: [
        { value: 'A', label: 'Aberto',  color: 'color-08' },
        { value: 'B', label: 'Baixado', color: 'color-10' },
        { value: 'C', label: 'Cancelado', color: 'color-07' },
      ],
    },
  ];

  readonly filterSettings: PoPageFilter = {
    placeholder: 'Buscar...',
    action: (q: string) => this.onQuickSearch(q),
  };

  readonly confirmPrimary = computed<PoModalAction>(() => {
    const draft     = this.currentAction();
    const isLoading = draft ? (this.actionLoading()[draft.config.id] ?? false) : false;
    return {
      label: 'Confirmar',
      action: () => this.executeAction(),
      loading: isLoading,
      disabled: isLoading,
    };
  });

  readonly confirmSecondary: PoModalAction = {
    label: 'Cancelar',
    action: () => {
      this.currentAction.set(null);
      this.confirmModal.close();
    },
  };

  readonly resultsPrimary: PoModalAction = {
    label: 'Fechar',
    action: () => {
      this.actionResults.set(null);
      this.resultsModal.close();
    },
  };

  readonly resultsColumns: PoTableColumn[] = [
    { property: 'id',       label: 'Registro', width: '30%' },
    {
      property: 'status', label: 'Status', width: '100px',
      type: 'label',
      labels: [
        { value: 'ok',   label: 'OK',   color: 'color-10' },
        { value: 'erro', label: 'Erro', color: 'color-07' },
      ],
    },
    { property: 'mensagem', label: 'Mensagem' },
  ];

  ngOnInit(): void {
    this.load();
  }

  onQuickSearch(q: string): void {
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

  onRowSelected(row: Titulo): void {
    this.selectedRows.update(prev =>
      prev.some(r => r[this.chaveUnica] === row[this.chaveUnica]) ? prev : [...prev, row]
    );
  }

  onRowUnselected(row: Titulo): void {
    this.selectedRows.update(prev =>
      prev.filter(r => r[this.chaveUnica] !== row[this.chaveUnica])
    );
  }

  onAllSelected(): void {
    this.selectedRows.set([...this.items()]);
  }

  onAllUnselected(): void {
    this.selectedRows.set([]);
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

  openAction(config: ActionConfig, rows: Titulo[]): void {
    const resolvedMessage = this.interpolateMessage(config.modalMessage, config.mode, rows);
    this.currentAction.set({ config, rows, resolvedMessage });
    this.confirmModal.open();
  }

  executeAction(): void {
    const draft = this.currentAction();
    if (!draft) return;

    const { config, rows } = draft;
    this.actionLoading.update(m => ({ ...m, [config.id]: true }));

    const payload = config.mode === 'single'
      ? { id: String(rows[0][this.chaveUnica]) }
      : { ids: rows.map(r => String(r[this.chaveUnica])) };

    this.service.executarAcao(config.endpoint, payload)
      .pipe(
        finalize(() => this.actionLoading.update(m => ({ ...m, [config.id]: false }))),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (res) => this.handleActionResponse(res, config.label),
        error: (err) => {
          this.notification.error(this.parseProtheusError(err));
          this.currentAction.set(null);
          this.confirmModal.close();
        },
      });
  }

  private handleActionResponse(res: ActionResponse, actionLabel: string): void {
    this.currentAction.set(null);
    this.confirmModal.close();
    this.currentPage = 1;
    this.load();

    if (res.falha === 0) {
      this.notification.success(`${res.sucesso} registro(s) processado(s) com sucesso.`);
      return;
    }

    const erroIds = new Set(res.itens.filter(i => i.status === 'erro').map(i => i.id));
    this.errorRows.set(erroIds);
    this.actionResults.set({ ...res, actionLabel });
    this.resultsModal.open();
  }

  private interpolateMessage(
    template: string,
    mode: 'single' | 'multi',
    rows: Titulo[],
  ): string {
    if (mode === 'multi') {
      return template.replace(/\{\{_count\}\}/g, String(rows.length));
    }
    const row = rows[0] as Record<string, unknown>;
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(row[key] ?? ''));
  }

  private parseProtheusError(err: unknown): string {
    try {
      const e      = err as { error?: { errorMessage?: string; message?: string } };
      const errObj = JSON.parse(e.error?.errorMessage ?? '{}') as {
        code?: number; message?: string; detailedMessage?: string;
      };
      const msg    = decodeURIComponent(escape(errObj.message ?? ''));
      const detail = errObj.detailedMessage
        ? ` — ${decodeURIComponent(escape(errObj.detailedMessage))}`
        : '';
      return `Erro ${errObj.code}: ${msg}${detail}`;
    } catch {
      return (err as { error?: { message?: string } }).error?.message
        ?? 'Erro ao processar a requisição.';
    }
  }
}
```

- [ ] **Step 4: Criar `titulos-list.component.html`**

Criar `Teste_poui/src/app/financeiro/titulos-list/titulos-list.component.html`:

```html
<po-page-list
  [p-title]="title"
  [p-actions]="pageActions()"
  [p-filter]="filterSettings">

  <po-table
    [p-columns]="columns"
    [p-items]="items()"
    [p-loading]="loading()"
    [p-actions]="tableActions"
    [p-checkbox]="true"
    [p-show-more-disabled]="!hasNext()"
    (p-show-more)="onShowMore()"
    (p-selected-row)="onRowSelected($event)"
    (p-unselected-row)="onRowUnselected($event)"
    (p-all-selected)="onAllSelected()"
    (p-all-unselected)="onAllUnselected()">
  </po-table>

</po-page-list>

<po-modal
  #confirmModal
  [p-title]="currentAction()?.config?.modalTitle ?? ''"
  [p-primary-action]="confirmPrimary()"
  [p-secondary-action]="confirmSecondary">
  <p>{{ currentAction()?.resolvedMessage }}</p>
</po-modal>

<po-modal
  #resultsModal
  [p-title]="'Resultado — ' + (actionResults()?.actionLabel ?? '')"
  [p-primary-action]="resultsPrimary"
  p-size="lg">
  <p>
    <strong>{{ actionResults()?.sucesso }}</strong> processado(s) com sucesso ·
    <strong>{{ actionResults()?.falha }}</strong> com erro
  </p>
  <po-table
    [p-columns]="resultsColumns"
    [p-items]="actionResults()?.itens ?? []">
  </po-table>
</po-modal>
```

- [ ] **Step 5: Criar `titulos-list.component.scss`**

Criar `Teste_poui/src/app/financeiro/titulos-list/titulos-list.component.scss`:

```scss
// Adicione estilos específicos do componente aqui
```

- [ ] **Step 6: Registrar rota em `app.routes.ts`**

Abrir `Teste_poui/src/app/app.routes.ts` e inserir antes do `];` final:

```typescript
  {
    path: 'financeiro/titulos-list',
    loadComponent: () =>
      import('./financeiro/titulos-list/titulos-list.component')
        .then(m => m.TitulosListComponent),
  },
```

- [ ] **Step 7: Adicionar item de menu em `app.component.ts`**

Abrir `Teste_poui/src/app/app.component.ts` e inserir dentro do array `menus`:

```typescript
    {
      label: 'Títulos',
      shortLabel: 'Títulos',
      icon: 'po-icon-document',
      link: '/financeiro/titulos-list',
    },
```

- [ ] **Step 8: Executar build para verificar compilação**

```powershell
cd Teste_poui
npx ng build --configuration development 2>&1 | Select-String -Pattern "error TS|ERROR|warning TS" | Select-Object -First 20
```

Saída esperada: nenhuma linha de erro. Se houver erros TypeScript, corrigi-los no `.component.ts` e no template e **também atualizar** o arquivo `templates-action-list.md` com as mesmas correções antes de commitar.

- [ ] **Step 9: Commit**

```powershell
cd ..
git add Teste_poui/src/app/financeiro/titulos-list/ Teste_poui/src/app/financeiro/titulos.service.ts Teste_poui/src/app/app.routes.ts Teste_poui/src/app/app.component.ts
git commit -m "feat(teste_poui): adicionar componente TitulosList para validacao do template action-list"
git push origin master
```

---

## Self-Review

**Cobertura do spec:**
- [x] Novo tipo `action-list` — Task 1 cria o template
- [x] N ações independentes — `actions: ActionConfig[]` no template
- [x] Modal com interpolação de campos — `interpolateMessage()` no template
- [x] Resposta estruturada por linha — `ActionResponse`, `handleActionResponse()`
- [x] mode `single` → `PoTableAction`; mode `multi` → `PoPageAction` via `computed()`
- [x] Loading isolado por ação — `actionLoading = signal<Record<string, boolean>>({})`
- [x] Modal de resultados quando `falha > 0` — `resultsModal`, `actionResults` signal
- [x] Integração nas referências do plugin — Task 2 (3 arquivos)
- [x] Validação de compilação — Task 3 com `ng build`
- [x] Critério 7 (backend legado) — `handleActionResponse` trata `falha === 0` como sucesso total
- [x] Critério 8 (dois modais nunca abertos) — `currentAction` e `actionResults` são independentes; `confirmModal.close()` é chamado antes de `resultsModal.open()`
