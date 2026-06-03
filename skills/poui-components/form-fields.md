# PO-UI Form Fields

All fields below work with Angular Reactive Forms (`formControlName`) and Template-driven Forms (`[(ngModel)]`).

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

---

## po-lookup

```typescript
readonly clienteColumns: PoLookupColumn[] = [
  { property: 'codigo', label: 'Código', width: '20%' },
  { property: 'nome', label: 'Nome' },
];
```

```html
<po-lookup
  p-label="Cliente"
  p-field-value="codigo"
  p-field-label="nome"
  formControlName="clienteCodigo"
  [p-columns]="clienteColumns"
  [p-filter-service]="clienteFilterService">
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
// src/app/<modulo>/services/cliente-lookup.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  PoLookupFilter,
  PoLookupFilteredItemsParams,
  PoLookupResponseApi,
} from '@po-ui/ng-components';

@Injectable({ providedIn: 'root' })
export class ClienteLookupService implements PoLookupFilter {
  private readonly http    = inject(HttpClient);
  private readonly baseUrl = '/rest/api/custom/v1/clientes';

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
export class FornecedorLookupService implements PoLookupFilter {
  private readonly http    = inject(HttpClient);
  private readonly baseUrl = '/rest/api/custom/v1/fornecedores';

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
import { ClienteLookupService } from '../services/cliente-lookup.service';

// No @Component:
readonly clienteLookupService = inject(ClienteLookupService);

readonly clienteColumns: PoLookupColumn[] = [
  { property: 'codigo', label: 'Código', width: '12%' },
  { property: 'loja',   label: 'Loja',   width: '8%' },
  { property: 'nome',   label: 'Nome' },
  { property: 'cnpj',   label: 'CNPJ',   width: '18%' },
];
```

```html
<po-lookup
  p-label="Cliente"
  p-field-value="codigo"
  p-field-label="nome"
  formControlName="clienteCodigo"
  [p-columns]="clienteColumns"
  [p-filter-service]="clienteLookupService">
</po-lookup>
```

```typescript
import { PoLookupModule } from '@po-ui/ng-components';
// em imports do @Component: [PoLookupModule]
```
