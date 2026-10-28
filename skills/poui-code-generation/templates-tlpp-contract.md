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
User Function EntGetLs() as Logical
  Local jQuery := oRest:getQueryRequest() as Json
  Local nPage     := IIf(jQuery["page"] == Nil, 1, jQuery["page"])
  Local nPageSize := IIf(jQuery["pageSize"] == Nil, 10, jQuery["pageSize"])
  // ... consultar via FWExecStatement com %xFilial% e %NotDel%, montar cResponse
Return oRest:setStatusResponse(200, cResponse)

@Get("/api/custom/v1/entidade/:id")
User Function EntGetId() as Logical
  Local jPath := oRest:getPathParamsRequest() as Json
  Local cId   := jPath["id"] as Character
  // ... buscar registro; se não encontrado:
  // Return oRest:setStatusResponse(404, '{"code":"404","message":"Not found","detailedMessage":""}')
Return oRest:setStatusResponse(200, cResponse)

@Post("/api/custom/v1/entidade")
User Function EntPost() as Logical
  Local cBody := oRest:getBodyRequest()
  // ... validar, RecLock/MsUnlock, montar cResponse do registro criado
Return oRest:setStatusResponse(201, cResponse)
```

> Requer `appserver.ini` com `[HTTPREST]` / `[HTTPURI]` configurado (`URL=/api`, `PrepareIn=ALL`).
> Ao usar este skeleton, o formato de erro é sempre o **plano** (`{code, message, detailedMessage}`),
> nunca o `errorMessage` serializado do WsRestFul.

---

## Filtro oData (opcional — flag `--odata`)

**Padrão: desligado.** Sem `--odata`, o contrato usa `q` (busca rápida) e parâmetros próprios,
como acima. Use `--odata` quando o cliente estiver na **12.1.2610+** (SmartX usa oData) ou quiser
seguir o padrão de API TOTVS. Ver `skills/poui-patterns/smartx.md`.

### Contrato

```
GET /rest/api/custom/v1/<entidade>?filter=codigo eq '000001' and nome ne ''&order=-nome&page=1&pageSize=10&fields=codigo,nome
```

| Parâmetro | Descrição |
|---|---|
| `filter` | Expressão oData sobre as **propriedades JSON** (não sobre os campos da tabela). Também aceitar `$filter` (oData puro). |
| `order` | Propriedades separadas por vírgula; prefixo `-` = decrescente |
| `fields` | Propriedades a devolver |
| `page` / `pageSize` | Paginação (mesmo comportamento do contrato padrão) |

Operadores: `eq`, `ne`, `gt`, `ge`, `lt`, `le`, `and`, `or`, parênteses. Texto entre aspas simples,
aspa simples dentro do valor duplicada (`'D''Avila'`). Funções como `contains`/`startswith`
dependem da versão da Lib — confirmar no TDN antes de usar.

Resposta: igual ao contrato padrão (`items`, `hasNext`, `remainingRecords`).

### Backend — `FWAdapterBaseV2` (o framework traduz o oData para SQL)

Não escrever parser de oData à mão. A classe `FWAdapterBaseV2` do framework recebe o filtro,
traduz para SQL e pagina. **Segurança:** só as propriedades registradas em `AddMapFields` podem
ser filtradas/ordenadas — o mapa funciona como lista permitida e impede SQL injection.

> Referência: TDN "09. FWAdapterBaseV2" (https://tdn.totvs.com/display/public/framework/09.+FWAdapterBaseV2).
> Conferir a assinatura dos métodos na Lib do cliente antes de compilar.

```tlpp
#include "totvs.ch"
#include "tlpp-core.th"

/*/{Protheus.doc} EntAdapter
    Adapter da lista de <Entidade>: paginacao e filtro oData via FWAdapterBaseV2.
    @type Class
    @author Andre Costa
/*/
Class EntAdapter From FWAdapterBaseV2
    Public Method New(cVerb As Character)
    Public Method GetLista()
EndClass

/*/{Protheus.doc} New
    Construtor do adapter.
    @param cVerb Character, verbo HTTP (GET)
    @type Method
    @author Andre Costa
/*/
Method New(cVerb) Class EntAdapter
    _Super:New(cVerb, .T.)
Return Self

