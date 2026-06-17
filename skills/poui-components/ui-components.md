# PO-UI UI Components — Referência Complementar

Componentes de interface especializados disponíveis no PO-UI: exibição rica de dados,
popover, estatísticas, editor de conteúdo, calendário e contexto de menu.

---

## po-rich-text

Editor de texto rico com toolbar de formatação (negrito, itálico, listas, alinhamento).
Ideal para campos de observações, descrições longas ou conteúdo formatado pelo usuário.

### Key Inputs

| Input | Type | Description |
|-------|------|-------------|
| `p-label` | `string` | Rótulo do editor |
| `p-height` | `number` | Altura do editor em pixels (default `200`) |
| `p-placeholder` | `string` | Texto de placeholder |
| `p-readonly` | `boolean` | Modo somente leitura |
| `p-required` | `boolean` | Campo obrigatório |

### Key Outputs

| Output | Payload | Description |
|--------|---------|-------------|
| `(p-change)` | `string` | HTML do conteúdo ao alterar |

### Exemplos

```typescript
import { PoRichTextModule } from '@po-ui/ng-components';
// em imports do @Component: [PoRichTextModule]
```

```html
<!-- Editor de observações em formulário -->
<po-rich-text
  class="po-md-12"
  p-label="Observações"
  [p-height]="200"
  p-placeholder="Digite as observações..."
  formControlName="observacoes">
</po-rich-text>

<!-- Exibição somente leitura do conteúdo -->
<po-rich-text
  class="po-md-12"
  p-label="Descrição do Produto"
  [p-readonly]="true"
  [p-value]="produto().descricaoFormatada">
</po-rich-text>
```

> **Atenção:** O valor do `po-rich-text` é HTML string (ex: `<b>Texto</b>`).
> Ao salvar no backend Protheus, encode o HTML para evitar problemas de parsing.

---

## po-popover

Popup de conteúdo flutuante ancorado a um elemento-trigger — usado para exibir
informações contextuais sem abrir um modal. Controlado via `@ViewChild`.

### Key Inputs

| Input | Type | Description |
|-------|------|-------------|
| `p-title` | `string` | Título exibido no popover |
| `p-trigger` | `'click' \| 'hover'` | Evento que abre o popover (default `'click'`) |
| `p-position` | `'top' \| 'right' \| 'bottom' \| 'left'` | Posição em relação ao trigger |
| `p-hide-arrow` | `boolean` | Oculta a seta indicadora |

### Uso com @ViewChild

```typescript
import { ViewChild } from '@angular/core';
import { PoPopoverComponent, PoPopoverModule } from '@po-ui/ng-components';
// em imports: [PoPopoverModule]

@ViewChild(PoPopoverComponent) popover!: PoPopoverComponent;

openPopover(): void {
  this.popover.open();
}
```

```html
<!-- Trigger e popover precisam estar no mesmo template -->
<po-button
  p-label="Mais Informações"
  p-icon="po-icon-info"
  (p-click)="openPopover()">
</po-button>

<po-popover p-title="Detalhes" p-position="right">
  <div class="po-p-2">
    <po-info p-label="Código"    [p-value]="item().codigo"></po-info>
    <po-info p-label="Criado em" [p-value]="item().dataCriacao"></po-info>
  </div>
</po-popover>
```

> **Trigger hover:** Use `p-trigger="hover"` para tooltips ricos — a diferença em relação
> ao `[p-tooltip]` é que o popover suporta conteúdo HTML arbitrário no corpo.

---

## po-statistic

Exibe um indicador de KPI com valor, unidade, descrição e variação percentual.
Ideal para dashboards e painéis de acompanhamento.

### Key Inputs

| Input | Type | Description |
|-------|------|-------------|
| `p-value` | `number` | Valor principal do KPI |
| `p-description` | `string` | Rótulo/descrição do KPI |
| `p-unit` | `string` | Unidade de medida (ex: `'%'`, `'un'`, `'R$'`) |
| `p-icon` | `string` | Ícone PO (ex: `'po-icon-finance'`) |
| `p-help` | `string` | Tooltip de ajuda sobre o KPI |

### Exemplos

```typescript
import { PoStatisticModule } from '@po-ui/ng-components';
// em imports do @Component: [PoStatisticModule]
```

```html
<div class="po-row">

  <po-statistic
    class="po-md-3"
    p-description="Pedidos Hoje"
    [p-value]="kpis().pedidosHoje"
    p-unit="un"
    p-icon="po-icon-buy">
  </po-statistic>

  <po-statistic
    class="po-md-3"
    p-description="Faturamento"
    [p-value]="kpis().faturamento"
    p-unit="R$"
    p-icon="po-icon-finance">
  </po-statistic>

  <po-statistic
    class="po-md-3"
    p-description="Ticket Médio"
    [p-value]="kpis().ticketMedio"
    p-unit="R$"
    p-help="Valor médio por pedido no período">
  </po-statistic>

</div>
```

---

## po-key-value

Exibe pares chave-valor em layout de grade — similar ao `po-info` mas projetado
para listas de propriedades onde chave e valor vêm de um array de dados.

### Key Inputs

