# Template: rotina MVC existente via REST (FWRestModel) — flag `--mvc <FONTE>`

Use quando a rotina **já tem MVC** (`ModelDef`) — padrão TOTVS (MATA010, CRMA980...) ou customizada — e a
tela PO-UI deve **gravar pelas regras do próprio modelo** (validações, gatilhos, commit, pontos de entrada),
sem duplicar regra numa API própria. Leitura de listas grandes/complexas continua melhor com
`FWAdapterBaseV2` + oData (`templates-tlpp-contract.md`); este template cobre lista simples, consulta,
inclusão, alteração e exclusão — em **qualquer nível**: cabeçalho, blocos 1:1 (FIELDS filhos), grades e
grades netas.

> Validado de ponta a ponta no Protheus 12.1.2510 (28/10/2026), com o código exatamente como está abaixo:
> - rotina MVC real com grade e regras de negócio (lista, busca, POST, PUT, 304, erro de validação, DELETE,
>   404, FILTER malicioso ignorado, busca com aspa maliciosa);
> - modelo de 3 níveis (cabeçalho → grade → grade neta): POST com netos; PUT alterando, excluindo e incluindo
>   neto, incluindo linha nova já com neto e excluindo linha com os netos; neto duplicado barrado; erro sem
>   gravar nada (transação);
> - modelo com bloco 1:1 (FIELDS filho): POST e PUT.
>
> Karma 13/13 no Angular 21. Padrões tirados de fontes da TOTVS: `JurModRest.prw` (INCLUI/ALTERA, 403),
> `mntMvc080/084.prw` (filtro fixo no `SetFilter`), `ESTA0001.prw` (`SaveData` próprio), `MRPData.prw`
> (acesso pelo MenuDef). Referência: TDN "FWRestModel" (https://tdn.totvs.com/pages/releaseview.action?pageId=271671548).

## Armadilhas do `/rest/fwmodel` (todas tratadas por este template)

| Armadilha | Sintoma | Tratamento |
|---|---|---|
| Campo de FIELDS sem `"order"` | o 1º campo é ignorado → "campo não foi preenchido" | servidor (`_RMNormJs`) e frontend (`buildMvcBody`) numeram |
| `value` numérico/lógico | HTTP 500 (`XPATHADDNODE ... expected C->N`) | tudo vira texto nos dois lados, em todos os níveis |
| ModelDef usa `INCLUI`/`ALTERA` | HTTP 500 já no GET (variável de tela não existe no REST) | `Activate` cria `INCLUI`/`ALTERA` pelo verbo HTTP |
| `FILTER` da URL é SQL puro colado no WHERE | injeção de SQL | `SetFilter` ignora o FILTER da URL; só filtro fixo + `SEARCH` escapado |
| Erro em texto corrido (`Id campo erro: [...]`) | difícil mostrar/marcar campo | `SaveData`/`DelData` devolvem JSON `{code,message,solution,field,submodel,value}`; o frontend também entende o texto padrão |
| PUT sem mudança | HTTP 304 (o `HttpClient` trata como erro) | service devolve `null` = "nada alterado" |
| Registro inexistente | DELETE → 404; PUT → 400 com `code: NOTFOUND` (o framework força 400) | tratar pelo `code` |
| Nome do `PUBLISH ... NAME` | o compilador gera uma função com o nome **truncado em 8 caracteres** → "Duplicated function" se dois nomes começam igual | `<api>` com **até 8 caracteres** e único no RPO |
| Neto relacionado a campo de relação do pai (ex.: `Z09_X := Z08_CODIGO`, que vem do cabeçalho) | na inclusão o neto grava com o campo **vazio** (órfão), sem erro | relacionar o neto ao campo do **cabeçalho** (`Z09_X := Z07_CODIGO`) + ao campo próprio da linha pai (`Z09_Y := Z08_ITEM`) |
| Datas / números | vêm como texto `AAAAMMDD` / `"1.00"` | `mvcDate()` / `mvcNumber()` |
| Chave (`pk`) | base64 de xFilial + chave primária com espaços | sempre usar o `pk`/`_pk` devolvido pelo GET — nunca montar no frontend |
| Grade **sem linhas** no GET com `FIELDEMPTY=true` | o submodelo vem só com `struct`, **sem a chave `items`** (`items` undefined) | o parse trata `items` ausente como lista vazia — nunca acessar `items.length` direto |
| URL com `/rest` no frontend | o ProtheusLibCore já prefixa a base REST (FwCallApp: URL do Protheus; `ng serve`: `serverBackend` + `restEntryPoint` do `appConfig.json`) → `/rest/rest/fwmodel/...` (404) | no frontend a constante é **`/fwmodel/<api>`**, sem `/rest` |

**Ainda quebram no REST (revisar o ModelDef antes):** `FWFormView`/`oView` no modelo, `MsgYesNo`/`Aviso`/
`Pergunte` (interação de tela), `aHeader`/`aCols`, `Private` de tela usada em validação, `IsBlind()` invertido.

## Backend — `RM_<FONTE>.prw`

- `<FONTE>`: fonte com o `ModelDef` (ex.: `MATA010`, `F0134310`). `<MENU>`: fonte com o `MenuDef` usado na
  permissão (normalmente o próprio `<FONTE>`).
- `<api>`: nome do endpoint (`/rest/fwmodel/<api>`), minúsculo, **até 8 caracteres**, único no RPO.
- `<CLASSE>`: `RM` + até 8 caracteres do fonte (≤ 10 no total, única no RPO).
- `RM_BUSCA`: campos do alias principal usados no `?SEARCH=`; `RM_FIXO`: filtro SQL fixo do servidor (opcional).
- Permissão: o usuário do REST precisa ter acesso ao item do `MenuDef` da operação (`MPUserHasAccess`), senão 403.

```advpl
#include "totvs.ch"
#include "fwmvcdef.ch"

// Publica o modelo MVC da rotina <FONTE> em /rest/fwmodel/<api> (FWRestModel)
PUBLISH USER MODEL REST NAME <api> SOURCE <FONTE> RESOURCE OBJECT <CLASSE>

// Fonte com o MenuDef usado na permissao (normalmente o proprio <FONTE>)
#define RM_MENU  "<MENU>"
// Campos da busca rapida (?SEARCH=texto) - so campos do alias principal
#define RM_BUSCA {"<CAMPO_CODIGO>", "<CAMPO_DESCRICAO>"}
// Filtro fixo da rotina (SQL do servidor, nunca do cliente). Vazio = sem filtro
#define RM_FIXO  ""

/*/{Protheus.doc} <CLASSE>
    Recurso REST do modelo da rotina <FONTE> (FWRestModel) com:
    INCLUI/ALTERA pelo verbo HTTP (MVC legado), permissao do menu da rotina (403),
    FILTER da URL bloqueado (SQL), busca rapida segura, JSON normalizado em todos os
    niveis (FIELDS, GRID e grades netas) e erro do modelo em JSON.
    @type Class
    @author Andre Costa
/*/
Class <CLASSE> From FwRestModel
    Method Activate()
    Method SetFilter()
    Method SaveData()
    Method DelData()
EndClass

/*/{Protheus.doc} Activate
    Cria INCLUI/ALTERA conforme o verbo, valida o acesso ao menu da rotina e aplica o filtro fixo.
    @return lRet Logical, .T. se a requisicao pode seguir
    @type Method
    @author Andre Costa
/*/
Method Activate() Class <CLASSE>
    Local cVerbo := Upper(AllTrim(self:GetHttpHeader("_METHOD_")))
    Local nOper  := MODEL_OPERATION_VIEW
    Local lRet   := _Super:Activate()

    Do Case
    Case cVerbo == "POST"
        nOper := MODEL_OPERATION_INSERT
    Case cVerbo == "PUT"
        nOper := MODEL_OPERATION_UPDATE
    Case cVerbo == "DELETE"
        nOper := MODEL_OPERATION_DELETE
    EndCase

    // ModelDef legado le INCLUI/ALTERA (variaveis de tela) e o REST nao as cria
    Public INCLUI := (nOper == MODEL_OPERATION_INSERT)
    Public ALTERA := (nOper == MODEL_OPERATION_UPDATE)

    If lRet .And. !_RMAcesso(RM_MENU, nOper)
        SetRestFault(403, _RMErroTx("FORBIDDEN", "Sem permissao para esta operacao na rotina " + RM_MENU + "."))
        self:ClearModel()
        lRet := .F.
    EndIf

    If lRet
        self:SetFilter("")
    EndIf

    self:lActivate := lRet
Return lRet

/*/{Protheus.doc} SetFilter
    Monta o filtro: nunca aceita o FILTER da URL (SQL puro); soma o filtro interno
    (ex.: chave do Seek), o filtro fixo da rotina e a busca rapida segura.
    @param cFilter Character, filtro recebido
    @return lRet Logical, sempre .T.
    @type Method
    @author Andre Costa
/*/
Method SetFilter(cFilter) Class <CLASSE>
    Local cUrl    := ""
    Local cBusca  := ""
    Local aPartes := {}
    Local cRet    := ""
    Local nI      := 0

    Default cFilter := ""

    If ValType(self:aQueryString) == "A"
        cUrl   := AllTrim(self:GetQSValue("FILTER"))
        cBusca := _RMBusca(self:GetQSValue("SEARCH"))
    EndIf

    cFilter := AllTrim(cFilter)
    If !Empty(cFilter) .And. !(cFilter == cUrl)
        AAdd(aPartes, "(" + cFilter + ")")
    EndIf
    If !Empty(RM_FIXO)
        AAdd(aPartes, "(" + RM_FIXO + ")")
    EndIf
    If !Empty(cBusca)
        AAdd(aPartes, cBusca)
    EndIf

    For nI := 1 To Len(aPartes)
        cRet += IIf(nI > 1, " AND ", "") + aPartes[nI]
    Next nI

    self:cFilter := cRet
    FwFreeArray(aPartes)
Return .T.

/*/{Protheus.doc} SaveData
    POST (sem cPK) inclui e PUT (com cPK) altera pelo LoadJsonData do modelo, com o JSON
    normalizado (order + valores texto, em todos os niveis); erro do modelo em JSON.
    @param cPK Character, chave do registro (base64 decodificada pelo framework)
    @param cData Character, corpo da requisicao
    @param cError Character, (referencia) erro devolvido ao cliente
    @return lRet Logical, .T. se gravou
    @type Method
    @author Andre Costa
/*/
Method SaveData(cPK, cData, cError) Class <CLASSE>
    Local lRet := .T.

    Default cData := ""

    If Empty(cPK)
        self:oModel:SetOperation(MODEL_OPERATION_INSERT)
    Else
        self:oModel:SetOperation(MODEL_OPERATION_UPDATE)
        lRet := self:Seek(cPK)
    EndIf

    If lRet
        self:oModel:Activate()
        lRet := self:oModel:LoadJsonData(_RMNormJs(cData))
        If lRet
            If self:oModel:lModify
                If !(self:oModel:VldData() .And. self:oModel:CommitData())
                    lRet   := .F.
                    cError := _RMErro(self:oModel:GetErrorMessage())
                EndIf
            Else
                lRet := .F.
                self:SetStatusResponse(304, "Not Modified")
            EndIf
        Else
            cError := _RMErro(self:oModel:GetErrorMessage())
        EndIf
        self:oModel:DeActivate()
    Else
        cError := _RMErroTx("NOTFOUND", "Registro nao encontrado.")
        SetRestFault(404, cError)
    EndIf
Return lRet

/*/{Protheus.doc} DelData
    DELETE do registro; devolve o erro do modelo em JSON.
    @param cPK Character, chave do registro
    @param cError Character, (referencia) erro devolvido ao cliente
    @return lRet Logical, .T. se excluiu
    @type Method
    @author Andre Costa
/*/
Method DelData(cPK, cError) Class <CLASSE>
    Local lRet := .F.

    If !Empty(cPK) .And. self:Seek(cPK)
        self:oModel:SetOperation(MODEL_OPERATION_DELETE)
        self:oModel:Activate()
        lRet := self:oModel:VldData() .And. self:oModel:CommitData()
        If !lRet
            cError := _RMErro(self:oModel:GetErrorMessage())
            SetRestFault(400, cError)
        EndIf
        self:oModel:DeActivate()
    Else
        cError := _RMErroTx("NOTFOUND", "Registro nao encontrado.")
        SetRestFault(404, cError)
    EndIf
Return lRet

/*/{Protheus.doc} _RMNormJs
    Normaliza o corpo: todo valor como texto e todo campo de FIELDS com "order"
    (sem isso o LoadJsonData ignora o 1o campo ou quebra com valor numerico).
    @param cData Character, JSON recebido
    @return cRet Character, JSON normalizado
    @type Static Function
    @author Andre Costa
/*/
Static Function _RMNormJs(cData)
    Local jBody := JsonObject():New()
    Local cRet  := cData

    If ValType(jBody:FromJson(cData)) == "U"
        If jBody:HasProperty("models")
            _RMNormMd(jBody["models"])
        EndIf
        cRet := jBody:ToJson()
    EndIf

    FwFreeObj(jBody)
Return cRet

/*/{Protheus.doc} _RMNormMd
    Percorre os submodelos (FIELDS e GRID) e os submodelos de cada linha (grades netas).
    @param aModels Array, submodelos do JSON
    @type Static Function
    @author Andre Costa
/*/
Static Function _RMNormMd(aModels)
    Local nM := 0
    Local nL := 0
    Local jItem := Nil

    For nM := 1 To Len(aModels)
        If aModels[nM]:HasProperty("fields")
            _RMNormFd(aModels[nM]["fields"], .T.)
        EndIf
        If aModels[nM]:HasProperty("items")
            For nL := 1 To Len(aModels[nM]["items"])
                jItem := aModels[nM]["items"][nL]
                If jItem:HasProperty("fields")
                    _RMNormFd(jItem["fields"], .F.)
                EndIf
                If jItem:HasProperty("models")
                    _RMNormMd(jItem["models"])
                EndIf
            Next nL
        EndIf
        If aModels[nM]:HasProperty("models")
            _RMNormMd(aModels[nM]["models"])
        EndIf
    Next nM
Return

/*/{Protheus.doc} _RMNormFd
    Converte cada value para texto e, nos FIELDS, numera o "order" que faltar.
    @param aFields Array, campos {id, value[, order]}
    @param lOrder Logical, .T. para preencher o order
    @type Static Function
    @author Andre Costa
/*/
Static Function _RMNormFd(aFields, lOrder)
    Local nF := 0
    Local xV := Nil

    For nF := 1 To Len(aFields)
        xV := aFields[nF]["value"]
        Do Case
        Case ValType(xV) == "N"
            aFields[nF]["value"] := cValToChar(xV)
        Case ValType(xV) == "L"
            aFields[nF]["value"] := IIf(xV, ".T.", ".F.")
        Case ValType(xV) == "U"
            aFields[nF]["value"] := ""
        EndCase
        If lOrder .And. !aFields[nF]:HasProperty("order")
            aFields[nF]["order"] := nF
        EndIf
    Next nF
Return

/*/{Protheus.doc} _RMAcesso
    Acesso do usuario REST a operacao, pela posicao do item no MenuDef da rotina.
    @param cRotina Character, fonte com o MenuDef
    @param nOper Numeric, operacao MVC
    @return lRet Logical, .T. se tem acesso
    @type Static Function
    @author Andre Costa
/*/
Static Function _RMAcesso(cRotina, nOper)
    Local aMenu := FWLoadMenuDef(cRotina)
    Local aOper := IIf(nOper == MODEL_OPERATION_VIEW, {MODEL_OPERATION_VIEW, 2}, {nOper})
    Local nPos  := AScan(aMenu, {|x| ValType(x[4]) == "N" .And. AScan(aOper, x[4]) > 0})
    Local lRet  := .F.

    If nPos > 0
        lRet := MPUserHasAccess(cRotina, nPos, RetCodUsr())
    EndIf

    FwFreeArray(aOper)
Return lRet

/*/{Protheus.doc} _RMBusca
    Busca rapida segura: LIKE nos campos de RM_BUSCA com o texto escapado.
    @param cTexto Character, texto do ?SEARCH=
    @return cRet Character, expressao SQL ou vazio
    @type Static Function
    @author Andre Costa
/*/
Static Function _RMBusca(cTexto)
    Local aCampos := RM_BUSCA
    Local cRet    := ""
    Local nI      := 0

    cTexto := Upper(AllTrim(DecodeUTF8(cValToChar(cTexto))))
    cTexto := StrTran(StrTran(StrTran(StrTran(cTexto, "'", "''"), "%", ""), "_", ""), ";", "")
    cTexto := Left(cTexto, 60)

    If !Empty(cTexto)
        For nI := 1 To Len(aCampos)
            cRet += IIf(nI > 1, " OR ", "") + "UPPER(" + aCampos[nI] + ") LIKE '%" + cTexto + "%'"
        Next nI
        cRet := "(" + cRet + ")"
    EndIf

    FwFreeArray(aCampos)
Return cRet

/*/{Protheus.doc} _RMErro
    Erro do modelo (GetErrorMessage) em JSON: code, message, solution, field, submodel, value.
    @param aErro Array, retorno de oModel:GetErrorMessage()
    @return cRet Character, JSON do erro
    @type Static Function
    @author Andre Costa
/*/
Static Function _RMErro(aErro)
    Local jErro := JsonObject():New()
    Local cRet  := ""

    jErro["code"]     := AllTrim(cValToChar(_RMPos(aErro, 5)))
    jErro["message"]  := AllTrim(cValToChar(_RMPos(aErro, 6)))
    jErro["solution"] := AllTrim(cValToChar(_RMPos(aErro, 7)))
    jErro["field"]    := AllTrim(cValToChar(_RMPos(aErro, 4)))
    jErro["submodel"] := AllTrim(cValToChar(_RMPos(aErro, 3)))
    jErro["value"]    := AllTrim(cValToChar(_RMPos(aErro, 8)))
    cRet := jErro:ToJson()

    FwFreeObj(jErro)
Return cRet

/*/{Protheus.doc} _RMErroTx
    Erro simples em JSON (mesmo formato do _RMErro).
    @param cCode Character, codigo do erro
    @param cMsg Character, mensagem
    @return cRet Character, JSON do erro
    @type Static Function
    @author Andre Costa
/*/
Static Function _RMErroTx(cCode, cMsg)
Return _RMErro({"", "", "", "", cCode, cMsg, "", ""})

/*/{Protheus.doc} _RMPos
    Posicao do array de erro ou vazio se nao existir.
    @param aErro Array, array de erro
    @param nPos Numeric, posicao
    @return xRet Any, valor da posicao ou ""
    @type Static Function
    @author Andre Costa
/*/
Static Function _RMPos(aErro, nPos)
Return IIf(ValType(aErro) == "A" .And. Len(aErro) >= nPos .And. aErro[nPos] <> Nil, aErro[nPos], "")
```

## Frontend — `src/app/core/protheus-mvc.ts` (conversões puras)

```typescript
// Conversão entre o formulário PO-UI e o JSON do FWRestModel (/rest/fwmodel), em qualquer nível:
// cabeçalho (FIELDS), blocos 1:1 (FIELDS filhos), grades e grades netas.
// Validado no Protheus 12.1.2510: todo value vai como texto, todo campo de FIELDS leva "order",
// a chave (pk) é opaca (base64 devolvido pelo GET) e linhas removidas vão com deleted: 1.

export type MvcValue = string | number | boolean | Date | null | undefined;
export type MvcRecord = Record<string, MvcValue>;

/** Submodelo filho na especificação: id do MVC, tipo e os filhos dele. */
export interface MvcSubmodel {
  id: string;
  type: 'FIELDS' | 'GRID';
  children?: MvcSubmodel[];
}

/** Estrutura do modelo: id do MPFormModel, id do FIELDS principal e a árvore de submodelos. */
export interface MvcModelSpec {
  modelId: string;
  masterId: string;
  children?: MvcSubmodel[];
}

/** Nó de dados: campos do Protheus (`values`) + blocos 1:1 (`fields`) + grades (`grids`) filhos. */
export interface MvcNode {
  values: MvcRecord;
  fields: Record<string, MvcNode>;
  grids: Record<string, MvcGridRow[]>;
}

/** Linha de grade: `line` = id da linha no modelo (vem do GET; vazio = linha nova). */
export interface MvcGridRow extends MvcNode {
  line?: number;
  deleted?: boolean;
}

export interface MvcData extends MvcNode {
  pk?: string;
}

export interface MvcListItem extends MvcRecord {
  _pk: string;
}

export interface MvcPage {
  items: MvcListItem[];
  hasNext: boolean;
  total: number;
}

export interface MvcError {
  status: number;
  code: string;
  message: string;
  solution: string;
  field: string;
  submodel: string;
  value: string;
}

export const MVC_INSERT = 3;
export const MVC_UPDATE = 4;

interface RawField {
  id: string;
  value?: string;
  order?: number;
}

interface RawItem {
  id: number;
  deleted?: number;
  fields?: RawField[];
  models?: RawModel[];
}

interface RawModel {
  id: string;
  modeltype?: string;
  fields?: RawField[];
  items?: RawItem[];
  models?: RawModel[];
}

export interface RawResource {
  id: string;
  pk?: string;
  models: RawModel[];
}

export interface RawList {
  total?: number;
  count?: number;
  startindex?: number;
  resources?: RawResource[];
}

/** Nó vazio (para montar linhas novas e blocos 1:1 no formulário). */
export function mvcNode(values: MvcRecord = {}): MvcNode {
  return { values, fields: {}, grids: {} };
}

/** Valor do formulário → texto do Protheus (Date → AAAAMMDD, número → texto, lógico → .T./.F.). */
export function toMvcValue(value: MvcValue): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (value instanceof Date) {
    const mm = String(value.getMonth() + 1).padStart(2, '0');
    const dd = String(value.getDate()).padStart(2, '0');
    return `${value.getFullYear()}${mm}${dd}`;
  }
  if (typeof value === 'boolean') {
    return value ? '.T.' : '.F.';
  }
  return String(value);
}

/** Data do Protheus (AAAAMMDD) → Date local; vazio ou inválido → null. */
export function mvcDate(value: MvcValue): Date | null {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!/^\d{8}$/.test(text)) {
    return null;
  }
  return new Date(Number(text.slice(0, 4)), Number(text.slice(4, 6)) - 1, Number(text.slice(6, 8)));
}

/** Número do Protheus ("1.00") → number; vazio → 0. */
export function mvcNumber(value: MvcValue): number {
  const parsed = Number(typeof value === 'string' ? value.trim() : value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toFields(values: MvcRecord, withOrder: boolean): RawField[] {
  return Object.entries(values).map(([id, value], index) =>
    withOrder ? { id, order: index + 1, value: toMvcValue(value) } : { id, value: toMvcValue(value) },
  );
}

function buildChildren(node: MvcNode, children: MvcSubmodel[] | undefined): RawModel[] {
  const models: RawModel[] = [];
  for (const sub of children ?? []) {
    if (sub.type === 'FIELDS') {
      const child = node.fields?.[sub.id];
      if (child) {
        const nested = buildChildren(child, sub.children);
        models.push({ id: sub.id, modeltype: 'FIELDS', fields: toFields(child.values, true), ...(nested.length ? { models: nested } : {}) });
      }
      continue;
    }
    const rows = node.grids?.[sub.id];
    if (!rows) {
      continue;
    }
    let nextLine = rows.reduce((max, row) => Math.max(max, row.line ?? 0), 0);
    models.push({
      id: sub.id,
      modeltype: 'GRID',
      items: rows.map((row) => {
        const nested = buildChildren(row, sub.children);
        return {
          id: row.line ?? ++nextLine,
          deleted: row.deleted ? 1 : 0,
          fields: toFields(row.values, false),
          ...(nested.length ? { models: nested } : {}),
        };
      }),
    });
  }
  return models;
}

/** Monta o corpo do POST (MVC_INSERT) ou PUT (MVC_UPDATE), em todos os níveis da especificação. */
export function buildMvcBody(spec: MvcModelSpec, data: MvcNode, operation: number): object {
  const nested = buildChildren(data, spec.children);
  return {
    id: spec.modelId,
    operation,
    models: [
      { id: spec.masterId, modeltype: 'FIELDS', fields: toFields(data.values, true), ...(nested.length ? { models: nested } : {}) },
    ],
  };
}

function toRecord(fields: RawField[] | undefined): MvcRecord {
  const record: MvcRecord = {};
  for (const field of fields ?? []) {
    record[field.id] = field.value ?? '';
  }
  return record;
}

function parseNode(fields: RawField[] | undefined, models: RawModel[] | undefined, children: MvcSubmodel[] | undefined): MvcNode {
  const node = mvcNode(toRecord(fields));
  for (const sub of children ?? []) {
    const raw = models?.find((model) => model.id === sub.id);
    if (sub.type === 'FIELDS') {
      node.fields[sub.id] = parseNode(raw?.fields, raw?.models, sub.children);
    } else {
      node.grids[sub.id] = (raw?.items ?? []).map((item) => ({
        ...parseNode(item.fields, item.models, sub.children),
        line: item.id,
        deleted: item.deleted === 1,
      }));
    }
  }
  return node;
}

/** Registro do GET /fwmodel/<api>/<pk> → { pk, values, fields, grids } em todos os níveis. */
export function parseMvcResource(resource: RawResource, spec: MvcModelSpec): MvcData {
  const master = resource.models.find((model) => model.id === spec.masterId) ?? resource.models[0];
  return { pk: resource.pk, ...parseNode(master?.fields, master?.models, spec.children) };
}

/** Lista do GET /fwmodel/<api> → { items (campos do cabeçalho + _pk), hasNext, total }. */
export function parseMvcList(raw: RawList, spec: MvcModelSpec): MvcPage {
  const resources = raw.resources ?? [];
  const items = resources.map((resource) => {
    const data = parseMvcResource(resource, { modelId: spec.modelId, masterId: spec.masterId });
    return { ...data.values, _pk: data.pk ?? '' } as MvcListItem;
  });
  const total = raw.total ?? items.length;
  const start = raw.startindex ?? 1;
  const count = raw.count ?? items.length;
  return { items, total, hasNext: start - 1 + count < total };
}

/** Parâmetros da lista: página/tamanho viram STARTINDEX/COUNT; SEARCH é a busca segura do recurso. */
export function mvcListParams(page: number, pageSize: number, search?: string): Record<string, string> {
  const params: Record<string, string> = {
    COUNT: String(pageSize),
    STARTINDEX: String((Math.max(page, 1) - 1) * pageSize + 1),
  };
  if (search?.trim()) {
    params['SEARCH'] = search.trim();
  }
  return params;
}

const TEXT_PATTERNS: Record<keyof Omit<MvcError, 'status'>, RegExp> = {
  code: /Id erro:\s*\[([^\]]*)\]/,
  message: /Mensagem de erro:\s*\[([^\]]*)\]/,
  solution: /Mensagem da solu[çc][ãa]o:\s*\[([^\]]*)\]/,
  field: /Id campo erro:\s*\[([^\]]*)\]/,
  submodel: /Id submodelo erro:\s*\[([^\]]*)\]/,
  value: /Valor atribu[íi]do:\s*\[([^\]]*)\]/,
};

/** Erro HTTP do /fwmodel → MvcError. Aceita o JSON do recurso gerado e o texto padrão do framework. */
export function parseMvcError(status: number, body: unknown): MvcError {
  const empty: MvcError = { status, code: '', message: '', solution: '', field: '', submodel: '', value: '' };
  const source = (body ?? {}) as Record<string, unknown>;
  const raw = typeof body === 'string' ? body : String(source['errorMessage'] ?? source['message'] ?? '');

  try {
    const parsed = JSON.parse(raw) as Partial<MvcError>;
    if (parsed && typeof parsed === 'object' && 'message' in parsed) {
      return { ...empty, ...trimAll(parsed) };
    }
  } catch {
    // não é JSON: texto padrão do FWRestModel
  }

  const result = { ...empty };
  let matched = false;
  for (const key of Object.keys(TEXT_PATTERNS) as (keyof typeof TEXT_PATTERNS)[]) {
    const found = TEXT_PATTERNS[key].exec(raw);
    if (found) {
      result[key] = found[1].trim();
      matched = true;
    }
  }
  if (!matched) {
    result.message = raw.trim() || 'Erro ao comunicar com o Protheus.';
  }
  return result;
}

function trimAll(error: Partial<MvcError>): Partial<MvcError> {
  const out: Partial<MvcError> = {};
  for (const [key, value] of Object.entries(error)) {
    if (key !== 'status') {
      (out as Record<string, string>)[key] = String(value ?? '').trim();
    }
  }
  return out;
}

/** Texto para o po-notification: mensagem + solução (quando houver). */
export function mvcErrorText(error: MvcError): string {
  return error.solution ? `${error.message} ${error.solution}` : error.message;
}
```

## Frontend — `src/app/core/protheus-mvc.service.ts`

```typescript
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, throwError } from 'rxjs';

import {
  MVC_INSERT,
  MVC_UPDATE,
  MvcData,
  MvcModelSpec,
  MvcNode,
  MvcPage,
  RawList,
  RawResource,
  buildMvcBody,
  mvcListParams,
  parseMvcError,
  parseMvcList,
  parseMvcResource,
} from './protheus-mvc';

/** CRUD de uma rotina MVC publicada com FWRestModel (`/fwmodel/<nome>`; o ProtheusLibCore prefixa o /rest). Erros saem como MvcError. */
@Injectable({ providedIn: 'root' })
export class ProtheusMvcService {
  private readonly http = inject(HttpClient);

  list(api: string, spec: MvcModelSpec, page: number, pageSize: number, search?: string): Observable<MvcPage> {
    const params = new HttpParams({ fromObject: mvcListParams(page, pageSize, search) });
    return this.http.get<RawList>(api, { params }).pipe(
      map((raw) => parseMvcList(raw, spec)),
      catchError((error: HttpErrorResponse) => this.fail(error)),
    );
  }

  get(api: string, spec: MvcModelSpec, pk: string): Observable<MvcData> {
    const params = new HttpParams().set('FIELDEMPTY', 'true');
    return this.http.get<RawResource>(`${api}/${pk}`, { params }).pipe(
      map((raw) => parseMvcResource(raw, spec)),
      catchError((error: HttpErrorResponse) => this.fail(error)),
    );
  }

  create(api: string, spec: MvcModelSpec, data: MvcNode): Observable<MvcData> {
    return this.http.post<RawResource>(api, buildMvcBody(spec, data, MVC_INSERT)).pipe(
      map((raw) => parseMvcResource(raw, spec)),
      catchError((error: HttpErrorResponse) => this.fail(error)),
    );
  }

  /** `null` = nada foi alterado (HTTP 304 do FWRestModel). */
  update(api: string, spec: MvcModelSpec, pk: string, data: MvcNode): Observable<MvcData | null> {
    return this.http.put<RawResource>(`${api}/${pk}`, buildMvcBody(spec, data, MVC_UPDATE)).pipe(
      map((raw) => parseMvcResource(raw, spec)),
      catchError((error: HttpErrorResponse) => (error.status === 304 ? of(null) : this.fail(error))),
    );
  }

  remove(api: string, pk: string): Observable<void> {
    return this.http.delete(`${api}/${pk}`).pipe(
      map(() => undefined),
      catchError((error: HttpErrorResponse) => this.fail(error)),
    );
  }

  private fail(error: HttpErrorResponse): Observable<never> {
    return throwError(() => parseMvcError(error.status, error.error));
  }
}
```

## Testes Karma (gerar junto)

`src/app/core/protheus-mvc.spec.ts`:

```typescript
import {
  MVC_INSERT,
  MVC_UPDATE,
  MvcModelSpec,
  buildMvcBody,
  mvcDate,
  mvcListParams,
  mvcNode,
  mvcNumber,
  parseMvcError,
  parseMvcList,
  parseMvcResource,
  toMvcValue,
} from './protheus-mvc';

interface BodyModel {
  id: string;
  modeltype: string;
  fields?: { id: string; order?: number; value: string }[];
  items?: { id: number; deleted: number; fields: { id: string; value: string }[]; models?: BodyModel[] }[];
  models?: BodyModel[];
}

describe('protheus-mvc (conversões)', () => {
  const spec: MvcModelSpec = {
    modelId: 'M',
    masterId: 'CAB',
    children: [
      { id: 'COMPL', type: 'FIELDS' },
      { id: 'ITENS', type: 'GRID', children: [{ id: 'SUBITENS', type: 'GRID' }] },
    ],
  };

  it('toMvcValue: Date, número, lógico e vazio viram texto', () => {
    expect(toMvcValue(new Date(2030, 0, 5))).toBe('20300105');
    expect(toMvcValue(5)).toBe('5');
    expect(toMvcValue(true)).toBe('.T.');
    expect(toMvcValue(null)).toBe('');
  });

  it('mvcDate e mvcNumber', () => {
    expect(mvcDate('20300105')?.getDate()).toBe(5);
    expect(mvcDate('')).toBeNull();
    expect(mvcNumber('1.00')).toBe(1);
  });

  it('buildMvcBody: order nos FIELDS (cabeçalho e 1:1), grade e grade neta com id/deleted', () => {
    const data = {
      ...mvcNode({ A: 'x', B: 2 }),
      fields: { COMPL: mvcNode({ C: 'y' }) },
      grids: {
        ITENS: [
          { ...mvcNode({ I: '001' }), line: 1, grids: { SUBITENS: [{ ...mvcNode({ S: 1 }), line: 1, deleted: true }, mvcNode({ S: 2 })] } },
          mvcNode({ I: '002' }),
        ],
      },
    };
    const body = buildMvcBody(spec, data, MVC_UPDATE) as { operation: number; models: BodyModel[] };
    const cab = body.models[0];
    expect(body.operation).toBe(4);
    expect(cab.fields).toEqual([
      { id: 'A', order: 1, value: 'x' },
      { id: 'B', order: 2, value: '2' },
    ]);
    const compl = cab.models!.find((m) => m.id === 'COMPL')!;
    expect(compl.modeltype).toBe('FIELDS');
    expect(compl.fields).toEqual([{ id: 'C', order: 1, value: 'y' }]);
    const itens = cab.models!.find((m) => m.id === 'ITENS')!.items!;
    expect(itens.map((i) => i.id)).toEqual([1, 2]);
    const netos = itens[0].models![0].items!;
    expect(netos.map((n) => [n.id, n.deleted])).toEqual([[1, 1], [2, 0]]);
    expect(itens[1].models).toBeUndefined();
  });

  it('buildMvcBody sem filhos não manda models', () => {
    const body = buildMvcBody({ modelId: 'M', masterId: 'CAB' }, mvcNode({ A: 1 }), MVC_INSERT) as { models: BodyModel[] };
    expect(body.models[0].models).toBeUndefined();
  });

  it('parseMvcResource: cabeçalho, bloco 1:1, grade e grade neta', () => {
    const data = parseMvcResource(
      {
        id: 'M',
        pk: 'PK1',
        models: [
          {
            id: 'CAB',
            fields: [{ id: 'A', value: 'x' }],
            models: [
              { id: 'COMPL', modeltype: 'FIELDS', fields: [{ id: 'C', value: 'y' }] },
              {
                id: 'ITENS',
                modeltype: 'GRID',
                items: [
                  {
                    id: 1,
                    deleted: 0,
                    fields: [{ id: 'I', value: '001' }],
                    models: [{ id: 'SUBITENS', modeltype: 'GRID', items: [{ id: 1, deleted: 0, fields: [{ id: 'S', value: '1.00' }] }] }],
                  },
                ],
              },
            ],
          },
        ],
      },
      spec,
    );
    expect(data.pk).toBe('PK1');
    expect(data.values['A']).toBe('x');
    expect(data.fields['COMPL'].values['C']).toBe('y');
    expect(data.grids['ITENS'][0].line).toBe(1);
    expect(mvcNumber(data.grids['ITENS'][0].grids['SUBITENS'][0].values['S'])).toBe(1);
  });

  it('parseMvcList: hasNext falso na última página', () => {
    expect(parseMvcList({ total: 3, count: 1, startindex: 3, resources: [] }, spec).hasNext).toBeFalse();
  });

  it('mvcListParams: página 3 de 10', () => {
    expect(mvcListParams(3, 10)['STARTINDEX']).toBe('21');
  });

  it('parseMvcError: texto padrão do framework e JSON do recurso', () => {
    const texto = parseMvcError(400, { errorMessage: 'Id campo erro: [Z08_NATORI]\r\nMensagem de erro: [Não existe.]\r\n' });
    expect(texto.field).toBe('Z08_NATORI');
    expect(texto.message).toBe('Não existe.');
    const json = parseMvcError(400, { errorMessage: '{"code":"UNIQUELINE","message":"Linha duplicada","submodel":"SUBITENS"}' });
    expect(json.code).toBe('UNIQUELINE');
    expect(json.submodel).toBe('SUBITENS');
  });
});
```

`src/app/core/protheus-mvc.service.spec.ts`:

```typescript
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { MvcError, MvcModelSpec, mvcNode } from './protheus-mvc';
import { ProtheusMvcService } from './protheus-mvc.service';

describe('ProtheusMvcService', () => {
  const api = '/fwmodel/rcaregras';
  const spec: MvcModelSpec = { modelId: 'MF134310', masterId: 'Z07MASTER', children: [{ id: 'Z08DETAIL', type: 'GRID' }] };
  const resource = {
    id: 'MF134310',
    pk: 'PK1',
    models: [{ id: 'Z07MASTER', modeltype: 'FIELDS', fields: [{ id: 'Z07_CODIGO', order: 2, value: 'R1' }] }],
  };
  let service: ProtheusMvcService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(ProtheusMvcService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('list: envia COUNT/STARTINDEX/SEARCH e devolve items/hasNext', () => {
    let hasNext = false;
    let codigo = '';
    service.list(api, spec, 2, 10, 'abc').subscribe((page) => {
      hasNext = page.hasNext;
      codigo = String(page.items[0]['Z07_CODIGO']);
    });
    const req = httpMock.expectOne((r) => r.url === api);
    expect(req.request.params.get('COUNT')).toBe('10');
    expect(req.request.params.get('STARTINDEX')).toBe('11');
    expect(req.request.params.get('SEARCH')).toBe('abc');
    req.flush({ total: 30, count: 1, startindex: 11, resources: [resource] });
    expect(hasNext).toBeTrue();
    expect(codigo).toBe('R1');
  });

  it('create: POST com operation 3, order nos campos e valores em texto', () => {
    service.create(api, spec, mvcNode({ Z07_CODIGO: 'R1', Z07_RCA: 5 })).subscribe();
    const req = httpMock.expectOne(api);
    expect(req.request.method).toBe('POST');
    const body = req.request.body as { operation: number; models: { fields: { id: string; order: number; value: string }[] }[] };
    expect(body.operation).toBe(3);
    expect(body.models[0].fields).toEqual([
      { id: 'Z07_CODIGO', order: 1, value: 'R1' },
      { id: 'Z07_RCA', order: 2, value: '5' },
    ]);
    req.flush(resource, { status: 201, statusText: 'Created' });
  });

  it('update: 304 vira null (nada alterado)', () => {
    let result: unknown = 'pendente';
    service.update(api, spec, 'PK1', mvcNode({ Z07_CODIGO: 'R1' })).subscribe((r) => (result = r));
    httpMock.expectOne(`${api}/PK1`).flush(null, { status: 304, statusText: 'Not Modified' });
    expect(result).toBeNull();
  });

  it('erro 400 do recurso gerado vira MvcError com campo', () => {
    let error: MvcError | undefined;
    service.remove(api, 'PK1').subscribe({ error: (e: MvcError) => (error = e) });
    httpMock.expectOne(`${api}/PK1`).flush(
      { errorCode: 400, errorMessage: '{"code":"FWVLDVAZIO","message":"Valor inválido","field":"Z08_RCA"}' },
      { status: 400, statusText: 'Bad Request' },
    );
    expect(error?.status).toBe(400);
    expect(error?.field).toBe('Z08_RCA');
  });

  it('erro 404 de registro inexistente', () => {
    let error: MvcError | undefined;
    service.get(api, spec, 'X').subscribe({ error: (e: MvcError) => (error = e) });
    httpMock.expectOne((r) => r.url === `${api}/X`).flush(
      { errorCode: 404, errorMessage: '{"code":"NOTFOUND","message":"Registro nao encontrado."}' },
      { status: 404, statusText: 'Not Found' },
    );
    expect(error?.code).toBe('NOTFOUND');
  });
});
```

## Especificação do modelo (`MvcModelSpec`)

Espelha o `ModelDef`: um nó por `AddFields`/`AddGrid`, com o id e o tipo, aninhado conforme o "owner".

```typescript
// oModel:AddFields("SC5MASTER") / AddFields("SC5COMPL", "SC5MASTER") / AddGrid("SC6DETAIL", "SC5MASTER")
// / AddGrid("SC9DETAIL", "SC6DETAIL")
const SPEC: MvcModelSpec = {
  modelId: '<MODEL_ID>',                 // MPFormModel():New("<MODEL_ID>")
  masterId: 'SC5MASTER',
  children: [
    { id: 'SC5COMPL', type: 'FIELDS' },
    { id: 'SC6DETAIL', type: 'GRID', children: [{ id: 'SC9DETAIL', type: 'GRID' }] },
  ],
};
```

## Uso no componente (page-edit / modal-crud)

```typescript
// sem /rest: o ProtheusLibCore prefixa a base REST (no ng serve, serverBackend + restEntryPoint do appConfig.json)
const API = '/fwmodel/<api>';

private readonly mvc = inject(ProtheusMvcService);
private readonly notification = inject(PoNotificationService);

carregar(pk: string): void {
  this.mvc.get(API, SPEC, pk).subscribe({
    next: (data) => {
      this.dados = data;                                   // data.values = campos do cabeçalho (texto)
      this.form.patchValue({ ...data.values, emissao: mvcDate(data.values['SC5_EMISSAO']) });
      this.itens = data.grids['SC6DETAIL'].filter((l) => !l.deleted);
      // netos da linha: this.itens[i].grids['SC9DETAIL'] · bloco 1:1: data.fields['SC5COMPL'].values
    },
    error: (e: MvcError) => this.notification.error(mvcErrorText(e)),
  });
}

novoItem(): void {
  this.dados!.grids['SC6DETAIL'].push(mvcNode({ SC6_ITEM: this.proximoItem() }));   // sem line = linha nova
}

salvar(): void {
  const data = this.dados!;
  data.values = { ...data.values, ...this.form.getRawValue() };
  const gravar$ = data.pk ? this.mvc.update(API, SPEC, data.pk, data) : this.mvc.create(API, SPEC, data);
  gravar$.subscribe({
    next: (salvo) => this.notification.success(salvo ? 'Registro gravado.' : 'Nenhuma alteração para gravar.'),
    error: (e: MvcError) => {
      this.notification.error(mvcErrorText(e));
      // e.field = campo do Protheus, e.submodel = submodelo (ex.: 'SC9DETAIL') → marcar o controle/linha
    },
  });
}
```

- Inclusão: começar de `mvcNode()` (cabeçalho vazio) e ir preenchendo `values`, `fields` e `grids`.
- Linha removida (em qualquer nível): `row.deleted = true` e **mantê-la no array** até salvar; excluir uma
  linha exclui também os netos dela.
- Linha nova: sem `line` — o `buildMvcBody` numera depois da maior linha existente.
- Lista: `this.mvc.list(API, SPEC, page, pageSize, busca)` → `{ items, hasNext, total }`; cada item tem `_pk`.
- O proxy `/rest` do `proxy.conf.js` já cobre `/rest/fwmodel` (a URL final, depois do prefixo do ProtheusLibCore).

## Modo somente leitura — `--mvc <FONTE> --readonly`

Para telas que **só consultam** o modelo (monitor, painel de acompanhamento, `two-panel-browse --detail`,
`page-detail`): a gravação continua só na rotina MVC (ou em ações próprias da API), e o frontend não leva
`buildMvcBody`, `create`, `update`, `remove` nem os testes deles.

- **Backend:** o `RM_<FONTE>.prw` é o mesmo (ele já bloqueia por MenuDef o que o usuário não pode). Se o
  recurso já existe no projeto, **não gerar de novo** — só confirmar o `<api>` e o `<MODEL_ID>`.
- **`protheus-mvc.ts`:** gerar só as partes de leitura — tipos (`MvcModelSpec`, `MvcData`, `MvcPage`,
  `MvcRecord`, `RawList`, `RawResource`, `MvcError`), `mvcText`/`mvcNumber`/`mvcDate`, `mvcListParams`,
  `parseMvcList`, `parseMvcResource` e `parseMvcError`. Omitir `mvcNode`, `buildMvcBody` e os helpers de
  numeração de linha.
- **`protheus-mvc.service.ts`** (leitura):

```typescript
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';

import { MvcData, MvcModelSpec, MvcPage, RawList, RawResource, mvcListParams, parseMvcError, parseMvcList, parseMvcResource } from './protheus-mvc';

/** Leitura de uma rotina MVC publicada com FWRestModel (`/fwmodel/<nome>`). Erros saem como MvcError. */
@Injectable({ providedIn: 'root' })
export class ProtheusMvcService {
  private readonly http = inject(HttpClient);

  list(api: string, spec: MvcModelSpec, page: number, pageSize: number, search?: string): Observable<MvcPage> {
    const params = new HttpParams({ fromObject: mvcListParams(page, pageSize, search) });
    return this.http.get<RawList>(api, { params }).pipe(
      map((raw) => parseMvcList(raw, spec)),
      catchError((error: HttpErrorResponse) => this.fail(error)),
    );
  }

  /** Registro completo (FIELDEMPTY=true: todos os campos, inclusive os vazios). */
  get(api: string, spec: MvcModelSpec, pk: string): Observable<MvcData> {
    const params = new HttpParams().set('FIELDEMPTY', 'true');
    return this.http.get<RawResource>(`${api}/${pk}`, { params }).pipe(
      map((raw) => parseMvcResource(raw, spec)),
      catchError((error: HttpErrorResponse) => this.fail(error)),
    );
  }

  private fail(error: HttpErrorResponse): Observable<never> {
    return throwError(() => parseMvcError(error.status, error.error));
  }
}
```

- **Service da entidade** (ex.: `LoteService`): mapeia `MvcData` → interface da tela (`values` do cabeçalho
  + `grids['<ID>DETAIL']` filtrando `deleted`) e expõe só `list`/`get`.
- **Testes:** só os de leitura (lista com `COUNT`/`STARTINDEX`/`SEARCH`, `get` com `FIELDEMPTY`, grade sem
  `items`, erro em JSON e em texto, 401/404).
- **Filtros que não são busca:** o `FILTER` da URL é ignorado pelo recurso (proteção contra injeção de
  SQL). Filtro fixo vai no `RM_FIXO` do backend; filtro escolhido na tela (status, tipo) filtra no cliente
  os registros já carregados — avisar na tela ("filtra os N carregados") — ou vira um parâmetro tratado no
  `SetFilter` do recurso com lista de valores permitidos.

## Limitações

- O GET devolve só campos preenchidos sem `FIELDEMPTY=true` (o `get` do service já manda; a lista não).
- Grade sem tabela (carga manual/array, ex.: SM0) precisa de `Seek`/`Skip`/`Total` próprios na classe —
  caso a caso (exemplo no TDN da FWRestModel).
- Permissão testada com administrador; validar com um usuário restrito no ambiente do cliente.
