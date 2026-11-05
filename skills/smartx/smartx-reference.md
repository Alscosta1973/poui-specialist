# Smart X — referência técnica (TDN, revisada em 05/11/2026)

## 1. Estrutura de uma rotina

| Artefato | O que é | Onde fica |
|---|---|---|
| **Objeto** | Contrato JSON de uma tabela. `ObjectFromMetadata` (lê SX3) ou `BuildFromCode` (campo a campo) | gerado em runtime, ou classe `<ns>.object.<NOME>.tlpp` |
| **Modelo** | Entidade de negócio: objetos, relacionamentos, propriedades, lookups, eventos | `<produto>.<modulo>.model.<rotina>.tlpp` |
| **Interface** | Contrato de UI: browse (`dataView`) e formulários (`dataNew`, `dataEdit`, `dataDetail`) | `<produto>.<modulo>.interface.<rotina>.tlpp` |
| **Launcher** | Função de menu que abre a Interface | `<rotina>sx.prw` (função global, sem namespace) |

Fluxo: **Launcher → Interface (namespace) → Modelo (`setModelId`) → Objetos (`ObjectFromMetadata`)**.
O launcher é o que se cadastra no menu (Configurador > Menu, ou CFGATV).

Convenções do TDN: namespace `<produto>.<modulo>.object|model|interface`; nome da classe = identificador
da rotina (`MATA110`, `FINA050`); arquivo = namespace com pontos + `.tlpp`.

Includes: `fw-tlpp-core.th`, `protheus.ch`, `totvs.framework.structure.model.th` (Modelo) ou
`totvs.framework.structure.Interface.th` (Interface). Launcher: `protheus.ch`.

## 2. Objeto

```advpl
// Assinatura
totvs.framework.structure.object.ObjectFromMetadata():new( cAlias, aFields, aKeyFields, cFilter, aIncludeFields )
```

| Parâmetro | Obrig. | Descrição |
|---|---|---|
| `cAlias` | Sim | Alias no dicionário (`"SC1"`) |
| `aFields` | Não | Campos a incluir; vazio = toda a SX3 |
| `aKeyFields` | Não | Chave do registro — **incluir o campo de filial** (`{"B1_FILIAL","B1_COD"}`) |
| `cFilter` | Não | Filtro oData (`"FK7_ALIAS eq 'SE2'"`) |
| 5º | Não | Campos do cabeçalho quando cabeçalho e itens usam a mesma tabela (SC7) |

`BuildFromCode` (controle fino):

```advpl
self:oObject := totvs.framework.structure.object.BuildFromCode():new( "SC1HEADER" )
oField := totvs.framework.structure.object.BuildFieldProperties():new( "C1_NUM" )
oField:setType("C") ; oField:setTitle("Número") ; oField:setSize(6)
oField:setOrder(2) ; oField:setRequired(.T.) ; oField:setUpperCase(.T.) ; oField:setInUse(.T.)
self:oObject:addFieldProperties( oField:getFieldProperties() )
self:oObject:setTitle("Solicitação de Compras")
```

Não é possível misturar no mesmo objeto campos do dicionário e campos hardcode (interface mista).

## 3. Modelo

```advpl
#include 'fw-tlpp-core.th'
#include "protheus.ch"
#include "totvs.framework.structure.model.th"

namespace <produto>.<modulo>.model

@totvsFrameworkStructureModel(lookup=.F., country="ALL", description="<Descrição>")
class <ROTINA> from totvs.framework.structure.model.data
    public method new() as object
    public method setModel()
EndClass

method new() as object class <ROTINA>
    _Super:new(,,.T.)
Return self

method setModel() class <ROTINA>
    local oObj as object
    oObj := totvs.framework.structure.object.ObjectFromMetadata():new( "SB1",, {"B1_FILIAL","B1_COD"} )
    self:setObject( oObj:getObject(), "SB1" )
return
```

Annotation: `lookup` (modelo usado como lookup?), `country` (`"ALL"` ou ISO 3166-1 alpha-3), `description`.

