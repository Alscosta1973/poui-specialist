# Template: Models

Padrões TypeScript para interfaces de modelo em projetos PO-UI / Protheus.

---

## Model simples

Para entidades com chave única e campos primitivos:

```typescript
// src/app/<modulo>/models/<entidade>.model.ts
export interface Produto {
  codigo: string;       // chave — sempre string no Protheus
  descricao: string;
  unidade: string;      // ex: 'UN', 'KG', 'CX'
  preco: number;
  estoque: number;
  ativo: string;        // 'S' | 'N' — padrão Protheus para boolean
}
```

---

## Model com chave composta Protheus (código + loja)

A maioria das entidades do módulo de Compras/Vendas usa chave composta:

```typescript
// src/app/<modulo>/models/<entidade>.model.ts
export interface ProtheusKey {
  codigo: string;   // 6 chars (A1_COD, A2_COD, etc.)
  loja: string;     // 2 chars (A1_LOJA, A2_LOJA, etc.)
}

export interface Fornecedor extends ProtheusKey {
  razaoSocial: string;
  cnpj: string;
  email: string;
  telefone: string;
  cidade: string;
  estado: string;
  ativo: string;    // 'S' | 'N'
}

export interface Cliente extends ProtheusKey {
  nomeFantasia: string;
  razaoSocial: string;
  cnpj: string;
  email: string;
  limiteCredito: number;
}
```

No service, as operações por chave usam ambos os campos:

```typescript
// Em <entidade>.service.ts
getByKey(codigo: string, loja: string): Observable<Fornecedor> {
  return this.http.get<Fornecedor>(`${this.baseUrl}/${codigo}/${loja}`);
}

deleteByKey(codigo: string, loja: string): Observable<void> {
  return this.http.delete<void>(`${this.baseUrl}/${codigo}/${loja}`);
}
```

---

## Model com relacionamento (campos flat — padrão Protheus)

> **Importante:** Protheus **não** retorna objetos aninhados.
> Retorna campos "achatados" com prefixo. Não use objetos compostos
> como `{ fornecedor: { codigo, nome } }` — o backend Protheus retornará
> `fornecedorCodigo` e `fornecedorNome` no mesmo nível do objeto raiz.

```typescript
// src/app/<modulo>/models/nota-fiscal.model.ts
export interface NotaFiscal {
  numero: string;
  serie: string;
  dataEmissao: string;        // ISO 8601: 'YYYY-MM-DD'
  valorTotal: number;

  // Relacionamento fornecedor — campos flat com prefixo
  fornecedorCodigo: string;
  fornecedorLoja: string;
  fornecedorNome: string;     // desnormalizado para exibição

  // Relacionamento filial
  filialCodigo: string;
  filialDescricao: string;
}
```

Este padrão flat simplifica o binding no template e evita navegação
opcional (`?.`) em toda a view:

```typescript
// Coluna na po-table — campo flat, sem navegação de objeto
{ property: 'fornecedorNome', label: 'Fornecedor' },
{ property: 'dataEmissao',    label: 'Emissão', type: 'date' },
{ property: 'valorTotal',     label: 'Valor',   type: 'currency' },
```

---

## Tipos de campo comuns no Protheus

| Campo Protheus | Tipo TypeScript | Observação |
|----------------|----------------|-----------|
| Código (6 chars) | `string` | Nunca `number` — pode ter zeros à esquerda |
| Loja (2 chars) | `string` | Sempre string |
| Data | `string` | ISO 8601 (`'YYYY-MM-DD'`) ou formato Protheus (`'YYYYMMDD'`) |
| Valor monetário | `number` | |
| Quantidade | `number` | |
| Flag S/N | `string` | `'S'` \| `'N'` — não boolean |
| Descrição | `string` | |
