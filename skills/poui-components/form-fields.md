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
