# PO-UI Dynamic Form Fields

`PoDynamicFormField` → `po-dynamic-form` / `PoPageDynamicEdit` | `PoDynamicViewField` → `po-dynamic-view` / `PoPageDynamicDetail`

```typescript
import { PoDynamicFormField, PoDynamicViewField } from '@po-ui/ng-components';
```

---

## PoDynamicFormField

```typescript
interface PoDynamicFormField {
  property: string;

  // layout
  label?: string;         // default: property em Title Case
  divider?: string;       // separador de seção
  gridColumns?: number;   // desktop 1-12 (padrão 6)
  gridSmColumns?: number; // mobile 1-12 (padrão 12)
  visible?: boolean;      // default true

  // validação
  required?: boolean;     // exibe indicador *
  optional?: boolean;     // exibe "(Opcional)" mesmo sem required
  disabled?: boolean;
  minLength?: number;
  maxLength?: number;
  // ATENÇÃO: min/max NÃO existem em PoDynamicFormField — causam TS2353. Não usar.
  regex?: string;
  errorMessage?: string;

  // tipo — default: 'string' → po-input
  type?: 'boolean'  // po-switch (S/N via booleanTrue/booleanFalse)
       | 'currency' // po-decimal (R$)
       | 'date' | 'dateRange' | 'dateTime'
       | 'number'   // po-number (inteiro)
       | 'string' | 'time' | 'password' | 'email' | 'tel'
       | 'cpf' | 'cnpj'; // máscara + validação automática

  // options → po-select (array) | po-checkbox-group (optionsMulti) | po-combo (URL)
  options?: Array<{ label: string; value: any }> | string;
  fieldLabel?: string;    // default: 'label'
  fieldValue?: string;    // default: 'value'
  optionsMulti?: boolean; // true → po-checkbox-group
  optionsService?: string; // URL GET → po-combo
  sort?: boolean;

  // lookup — searchService definido → po-lookup automático
  searchService?: string | PoLookupFilter;
  columns?: PoLookupColumn[];
  // Ver form-fields.md para PoLookupFilterService

  // máscara: 9=dígito obrig, 0=opc, L=letra, *=letra ou dígito
  mask?: string;          // ex: '(99) 99999-9999'
  maskFormatModel?: boolean; // true → ngModel sem chars de máscara

  decimalsLength?: number; // padrão 2 para currency
  thousandMaxlength?: number;

  booleanTrue?: string;   // ex: 'S', 'Sim', 'Ativo'
  booleanFalse?: string;  // ex: 'N', 'Não', 'Inativo'
  format?: string;        // ex: 'dd/MM/yyyy' — CORRETO; 'dateFormat' NÃO existe (TS2353)
  rows?: number;          // > 0 → textarea
  key?: boolean;          // chave primária (PoPageDynamicEdit)
}
```

---

## Exemplos

