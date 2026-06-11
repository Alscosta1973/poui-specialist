# PO-UI Feedback e Status Components

## po-tag

Etiqueta visual para status, categorias e indicadores coloridos. Alternativa ao `type: 'label'` do `po-table` quando o tag precisa aparecer fora da tabela.

### Key Inputs

| Input | Type | Description |
|-------|------|-------------|
| `p-value` | `string` | Texto exibido |
| `p-kind` | `'default' \| 'success' \| 'warning' \| 'danger' \| 'disabled' \| 'neutral'` | Variante de cor semântica |
| `p-color` | `string` | Token de cor customizado (ex: `'color-08'`) — substitui `p-kind` |
| `p-icon` | `string` | Ícone PO (ex: `'po-icon-ok'`, `'po-icon-warning'`) |
| `p-removable` | `boolean` | Exibe botão X para remover |
| `p-inverse` | `boolean` | Inverte cor de fundo/texto |

### Outputs

| Output | Payload | Description |
|--------|---------|-------------|
| `(p-remove)` | `void` | Emitido ao clicar no X de remoção |

### Exemplos

```html
<po-tag p-value="Aprovado"  p-kind="success"></po-tag>
<po-tag p-value="Pendente"  p-kind="warning"></po-tag>
<po-tag p-value="Recusado"  p-kind="danger"></po-tag>
<po-tag p-value="Rascunho"  p-kind="neutral"></po-tag>

<po-tag p-value="Enviado" p-kind="success" p-icon="po-icon-ok"></po-tag>

<!-- Tags removíveis (ex: filtros ativos em busca) -->
@for (tag of activeTags(); track tag.value) {
  <po-tag
    [p-value]="tag.label"
    p-kind="default"
    [p-removable]="true"
    (p-remove)="removeTag(tag)">
  </po-tag>
}
```

```typescript
import { PoTagModule } from '@po-ui/ng-components';
// em imports do @Component: [PoTagModule]
```

### Mapeamento Protheus S/N → kind

```typescript
tagKind(ativo: string): 'success' | 'danger' {
  return ativo === 'S' ? 'success' : 'danger';
}
tagLabel(ativo: string): string {
  return ativo === 'S' ? 'Ativo' : 'Inativo';
}
```

```html
<po-tag [p-value]="tagLabel(row.ativo)" [p-kind]="tagKind(row.ativo)"></po-tag>
```

---

## po-info

Par rótulo/valor em layout compacto — alternativa leve ao `po-dynamic-view` quando os campos são fixos em tempo de compilação.

### Key Inputs

| Input | Type | Description |
|-------|------|-------------|
| `p-label` | `string` | Rótulo do campo |
| `p-value` | `string \| number` | Valor exibido |
| `p-orientation` | `'horizontal' \| 'vertical'` | Layout rótulo/valor (default `'horizontal'`) |
| `p-url` | `string` | Torna o valor um link clicável |

### Exemplo em tela de detalhe

```html
<div class="po-row">
  <po-info class="po-md-3" p-label="Código"     [p-value]="record().codigo"></po-info>
  <po-info class="po-md-9" p-label="Nome"       [p-value]="record().nome"></po-info>
  <po-info class="po-md-6" p-label="E-mail"     [p-value]="record().email"
           [p-url]="'mailto:' + record().email"></po-info>
  <po-info class="po-md-3" p-label="Emissão"    [p-value]="record().dataEmissao"></po-info>
  <po-info class="po-md-3" p-label="Valor"      [p-value]="record().valorTotal | currency:'BRL'"></po-info>
</div>
```

```typescript
import { PoInfoModule } from '@po-ui/ng-components';
// em imports do @Component: [PoInfoModule]
```

> **po-info vs po-dynamic-view:** Use `po-info` para campos fixos com controle total de grid; use `po-dynamic-view` para campos configurados em runtime ou reaproveitados de um `po-dynamic-form`.

---

## [p-tooltip] — Diretiva de tooltip

Exibe tooltip ao hover/foco em qualquer tag HTML ou componente PO-UI.

### Key Inputs

| Input | Type | Description |
|-------|------|-------------|
| `p-tooltip` | `string` | Texto do tooltip |
| `p-tooltip-position` | `'top' \| 'bottom' \| 'left' \| 'right' \| 'top-left' \| 'top-right' \| 'bottom-left' \| 'bottom-right'` | Posição (default `'top'`) |
| `p-hide-arrow` | `boolean` | Oculta a seta direcional |
| `p-inner-html` | `boolean` | Permite HTML no texto do tooltip |

### Exemplos

```html
<!-- Botão com tooltip explicativo -->
<po-button
  p-label="Excluir"
  p-kind="danger"
  p-tooltip="Remove permanentemente este registro"
  p-tooltip-position="top">
</po-button>

<!-- Ícone de ajuda inline -->
<span
  class="po-icon po-icon-info"
  p-tooltip="CNPJ deve estar no formato 00.000.000/0000-00"
  p-tooltip-position="right">
</span>

<!-- Campo desabilitado com explicação -->
<po-input
  p-label="Código"
  formControlName="codigo"
  [p-disabled]="isEdit()"
  p-tooltip="O código não pode ser alterado após a inclusão"
  p-tooltip-position="bottom">
</po-input>
```

```typescript
import { PoTooltipModule } from '@po-ui/ng-components';
// em imports do @Component: [PoTooltipModule]
```

---

## po-progress

Barra de progresso linear ou circular para uploads, importações e indicadores de meta.

### Key Inputs

| Input | Type | Description |
|-------|------|-------------|
| `p-value` | `number` | Percentual de 0 a 100 |
| `p-kind` | `'linear' \| 'circular'` | Estilo visual (default `'linear'`) |
| `p-show-percentage` | `boolean` | Exibe o número de percentual |
| `p-status` | `'default' \| 'success' \| 'error'` | Estado de cor |
| `p-text` | `string` | Texto abaixo da barra (só linear) |
| `p-size` | `'medium' \| 'thin'` | Espessura da barra (só linear) |

### Exemplos

```typescript
readonly uploadProgress = signal(0);
readonly uploadError    = signal(false);
readonly uploadDone     = signal(false);

get progressStatus(): 'default' | 'success' | 'error' {
  if (this.uploadError()) return 'error';
  if (this.uploadDone())  return 'success';
  return 'default';
}
```

```html
<po-progress
  [p-value]="uploadProgress()"
  p-kind="linear"
  [p-show-percentage]="true"
  [p-status]="progressStatus"
  p-text="Enviando arquivo...">
</po-progress>

<!-- indicador circular (ex: meta de vendas) -->
<po-progress
  [p-value]="metaAtingida()"
  p-kind="circular"
  [p-show-percentage]="true">
</po-progress>

<!-- barra fina no topo da página -->
<po-progress
  [p-value]="loadingPercent()"
  p-kind="linear"
  p-size="thin">
</po-progress>
```

```typescript
import { PoProgressModule } from '@po-ui/ng-components';
// em imports do @Component: [PoProgressModule]
```
