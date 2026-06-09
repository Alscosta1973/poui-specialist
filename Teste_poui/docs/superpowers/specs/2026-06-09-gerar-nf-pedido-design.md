# Design: Geração de NF a partir de Itens de Pedido (SC5/SC6)

**Data:** 2026-06-09
**Módulo:** Faturamento
**Rota:** `/faturamento/gerar-nf-pedido`

---

## 1. Objetivo

Permitir que o operador de faturamento selecione múltiplos itens de pedido (SC6) de diferentes pedidos (SC5) e gere uma Nota Fiscal via endpoint REST. A seleção é acumulativa: o usuário navega pedido a pedido no browse superior e vai marcando os itens desejados no browse inferior, sem perder as marcações anteriores.

---

## 2. Arquitetura

### Localização dos arquivos
```
src/app/faturamento/gerar-nf-pedido/
  gerar-nf-pedido.component.ts
  gerar-nf-pedido.component.html
  gerar-nf-pedido.component.scss
  gerar-nf-pedido.service.ts
  gerar-nf-pedido.model.ts
```

### Padrão técnico
- Standalone component com `ChangeDetectionStrategy.OnPush`
- Angular signals para todo o estado reativo
- `DestroyRef` + `takeUntilDestroyed` para gerenciar subscriptions
- `PoNotificationService` para feedback ao usuário

---

## 3. Modelos (`gerar-nf-pedido.model.ts`)

```typescript
export interface PedidoSC5 {
  numPedido: string;   // T1_NUM (derivado)
  cliente:   string;   // T1_CLI
  loja:      string;   // T1_LOJA
  produto:   string;   // T1_PROD
  descricao: string;   // T1_DESCRI
  nomCliente:string;   // T1_NOMCLI
  qtdTotal:  number;   // T1_QTDTOT
  prcVenda:  number;   // T1_PRCVEN
  vlrTotal:  number;   // T1_VLRTOT
  status:    string;   // T1_STATUS
  $selected?: boolean; // controle interno po-table
}

export interface ItemPedidoSC6 {
  recno:     number;   // T2_RECNO
  numPedido: string;   // T2_NUM
  item:      string;   // T2_ITEM
  produto:   string;   // T2_PROD
  qtdVenda:  number;   // T2_QTDVEN
  prcVenda:  number;   // T2_PRCVEN
  valor:     number;   // T2_VALOR
  emissao:   string;   // T2_EMISS
  $selected?: boolean; // controle interno po-table
}

export interface GerarNfRequest {
  itens: Array<{
    numPedido:  string;
    itemPedido: string;
    recno:      number;
  }>;
}

export interface FiltrosPedido {
  numPedido:    string;
  codCliente:   string;
  dataEmissaoDe: string;
  dataEmissaoAte: string;
}
```

---

## 4. Service (`gerar-nf-pedido.service.ts`)

| Método | Verbo | Endpoint |
|--------|-------|----------|
| `buscarPedidos(filtros)` | GET | `/rest/api/faturamento/v1/pedidos` |
| `buscarItensPedido(numPedido)` | GET | `/rest/api/faturamento/v1/pedidos/{num}/itens` |
| `gerarNf(request)` | POST | `/rest/api/faturamento/v1/gerar-nf` |

---

## 5. Componente — Estado (signals)

| Signal | Tipo | Descrição |
|--------|------|-----------|
| `loading` | `signal<boolean>` | Spinner global |
| `pedidos` | `signal<PedidoSC5[]>` | Dados do browse SC5 |
| `itensPedidoAtual` | `signal<ItemPedidoSC6[]>` | Itens SC6 do pedido selecionado |
| `pedidoAtual` | `signal<PedidoSC5 \| null>` | Pedido clicado no SC5 |
| `itensSelecionados` | `signal<ItemPedidoSC6[]>` | Acumulado de itens marcados |
| `modalAberto` | `signal<boolean>` | Controla abertura do po-modal |

### Computeds

| Computed | Descrição |
|----------|-----------|
| `totalSelecionado` | Soma de `item.valor` de `itensSelecionados` |
| `pedidosComSelecao` | Set de `numPedido` dos itens acumulados |
| `browseHeight` | `window.innerHeight - offset` (ajuste dinâmico) |

---

## 6. Layout da Tela

