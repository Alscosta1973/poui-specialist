# Referência estática — Campos padrão Protheus (SX3)

Referência **embutida e autocontida** (não depende de nenhum outro plugin instalado) para
validar, no `/poui-specialist:discover`, o tamanho/tipo/obrigatoriedade dos campos **padrão**
das tabelas Protheus mais comuns em integrações REST.

> **Atribuição:** a estrutura de colunas do SX3 abaixo foi conferida contra a documentação do
> pacote [`advpl-specialist`](https://github.com/thalysjuvenal/advpl-specialist) (MIT License,
> © Thalys Augusto) e a TDN pública da TOTVS. Os nomes/tamanhos de campo listados são schema
> público e estável do Protheus (não são segredo comercial de nenhum autor).

## Limite desta referência

Cobre **só campos padrão** — os que vêm de fábrica em qualquer instalação Protheus. **Não
cobre campos customizados** (prefixo `X_*`, ex: `A1_XCODAGE`), que variam por cliente e só
podem ser confirmados consultando o dicionário de dados real (SX3) daquela instalação
específica — algo que nenhum plugin Claude Code consegue fazer sem acesso direto ao banco/AppServer
do cliente. Se o campo do endpoint não aparecer aqui, é provavelmente customizado: sinalize e
não adivinhe o tamanho.

## O que cada coluna SX3 significa (para interpretar o resultado)

| Coluna SX3 | Significado |
|---|---|
| `X3_CAMPO` | Nome do campo (ex: `A1_COD`) |
| `X3_TIPO` | Tipo: `C` Character, `N` Numeric, `D` Date, `L` Logical, `M` Memo |
| `X3_TAMANHO` | Tamanho do campo |
| `X3_DECIMAL` | Casas decimais (campos numéricos) |
| `X3_OBRIGAT` | Obrigatório: `S`/`N` |

## Campos padrão por tabela

### SA1 — Clientes

| Campo | Tipo | Tamanho | Decimal | Obrigatório |
|---|---|---|---|---|
| A1_COD | C | 6 | — | S |
| A1_LOJA | C | 2 | — | S |
| A1_NOME | C | 40 | — | S |
| A1_NREDUZ | C | 20 | — | S |
| A1_CGC | C | 14 | — | N |
| A1_END | C | 60 | — | N |
| A1_MUN | C | 20 | — | N |
| A1_EST | C | 2 | — | N |
| A1_CEP | C | 8 | — | N |
| A1_TEL | C | 20 | — | N |

### SA2 — Fornecedores

| Campo | Tipo | Tamanho | Decimal | Obrigatório |
|---|---|---|---|---|
| A2_COD | C | 6 | — | S |
| A2_LOJA | C | 2 | — | S |
| A2_NOME | C | 40 | — | S |
| A2_NREDUZ | C | 20 | — | S |
| A2_CGC | C | 14 | — | N |

### SB1 — Produtos

| Campo | Tipo | Tamanho | Decimal | Obrigatório |
|---|---|---|---|---|
| B1_COD | C | 15 | — | S |
| B1_DESC | C | 40 | — | S |
| B1_UM | C | 2 | — | S |
| B1_TIPO | C | 2 | — | N |
| B1_PRV1 | N | 14 | 2 | N |

### SC5 — Pedido de Venda (Cabeçalho)

| Campo | Tipo | Tamanho | Decimal | Obrigatório |
|---|---|---|---|---|
| C5_NUM | C | 6 | — | S |
| C5_CLIENTE | C | 6 | — | S |
| C5_LOJACLI | C | 2 | — | S |
| C5_EMISSAO | D | 8 | — | S |
| C5_CONDPAG | C | 3 | — | N |

### SC6 — Pedido de Venda (Itens)

| Campo | Tipo | Tamanho | Decimal | Obrigatório |
|---|---|---|---|---|
| C6_NUM | C | 6 | — | S |
| C6_ITEM | C | 4 | — | S |
| C6_PRODUTO | C | 15 | — | S |
| C6_QTDVEN | N | 13 | 2 | S |
| C6_PRCVEN | N | 14 | 2 | S |

### SE1 — Contas a Receber

| Campo | Tipo | Tamanho | Decimal | Obrigatório |
|---|---|---|---|---|
| E1_PREFIXO | C | 3 | — | S |
| E1_NUM | C | 9 | — | S |
| E1_PARCELA | C | 3 | — | S |
| E1_CLIENTE | C | 6 | — | S |
| E1_LOJA | C | 2 | — | S |
| E1_VENCTO | D | 8 | — | S |
| E1_VALOR | N | 16 | 2 | S |

### SE2 — Contas a Pagar

| Campo | Tipo | Tamanho | Decimal | Obrigatório |
|---|---|---|---|---|
| E2_PREFIXO | C | 3 | — | S |
| E2_NUM | C | 9 | — | S |
| E2_PARCELA | C | 3 | — | S |
| E2_FORNECE | C | 6 | — | S |
| E2_LOJA | C | 2 | — | S |
| E2_VENCTO | D | 8 | — | S |
| E2_VALOR | N | 16 | 2 | S |

## Como casar o campo JSON com o campo SX3

O JSON do REST costuma vir em camelCase sem o prefixo de tabela (ex: `codigo`, `nome`,
`vencimento`). Para casar com a tabela acima:

1. Remover o prefixo da tabela do nome SX3 (`A1_COD` → `cod`)
2. Comparar case-insensitive e ignorando underscore (`nome` ~ `NOME`, `dataVencto` ~ `VENCTO`)
3. Se não achar correspondência em nenhuma linha da tabela informada → tratar como campo
   customizado (ver "Limite desta referência" acima)
