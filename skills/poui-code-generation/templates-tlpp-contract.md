# Template: TLPP REST Contract

Define o contrato de API REST que o frontend Angular gerado pelo plugin espera.
Use este documento como especificação para criar o backend no Protheus via
`/advpl-specialist:generate rest`.

> **Cobertura de testes:** o artefato gerado por este tipo é um arquivo `.tlpp` (backend
> Protheus), não um componente Angular. Por isso **não existe spec Karma** para este tipo —
> a validação é feita via `/advpl-specialist:generate rest` + testes REST no Postman/Insomnia
> ou via `ProAuthInteceptor` + servidor Protheus de desenvolvimento.
> O comando `/poui-specialist:test` não se aplica a `tlpp-contract`.

---

## Endpoints por operação CRUD

### Listar (GET com paginação)

```
GET /rest/api/custom/v1/<entidade>
```

Query parameters:

| Parâmetro | Tipo | Padrão | Descrição |
|-----------|------|--------|-----------|
| `page` | integer | 1 | Número da página |
| `pageSize` | integer | 10 | Itens por página (máx. 50) |
| `q` | string | — | Busca rápida em todos os campos texto |
| `order` | string | — | Campo de ordenação; prefixo `-` para desc (ex: `-nome`) |
| `fields` | string | — | *(opcional, padrão TTALK)* Lista de campos separados por vírgula para retornar apenas um subconjunto |

> **Nota:** `pageSize` padrão 10/máx. 50 é escolha deliberada do plugin (densidade padrão do `po-table`). O padrão TTALK da TOTVS usa padrão 20/máx. 100 — ajuste se o backend precisar interoperar com outros clientes TTALK.

Response `200 OK`:

```json
{
  "items": [ { "codigo": "000001", "nome": "Exemplo" } ],
  "hasNext": true,
  "remainingRecords": 48
}
```

`remainingRecords` (padrão TTALK) é o total de registros restantes após a página atual — use para exibir "Mostrando X de Y" no `po-table`. Opcional: se o backend não implementar, o frontend cai para paginação apenas com `hasNext`.

---

### Consultar por chave (GET por ID)

**Chave simples:**
```
GET /rest/api/custom/v1/<entidade>/{id}
```

**Chave composta Protheus (código + loja):**
```
GET /rest/api/custom/v1/<entidade>/{codigo}/{loja}
```

Response `200 OK`: objeto completo da entidade (mesmo shape de `items[0]`).

---

### Incluir (POST)

```
POST /rest/api/custom/v1/<entidade>
Content-Type: application/json

{ "codigo": "000001", "nome": "Exemplo", ... }
```

Response `201 Created`: objeto criado (mesmo shape do GET por ID).

---

### Alterar (PUT)

```
PUT /rest/api/custom/v1/<entidade>/{id}
Content-Type: application/json

{ "nome": "Novo nome", ... }
```

Response `200 OK`: objeto atualizado.

---

### Excluir (DELETE)

```
DELETE /rest/api/custom/v1/<entidade>/{id}
```

Response `204 No Content` (sem body).

---

## Formato de erro Protheus

Dois formatos coexistem, dependendo de qual framework REST o backend usa. O frontend
gerado pelo plugin deve tratar **ambos** ao fazer parse do body de erro.

### Legado — WsRestFul clássico

```json
{
  "errorMessage": "{\"code\":\"MA0001\",\"message\":\"Registro j\\u00e1 existe\",\"detailedMessage\":\"\"}"
}
```

O campo `errorMessage` é uma **string JSON serializada** com os campos `code`,
`message` e `detailedMessage`. O texto é URI-encoded — o frontend usa
`decodeURIComponent(escape(...))` para decodificar. Esse é o comportamento
padrão de serialização de exceção não tratada do `WSRESTFUL` clássico (skeleton
abaixo).

### Moderno — TLPP REST por anotações (padrão TTALK)

```json
{
  "code": "404",
  "message": "Resource not found",
  "detailedMessage": "Customer with code 000999 was not found in branch 01"
}
```

Objeto **plano** (sem serialização aninhada), retornado por `oRest:setStatusResponse(nCode, cBody)`
em endpoints `@Get`/`@Post`/`@Put`/`@Patch`/`@Delete`. É o formato TTALK oficial da TOTVS — prefira-o
em Protheus com REST Server por anotações disponível (ver skeleton moderno abaixo).

**Todos os endpoints de escrita (POST, PUT, DELETE) devem retornar um dos dois formatos acima
em caso de erro (4xx/5xx), de forma consistente em todo o backend.**

---

## Códigos HTTP esperados

| Status | Quando usar |
|--------|-------------|
| 200 | GET por ID, PUT com sucesso |
| 201 | POST com sucesso |
| 204 | DELETE com sucesso |
| 400 | Validação falhou / dados inválidos |
| 401 | Não autenticado |
| 403 | Sem permissão |
| 404 | Registro não encontrado |
| 409 | Conflito (registro duplicado) |
| 500 | Erro interno do servidor |

---

## Segurança — Padrões obrigatórios

Ao implementar os endpoints com `/advpl-specialist:generate rest`, incluir **obrigatoriamente** os controles abaixo:

