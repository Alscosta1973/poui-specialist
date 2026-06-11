# Plugin poui-specialist — Bugfix + Gaps v1.3.0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir 4 bugs críticos de informação incorreta no agent e preencher 3 gaps estruturais (tipos faltando no command, versionamento, CHANGELOG).

**Architecture:** Todas as mudanças são edições de arquivos Markdown dentro do plugin. Não há código Angular gerado — apenas a base de conhecimento do plugin é alterada. Um único commit ao final.

**Tech Stack:** Markdown, plugin poui-specialist (Claude Code plugin), PowerShell para verificações.

**Spec:** `docs/superpowers/specs/2026-06-11-plugin-bugfix-v130-design.md`

---

## Mapa de Arquivos

| Arquivo | Operação | Tarefas |
|---------|----------|---------|
| `agents/code-generator.md` | Editar | Task 1 (B1 + B2) |
| `commands/generate.md` | Editar | Task 2 (B3 + G1) |
| `skills/poui-patterns/SKILL.md` | Editar | Task 3 (B4) |
| `.claude-plugin/plugin.json` | Editar | Task 4 (G2) |
| `.claude-plugin/marketplace.json` | Editar | Task 4 (G2) |
| `skills/poui-code-generation/SKILL.md` | Editar | Task 4 (G2) |
| `CHANGELOG.md` | Criar | Task 5 (G3) |

---

### Task 1: Corrigir `agents/code-generator.md` — po-table selection (B1) e coluna 'tag' (B2)

**Files:**
- Modify: `agents/code-generator.md`

- [ ] **Step 1: Verificar que o conteúdo errado existe no arquivo**

```powershell
Select-String -Path "C:\TOTVS\Projetos\Claude\poui-specialist\agents\code-generator.md" -Pattern "p-selected-rows"
```

Esperado: uma linha com `(p-selected-rows)="onSelectionChange($event)"`. Se não aparecer, o arquivo já foi corrigido — pule para o Step 3.

- [ ] **Step 2: Corrigir a seção `### po-table selection` (B1)**

No arquivo `C:\TOTVS\Projetos\Claude\poui-specialist\agents\code-generator.md`, substituir o bloco:

```
### po-table selection
- Use `(p-selected-rows)="onSelectionChange($event)"` — emits the full `any[]` array
- **Never** use `(p-selected)` / `(p-unselected)` — those are single-row events requiring manual accumulation
```

Por:

```
### po-table selection
- `p-selected-rows` **does not exist** — never use it
- Use individual-row events and accumulate manually in a local signal:
  - `(p-selected)` — fires when a single row is selected, emits the row object
  - `(p-unselected)` — fires when a single row is deselected, emits the row object
  - `(p-all-selected)` — fires when all rows are selected via header checkbox
  - `(p-all-unselected)` — fires when all rows are deselected
- Example:
  ```typescript
  readonly selectedRows = signal<any[]>([]);
  onRowSelected(row: any): void { this.selectedRows.update(rows => [...rows, row]); }
  onRowUnselected(row: any): void { this.selectedRows.update(rows => rows.filter(r => r !== row)); }
  ```
  ```html
  <po-table [p-selectable]="true"
    (p-selected)="onRowSelected($event)"
    (p-unselected)="onRowUnselected($event)"
    (p-all-selected)="selectedRows.set(items())"
    (p-all-unselected)="selectedRows.set([])">
  </po-table>
  ```
```

- [ ] **Step 3: Verificar que o conteúdo antigo foi removido**

```powershell
Select-String -Path "C:\TOTVS\Projetos\Claude\poui-specialist\agents\code-generator.md" -Pattern "p-selected-rows"
```

Esperado: sem saída (nenhuma linha encontrada).

- [ ] **Step 4: Corrigir a lista de tipos válidos de coluna — remover 'tag' (B2)**

No mesmo arquivo, substituir a linha:

```
- Valid values: `'string' | 'number' | 'currency' | 'date' | 'dateTime' | 'time' | 'boolean' | 'label' | 'icon' | 'tag'`
```

Por:

```
- Valid values: `'string' | 'number' | 'currency' | 'date' | 'dateTime' | 'time' | 'boolean' | 'label' | 'icon' | 'link' | 'detail' | 'subtitle'`
- **Never** use `'tag'` as column type — it does not exist in the installed version
```