| Método | Uso |
|---|---|
| `setObject(jObj, cAlias, lIgnore, lModel2, aModel2IgnoreFields, , aModel2IncludeFields)` | Objeto principal |
| `addObject(jObj, cId, aChaveFilho, aChavePai, cPai, cLabel)` | Relacionado 1:1 |
| `addArray(jObj, cId, aChaveFilho, aChavePai, cPai, nPos, cLabel, cAliasVirtual)` | Grid 1:N |
| `setProperty(cCampo, cProp, xValor, cObjId)` | `hidden`, `readOnly`, `defaultValue`, `title`, `description`, `format`, `pattern` |
| `addRequired(aCampos)` / `setRequired(aCampos)` | Obrigatórios além do dicionário |
| `addExclude(aCampos)` | Remove campos do modelo |
| `addLookup(cCampo, cAlias, jLookup)` | Lookup personalizado (seção 8) |
| `addAggregates(aCampos, cTipo, cObjeto, cLabel)` | Totalizador do grid (`sum`, `average`, `count`, `min`, `max`) |
| `addLineValidation(cGrid, cFuncao)` | Validação da linha do grid (seção 10) |
| `addValidators` / `addTriggers` / `addInitializers` / `addEvents` | Eventos (seção 5) |
| `disableDefaultValidators()` / `disableDefaultTriggers()` / `disableDefaultInitializers()` | Desliga X3_VALID / SX7 / X3_RELACAO **da rotina inteira** |
| `setEvents(oHandler)` | Classe de eventos de ciclo de vida (`from totvs.framework.model.events`) |
| `static beforeCommit(jData)` / `static afterCommit(jData)` | Hooks de gravação no próprio modelo |

Mesma tabela para cabeçalho e itens (ex.: SC7): dois objetos do mesmo alias; `setObject` com
`aModel2IncludeFields` (campos do cabeçalho); `addArray` com **alias virtual** diferente (`"SC7ITEM"`);
na Interface `addInclude(..., "SC7")` e `addProperty("SC7ITEM", "C7_NUM", "hidden", .T.)`;
`addProperty("SC7", "C7_ITEM", "autoInc", .T.)` numera os itens.

## 4. Interface

```advpl
#include 'fw-tlpp-core.th'
#include "protheus.ch"
#include "totvs.framework.structure.Interface.th"

namespace <produto>.<modulo>.interface

@totvsFrameworkStructureInterface(lookup=.F., country="ALL", description="<Descrição>")
class <ROTINA>
    private data oInterface  as object
    private data oDataView   as object
    private data oDataNew    as object
    private data oDataEdit   as object
    private data oDataDetail as object
    public method new() as object
    public method setInterface()
    public method getContract() as json
EndClass
```

Os três métodos `new`, `setInterface` e `getContract` são **obrigatórios**. Atalho para rotina simples:
`class X from totvs.framework.structure.interface.BuildContract` + `self:setModelId(...)` + `self:buildStardardView()`
(grafia do TDN; recurso em prototipação).

| Classe | Papel | Métodos principais |
|---|---|---|
| `BuildContract():new(cId)` | Contrato da rotina | `setTitle`, `setModelId(cModel, l)`, `setVersion`, `setDataView/New/Edit/Detail(j, l)`, `getContract` |
| `BuildDataView():new(cId, cModel)` | Browse | `setTitle`, `setModelId`, `setInvisibleFields(aObjs)`, `assignInvisibleFields()` (usa X3_BROWSE), `addPageAction(j, lRefresh, lLoading)`, `addTableAction(j, , , lRefresh, lLoading)`, `addTableActionSubItems`, `addBeforePageAction(cId, j)`, `addBeforeTableAction(cId, j)`, `addFilterConfig("basic", aCampos, l)`, `setFieldAsLabel(cAlias, cCampo, jCores, lPrimeira)`, `addAggregates(aCampos, cTipo, cLabel)` |
| `BuildDataNew` / `BuildDataEdit` / `BuildDataDetail` | Formulários (Edit faz alterar e excluir) | `setTitle`, `addInclude(aCampos, cObj)`, `addProperty(cObj, cCampo, cProp, x)`, `setElement(cObj, aElements)`, `addComponent(cAlias, cCampo, jComp)`, `addPageAction({"identifier":"editAction","hidden":.T.})` |
| `BuildTabsFromCode` / `BuildTabsSection` | Abas | `addTab(cTitulo, aElementos)`, `getByObject(cModel, cObj)`, `getTabs()` |
| `BuildElementsFromCode` | Elementos manuais | `addElements(aCampos, lOrdemArray)`, `mergeElements(aBase, aExtra)`, `getElements()` |
| `BuildComponent` | Componentes PO-UI | `setRadioGroup(nCols, cTam)`, `getRadioGroup()`, `setDivider(cLabel)`, `getDivider()` |
| `BuildGridSystem`, `BuildSectionsFromCode`, `BuildPageSlide`, `BuildRelatedView` | Layout avançado | ver páginas de classe no TDN |