```advpl
// Autenticação: validar usuário/senha do header Authorization ou sessão REST
If !FWUserLogged()
    Self:SetResponse('{"errorMessage":"Não autenticado"}')
    Self:SetHTTPStatus(401, "Unauthorized")
    Return .F.
EndIf

// Autorização: verificar permissão de rotina
If !FWValidUserLog(cAlias, "LI") // LI=Listar  IN=Incluir  EX=Excluir  AT=Alterar
    Self:SetResponse('{"errorMessage":"Acesso negado"}')
    Self:SetHTTPStatus(403, "Forbidden")
    Return .F.
EndIf

// SQL sanitization: NUNCA concatenar input do usuário em SQL diretamente
// CORRETO — usar BeginSQL com macros:
BeginSQL Alias cAlias
    SELECT %Exp:cCampos% FROM %Table:cTabela% WHERE %NotDel%
    AND %xFilial:cTabela%
    AND UPPER(CAMPO_BUSCA) LIKE UPPER('%' + %Exp:cBusca% + '%')
EndSQL

// ERRADO — vulnerável a SQL injection:
// cSql := "SELECT * FROM " + cTabela + " WHERE CAMPO = '" + cInput + "'"
```

> **Auditoria:** campos `X_*` customizados devem ter existência validada com `ExistField(cAlias, cCampo)` antes de referenciar. Campos do sistema (SX3) são garantidos pelo dicionário.

---

## Skeleton WsRestFul ADVPL (legado)

Estrutura mínima da classe REST no lado Protheus. Use como ponto de partida
ou gere o código completo com `/advpl-specialist:generate rest`:

```advpl
#include "totvs.ch"
#include "restful.ch"

// WsRestFul suporta um método HTTP por bloco.
// Use WSDATA para receber id/chave-composta; o método GET
// diferencia lista vs detalhe pelo valor do WSDATA id.
WSRESTFUL EntidadeAPI DESCRIPTION "Entidade API"
  WSDATA id       AS CHARACTER OPTIONAL
  WSDATA loja     AS CHARACTER OPTIONAL
  WSDATA page     AS INTEGER   OPTIONAL
  WSDATA pageSize AS INTEGER   OPTIONAL
  WSDATA q        AS CHARACTER OPTIONAL

  WSMETHOD GET    DESCRIPTION "Listar / Consultar" WSSYNTAX "/api/custom/v1/entidade"
  WSMETHOD POST   DESCRIPTION "Incluir"            WSSYNTAX "/api/custom/v1/entidade"
  WSMETHOD PUT    DESCRIPTION "Alterar"            WSSYNTAX "/api/custom/v1/entidade"
  WSMETHOD DELETE DESCRIPTION "Excluir"            WSSYNTAX "/api/custom/v1/entidade"
END WSRESTFUL
```

> Para implementar a lógica de negócio (paginação, filtro, ExecAuto, tratamento
> de erros), use: `/advpl-specialist:generate rest --entity <Entidade>`

---

## Skeleton TLPP REST por anotações (moderno, preferencial)

Quando o AppServer Protheus tem o REST Server por anotações habilitado (`appserver.ini`
com seção `[HTTPREST]`), prefira este padrão em vez do `WSRESTFUL` — é o formato
TTALK oficial da TOTVS, mais simples e com Swagger automático:

```tlpp
#include "tlpp-core.th"

@Get("/api/custom/v1/entidade")
User Function getEntidadeList() as Logical
  Local jQuery := oRest:getQueryRequest() as Json
  Local nPage     := IIf(jQuery["page"] == Nil, 1, jQuery["page"])
  Local nPageSize := IIf(jQuery["pageSize"] == Nil, 10, jQuery["pageSize"])
  // ... consultar via FWExecStatement com %xFilial% e %NotDel%, montar cResponse
Return oRest:setStatusResponse(200, cResponse)

@Get("/api/custom/v1/entidade/:id")
User Function getEntidadeById() as Logical
  Local jPath := oRest:getPathParamsRequest() as Json
  Local cId   := jPath["id"] as Character
  // ... buscar registro; se não encontrado:
  // Return oRest:setStatusResponse(404, '{"code":"404","message":"Not found","detailedMessage":""}')
Return oRest:setStatusResponse(200, cResponse)

@Post("/api/custom/v1/entidade")
User Function postEntidade() as Logical
  Local cBody := oRest:getBodyRequest()
  // ... validar, RecLock/MsUnlock, montar cResponse do registro criado
Return oRest:setStatusResponse(201, cResponse)
```

> Requer `appserver.ini` com `[HTTPREST]` / `[HTTPURI]` configurado (`URL=/api`, `PrepareIn=ALL`).
> Ao usar este skeleton, o formato de erro é sempre o **plano** (`{code, message, detailedMessage}`),
> nunca o `errorMessage` serializado do WsRestFul.

---

## TypeScript — shape esperado no frontend

O service Angular espera exatamente este contrato:

```typescript
// Response do GET lista
interface ProtheusListResponse<T> {
  items: T[];
  hasNext: boolean;
  remainingRecords?: number; // padrão TTALK — opcional, nem todo backend implementa
}

// Exemplo de service consumindo os endpoints acima
// getAll  → GET  /rest/api/custom/v1/entidade?page=1&pageSize=10&q=...
// getById → GET  /rest/api/custom/v1/entidade/{id}
// create  → POST /rest/api/custom/v1/entidade
// update  → PUT  /rest/api/custom/v1/entidade/{id}
// delete  → DELETE /rest/api/custom/v1/entidade/{id}
```