```
┌──────────────────────────────────────────────────────┐
│  [po-page-default] Geração de NF — Pedidos           │
├──────────────────────────────────────────────────────┤
│  Filtros: [Pedido] [Cliente] [De] [Até]  [Buscar]    │
├──────────────────────────────────────────────────────┤
│  BROWSE SC5 — Pedidos                                │
│  (po-table sem checkbox, clique carrega SC6)         │
│  ● 000001  CLI001  R$1.500  Aprovado  ✔             │
│    000002  CLI002  R$800    Pendente                 │
├──────────────────────────────────────────────────────┤
│  BROWSE SC6 — Itens do Pedido 000001                 │
│  (po-table com p-selectable, multi-select)           │
│  ☑ 01  PROD001  5un  R$500  01/06/2026              │
│  ☐ 02  PROD002  5un  R$1.000  01/06/2026            │
├──────────────────────────────────────────────────────┤
│  2 iten(s) · 1 pedido(s) · Total R$ 500,00  [Gerar NF] │
└──────────────────────────────────────────────────────┘
```

### Indicador automático no SC5
- Linha de pedido com `$selected: true` quando `pedidosComSelecao` contém seu `numPedido`
- Coluna extra `"✔"` via `columnTemplate` com ícone `po-icon-ok` visível apenas quando selecionado

---

## 7. Fluxo de Interação

1. Usuário preenche filtros e clica **Buscar** → `buscarPedidos()` → `pedidos.set()`
2. Usuário clica em uma linha do SC5 → `pedidoAtual.set(row)` → `buscarItensPedido(num)` → `itensPedidoAtual.set()`
   - Itens do pedido que já estão em `itensSelecionados` reaparecem com `$selected: true`
3. Usuário marca/desmarca itens no SC6:
   - `(p-selected)` → adiciona ao array `itensSelecionados`
   - `(p-unselected)` → remove do array
   - `(p-all-selected)` / `(p-all-unselected)` → adiciona/remove todos os itens do pedido atual
4. SC5 atualiza indicador automaticamente via `computed pedidosComSelecao`
5. Usuário clica **Gerar NF** → `modalAberto.set(true)`
6. Modal exibe resumo dos `itensSelecionados`
7. Usuário clica **Confirmar** → `gerarNf()` → POST REST
   - Sucesso: notificação, limpa `itensSelecionados`, recarrega pedidos com filtros atuais
   - Erro: notificação de erro, modal fecha, seleção preservada para retry
8. Usuário clica **Cancelar** no modal → `modalAberto.set(false)`, seleção preservada

---

## 8. Colunas dos Browses

### SC5 — Pedidos
| Propriedade | Label | Tipo | Largura |
|-------------|-------|------|---------|
| `_selecionado` | `''` | `columnTemplate` | 28px |
| `numPedido` | Pedido | string | 70px |
| `cliente` | Cód. Cliente | string | 80px |
| `nomCliente` | Cliente | string | — |
| `qtdTotal` | Qtd | number | 80px |
| `prcVenda` | Pr. Venda | currency (BRL) | 100px |
| `vlrTotal` | Vl. Total | currency (BRL) | 110px |
| `status` | Status | string | 90px |

### SC6 — Itens de Pedido
| Propriedade | Label | Tipo | Largura |
|-------------|-------|------|---------|
| `numPedido` | Pedido | string | 70px |
| `item` | Item | string | 50px |
| `produto` | Produto | string | 130px |
| `qtdVenda` | Qtd | number | 80px |
| `prcVenda` | Pr. Venda | currency (BRL) | 100px |
| `valor` | Valor | currency (BRL) | 110px |
| `emissao` | Emissão | date (dd/MM/yyyy) | 90px |

---

## 9. Modal de Confirmação

- **Título:** "Confirmar Geração de NF"
- **Conteúdo:** `po-table` read-only com os `itensSelecionados` (colunas: Pedido, Item, Produto, Qtd, Valor)
- **Rodapé do modal:** Total: `R$ XXX,XX`
- **Botões:** Confirmar (primário) | Cancelar

---

## 10. Rota

Adicionar em `app.routes.ts`:
```typescript
{
  path: 'faturamento/gerar-nf-pedido',
  loadComponent: () =>
    import('./faturamento/gerar-nf-pedido/gerar-nf-pedido.component')
      .then(m => m.GerarNfPedidoComponent),
}
```

---

## 11. Fora de Escopo

- TLPP/ADVPL backend — apenas contrato REST definido; implementação do lado Protheus é separada
- Validações de negócio no frontend (ex: limite de itens por NF) — delegadas ao backend
- Paginação nos browses — implementar na fase seguinte se volume de dados exigir