Ações padrão do `dataDetail`: `editAction`, `deleteAction` (ocultar com `addPageAction` + `"hidden": .T.`).

## 5. Eventos (sempre no **Modelo**)

Registrar eventos pela Interface (`setEvents` no contrato) gera erro. Só `onKeyDown` fica na Interface
(`addInterfaceEvents`).

| Dicionário | Evento padrão gerado |
|---|---|
| `X3_VALID` preenchido | `onChange` → `serverValidate` (validator padrão) |
| SX7 (gatilho) | `onChange` → `apiCall /runTrigger` (trigger padrão) |
| `X3_RELACAO` | `onLoad` / `onActionEdit` (initializer padrão) |

| Método | Evento | Efeito sobre o padrão |
|---|---|---|
| `addValidators` | `onChange` | **Substitui** o X3_VALID do campo |
| `addTriggers` | `onChange` | **Complementa**: roda como `actionValid` depois do X3_VALID retornar `.T.` |
| `addInitializers` | `onLoad` / `onActionEdit` | Substitui o X3_RELACAO |
| `addEvents` | outros (`onEnter`, `onBlur`…) | Não interage |

Regras obrigatórias (TDN + FAQ):

1. **Um contexto por chamada** — `addOnChange({"dataNew"}, ...)` e `addOnChange({"dataEdit"}, ...)`
   separados. `{"dataNew","dataEdit"}` juntos quebra o encapsulamento com o validator padrão e o trigger
   não dispara. Exceção: campo virtual sem X3_VALID (aí o agrupado funciona).
2. **Um campo por evento** — o array de campos deve ter exatamente 1 elemento.
3. `addTriggers` não valida nem bloqueia gravação; para isso `addValidators`.
4. `BuildAdvplAction` que devolve dados: `setHasResponse(.T.)`, e a função retorna **JSON em string**.
5. Campo virtual é `readOnly` por padrão e não dispara evento — `addProperty(cObj, cCampo, "readOnly", "false")`
   no `dataNew`/`dataEdit`.

Trigger padrão:

```advpl
oField := totvs.framework.structure.interface.BuildTargetFieldStructure():new()
oField:setIdentifier("A1_BAIRRO")
oField:setProperty("value", "{{$response.A1_BAIRRO}}")

oSetFields := totvs.framework.structure.interface.BuildSetFieldsAction():new()
oSetFields:setLabel("fillByCEP")
oSetFields:setIdentifier("fillByCEP")
oSetFields:addTargetField(oField:getStructure())

oAdvplAct := totvs.framework.structure.interface.BuildAdvplAction():new()
oAdvplAct:setLabel("buscaCEP")
oAdvplAct:setRoutine("meu.namespace.BuscaCEP")
oAdvplAct:setParams({"{{$model.A1_CEP}}"})
oAdvplAct:setHasResponse(.T.)
oAdvplAct:setAction(oSetFields:getAction())

oEvents := totvs.framework.structure.interface.BuildEvents():new()
oEvents:addOnChange({"dataNew"},  {"A1_CEP"}, oAdvplAct:getAction())
oEvents:addOnChange({"dataEdit"}, {"A1_CEP"}, oAdvplAct:getAction())
self:addTriggers(oEvents:getEvents())
```

Validator customizado (substitui o X3_VALID):

```advpl
jPayload := JsonObject():New()
jPayload["identifier"] := "meu.namespace.valid_CAMPO"
jPayload["function"]   := "meu.namespace.validarCampo"
jPayload["field"]      := "MEU_CAMPO"
jPayload["value"]      := "{{$model.MEU_CAMPO}}"

oAction := totvs.framework.structure.interface.BuildServerValidateAction():new()
oAction:setLabel("valid_MEU_CAMPO")
oAction:setIdentifier("valid_MEU_CAMPO")
oAction:setHTTPMethod("POST")
oAction:setEndPoint("validateMEU_CAMPO")
oAction:setPayload(jPayload)
```

