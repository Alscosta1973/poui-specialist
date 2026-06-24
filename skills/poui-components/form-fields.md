# PO-UI Form Fields

Todos os campos abaixo funcionam com Angular Reactive Forms (`formControlName`) e Template-driven Forms (`[(ngModel)]`).

## Quick Reference — Form Field Components

| Component | Key inputs | Critical notes |
|---|---|---|
| `po-input` | `p-label`, `p-maxlength`, `p-placeholder` | Use `p-maxlength` — not `p-max-length` (causes NG8002) |
| `po-number` | `p-label`, `p-min`, `p-max`, `p-step` | Set `p-min`/`p-max` for business rule enforcement |
| `po-decimal` | `p-label`, `p-decimals-length` | Default 2 decimal places |
| `po-select` | `p-label`, `p-options`, `p-required` | Options: `PoSelectOption[]` — `{ label, value }` |
| `po-combo` | `p-label`, `p-options`, `p-filter-service` | Use filter service for server-side search |
| `po-lookup` | `p-label`, `p-filter-service`, `p-columns`, `p-field-value`, `p-field-label` | Requires `PoLookupFilterService` implementation |
| `po-datepicker` | `p-label`, `p-min-date`, `p-max-date`, `p-format` | Default format `dd/MM/yyyy` |
| `po-datepicker-range` | `p-label`, `p-min-date`, `p-max-date` | Retorna `PoDatepickerRange` — `{ start, end }` |
| `po-datetimepicker` | `p-label`, `p-min-date`, `p-no-seconds` | Data + hora combinados em um campo |
| `po-timepicker` | `p-label`, `p-no-seconds`, `p-min-time` | Nova API de hora com painel flutuante — prefira a `po-time` |
| `po-switch` | `p-label`, `p-true-value`, `p-false-value` | Boolean by default |
| `po-checkbox-group` | `p-label`, `p-checkboxes` | Options: `PoCheckboxGroupItem[]` |
| `po-radio-group` | `p-label`, `p-options` | Options: `PoRadioGroupOption[]` |
| `po-multiselect` | `p-label`, `p-options`, `p-filter-mode` | Returns `string[]` |
| `po-textarea` | `p-label`, `p-rows`, `p-maxlength` | Import `PoFieldModule`, **not** `PoTextareaModule` |
| `po-upload` | `p-url`, `p-multiple`, `p-auto-upload` | Returns `PoUploadFile[]` |

---

## Common Inputs (all fields)

| Input | Type | Description |
|-------|------|-------------|
| `p-label` | `string` | Field label — **always required for accessibility** |
| `p-placeholder` | `string` | Placeholder text |
| `p-required` | `boolean` | Shows required indicator |
| `p-disabled` | `boolean` | Disables the field |
| `p-readonly` | `boolean` | Makes field read-only |
| `p-help-tooltip` | `string` | Help tooltip text |
| `p-error-message` | `string` | Custom error message |

---

## po-input

```html
<po-input
  p-label="Nome"
  p-placeholder="Digite o nome"
  formControlName="nome"
  [p-required]="true"
  [p-maxlength]="100">
</po-input>
```

Additional inputs: `p-maxlength`, `p-minlength`, `p-mask` (e.g., `(99) 99999-9999`), `p-type` (`text` | `password` | `email` | `tel`).

---

## po-number

```html
<po-number
  p-label="Quantidade"
  formControlName="quantidade"
  [p-min]="0"
  [p-max]="999">
</po-number>
```

---

## po-decimal

```html
<po-decimal
  p-label="Valor"
  formControlName="valor"
  [p-decimals-length]="2"
  [p-thousands-maxlength]="10">
</po-decimal>
```

---

## po-select

```typescript
readonly statusOptions: PoSelectOption[] = [
  { label: 'Ativo', value: 'A' },
  { label: 'Inativo', value: 'I' },
];
```

```html
<po-select
  p-label="Status"
  formControlName="status"
  [p-options]="statusOptions">
</po-select>
```

### PoSelectOption

```typescript
interface PoSelectOption {
  label: string;
  value: string | number | boolean;
}
```

---

## po-combo

```typescript
readonly estadoOptions: PoComboOption[] = [
  { label: 'São Paulo', value: 'SP' },
  { label: 'Rio de Janeiro', value: 'RJ' },
];
```