/*/{Protheus.doc} GetLista
    Mapeia propriedade JSON -> campo, monta a query e executa com o filtro/ordem/pagina recebidos.
    @type Method
    @author Andre Costa
/*/
Method GetLista() Class EntAdapter
    Local aArea := FWGetArea()

    // So as propriedades mapeadas aqui podem aparecer no filter/order/fields (lista permitida)
    ::AddMapFields("codigo", "A1_COD",  .T., .T., {"A1_COD",  "C", TamSX3("A1_COD")[1],  0})
    ::AddMapFields("loja",   "A1_LOJA", .T., .T., {"A1_LOJA", "C", TamSX3("A1_LOJA")[1], 0})
    ::AddMapFields("nome",   "A1_NOME", .T., .F., {"A1_NOME", "C", TamSX3("A1_NOME")[1], 0})

    ::SetQuery("SELECT #QueryFields# FROM " + RetSqlName("SA1") + " SA1 WHERE #QueryWhere#")
    ::SetWhere("SA1.A1_FILIAL = '" + FWxFilial("SA1") + "' AND SA1.D_E_L_E_T_ = ' '")
    ::SetOrder("A1_COD, A1_LOJA")

    If ::Execute()
        ::FillGetResponse()
    EndIf

    FWRestArea(aArea)
Return

/*/{Protheus.doc} EntLista
    GET da lista de <Entidade> com filtro oData.
    @type User Function
    @author Andre Costa
/*/
@Get("/api/custom/v1/entidade")
User Function EntLista() as Logical
    Local jQuery  := oRest:getQueryRequest()
    Local oAdapt  := EntAdapter():New("GET")
    Local jErro   := Nil
    Local cFiltro := ""
    Local lRet    := .T.

    cFiltro := IIf(jQuery["filter"] <> Nil, jQuery["filter"], IIf(jQuery["$filter"] <> Nil, jQuery["$filter"], ""))

    oAdapt:SetPage(Val(IIf(jQuery["page"] == Nil, "1", cValToChar(jQuery["page"]))))
    oAdapt:SetPageSize(Min(Val(IIf(jQuery["pageSize"] == Nil, "10", cValToChar(jQuery["pageSize"]))), 50))
    If jQuery["order"] <> Nil
        oAdapt:SetOrderQuery(jQuery["order"])
    EndIf
    If jQuery["fields"] <> Nil
        oAdapt:SetFields(jQuery["fields"])
    EndIf
    If !Empty(cFiltro)
        // mesmo formato do aQueryString do REST ADVPL: {{"FILTER", <expressao oData>}}
        oAdapt:SetUrlFilter({{"FILTER", cFiltro}})
    EndIf

    oAdapt:GetLista()

    If oAdapt:lOk
        lRet := oRest:setStatusResponse(200, oAdapt:GetJSONResponse())
    Else
        jErro := JsonObject():New()
        jErro["code"]            := cValToChar(oAdapt:GetCode())
        jErro["message"]         := oAdapt:GetMessage()
        jErro["detailedMessage"] := ""
        lRet := oRest:setStatusResponse(400, jErro:ToJson())
        FwFreeObj(jErro)
    EndIf

    FwFreeObj(oAdapt)
Return lRet
```

> Nomes de `User Function` com no máximo 8 caracteres (o RPO prefixa `U_`).
> A classe de adapter fica no mesmo `.tlpp` ou em um fonte de serviço próprio; a regra de negócio
> que não for de consulta continua na classe de serviço (ver `smartx.md`).

### Frontend — montar o filtro

Helper gerado em `src/app/core/odata-filter.ts` (uma vez por projeto):

```typescript
export type ODataOp = 'eq' | 'ne' | 'gt' | 'ge' | 'lt' | 'le';

export interface ODataCondition {
  field: string;
  op: ODataOp;
  value: string | number | boolean | null | undefined;
}

/** Converte condições em expressão oData (`a eq 'x' and b ge 10`), ignorando valores vazios. */
export function toODataFilter(conditions: ODataCondition[]): string {
  return conditions
    .filter(c => c.value !== null && c.value !== undefined && c.value !== '')
    .map(c => `${c.field} ${c.op} ${toODataLiteral(c.value as string | number | boolean)}`)
    .join(' and ');
}

function toODataLiteral(value: string | number | boolean): string {
  return typeof value === 'string' ? `'${value.replace(/'/g, "''")}'` : String(value);
}
```

No service, o filtro avançado do `page-dynamic-search` vira `filter`:

```typescript
getAll(params: GetAllParams): Observable<ProtheusListResponse<Entidade>> {
  const filter = toODataFilter([
    { field: 'codigo',     op: 'eq', value: params.codigo },
    { field: 'emissao',    op: 'ge', value: params.emissaoDe },   // datas AAAAMMDD
    { field: 'emissao',    op: 'le', value: params.emissaoAte },
  ]);
  let p = new HttpParams()
    .set('page', String(params.page ?? 1))
    .set('pageSize', String(params.pageSize ?? 10));
  if (filter)       { p = p.set('filter', filter); }
  if (params.order) { p = p.set('order', params.order); }
  return this.http.get<ProtheusListResponse<Entidade>>(this.apiUrl, { params: p });
}
```

Testes Karma do helper (gerar junto, `odata-filter.spec.ts`): condição vazia é ignorada,
`and` entre condições, aspa simples duplicada, número sem aspas.

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
