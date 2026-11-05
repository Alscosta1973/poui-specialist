# Template: rotina Smart X (Modelo + Interface + Launcher)

Gera uma rotina Smart X completa em TLPP, no padrão dos exemplos oficiais do TDN ("Construindo uma
rotina do zero com Smart X"). A tela web é renderizada pelo framework — **não há código Angular**.

> **Sem build Angular e sem spec Karma:** os artefatos são fontes Protheus. Validar compilando no RPO
> (TDS / VS Code TOTVS) e abrindo o launcher no Protheus 12.1.2610+. Depois de gerar, rodar
> `/poui-specialist:lint <pasta>` (regras SX01–SX11 de `skills/smartx/smartx-rules.md`).
> Referência completa: `skills/smartx/smartx-reference.md`.

---

## Entradas (perguntar o que faltar — não inventar campos)

| Entrada | Exemplo | Observação |
|---|---|---|
| Identificador da rotina | `ZA0CAD` | Nome da classe do Modelo e da Interface; ID do contrato |
| Descrição | `Cadastro de Autores` | Annotation, títulos |
| Namespace base | `custom.cadastro.autor` | Gera `<base>.model` e `<base>.interface`. TOTVS usa `totvs.<produto>.<modulo>` |
| Alias principal + chave | `ZA0` · `{"ZA0_FILIAL","ZA0_CODIGO"}` | Chave **com filial** |
| Grids 1:N (opcional) | `ZA1` · chave `{"ZA1_FILIAL","ZA1_CODAUT","ZA1_ITEM"}` · vínculo `ZA1_FILIAL,ZA1_CODAUT` → `ZA0_FILIAL,ZA0_CODIGO` | Um `addArray` por grid |
| Objetos 1:1 (opcional) | `ZA2` | `addObject` |
| Campo de legenda (opcional) | `ZA0_TIPO` (combo) | `setFieldAsLabel` (+ `LabelColors` se quiser fixar cores) |
| Ponto de entrada (opcional) | `formPos` | Arquivo separado no namespace `custom.entrypoint...` |
| Nome do launcher | `ZA0CADSX` | Ver nota sobre `Function` × `User Function` |

## Arquivos gerados

| Arquivo | Namespace |
|---|---|
| `<base>.model.<rotina>.tlpp` | `<base>.model` |
| `<base>.interface.<rotina>.tlpp` | `<base>.interface` |
| `<rotina>sx.prw` | — (função global) |
| `custom.entrypoint.<resto>.model.<pe>.tlpp` (opcional) | `custom.entrypoint.<resto do namespace do modelo>` |

Todo arquivo começa com o header de atribuição usado pelo plugin:
`// @generated  poui-specialist v<versão do plugin> — smartx`.

---

## 1. Modelo

```tlpp
// @generated  poui-specialist v1.23.0 — smartx
#include 'fw-tlpp-core.th'
#include "protheus.ch"
#include "totvs.framework.structure.model.th"

namespace custom.cadastro.autor.model

/*/{Protheus.doc} ZA0CAD
    Modelo Smart X do Cadastro de Autores (ZA0) com os titulos do autor (ZA1).
    @type Class
    @author Andre Costa
/*/
@totvsFrameworkStructureModel(lookup=.F., country="ALL", description="Cadastro de Autores")
class ZA0CAD from totvs.framework.structure.model.data
    public method new() as object
    public method setModel()
EndClass

/*/{Protheus.doc} new
    Construtor do modelo.
    @type Method
    @author Andre Costa
/*/
method new() as object class ZA0CAD
    _Super:new(,,.T.)
return self

/*/{Protheus.doc} setModel
    Define objetos, relacionamentos e propriedades do modelo.
    @type Method
    @author Andre Costa
/*/
method setModel() class ZA0CAD
    local oZA0 as object
    local oZA1 as object

    // Objeto principal: estrutura lida da SX3; chave sempre com a filial
    oZA0 := totvs.framework.structure.object.ObjectFromMetadata():new( "ZA0",, {"ZA0_FILIAL", "ZA0_CODIGO"} )
    self:setObject( oZA0:getObject(), "ZA0" )

    // Grid 1:N — chaves na ordem FILHO -> PAI ("Criação de um modelo de dados", breaking change).
    // Se o ambiente seguir a ordem antiga (exemplo FINA050 do TDN), inverter os dois arrays.
    oZA1 := totvs.framework.structure.object.ObjectFromMetadata():new( "ZA1",, {"ZA1_FILIAL", "ZA1_CODAUT", "ZA1_ITEM"} )
    self:addArray( oZA1:getObject(), "ZA1", {"ZA1_FILIAL", "ZA1_CODAUT"}, {"ZA0_FILIAL", "ZA0_CODIGO"}, "ZA0", 1, "Titulos do autor" )

    // Campos de vinculo nao aparecem no grid
    self:setProperty( "ZA1_FILIAL", "hidden", .T., "ZA1" )
    self:setProperty( "ZA1_CODAUT", "hidden", .T., "ZA1" )

    // Valids (X3_VALID), gatilhos (SX7) e inicializadores (X3_RELACAO) do dicionario sao carregados
    // automaticamente — nao chamar loadEventsFromMetadata()/setOnChange() (ver smartx-reference.md §16).

    FwFreeObj( oZA1 )
    FwFreeObj( oZA0 )
return
```

### 1.1 Trigger customizado (opcional) — preenche campos depois do X3_VALID

Declarar `public method addTrgCEP()` na classe e chamar `self:addTrgCEP()` no fim do `setModel`.

```tlpp
/*/{Protheus.doc} addTrgCEP
    Gatilho: ao alterar ZA0_CEP busca bairro e municipio e preenche os campos.
    @type Method
    @author Andre Costa
/*/
method addTrgCEP() class ZA0CAD
    local oFldBai    as object
    local oFldMun    as object
    local oSetFields as object
    local oAdvplAct  as object
    local oEvents    as object

    oFldBai := totvs.framework.structure.interface.BuildTargetFieldStructure():new()
    oFldBai:setIdentifier("ZA0_BAIRRO")
    oFldBai:setProperty("value", "{{$response.ZA0_BAIRRO}}")

    oFldMun := totvs.framework.structure.interface.BuildTargetFieldStructure():new()
    oFldMun:setIdentifier("ZA0_MUN")
    oFldMun:setProperty("value", "{{$response.ZA0_MUN}}")

    oSetFields := totvs.framework.structure.interface.BuildSetFieldsAction():new()
    oSetFields:setLabel("fillByCEP")
    oSetFields:setIdentifier("fillByCEP")
    oSetFields:addTargetField(oFldBai:getStructure())
    oSetFields:addTargetField(oFldMun:getStructure())

    oAdvplAct := totvs.framework.structure.interface.BuildAdvplAction():new()
    oAdvplAct:setLabel("buscaCEP")
    oAdvplAct:setRoutine("custom.cadastro.autor.model.BuscaCEP")
    oAdvplAct:setParams({"{{$model.ZA0_CEP}}"})
    oAdvplAct:setHasResponse(.T.)                 // SX10 — a funcao devolve dados
    oAdvplAct:setAction(oSetFields:getAction())

    // SX02/SX03 — um contexto e um campo por chamada
    oEvents := totvs.framework.structure.interface.BuildEvents():new()
    oEvents:addOnChange({"dataNew"},  {"ZA0_CEP"}, oAdvplAct:getAction())
    oEvents:addOnChange({"dataEdit"}, {"ZA0_CEP"}, oAdvplAct:getAction())
    self:addTriggers(oEvents:getEvents())
return

/*/{Protheus.doc} BuscaCEP
    Funcao chamada pela acao do gatilho: devolve JSON em string com os campos a preencher.
    @type Function
    @author Andre Costa
    @param cCep Character, CEP digitado
    @return Character, JSON {ZA0_BAIRRO, ZA0_MUN}
/*/
function BuscaCEP(cCep as character) as character
    local jRet := JsonObject():New() as json
    jRet["ZA0_BAIRRO"] := ""
    jRet["ZA0_MUN"]    := ""
    // TODO: consulta do CEP
return jRet:toJson()
```

`addValidators` **substitui** o X3_VALID do campo (SX09) — usar só quando a validação do dicionário não
serve; modelo em `skills/smartx/smartx-reference.md` §5.

## 2. Interface

```tlpp
// @generated  poui-specialist v1.23.0 — smartx
#include 'fw-tlpp-core.th'
#include "protheus.ch"
#include "totvs.framework.structure.Interface.th"

namespace custom.cadastro.autor.interface

/*/{Protheus.doc} ZA0CAD
    Interface Smart X do Cadastro de Autores: browse e formularios de inclusao, edicao e visualizacao.
    @type Class
    @author Andre Costa
/*/
@totvsFrameworkStructureInterface(lookup=.F., country="ALL", description="Cadastro de Autores")
class ZA0CAD
    private data oInterface  as object
    private data oDataView   as object
    private data oDataNew    as object
    private data oDataEdit   as object
    private data oDataDetail as object

    public method new() as object
    public method setInterface()
    public method getContract() as json
EndClass

/*/{Protheus.doc} new
    Construtor da interface.
    @type Method
    @author Andre Costa
/*/
method new() as object class ZA0CAD
return self

/*/{Protheus.doc} setInterface
    Monta o contrato da interface (browse + formularios).
    @type Method
    @author Andre Costa
/*/
method setInterface() class ZA0CAD
    local cModel  := "custom.cadastro.autor.model.ZA0CAD" as character
    local cId     := "za0cad" as character
    local oColors := totvs.framework.structure.interface.LabelColors():new() as object

    ::oInterface := totvs.framework.structure.interface.BuildContract():new(cId)
    ::oInterface:setTitle("Cadastro de Autores")
    ::oInterface:setModelId(cModel)
    ::oInterface:setVersion("1.0")

    // Browse: grids filhos so aparecem no formulario; colunas pelo X3_BROWSE
    ::oDataView := totvs.framework.structure.interface.BuildDataView():new(cId + "View", cModel)
    ::oDataView:setModelId(cModel)
    ::oDataView:setTitle("Cadastro de Autores")
    ::oDataView:setInvisibleFields({"ZA1"})
    ::oDataView:assignInvisibleFields()

    // Legenda pelo combo ZA0_TIPO (cores na ordem das opcoes do SX3; tokens red1..gray5)
    oColors:setColors({"green1", "yellow1"})
    ::oDataView:setFieldAsLabel("ZA0", "ZA0_TIPO", oColors:getObject())

    ::oDataNew := totvs.framework.structure.interface.BuildDataNew():new(cId + "New", cModel)
    ::oDataNew:setTitle("Incluir")

    ::oDataEdit := totvs.framework.structure.interface.BuildDataEdit():new(cId + "Edit", cModel)
    ::oDataEdit:setTitle("Editar")

    ::oDataDetail := totvs.framework.structure.interface.BuildDataDetail():new(cId + "Detail", cModel)
    ::oDataDetail:setTitle("Visualizar")

    ::oInterface:setDataView(::oDataView:getDataView())
    ::oInterface:setDataNew(::oDataNew:getDataNew())
    ::oInterface:setDataEdit(::oDataEdit:getDataEdit())
    ::oInterface:setDataDetail(::oDataDetail:getDataDetail())

    FwFreeObj(oColors)
return

/*/{Protheus.doc} getContract
    Devolve o contrato da interface.
    @type Method
    @author Andre Costa
/*/
method getContract() as json class ZA0CAD
return ::oInterface:getContract()
```

Eventos **nunca** na Interface (`setEvents` aqui gera erro — SX04). Ações de linha/página, abas,
componentes e totalizadores: `skills/smartx/smartx-reference.md` §4, §6 e §9.

## 3. Launcher

```advpl
// @generated  poui-specialist v1.23.0 — smartx
#include "protheus.ch"

/*/{Protheus.doc} ZA0CADSX
    Abre a rotina Smart X Cadastro de Autores (cadastrar esta funcao no menu).
    @type Function
    @author Andre Costa
/*/
function ZA0CADSX()
    local oLauncher as object
    oLauncher := totvs.framework.application.smartx.launcher():new()
    oLauncher:setInterface("custom.cadastro.autor.interface.ZA0CAD")   // namespace + classe, nao o arquivo
    oLauncher:open()
return
```

> **`Function` × `User Function`:** o TDN usa `function` (fontes do produto). Num RPO de cliente,
> compilar `Function` exige autorização TOTVS — use `User Function` com nome de até **8** caracteres
> (o `U_` ocupa 2 dos 10 do RPO) e cadastre `U_<nome>` no menu.

## 4. Ponto de entrada (opcional)

Namespace = namespace do **modelo** com o prefixo trocado por `custom.entrypoint`. Para um modelo
`custom.cadastro.autor.model`, o PE fica em `custom.entrypoint.cadastro.autor.model`. Os nomes
(`formPre`, `formPos`, `beforeCommit`, `beforeCommitInTransaction`, `afterCommitInTransaction`,
`afterCommit`) são fixos do framework e vivem em namespace TLPP — exceção à regra de 10 caracteres.

```tlpp
// @generated  poui-specialist v1.23.0 — smartx
#include 'fw-tlpp-core.th'
#include "protheus.ch"

namespace custom.entrypoint.cadastro.autor.model

/*/{Protheus.doc} formPos
    Valida a confirmacao do formulario antes da transacao.
    @type User Function
    @author Andre Costa
    @return Logical, .T. continua; .F. cancela com a mensagem de oError
/*/
User Function formPos()
    local oDataset   := PARAMIXB[2] as object
    local oError     := PARAMIXB[3] as object
    local cOperation := PARAMIXB[5] as character
    local lRet       := .T. as logical

    if cOperation == "update" .and. Empty(oDataset:getFieldValue("ZA0", "ZA0_NOME"))
        oError:set(400, "formPos", "Informe o nome do autor.")
        lRet := .F.
    endif
return lRet
```

## Checklist antes de entregar

1. Chaves de objetos com o campo de filial; `addArray`/`addObject` na ordem filho → pai (com o comentário).
2. Eventos só no Modelo, um contexto e um campo por `addOnChange`; `setHasResponse(.T.)` quando a ação usa resposta.
3. Funções chamadas por ação devolvem **JSON em string**; nada de `Static`/`Private`/`M->`/`aCols`.
4. `setModelId` da Interface = `namespace.do.modelo.CLASSE`; `setInterface` do launcher = `namespace.da.interface.CLASSE`.
5. Tabelas reais (sem temporária); release 12.1.2610+.
6. Avisar o usuário: compilar os 3 fontes, cadastrar o launcher no menu e conferir o contrato pelo DevTools
   (`/api/framework/v1/`, nó `events`) se algum evento não disparar.