```html
<po-combo
  p-label="Estado"
  formControlName="estado"
  [p-options]="estadoOptions"
  [p-filter-mode]="'startsWith'">
</po-combo>
```

### Key Outputs

| Output | Payload | Description |
|--------|---------|-------------|
| `(p-change)` | `any` | Emitido ao selecionar uma opção |
| `(p-input-change)` | `string` | Emitido a cada keystroke no campo — use para busca dinâmica server-side sem `p-filter-service` |

---

## po-lookup

```typescript
readonly pedidoColumns: PoLookupColumn[] = [
  { property: 'codigo', label: 'Código', width: '20%' },
  { property: 'nome', label: 'Nome' },
];
```

```html
<po-lookup
  p-label="Pedido"
  p-field-value="codigo"
  p-field-label="nome"
  formControlName="pedidoCodigo"
  [p-columns]="pedidoColumns"
  [p-filter-service]="pedidoFilterService">
</po-lookup>
```

---

## po-datepicker

```html
<po-datepicker
  p-label="Data de Emissão"
  formControlName="dataEmissao"
  p-format="dd/mm/yyyy"
  [p-min-date]="minDate"
  [p-max-date]="maxDate">
</po-datepicker>
```

---

## po-datepicker-range

Campo para seleção de um período entre duas datas — início e fim em um único campo.
Ideal para filtros de relatório, parametrização de períodos ou intervalo de datas em formulários.

### Key Inputs

| Input | Type | Description |
|-------|------|-------------|
| `p-label` | `string` | Rótulo do campo |
| `p-min-date` | `Date \| string` | Data mínima permitida |
| `p-max-date` | `Date \| string` | Data máxima permitida |
| `p-required` | `boolean` | Campo obrigatório |
| `p-disabled` | `boolean` | Desabilita o campo |
| `p-clean` | `boolean` | Exibe botão para limpar o valor (default `true`) |

### Key Outputs

| Output | Payload | Description |
|--------|---------|-------------|
| `(p-change)` | `PoDatepickerRange` | Emitido ao selecionar o intervalo |

### PoDatepickerRange

```typescript
interface PoDatepickerRange {
  start: Date | string;
  end:   Date | string;
}
```

### Exemplos

```typescript
import { PoDatepickerRangeModule, PoDatepickerRange } from '@po-ui/ng-components';
// em imports: [PoDatepickerRangeModule]

readonly periodo = signal<PoDatepickerRange | null>(null);

onPeriodoChange(range: PoDatepickerRange): void {
  this.periodo.set(range);
}
```

```html
<po-datepicker-range
  class="po-md-6"
  p-label="Período de Emissão"
  formControlName="periodo"
  [p-required]="true"
  (p-change)="onPeriodoChange($event)">
</po-datepicker-range>
```

> **Reactive Forms:** O valor do `formControl` é `PoDatepickerRange` — ao submeter, acesse
> `form.value.periodo.start` e `form.value.periodo.end`.

---

## po-datetimepicker

Campo que combina data e hora em um único input — substitui o uso de `po-datepicker` + `po-time` juntos.
Útil para agendamentos e registros de eventos com hora exata.

### Key Inputs

| Input | Type | Description |
|-------|------|-------------|
| `p-label` | `string` | Rótulo do campo |
| `p-min-date` | `string` | Data/hora mínima (formato ISO `yyyy-MM-ddTHH:mm:ss`) |
| `p-max-date` | `string` | Data/hora máxima |
| `p-no-seconds` | `boolean` | Oculta os segundos no campo de hora (default `false`) |
| `p-required` | `boolean` | Campo obrigatório |
| `p-disabled` | `boolean` | Desabilita o campo |

### Key Outputs

| Output | Payload | Description |
|--------|---------|-------------|
| `(p-change)` | `string` | Data/hora selecionada em formato ISO |

### Exemplos

```typescript
import { PoDatetimepickerModule } from '@po-ui/ng-components';
// em imports: [PoDatetimepickerModule]
```

```html
<!-- Agendamento com data e hora — sem segundos -->
<po-datetimepicker
  class="po-md-6"
  p-label="Data e Hora do Agendamento"
  [p-no-seconds]="true"
  [p-required]="true"
  formControlName="dataHoraAgendamento">
</po-datetimepicker>
```

