# Guia: Como solicitar integração com dados reais do Protheus

Use este guia quando quiser substituir os mocks de um componente Angular pela API REST real do Protheus.
Quanto mais completo o pedido, menos idas e vindas serão necessárias.

---

## Formato do pedido

```
Quero conectar <ComponentClass> ao Protheus real.

TABELAS:
  <alias>  (<nome>)  campos: <lista>

ENDPOINT:
  Existe: sim → URL: <url>  Método: GET|POST|DELETE
  Não existe → precisa criar TLPP

AUTH:
  Tipo: Basic|Bearer|sem auth
  Header: <valor ou "fixo no proxy">

PROTHEUS:
  URL base: http://<ip>:<porta>
  Prefixo REST: /rest/api/custom/v1

MOCK A REMOVER:
  <arquivo-interceptor>

AÇÕES NOVAS (se houver):
  POST <endpoint> com payload { <campos> }
```

---

## Detalhamento de cada campo

### TABELAS

Liste os aliases e campos que a tela consome. Se não souber de cor, informe a rotina ADVPL que
já acessa esses dados (ex: `MATA910`, `FIN010`, `SIGAFIN`) e o campo será extraído do código fonte.

```
SE1  (Títulos a Receber)  campos: E1_NUM, E1_PARCELA, E1_TIPO, E1_NOMCLI, E1_VALOR, E1_SALDO, E1_VENCTO
SA1  (Clientes)           campos: A1_COD, A1_LOJA, A1_NOME, A1_CGC
SEA  (Mov. Cartão)        campos: EA_DTMOV, EA_CARTAO, EA_VALOR, EA_STATUS
```

### ENDPOINT

**Já existe no Protheus:**
```
URL:     /rest/api/custom/v1/financeiro/divergencias
Método:  GET
Params:  filial, dataInicio, dataFim, status
Response (exemplo):
  {
    "items": [
      { "E1_NUM": "000001", "E1_VALOR": 1500.00, ... }
    ],
    "hasNext": false
  }
```

**Não existe (precisa criar):**
Informe as regras de negócio:
- O que define um registro como "divergência"
- Filtros e ordenação esperados
- O plugin gera o contrato TLPP (`/poui-specialist:generate tlpp-contract`)

### AUTH

| Tipo | Como informar |
|------|--------------|
| Sem auth | `sem auth` |
| Basic Auth | `Basic — usuário/senha fixos no proxy` |
| Bearer Token | `Bearer — token vem do localStorage['token']` |
| Cookie de sessão | `Cookie — Protheus mantém sessão após login` |

### PROTHEUS — URL base

```
URL base:     http://192.168.1.10:8086
Prefixo REST: /rest/api/custom/v1
```

O plugin cria ou atualiza o `proxy.conf.json` para redirecionar `/rest` → Protheus.

### MOCK A REMOVER

Informe o arquivo do interceptor (ou "não sei onde está" — o plugin localiza):
```
src/app/core/interceptors/mock-divergencias.interceptor.ts
```

### AÇÕES NOVAS

Para cada botão que vai acionar o backend (além do GET de lista):
```
POST /rest/api/custom/v1/financeiro/divergencias/confirmar
  Payload: { ids: string[] }
  Response: { sucesso: number, falha: number, itens: [...] }

DELETE /rest/api/custom/v1/financeiro/divergencias/:id
  Response: 204 No Content
```

---

## Exemplo completo de pedido

```
Quero conectar DivergenciasCartaoComponent ao Protheus real.

TABELAS:
  SE1 (Títulos a Receber): E1_NUM, E1_PARCELA, E1_TIPO, E1_NOMCLI, E1_VALOR, E1_SALDO, E1_VENCTO, E1_SITUACA
  SEA (Movimentos Cartão): EA_DTMOV, EA_CARTAO, EA_VALOR, EA_STATUS, EA_CODFOR

ENDPOINT:
  Existe: sim
  URL: /rest/api/custom/v1/financeiro/divergencias
  Método: GET
  Params: filial, dataInicio, dataFim
  Response: { items: [...], hasNext: bool }

AUTH:
  Basic Auth — usuário "admin" / senha fixa no proxy

PROTHEUS:
  URL base: http://192.168.1.10:8086
  Prefixo REST: /rest/api/custom/v1

MOCK A REMOVER:
  src/app/core/interceptors/mock-divergencias-cartao.interceptor.ts

AÇÕES NOVAS:
  POST /financeiro/divergencias/confirmar  payload: { ids: string[] }
  POST /financeiro/divergencias/rejeitar   payload: { id: string, motivo: string }
```

---

## O que o plugin faz após receber esse pedido

1. Lê o service e component existentes
2. Identifica padrões mock (`of(MOCK_*)`, `delay()`, `DEMO_*`)
3. Atualiza `proxy.conf.json` com o target do Protheus
4. Substitui o service: `of(data)` → `this.http.get/post(...)`
5. Remove ou desativa o interceptor de mock
6. Gera o contrato TLPP se o endpoint não existir
7. Atualiza os specs: troca mocks fixos por `HttpTestingController`
8. Roda build + testes para confirmar que nada quebrou