Initializer: `oEvents:addOnLoad({"dataNew"},, oAct)` + `oEvents:addOnActionEdit({"dataNew"},, oAct)` →
`self:addInitializers(oEvents:getEvents())`.

## 6. Ações

Tipos: `setFields`, `showMessage`, `submit`, `navigate`, `apiCall`, `routine`, `serverValidate`,
`conditional`, `validate`, `confirm`, `knowledgeBase`, `advpl`. Cada um tem sua classe `Build*Action`;
o contrato sai de `getAction()`. Ações podem ser encadeadas (`setAction`, `setActionTrue`).

- `BuildAdvplAction` chama qualquer função ADVPL/TLPP (inclusive com tela ADVPL). Interpolações:
  `{{$selectedRow.CAMPO}}` (linha do browse), `{{$model.CAMPO}}` (formulário), `{{$response.x}}` (retorno).
- `BuildShowMessageAction`: `setMessage`, `setSupportMessage`, `setMessageType("warning")`.
- `BuildKnowledgeBaseAction`: Banco de Conhecimento; `setParams` com a chave única do registro.
- Refresh do browse após a ação: `addPageAction(j, .T.)`, `addTableAction(j, , , .T.)`.
- Botões customizados viram ações: chamam função/API no backend, não executam bloco de código na tela.

## 7. Expressões e ações condicionais

`BuildExpression`: `addValueFromSelectedRow("SC6.C6_QTDE")`, `addValueFromModel("C5_DESCONT")`,
`addValueFromLiteral("100")`, `addValueFromResponse("ok")`, `addParenthesisOpen/Close()`,
`addOperatorMath(n)` (1 +, 2 −, 3 ×, 4 ÷), `addOperatorComparison(n)` (1 >, 2 <, 3 >=, 4 <=, 5 ==, 6 !=),
`addOperatorLogical(n)` (1 AND, 2 OR), `getExpression()`.

- `BuildConditionalAction`: `setExpression`, `setActionTrue`, `setActionFalse`.
- `BuildValidateAction`: valida no frontend sem chamar API; expressão `.T.` = válido.

## 8. Lookups

- **Automático:** campo com `X3_F3` → o framework lê a SXB (tipo 1 tabela, 4 colunas, 5 retorno, 6 filtro)
  e expõe `GET /api/framework/v1/data/totvs.framework.model.lookup.<CONSULTA>`.
- Suportado nas colunas: campo, `Posicione`, `SUBSTR`, `LEFT`. Não: `RIGHT`, `If/IIF`, funções customizadas.
- Filtro tipo 6 convertido para oData (`CC2->CC2_EST == M->A1_EST` → `CC2_EST eq {{$model.A1_EST}}`).
  Não convertível (macro `#`/`@#`, `IIF`, `FwFldGet`, `MV_PAR`) → **lookup abre sem filtro**.
- Consultas tipo **RE** não são processadas → lookup personalizado:

```advpl
oLookup := totvs.framework.structure.model.lookup():new()
oLookup:setLookup("totvs.framework.model.lookup.CC2SA1", "CC2_CODMUN", "CC2_EST eq {{$model.A1_EST}}", ;
                  {"CC2_EST","CC2_MUN"}, {"CC2_CODMUN","CC2_MUN"})
aMulti := {}
AAdd(aMulti, {"lookupField": "CC2_CODMUN", "field": "A1_COD_MUN"})
AAdd(aMulti, {"lookupField": "CC2_MUN",    "field": "A1_MUN"})
oLookup:setMultiFieldValues(aMulti)
self:addLookup("A1_COD_MUN", "SA1", oLookup:getLookup())
oLookup:destroy()
```

Outros: `setMultiFieldValuesFromSXB(cConsulta, cOrdem, cAlias)`, `setFinderFromSXB(...)`,
`setMultiSelect("|")`. Lookup personalizado é sempre no **Modelo**.