> **Substitui po-datepicker + po-time:** Use `po-datetimepicker` sempre que precisar de
> data e hora no mesmo campo — evita sincronizar dois campos separados no formulário.

---

## po-switch

```html
<po-switch
  p-label="Ativo"
  formControlName="ativo"
  p-label-on="Sim"
  p-label-off="Não">
</po-switch>
```

---

## po-checkbox / po-checkbox-group

```typescript
readonly permissaoOptions = [
  { value: 'read', label: 'Leitura' },
  { value: 'write', label: 'Escrita' },
];
```

```html
<!-- Single -->
<po-checkbox p-label="Aceito os termos" formControlName="aceito"></po-checkbox>

<!-- Group -->
<po-checkbox-group
  p-label="Permissões"
  formControlName="permissoes"
  [p-options]="permissaoOptions">
</po-checkbox-group>
```

---

## po-radio-group

```typescript
readonly generoOptions = [
  { value: 'M', label: 'Masculino' },
  { value: 'F', label: 'Feminino' },
];
```

```html
<po-radio-group
  p-label="Gênero"
  formControlName="genero"
  [p-options]="generoOptions">
</po-radio-group>
```

---

## po-multiselect

```typescript
readonly tagOptions: PoMultiselectOption[] = [
  { value: 'vip', label: 'VIP' },
  { value: 'prospect', label: 'Prospect' },
];
```

```html
<po-multiselect
  p-label="Tags"
  formControlName="tags"
  [p-options]="tagOptions">
</po-multiselect>
```

### Key Outputs

| Output | Payload | Description |
|--------|---------|-------------|
| `(p-change)` | `string[]` | Emitido ao selecionar/remover opções |
| `(p-input-change)` | `string` | Emitido a cada keystroke no filtro interno da lista |

---

## po-textarea

```html
<po-textarea
  p-label="Observações"
  formControlName="observacoes"
  [p-rows]="4"
  [p-maxlength]="500">
</po-textarea>
```

---

## po-upload

Componente para envio de arquivos. Suporta upload automático ou manual, múltiplos arquivos,
drag-and-drop, e validação de extensão e tamanho.

### Key Inputs

| Input | Type | Description |
|-------|------|-------------|
| `p-url` | `string` | URL de destino do upload (multipart/form-data) |
| `p-allowed-extensions` | `string[]` | Extensões permitidas (ex: `['.pdf', '.jpg', '.png']`) |
| `p-auto-upload` | `boolean` | Inicia upload imediatamente ao selecionar o arquivo |
| `p-drag-drop` | `boolean` | Habilita zona de drag-and-drop |
| `p-multiple` | `boolean` | Permite selecionar múltiplos arquivos |
| `p-max-file-size` | `number` | Tamanho máximo em bytes (ex: `5242880` = 5 MB) |
| `p-required` | `boolean` | Campo obrigatório |
| `p-disabled` | `boolean` | Desabilita o componente |
| `p-label` | `string` | Rótulo exibido acima do componente |

### Key Outputs

| Output | Payload | Description |
|--------|---------|-------------|
| `(p-upload)` | `PoUploadFile[]` | Emitido após upload bem-sucedido |
| `(p-success)` | `any` | Resposta HTTP do servidor após upload |
| `(p-error)` | `any` | Erro de upload (HTTP ou validação) |
| `(p-change)` | `PoUploadFile[]` | Arquivos selecionados (antes do upload) |

### Exemplos

```typescript
import { PoUploadModule } from '@po-ui/ng-components';
// em imports do @Component: [PoUploadModule]
```

```html
<!-- Upload automático de PDF — máx 10 MB -->
<po-upload
  p-label="Anexar NF-e (PDF)"
  p-url="/rest/api/custom/v1/documentos/upload"
  [p-allowed-extensions]="['.pdf']"
  [p-auto-upload]="true"
  [p-max-file-size]="10485760"
  [p-required]="true"
  (p-success)="onUploadSuccess($event)"
  (p-error)="onUploadError($event)">
</po-upload>

<!-- Upload manual com múltiplos arquivos e drag-and-drop -->
<po-upload
  p-label="Documentos Complementares"
  p-url="/rest/api/custom/v1/documentos/upload"
  [p-allowed-extensions]="['.pdf', '.jpg', '.png', '.docx']"
  [p-multiple]="true"
  [p-drag-drop]="true"
  [p-max-file-size]="5242880"
  (p-change)="onFilesSelected($event)"
  (p-upload)="onUploadComplete($event)">
</po-upload>
```