```typescript
readonly fields: PoDynamicFormField[] = [
  { property: 'codigo',   label: 'Código',           divider: 'Identificação', required: true, maxLength: 6,  gridColumns: 4, key: true },
  { property: 'nome',     label: 'Nome / Razão Social',                         required: true, minLength: 3, maxLength: 40,  gridColumns: 8 },

  // máscara nativa → type 'cnpj'/'cpf' aplica máscara e validação automáticas
  { property: 'cnpj',     label: 'CNPJ',     type: 'cnpj', required: true, gridColumns: 5 },
  { property: 'cpf',      label: 'CPF',      type: 'cpf',                  gridColumns: 4 },
  { property: 'telefone', label: 'Telefone', mask: '(99) 99999-9999',       gridColumns: 4 },
  { property: 'cep',      label: 'CEP',      mask: '99999-999',             gridColumns: 3 },

  { property: 'email', label: 'E-mail', regex: '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$', errorMessage: 'Informe um e-mail válido', optional: true, gridColumns: 8 },

  { property: 'quantidade',    label: 'Quantidade',    type: 'number',   gridColumns: 3 },
  { property: 'valorUnitario', label: 'Valor Unitário', type: 'currency', decimalsLength: 2, gridColumns: 4 },
  { property: 'dataEmissao',   label: 'Data de Emissão', type: 'date',   required: true, format: 'dd/MM/yyyy', gridColumns: 4 },

  // po-select estático
  {
    property: 'situacao', label: 'Situação', divider: 'Status',
    options: [
      { label: 'Ativo',    value: 'S' },
      { label: 'Inativo',  value: 'N' },
      { label: 'Bloqueado', value: 'B' },
    ],
    gridColumns: 4,
  },

  // po-checkbox-group (optionsMulti: true)
  {
    property: 'permissoes', label: 'Permissões',
    options: [
      { label: 'Incluir',   value: 'I' },
      { label: 'Alterar',   value: 'A' },
      { label: 'Excluir',   value: 'E' },
      { label: 'Consultar', value: 'C' },
    ],
    optionsMulti: true, gridColumns: 12,
  },

  // po-combo via URL
  { property: 'filial', label: 'Filial', optionsService: '/rest/api/custom/v1/filiais', fieldLabel: 'descricao', fieldValue: 'codigo', gridColumns: 6 },

  // po-switch — padrão Protheus S/N
  { property: 'ativo', label: 'Ativo', type: 'boolean', booleanTrue: 'S', booleanFalse: 'N', gridColumns: 3 },

  { property: 'observacoes', label: 'Observações', divider: 'Complemento', rows: 4, maxLength: 500, optional: true, gridColumns: 12 },
];
```

---

## PoDynamicViewField

```typescript
interface PoDynamicViewField {
  property: string;
  label?: string;            // default: property em Title Case
  gridColumns?: number;      // 1-12 (padrão 6)

  // default: 'string'
  type?: 'string' | 'number'
       | 'currency'          // R$
       | 'date' | 'dateTime'
       | 'boolean'           // exibe booleanTrue/booleanFalse
       | 'link'              // <a href> (value = URL)
       | 'subtitle';

  format?: string;           // ex: 'dd/MM/yyyy' | 'dd/MM/yyyy HH:mm'
  concatLinesLimit?: number;
  tag?: boolean;
  color?: string;            // token PO-UI (ex: 'color-10', 'color-07')
  booleanTrue?: string;      // ex: 'Ativo', 'Sim'
  booleanFalse?: string;     // ex: 'Inativo', 'Não'
}
```

```typescript
readonly viewFields: PoDynamicViewField[] = [
  { property: 'codigo',      label: 'Código',      gridColumns: 3 },
  { property: 'nome',        label: 'Nome',         gridColumns: 9 },
  { property: 'cnpj',        label: 'CNPJ',         gridColumns: 4 },
  { property: 'email',       label: 'E-mail',       gridColumns: 5, type: 'link' },
  { property: 'dataEmissao', label: 'Emissão',      type: 'date', format: 'dd/MM/yyyy', gridColumns: 3 },
  { property: 'valorTotal',  label: 'Valor Total',  type: 'currency', gridColumns: 3 },
  { property: 'ativo', label: 'Status', type: 'boolean', booleanTrue: 'Ativo', booleanFalse: 'Inativo', tag: true, color: 'color-11', gridColumns: 3 },
];
```

---

## Mapeamento type → componente

| `type` | `options?` | `optionsMulti?` | `searchService?` | `rows?` | Componente |
|--------|-----------|----------------|-----------------|---------|-----------|
| `'string'` | — | — | — | — | `po-input` |
| `'string'` | array | false | — | — | `po-select` |
| `'string'` | array | true | — | — | `po-checkbox-group` |
| `'string'` | URL/string | — | — | — | `po-combo` |
| `'string'` | — | — | definido | — | `po-lookup` |
| `'string'` | — | — | — | > 0 | `po-textarea` |
| `'number'` | — | — | — | — | `po-number` |
| `'currency'` | — | — | — | — | `po-decimal` |
| `'boolean'` | — | — | — | — | `po-switch` |
| `'date'` | — | — | — | — | `po-datepicker` |
| `'cpf'` | — | — | — | — | `po-input` (máscara+validação CPF) |
| `'cnpj'` | — | — | — | — | `po-input` (máscara+validação CNPJ) |
| `'password'` | — | — | — | — | `po-password` |
