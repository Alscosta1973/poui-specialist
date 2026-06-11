# PO-UI Dynamic Form Fields — Interface Completa

Referência completa de `PoDynamicFormField` (usado em `po-dynamic-form` e `PoPageDynamicEdit`)
e `PoDynamicViewField` (usado em `po-dynamic-view` e `PoPageDynamicDetail`).

```typescript
import {
  PoDynamicFormField,
  PoDynamicViewField,
} from '@po-ui/ng-components';
```

---

## PoDynamicFormField — todos os campos

```typescript
interface PoDynamicFormField {
  // ──────────── OBRIGATÓRIO ────────────
  property: string;

  // ──────────── RÓTULO E LAYOUT ────────────
  label?: string;            // rótulo do campo (default: property em Title Case)
  divider?: string;          // texto de separador de seção acima deste campo
  gridColumns?: number;      // largura desktop: 1-12 (padrão 6)
  gridSmColumns?: number;    // largura mobile/small: 1-12 (padrão 12)
  visible?: boolean;         // exibe/oculta o campo (default true)

  // ──────────── VALIDAÇÃO ────────────
  required?: boolean;        // campo obrigatório — exibe indicador visual *
  optional?: boolean;        // exibe "(Opcional)" mesmo quando required é false
  disabled?: boolean;
  minLength?: number;        // mínimo de caracteres (type: 'string')
  maxLength?: number;        // máximo de caracteres (type: 'string')
  min?: number;              // valor mínimo (type: 'number' | 'currency')
  max?: number;              // valor máximo (type: 'number' | 'currency')
  regex?: string;
  errorMessage?: string;     // mensagem exibida quando regex ou validação falha

  // ──────────── TIPO ────────────
  // default: 'string' → po-input
  type?: 'boolean'           // po-switch (true/false ou S/N via booleanTrue/booleanFalse)
       | 'currency'          // po-decimal formatado como moeda (R$)
       | 'date'              // po-datepicker
       | 'dateRange'         // po-datepicker com seleção de intervalo
       | 'dateTime'          // po-datepicker com campo de hora
       | 'number'            // po-number (inteiro sem decimais)
       | 'string'            // po-input de texto (padrão)
       | 'time'              // campo de hora (HH:MM)
       | 'cpf'               // po-input com máscara e validação de CPF automática
       | 'cnpj'              // po-input com máscara e validação de CNPJ automática
       | 'password'          // po-password (caracteres ocultos com toggle)
       | 'email'             // po-input type email + validação de formato
       | 'tel';              // po-input type tel

  // ──────────── OPÇÕES (select / combo / radio / checkbox-group) ────────────
  options?: Array<{ label: string; value: any }> | string;
  //   Array estático  → po-select (optionsMulti: false) ou po-checkbox-group (optionsMulti: true)
  //   String (URL)    → po-combo com carregamento assíncrono via GET
  fieldLabel?: string;       // propriedade do label nas options (default: 'label')
  fieldValue?: string;       // propriedade do value nas options (default: 'value')
  optionsMulti?: boolean;    // true → po-checkbox-group (seleção múltipla)
  optionsService?: string;   // URL para carregar options via GET → resulta em po-combo
  sort?: boolean;            // ordena as options alfabeticamente por label

  // ──────────── LOOKUP (po-lookup) ────────────
  // Quando searchService está definido, o campo torna-se po-lookup automaticamente
  searchService?: string | PoLookupFilter;  // serviço ou URL de busca
  columns?: PoLookupColumn[];               // colunas do modal de busca
  // Ver form-fields.md para implementação completa do PoLookupFilterService

  // ──────────── MÁSCARA ────────────
  mask?: string;             // padrão de máscara (ex: '(99) 99999-9999', '99999-999')
  //   9 → dígito obrigatório
  //   0 → dígito opcional
  //   L → letra obrigatória
  //   * → letra ou dígito obrigatório
  maskFormatModel?: boolean; // true → o ngModel armazena apenas os chars digitados (sem máscara)

  // ──────────── NÚMERO E MOEDA ────────────
  decimalsLength?: number;   // casas decimais (default: 2 para currency)
  thousandMaxlength?: number;// máximo de dígitos antes da vírgula decimal

  // ──────────── BOOLEAN ────────────
  booleanTrue?: string;      // label/valor do estado verdadeiro (ex: 'Sim', 'S', 'Ativo')
  booleanFalse?: string;     // label/valor do estado falso (ex: 'Não', 'N', 'Inativo')

  // ──────────── DATA ────────────
  dateFormat?: string;       // formato de exibição (ex: 'dd/MM/yyyy')

  // ──────────── TEXTAREA ────────────
  rows?: number;             // número de linhas → ativa modo textarea automaticamente

  // ──────────── CHAVE (PoPageDynamicEdit) ────────────
  key?: boolean;             // marca o campo como chave primária (usado pelo PoPageDynamic*)
}
```

---

## Exemplos práticos por tipo