```typescript
onUploadSuccess(response: any): void {
  this.notification.success('Arquivo enviado com sucesso.');
}

onUploadError(error: any): void {
  this.notification.error('Erro ao enviar arquivo. Verifique o formato e tamanho.');
}

onFilesSelected(files: PoUploadFile[]): void {
  // chamado ao selecionar — antes do upload
  this.selectedFiles = files;
}
```

> **Integração Protheus:** O endpoint de upload deve aceitar `multipart/form-data`.
> No ADVPL, use `oRequest:GetMultipartBody()` para ler o arquivo recebido.

---

## po-password

Campo de senha com toggle de visibilidade, indicador de força e suporte a regras de validação.

### Key Inputs

| Input | Type | Description |
|-------|------|-------------|
| `p-label` | `string` | Rótulo do campo |
| `p-required` | `boolean` | Campo obrigatório |
| `p-disabled` | `boolean` | Desabilita o campo |
| `p-placeholder` | `string` | Texto de placeholder |
| `p-maxlength` | `number` | Comprimento máximo |
| `p-error-message` | `string` | Mensagem de erro customizada |

### Exemplos

```typescript
import { PoPasswordModule } from '@po-ui/ng-components';
// em imports do @Component: [PoPasswordModule]
```

```html
<!-- Senha com required e maxlength -->
<po-password
  class="po-md-6"
  p-label="Senha"
  [p-required]="true"
  [p-maxlength]="20"
  formControlName="senha">
</po-password>

<!-- Confirmação de senha com validação customizada -->
<po-password
  class="po-md-6"
  p-label="Confirmar Senha"
  [p-required]="true"
  p-error-message="Senhas não conferem"
  formControlName="confirmaSenha">
</po-password>
```

---

## po-time

Campo de entrada de hora com máscara automática — formato HH:MM ou HH:MM:SS.

### Key Inputs

| Input | Type | Description |
|-------|------|-------------|
| `p-label` | `string` | Rótulo do campo |
| `p-required` | `boolean` | Campo obrigatório |
| `p-disabled` | `boolean` | Desabilita o campo |
| `p-no-seconds` | `boolean` | Oculta os segundos — usa formato HH:MM (default `false`) |
| `p-min-time` | `string` | Hora mínima permitida (formato `HH:MM` ou `HH:MM:SS`) |
| `p-max-time` | `string` | Hora máxima permitida |

### Exemplos

```typescript
import { PoTimeModule } from '@po-ui/ng-components';
// em imports do @Component: [PoTimeModule]
```

```html
<!-- Hora sem segundos (formato HH:MM) -->
<po-time
  class="po-md-3"
  p-label="Hora de Início"
  [p-no-seconds]="true"
  formControlName="horaInicio">
</po-time>

<!-- Hora completa com restrição de intervalo comercial -->
<po-time
  class="po-md-3"
  p-label="Hora de Agendamento"
  p-min-time="08:00:00"
  p-max-time="18:00:00"
  formControlName="horaAgendamento">
</po-time>
```

---

## po-timepicker

Componente de hora com painel flutuante de seleção — API mais recente que `po-time`.
Prefira `po-timepicker` em novos componentes; `po-time` segue suportado mas não evolui.

### Key Inputs

| Input | Type | Description |
|-------|------|-------------|
| `p-label` | `string` | Rótulo do campo |
| `p-no-seconds` | `boolean` | Oculta os segundos — usa formato HH:MM (default `false`) |
| `p-min-time` | `string` | Hora mínima permitida (formato `HH:MM` ou `HH:MM:SS`) |
| `p-max-time` | `string` | Hora máxima permitida |
| `p-required` | `boolean` | Campo obrigatório |
| `p-disabled` | `boolean` | Desabilita o campo |

### Key Outputs

| Output | Payload | Description |
|--------|---------|-------------|
| `(p-change)` | `string` | Hora selecionada em formato `HH:MM:SS` ou `HH:MM` |

### Exemplos

```typescript
import { PoTimepickerModule } from '@po-ui/ng-components';
// em imports: [PoTimepickerModule]
```