- [ ] **Step 5: Verificar remoção de 'tag'**

```powershell
Select-String -Path "C:\TOTVS\Projetos\Claude\poui-specialist\agents\code-generator.md" -Pattern "'tag'"
```

Esperado: deve aparecer apenas na linha "Never use `'tag'`" (a proibição), não na lista de válidos.

---

### Task 2: Atualizar `commands/generate.md` — novos tipos (B3 + G1)

**Files:**
- Modify: `commands/generate.md`

- [ ] **Step 1: Adicionar `stacked-browse` e `two-panel-browse` na tabela "List pages" (B3)**

No arquivo `C:\TOTVS\Projetos\Claude\poui-specialist\commands\generate.md`, localizar a tabela "### List pages" e substituir:

```
| `master-detail` | `*.component.ts/html/scss` + model | Yes | List with expandable child rows (pedido/itens, NF/itens) |
```

Por:

```
| `master-detail` | `*.component.ts/html/scss` + model | Yes | List with expandable child rows (pedido/itens, NF/itens) |
| `stacked-browse` | `*.component.ts/html/scss` | Yes | Dois po-table empilhados (master/detail) com navegação por teclado ArrowUp/Down e Tab para alternar |
| `two-panel-browse` | `*.component.ts/html/scss` | Yes | Dois po-table lado a lado para conciliação/matching (seleciona um de cada e confirma) |
```

- [ ] **Step 2: Adicionar `models` e `tlpp-contract` na tabela "Other" (G1)**

Na mesma tabela "### Other", substituir:

```
| `refactor` | `*.component.ts/html/scss` + service + model | Yes | Convert existing `.prw`/`.tlpp` to PO-UI (provide source file) |
```

Por:

```
| `refactor` | `*.component.ts/html/scss` + service + model | Yes | Convert existing `.prw`/`.tlpp` to PO-UI (provide source file) |
| `models` | `<entity>.model.ts` | Yes | TypeScript interfaces: simple, composite key, flat relational (padrão Protheus) |
| `tlpp-contract` | skeleton WsRestFul `.tlpp` | Yes | Contrato REST backend para implementar com `/advpl-specialist:generate rest` |
```

- [ ] **Step 3: Adicionar exemplos dos novos tipos na seção Examples**

Na seção `## Examples`, substituir:

```
/poui-specialist:generate refactor --module financeiro   # will ask for .prw/.tlpp file
```

Por:

```
/poui-specialist:generate refactor --module financeiro   # will ask for .prw/.tlpp file
/poui-specialist:generate stacked-browse AprovacaoPedido --module compras
/poui-specialist:generate two-panel-browse ConciliacaoCartao --module financeiro
/poui-specialist:generate models Pedido --module compras
/poui-specialist:generate tlpp-contract Pedido --module compras
```

- [ ] **Step 4: Verificar os novos tipos**

```powershell
Select-String -Path "C:\TOTVS\Projetos\Claude\poui-specialist\commands\generate.md" -Pattern "stacked-browse|two-panel-browse|tlpp-contract"
```

Esperado: 3+ linhas encontradas (tabela + exemplos para cada tipo).

---

### Task 3: Adicionar `deploy-protheus.md` ao índice de `poui-patterns/SKILL.md` (B4)

**Files:**
- Modify: `skills/poui-patterns/SKILL.md`

- [ ] **Step 1: Verificar conteúdo atual do índice**

```powershell
Select-String -Path "C:\TOTVS\Projetos\Claude\poui-specialist\skills\poui-patterns\SKILL.md" -Pattern "deploy-protheus"
```

Esperado: sem saída. Se aparecer, o arquivo já foi corrigido — pule esta task.

- [ ] **Step 2: Adicionar entrada no índice**

No arquivo `C:\TOTVS\Projetos\Claude\poui-specialist\skills\poui-patterns\SKILL.md`, substituir:

```
- **PO-UI known quirks and fixes** (po-page-content opacity, po-input 8px offset, po-table horizontal scroll, dynamic table height): see `po-ui-quirks.md`
```

Por:

```
- **PO-UI known quirks and fixes** (po-page-content opacity, po-input 8px offset, po-table horizontal scroll, dynamic table height): see `po-ui-quirks.md`
- **Deploy no Protheus** (build `ng build`, pasta `.app`, rdmake com `FWCallApp`, `appserver.ini`): see `deploy-protheus.md`
```

- [ ] **Step 3: Verificar a entrada adicionada**

```powershell
Select-String -Path "C:\TOTVS\Projetos\Claude\poui-specialist\skills\poui-patterns\SKILL.md" -Pattern "deploy-protheus"
```

Esperado: uma linha com `see \`deploy-protheus.md\``.

---

### Task 4: Bump de versão 1.0.0 → 1.3.0 (G2)

**Files:**
- Modify: `.claude-plugin/plugin.json`
- Modify: `.claude-plugin/marketplace.json`
- Modify: `skills/poui-code-generation/SKILL.md`
- Modify: `agents/code-generator.md`

- [ ] **Step 1: Atualizar `plugin.json`**

No arquivo `C:\TOTVS\Projetos\Claude\poui-specialist\.claude-plugin\plugin.json`, substituir:

```
"version": "1.0.0",
```

Por:

```
"version": "1.3.0",
```

- [ ] **Step 2: Atualizar `marketplace.json`**

No arquivo `C:\TOTVS\Projetos\Claude\poui-specialist\.claude-plugin\marketplace.json`, substituir:

```
"version": "1.0.0",
```

Por:

```
"version": "1.3.0",
```

- [ ] **Step 3: Atualizar attribution header em `skills/poui-code-generation/SKILL.md`**

No arquivo `C:\TOTVS\Projetos\Claude\poui-specialist\skills\poui-code-generation\SKILL.md`, substituir:

```
 * @generated  poui-specialist v1.0
```

Por:

```
 * @generated  poui-specialist v1.3
```

- [ ] **Step 4: Atualizar attribution header em `agents/code-generator.md`**

No arquivo `C:\TOTVS\Projetos\Claude\poui-specialist\agents\code-generator.md`, substituir:

```
 * @generated  poui-specialist v1.0
```

Por:

```
 * @generated  poui-specialist v1.3
```

- [ ] **Step 5: Verificar todos os bumps**

```powershell
Select-String -Path "C:\TOTVS\Projetos\Claude\poui-specialist\.claude-plugin\plugin.json","C:\TOTVS\Projetos\Claude\poui-specialist\.claude-plugin\marketplace.json" -Pattern "version"
```

Esperado: ambas as linhas com `1.3.0`.

```powershell
Select-String -Path "C:\TOTVS\Projetos\Claude\poui-specialist\skills\poui-code-generation\SKILL.md","C:\TOTVS\Projetos\Claude\poui-specialist\agents\code-generator.md" -Pattern "poui-specialist v1"
```

Esperado: ambas as linhas com `v1.3`.

---

### Task 5: Criar `CHANGELOG.md` (G3)

