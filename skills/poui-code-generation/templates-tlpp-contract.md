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

Response `200 OK`:

```json
{
  "items": [ { "codigo": "000001", "nome": "Exemplo" } ],
  "hasNext": true
}
```

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

O frontend do plugin decodifica erros neste formato específico:

```json
{
  "errorMessage": "{\"code\":\"MA0001\",\"message\":\"Registro j\\u00e1 existe\",\"detailedMessage\":\"\"}"
}
```

O campo `errorMessage` é uma **string JSON serializada** com os campos `code`,
`message` e `detailedMessage`. O texto é URI-encoded — o frontend usa
`decodeURIComponent(escape(...))` para decodificar.

**Todos os endpoints de escrita (POST, PUT, DELETE) devem retornar este formato
em caso de erro (4xx/5xx).**

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

## Skeleton WsRestFul ADVPL

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

## TypeScript — shape esperado no frontend

O service Angular espera exatamente este contrato:

```typescript
// Response do GET lista
interface ProtheusListResponse<T> {
  items: T[];
  hasNext: boolean;
}

// Exemplo de service consumindo os endpoints acima
// getAll  → GET  /rest/api/custom/v1/entidade?page=1&pageSize=10&q=...
// getById → GET  /rest/api/custom/v1/entidade/{id}
// create  → POST /rest/api/custom/v1/entidade
// update  → PUT  /rest/api/custom/v1/entidade/{id}
// delete  → DELETE /rest/api/custom/v1/entidade/{id}
```