```html
<!-- Hora sem segundos com janela comercial -->
<po-timepicker
  class="po-md-3"
  p-label="Hora de Início"
  [p-no-seconds]="true"
  p-min-time="08:00"
  p-max-time="18:00"
  formControlName="horaInicio">
</po-timepicker>
```

> **po-time vs po-timepicker:** Ambos funcionam, mas `po-timepicker` é a API mais recente
> com painel flutuante de seleção. Use `po-timepicker` em novos componentes.

---

## PoLookupFilterService — implementação completa

O `po-lookup` requer um serviço que implemente a interface `PoLookupFilter`.
Diferente dos outros campos, o po-lookup NÃO aceita uma URL diretamente — requer um serviço Angular.

### Interface PoLookupFilter

```typescript
import { Observable } from 'rxjs';
import {
  PoLookupFilter,
  PoLookupFilteredItemsParams,
  PoLookupResponseApi,
} from '@po-ui/ng-components';

// Contrato que o serviço DEVE implementar:
interface PoLookupFilter {
  getFilteredData(
    params: PoLookupFilteredItemsParams,
    filterParams?: any,
  ): Observable<PoLookupResponseApi>;

  getObjectByValue(
    value: string | number,
    filterParams?: any,
  ): Observable<any>;
}

interface PoLookupFilteredItemsParams {
  filter:   string;   // termo digitado pelo usuário na busca
  page:     number;   // paginação 1-based
  pageSize: number;   // itens por página (default 10)
}

interface PoLookupResponseApi {
  items:   any[];
  hasNext: boolean;
}
```

### Implementação — chave simples

```typescript
// src/app/<modulo>/services/pedido-lookup.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  PoLookupFilter,
  PoLookupFilteredItemsParams,
  PoLookupResponseApi,
} from '@po-ui/ng-components';

@Injectable({ providedIn: 'root' })
export class PedidoLookupService implements PoLookupFilter {
  private readonly http    = inject(HttpClient);
  private readonly baseUrl = '/rest/api/custom/v1/pedidos';

  getFilteredData(
    { filter, page, pageSize }: PoLookupFilteredItemsParams,
  ): Observable<PoLookupResponseApi> {
    const params = new HttpParams()
      .set('page',     page.toString())
      .set('pageSize', pageSize.toString())
      .set('q',        filter ?? '');
    return this.http.get<PoLookupResponseApi>(this.baseUrl, { params });
  }

  getObjectByValue(value: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/${value}`);
  }
}
```

### Implementação — chave composta (código + loja)

```typescript
@Injectable({ providedIn: 'root' })
export class ParceiroLookupService implements PoLookupFilter {
  private readonly http    = inject(HttpClient);
  private readonly baseUrl = '/rest/api/custom/v1/parceiros';

  getFilteredData(
    { filter, page, pageSize }: PoLookupFilteredItemsParams,
  ): Observable<PoLookupResponseApi> {
    const params = new HttpParams()
      .set('page',     page.toString())
      .set('pageSize', pageSize.toString())
      .set('q',        filter ?? '');
    return this.http.get<PoLookupResponseApi>(this.baseUrl, { params });
  }

  // Para chave composta, armazene como 'codigo|loja' e decodifique aqui
  getObjectByValue(value: string): Observable<any> {
    const [codigo, loja] = value.split('|');
    return this.http.get(`${this.baseUrl}/${codigo}/${loja}`);
  }
}
```

### Uso no componente

```typescript
import { inject } from '@angular/core';
import { PoLookupColumn, PoLookupModule } from '@po-ui/ng-components';
import { PedidoLookupService } from '../services/pedido-lookup.service';

// No @Component:
readonly pedidoLookupService = inject(PedidoLookupService);

readonly pedidoColumns: PoLookupColumn[] = [
  { property: 'codigo', label: 'Código', width: '12%' },
  { property: 'loja',   label: 'Loja',   width: '8%' },
  { property: 'nome',   label: 'Nome' },
  { property: 'cnpj',   label: 'CNPJ',   width: '18%' },
];
```

```html
<po-lookup
  p-label="Pedido"
  p-field-value="codigo"
  p-field-label="nome"
  formControlName="pedidoCodigo"
  [p-columns]="pedidoColumns"
  [p-filter-service]="pedidoLookupService">
</po-lookup>
```

```typescript
import { PoLookupModule } from '@po-ui/ng-components';
// em imports do @Component: [PoLookupModule]
```