**Files:**
- Create: `CHANGELOG.md` (raiz do plugin: `C:\TOTVS\Projetos\Claude\poui-specialist\`)

- [ ] **Step 1: Criar o arquivo com histórico retroativo**

Criar `C:\TOTVS\Projetos\Claude\poui-specialist\CHANGELOG.md` com o conteúdo:

```markdown
# Changelog

Todas as mudanças notáveis do plugin poui-specialist são documentadas aqui.

## [1.3.0] — 2026-06-11

### Fixed
- Corrige instrução incorreta de `p-selected-rows` no agent (não existe na biblioteca)
- Remove `'tag'` da lista de tipos válidos de `PoTableColumn` no agent
- Adiciona `stacked-browse` e `two-panel-browse` ao comando `/generate`
- Adiciona `deploy-protheus.md` ao índice da skill `poui-patterns`

### Added
- Tipos `models` e `tlpp-contract` listados no comando `/generate`
- `CHANGELOG.md` (este arquivo)

## [1.2.0] — 2026-06-09

### Added
- Template `stacked-browse`: dois po-table empilhados com navegação por teclado (ArrowUp/Down, Tab)
- Template `two-panel-browse`: painéis lado a lado para conciliação/matching
- Template `refactor-from-tlpp`: converte `.prw`/`.tlpp` existente para PO-UI
- `po-ui-quirks.md` com 11 quirks documentados de produção
- `deploy-protheus.md`: build, pasta `.app`, rdmake, `appserver.ini`
- Template `tlpp-contract`: contrato REST backend com skeleton WsRestFul
- Template `models`: interfaces TypeScript (simples, chave composta, flat relational)

## [1.1.0] — 2026-06-03

### Added
- Skill `poui-components` com 9 arquivos de referência de componentes
- Skill `poui-patterns` com `module-structure.md`, `protheus-rest.md`, `reactive-forms.md`, `po-ui-quirks.md`
- Template `master-detail`: lista com linhas filho expansíveis
- Template `stepper-form`: formulário wizard multi-etapas com `po-stepper`
- Template `page-detail`: tela de detalhe read-only com rota `:id`
- Template `page-dynamic`: lista zero-boilerplate via `PoPageDynamicTableComponent`
- Template `dashboard`: página de analytics com `po-widget` + `po-chart`

## [1.0.0] — 2026-05-28

### Added
- Versão inicial do plugin
- Templates: `page-list`, `page-dynamic-search`, `page-edit`, `modal-crud`, `service`, `module`
- Skill `poui-code-generation` com guia de seleção de template e regras críticas
- Agent `code-generator` e `code-reviewer`
- Comandos `/generate`, `/review`, `/docs`
```

- [ ] **Step 2: Verificar criação do arquivo**

```powershell
Test-Path "C:\TOTVS\Projetos\Claude\poui-specialist\CHANGELOG.md"
```

Esperado: `True`.

```powershell
Select-String -Path "C:\TOTVS\Projetos\Claude\poui-specialist\CHANGELOG.md" -Pattern "\[1.3.0\]"
```

Esperado: uma linha com a versão 1.3.0.

---

### Task 6: Commit único

**Files:** todos os modificados nas Tasks 1–5.

- [ ] **Step 1: Verificar status do git**

```powershell
git -C "C:\TOTVS\Projetos\Claude\poui-specialist" status
```

Esperado: lista com `agents/code-generator.md`, `commands/generate.md`, `skills/poui-patterns/SKILL.md`, `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `skills/poui-code-generation/SKILL.md`, e `CHANGELOG.md` (untracked).

- [ ] **Step 2: Staged e commit**

```powershell
git -C "C:\TOTVS\Projetos\Claude\poui-specialist" add agents/code-generator.md commands/generate.md skills/poui-patterns/SKILL.md .claude-plugin/plugin.json .claude-plugin/marketplace.json skills/poui-code-generation/SKILL.md CHANGELOG.md
```

```powershell
git -C "C:\TOTVS\Projetos\Claude\poui-specialist" commit -m @'
fix(plugin): corrige inconsistências de API e atualiza cobertura de templates

- Corrige po-table selection no agent (p-selected-rows não existe)
- Remove 'tag' dos tipos válidos de PoTableColumn no agent
- Adiciona stacked-browse e two-panel-browse ao comando /generate
- Adiciona models e tlpp-contract ao comando /generate
- Adiciona deploy-protheus.md ao índice de poui-patterns
- Bump de versão 1.0.0 → 1.3.0
- Cria CHANGELOG.md retroativo
'@
```

- [ ] **Step 3: Confirmar commit**

```powershell
git -C "C:\TOTVS\Projetos\Claude\poui-specialist" log --oneline -1
```

Esperado: hash + mensagem começando com `fix(plugin): corrige inconsistências...`.

---

## Self-Review

**Cobertura do spec:**
- B1 (selection errada) → Task 1 Step 2 ✓
- B2 ('tag' inválido) → Task 1 Step 4 ✓
- B3 (stacked/two-panel no command) → Task 2 Step 1 ✓
- B4 (deploy-protheus no índice) → Task 3 Step 2 ✓
- G1 (models/tlpp-contract no command) → Task 2 Step 2 + Step 3 ✓
- G2 (versão 1.3.0) → Task 4 Steps 1–4 ✓
- G3 (CHANGELOG) → Task 5 Step 1 ✓
- Commit único → Task 6 ✓

**Placeholders:** nenhum TBD ou "similar ao anterior" — cada step tem conteúdo completo.

**Consistência:** a versão `v1.3` é usada consistentemente em todos os 4 lugares (plugin.json, marketplace.json, SKILL.md, code-generator.md).