## 9. Legendas e totalizadores no browse

```advpl
::oDataView:setFieldAsLabel("SA1", "A1_TIPO")                  // combo do SX3, cores automáticas
oColors := totvs.framework.structure.interface.LabelColors():new()
oColors:setColors({"green1","yellow1"})                        // ordem/cores para o combo
oColors:bindColor("01", "Loja 01", "purple2")                  // valor -> rótulo -> cor
::oDataView:setFieldAsLabel("SA1", "A1_LOJA", oColors:getObject(), .F.)
```

Campo virtual com `X3_INIBRW` devolvendo uma chave (`IIF(...,'A','B')`) + `bindColor` = legenda por N campos.

Tokens (`bindColor`/`setColors`) → classe CSS:

| Token | Classe | Token | Classe | Token | Classe |
|---|---|---|---|---|---|
| red1–red5 | caption-tag-01–05 | green1–green5 | caption-tag-11–15 | purple1–purple5 | caption-tag-21–25 |
| yellow1–yellow3 | caption-tag-06–08 | blue1–blue5 | caption-tag-16–20 | pink1–pink5 | caption-tag-26–30 |
| brown1–brown2 | caption-tag-09–10 | | | gray1–gray5 | caption-tag-31–35 |

`color-01`…`color-12` continuam aceitos por compatibilidade. Sem RGB/hex, sem `.BMP`, sem
`SetBlkBackColor` (pintar a linha). Legenda de `mBrowse`/`FWMBrowse`: ver `smartx-browse-migration.md`.

Totalizadores: Interface `::oDataView:addAggregates({"RA_MAT"}, "count")`; Modelo
`self:addAggregates({"R3_VALOR"}, "sum", "SR3")`. Colunas não configuradas ficam "Nenhum" e o usuário escolhe.

## 10. Validações

- **Validação exclusiva Smart X (`X3_VLDSMX`, "Valid Smart X" no ATUSX, metadado ≥ 12.1.2610):**
  tem prioridade sobre `X3_VALID` e `X3_VLDUSER`. Contrato:
  `{"type":"serverValidate","function":"MyValidateFunction","contextInfo":["{{$model.A1_EST}}"]}`.
  A função recebe `(xValue, cField, aContextInfo)` e devolve JSON `{"return": .T./.F., "notValidMessage": "..."}`.
- **Linha do grid:** `self:addLineValidation("AGA", "ns.validLinePos")`; função `(cIdentifier, jFields)`
  retorna lógico; mensagem com `Help()`.
- **`X3_WHEN` não existe** no Smart X (sem "when" dinâmico de interface).

## 11. Pontos de entrada

Namespace do PE = namespace do **modelo** trocando o prefixo `totvs` (ou `custom`) por
`custom.entrypoint` — ex.: modelo `totvs.protheus.faturamento.model` → PE
`custom.entrypoint.protheus.faturamento.model`. Cada PE é uma `User Function` com o nome do evento
(nomes fixos do framework, longos e dentro de namespace TLPP).

| PE | Quando | Pode abortar? | Retorno |
|---|---|---|---|
| `formPre` | Carga do formulário (insert/update) | — | Array de JSON com o que desabilitar: `{{"entity":"SA1","fields":{"A1_DDD"}}, {"entity":"AI0"}}` |
| `formPos` | Confirmação (insert/update/delete), antes da transação | Sim | Lógico; mensagem via `oError:set(400, "FormPos", "...")` |
| `beforeCommit` | Antes de gravar | Não | Lógico |
| `beforeCommitInTransaction` | Antes de gravar, dentro da transação | Sim | Lógico |
| `afterCommitInTransaction` | Depois de gravar, dentro da transação | Sim | Lógico |
| `afterCommit` | Depois de gravar | Não | Lógico |

`PARAMIXB`: `[1]` `oModelPropertyManager` (`totvs.framework.structure.model.PropertyManager`),
`[2]` `oDataset` (`framework.model.events.ContextManager` — `getFieldValue(cAlias, cCampo)`; não existe no
`formPre` de inclusão), `[3]` `oError` (`totvs.framework.rest.manager.Error`), `[4]` `oSuccess`
(`...Success`) — `[3]` e `[4]` não existem no `formPre` — e `[5]` `cOperation` (`insert`, `update`, `delete`).