```typescript
readonly fields: PoDynamicFormField[] = [

  // ── Seção: Identificação ──
  {
    property:   'codigo',
    label:      'Código',
    divider:    'Identificação',
    required:   true,
    maxLength:  6,
    gridColumns: 4,
    key:        true,              // chave para PoPageDynamicEdit
  },
  {
    property:   'nome',
    label:      'Nome / Razão Social',
    required:   true,
    minLength:  3,
    maxLength:  40,
    gridColumns: 8,
  },

  // ── Campos com máscara nativa (validação automática) ──
  {
    property: 'cnpj',
    label:    'CNPJ',
    type:     'cnpj',
    required: true,
    gridColumns: 5,
  },
  {
    property: 'cpf',
    label:    'CPF',
    type:     'cpf',
    gridColumns: 4,
  },
  {
    property: 'telefone',
    label:    'Telefone',
    mask:     '(99) 99999-9999',
    gridColumns: 4,
  },
  {
    property: 'cep',
    label:    'CEP',
    mask:     '99999-999',
    gridColumns: 3,
  },

  // ── E-mail com regex ──
  {
    property:     'email',
    label:        'E-mail',
    regex:        '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$',
    errorMessage: 'Informe um e-mail válido',
    optional:     true,
    gridColumns:  8,
  },

  // ── Número e moeda ──
  {
    property:    'quantidade',
    label:       'Quantidade',
    type:        'number',
    min:         0,
    max:         9999,
    gridColumns: 3,
  },
  {
    property:       'valorUnitario',
    label:          'Valor Unitário',
    type:           'currency',
    decimalsLength: 2,
    min:            0,
    gridColumns:    4,
  },

  // ── Data ──
  {
    property:    'dataEmissao',
    label:       'Data de Emissão',
    type:        'date',
    required:    true,
    dateFormat:  'dd/MM/yyyy',
    gridColumns: 4,
  },

  // ── Seção: Status ──
  // Select estático (po-select)
  {
    property: 'situacao',
    label:    'Situação',
    divider:  'Status',
    options: [
      { label: 'Ativo',    value: 'S' },
      { label: 'Inativo',  value: 'N' },
      { label: 'Bloqueado', value: 'B' },
    ],
    gridColumns: 4,
  },

  // Select múltiplo (po-checkbox-group)
  {
    property:     'permissoes',
    label:        'Permissões',
    options: [
      { label: 'Incluir',   value: 'I' },
      { label: 'Alterar',   value: 'A' },
      { label: 'Excluir',   value: 'E' },
      { label: 'Consultar', value: 'C' },
    ],
    optionsMulti: true,
    gridColumns:  12,
  },

  // Combo com URL assíncrona (po-combo com filtro)
  {
    property:       'filial',
    label:          'Filial',
    optionsService: '/rest/api/custom/v1/filiais',
    fieldLabel:     'descricao',
    fieldValue:     'codigo',
    gridColumns:    6,
  },

  // Boolean — padrão Protheus S/N (po-switch)
  {
    property:     'ativo',
    label:        'Ativo',
    type:         'boolean',
    booleanTrue:  'S',            // valor armazenado quando ligado
    booleanFalse: 'N',            // valor armazenado quando desligado
    gridColumns:  3,
  },

  // ── Seção: Complemento ──
  // Textarea
  {
    property:    'observacoes',
    label:       'Observações',
    divider:     'Complemento',
    rows:        4,
    maxLength:   500,
    optional:    true,
    gridColumns: 12,
  },
];
```

---

## PoDynamicViewField — todos os campos

```typescript
interface PoDynamicViewField {
  // ──────────── OBRIGATÓRIO ────────────
  property: string;

  // ──────────── RÓTULO E LAYOUT ────────────
  label?: string;            // rótulo exibido (default: property em Title Case)
  gridColumns?: number;      // largura: 1-12 (padrão 6)

  // ──────────── TIPO ────────────
  // default: 'string'
  type?: 'string'
       | 'number'
       | 'currency'          // formata como moeda (R$)
       | 'date'
       | 'dateTime'          // formata como data + hora
       | 'boolean'           // exibe booleanTrue/booleanFalse como texto
       | 'link'              // renderiza como <a href> (value = URL)
       | 'subtitle';         // texto menor / secundário

  // ──────────── FORMATAÇÃO ────────────
  format?: string;           // ex: 'dd/MM/yyyy' para date | 'dd/MM/yyyy HH:mm' para dateTime
  concatLinesLimit?: number; // limita o número de linhas (para arrays de string)
  tag?: boolean;
  color?: string;            // token de cor PO-UI (ex: 'color-10', 'color-07')

  // ──────────── BOOLEAN ────────────
  booleanTrue?: string;      // texto exibido quando true/truthy (ex: 'Ativo', 'Sim')
  booleanFalse?: string;     // texto exibido quando false/falsy (ex: 'Inativo', 'Não')
}
```

### Exemplo de viewFields para tela de detalhe

```typescript
readonly viewFields: PoDynamicViewField[] = [
  { property: 'codigo',       label: 'Código',       gridColumns: 3 },
  { property: 'nome',         label: 'Nome',         gridColumns: 9 },
  { property: 'cnpj',         label: 'CNPJ',         gridColumns: 4 },
  { property: 'email',        label: 'E-mail',       gridColumns: 5, type: 'link' },
  { property: 'dataEmissao',  label: 'Emissão',      type: 'date', format: 'dd/MM/yyyy', gridColumns: 3 },
  { property: 'valorTotal',   label: 'Valor Total',  type: 'currency', gridColumns: 3 },
  {
    property:     'ativo',
    label:        'Status',
    type:         'boolean',
    booleanTrue:  'Ativo',
    booleanFalse: 'Inativo',
    tag:          true,
    color:        'color-11',      // verde para ativo
    gridColumns:  3,
  },
];
```

---

## Mapeamento: tipo do campo → componente PO-UI renderizado

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