| Input | Type | Description |
|-------|------|-------------|
| `p-items` | `PoKeyValueItem[]` | Array de pares chave-valor |
| `p-columns` | `number` | Número de colunas na grade (default `1`) |

### PoKeyValueItem

```typescript
interface PoKeyValueItem {
  label: string;       // chave/rótulo
  value: any;          // valor exibido
  type?: 'string' | 'number' | 'currency' | 'date'; // formatação automática
}
```

### Exemplos

```typescript
import { PoKeyValueModule, PoKeyValueItem } from '@po-ui/ng-components';
// em imports: [PoKeyValueModule]

readonly infoItems: PoKeyValueItem[] = [
  { label: 'Código',       value: this.pedido.codigo },
  { label: 'Cliente',      value: this.pedido.nomeCliente },
  { label: 'Emissão',      value: this.pedido.dataEmissao,  type: 'date' },
  { label: 'Valor Total',  value: this.pedido.valorTotal,   type: 'currency' },
  { label: 'Status',       value: this.pedido.status },
];
```

```html
<po-key-value [p-items]="infoItems" [p-columns]="2"></po-key-value>
```

---

## po-code-editor

Editor de código com syntax highlighting baseado no Monaco Editor.
Ideal para telas de parametrização que exibem JSON, SQL, ou código de configuração.

### Key Inputs

| Input | Type | Description |
|-------|------|-------------|
| `p-language` | `string` | Linguagem para highlight (ex: `'json'`, `'sql'`, `'typescript'`) |
| `p-theme` | `'vs' \| 'vs-dark' \| 'hc-black'` | Tema do editor |
| `p-readonly` | `boolean` | Modo somente leitura |
| `p-height` | `number` | Altura em pixels (default `150`) |
| `p-show-diff` | `boolean` | Habilita modo diff (comparação side-by-side) |

### Exemplos

```typescript
import { PoCodeEditorModule } from '@po-ui/ng-components';
// em imports: [PoCodeEditorModule]
// Requer instalação separada do Monaco: npm install monaco-editor
```

```html
<!-- Editor de JSON para configuração de parâmetro -->
<po-code-editor
  p-language="json"
  [p-height]="200"
  p-theme="vs"
  formControlName="configJson">
</po-code-editor>

<!-- Visualizador de SQL somente leitura -->
<po-code-editor
  p-language="sql"
  [p-height]="150"
  [p-readonly]="true"
  [p-value]="queryGerada()">
</po-code-editor>
```

---

## po-calendar

Seletor de data visual com navegação mensal — alternativa ao `po-datepicker` para
telas que precisam exibir e selecionar datas em formato de calendário full.

### Key Inputs

| Input | Type | Description |
|-------|------|-------------|
| `p-value` | `Date \| string` | Data selecionada |
| `p-min-date` | `Date \| string` | Data mínima permitida |
| `p-max-date` | `Date \| string` | Data máxima permitida |
| `p-locale` | `string` | Localidade para nomes de meses/dias (default `'pt'`) |

### Key Outputs

| Output | Payload | Description |
|--------|---------|-------------|
| `(p-change)` | `Date` | Emitido ao selecionar uma data |

### Exemplos

```typescript
import { PoCalendarModule } from '@po-ui/ng-components';
// em imports: [PoCalendarModule]

readonly dataSelecionada = signal<Date | null>(null);

onDateChange(date: Date): void {
  this.dataSelecionada.set(date);
}
```

```html
<po-calendar
  p-locale="pt"
  [p-min-date]="hoje"
  [p-value]="dataSelecionada()"
  (p-change)="onDateChange($event)">
</po-calendar>
```

---

## po-context-menu

Menu contextual flutuante ativado por clique direito ou evento programático —
útil para ações contextuais em linhas de tabela ou itens de lista.

### Key Inputs

| Input | Type | Description |
|-------|------|-------------|
| `p-items` | `PoContextMenuAction[]` | Lista de ações do menu |
| `p-target` | `HTMLElement` | Elemento que aciona o menu contextual |

### PoContextMenuAction

```typescript
interface PoContextMenuAction {
  label:      string;
  action?:    (item: any) => void;
  disabled?:  boolean | ((item: any) => boolean);
  icon?:      string;
  separator?: boolean;
  type?:      'danger' | 'default';
  subItems?:  PoContextMenuAction[];
}
```

### Exemplos

```typescript
import {
  PoContextMenuModule,
  PoContextMenuAction,
} from '@po-ui/ng-components';
// em imports: [PoContextMenuModule]

readonly contextActions: PoContextMenuAction[] = [
  { label: 'Editar',    icon: 'po-icon-edit',   action: (row) => this.edit(row)   },
  { label: 'Duplicar',  icon: 'po-icon-copy',   action: (row) => this.copy(row)   },
  { separator: true, label: 'Excluir', icon: 'po-icon-delete', type: 'danger', action: (row) => this.delete(row) },
];
```

```html
<!-- Associa o menu contextual à tabela via ViewChild -->
<po-table
  #tabela
  [p-columns]="columns"
  [p-items]="items()">
</po-table>

<po-context-menu
  [p-target]="tabela"
  [p-items]="contextActions">
</po-context-menu>
```