PEs MVC → Smart X: `MODELPRE` ignorado; `FORMPRE` → `formPre`; `FORMPOS` → `beforeCommit` /
`beforeCommitInTransaction`; `MODELCOMMIT` → `afterCommitInTransaction`; `FORMLINEPRE`/`FORMLINEPOS` em
desenvolvimento; `BUTTONBAR` não existe (botões = `addPageAction`/`addTableAction` na Interface).
Nos PEs não há manipulação visual (sem diálogo de confirmação).

## 12. Funções de contexto

- `hasSmartX()` — ambiente atende os requisitos? Exige `#include "fwmbrowse.ch"` **atualizado**.
- `totvs.framework.smartx.context.amIIn()` — a pilha de chamada veio de uma rotina Smart X? Útil em
  valids compartilhados entre MVC e Smart X.
- `oBrowse:isSmartX()` — o browse ativo está convertido? (após `Activate` não dá para manipular o objeto
  do browse convertido).

## 13. Arquitetura stateless — o que não funciona

Frontend em thread separada consumindo JSON/oData: sem `Static`/`Private` entre requisições, sem área
de trabalho/cursor posicionado, sem variáveis de memória (`M->`), sem `aHeader`/`aCols` (usar o dataset nos
eventos), sem tabela temporária, sem `ViewDef` manual/`AddOtherObject`, sem `X3_WHEN`, sem Papel de Trabalho
(SIGACFG ignorado), sem `aFixe`, sem Tree (2610), sem AxCadastro (2610), sem markbrowse em grid de itens
(só na lista principal), sem mestre/detalhe na mesma tela, sem mais de um browse por rotina.
Busca rápida só filtra a página carregada (100 registros, configurável até 1000); busca no banco = filtro
avançado. EAI só assíncrono e ExecAuto: em desenvolvimento.

## 14. Diagnóstico pelo DevTools

F12 → Network → filtrar `/api/framework/v1/` → resposta do contrato da interface → nó `events`:
campo com `actionValid` = encapsulado no validator padrão (OK); evento solto = trigger independente
(só funciona sem X3_VALID); campo ausente = registro falhou (método, contextos ou campo errados).

## 15. Erros conhecidos (FAQ)

| Erro | Causa | Correção |
|---|---|---|
| `Cor inválida para a legenda: CANCEL on ...IMPORTLEGENDSFROMFWMBROWSE:SET` | Bitmap sem de-para e sem cor PO-UI | Informar a cor PO-UI (6º parâmetro do `AddLegend`/array do `mBrowse`; 5º no array `{cond, título, bitmap, NIL, cor}` de PEs de legenda) — regra SX01 |
| Trigger customizado não dispara | Contextos agrupados em campo com X3_VALID | Um contexto por `addOnChange` — SX02 |
| `invalid class MEU.NAMESPACE.EVENTS.X on ...:SETMODEL` | Classe de eventos não compilada ou namespace divergente | Compilar o fonte; conferir namespace idêntico |
| Campo virtual não dispara `onChange` | Virtual é `readOnly` por padrão | `addProperty(..., "readOnly", "false")` |
| Exceção ao abrir `mBrowse` convertido | `setSmartX()` fora da função que chama o `mBrowse` | Mover para a mesma função/fonte — SX05 |

## 16. Divergências entre páginas do TDN (verificar no ambiente)

| Ponto | Página A | Página B | Adotado nos templates |
|---|---|---|---|
| Ordem das chaves em `addObject`/`addArray` | "Criação de um modelo": **filho → pai** (breaking change) | Exemplo FINA050 em "Construindo do zero": pai → filho | filho → pai, com comentário |
| `loadEventsFromMetadata()` / `setOnChange()` | "Criação de um modelo": eventos do dicionário carregam **sozinhos** (breaking change) | Exemplos MATA120/FINA050 ainda chamam | não chamar; comentário explica |
| Cores no FAQ | `caption-tag-03` = "Vermelho" | Tabela oficial: `caption-tag-03` = `red3` | tabela oficial (seção 9) |
| Cores em "Mudança de comportamento" | `color-07` = vermelho, `color-11` = verde | — | só como compatibilidade |
