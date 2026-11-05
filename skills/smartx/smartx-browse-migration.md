# Migração de browse legado para a nova visão Smart X

Rotinas existentes com `mBrowse` ou `FWMBrowse` ganham a nova visão (Data View) sem reescrever a rotina:
basta ativar a conversão no fonte. Os formulários continuam os do MVC/legado; só o browse muda.

Pré-requisitos: **12.1.2610+** em produção (RPO D-1 em desenvolvimento interno TOTVS) e includes de
framework atualizados (`fwmbrowse.ch`; `PAGEACTION` por comando depende dos `.ch` de 12/01/2026+).

## 1. Ativação

### FWMBrowse — método `setSmartX(nIndex, lOrderAsc)`

```advpl
#include "protheus.ch"
#include "fwmbrowse.ch"

Function MEUFONTE()
    Local oBrowse  as object
    Local nIndex   as numeric
    Local lOrdAsc  as logical

    oBrowse := FWMBrowse():New()
    oBrowse:SetAlias("SC5")
    oBrowse:SetDescription("Pedido de vendas")

    If hasSmartX()                     // ambiente atende os requisitos
        nIndex  := 1                   // C5_FILIAL+C5_NUM (0 = RECNO; índice inexistente = exceção)
        lOrdAsc := .T.
        oBrowse:setSmartX(nIndex, lOrdAsc)
    EndIf

    oBrowse:Activate()
Return Nil
```

### mBrowse — função `SetSmartX(nIndex, lOrderAsc)`

`SetSmartX()` tem de estar **na mesma função e no mesmo fonte** que chama o `mBrowse`; fora disso, exceção.

```advpl
#include "protheus.ch"
#include "fwmbrowse.ch"

Function MEUFONTE()
    local aLegendas      as array
    local cFilterDefault as character

    cFilterDefault := "@ ZA0_TIPO IN ('1','2')"      // só SQL; expressão ADVPL é ignorada
    aLegendas := {}
    aAdd(aLegendas, {"ZA0_TIPO=='1'", "YELLOW", "Teste"})
    aAdd(aLegendas, {"ZA0_TIPO=='2'", "GREEN",  "Interprete",,,"caption-tag-13"})

    If hasSmartX()
        setSmartX(2, .T.)                            // ZA0_FILIAL+ZA0_NOME, ascendente
    EndIf

    mBrowse(,,,,"ZA0",,,,,,aLegendas,,,,,,,,cFilterDefault)
    FwFreeArray(aLegendas)
Return Nil
```

Código legado que manipula o browse depois de ativo: proteger com `isSmartX()`.

```advpl
if !oBrowse:isSmartX()                 // mBrowse: oBrw := GetMBrowse()
    oFilAux := oBrowse:FwFilter()
endif
```

## 2. Legendas

`AddLegend(xCondition, cColor, cTitle, cID, lFilter, cColorPoUi)` e o array do `mBrowse`
`{xCondition, cColor, cTitle, cID, lFilter, cColorPoUi}` ganharam o **6º elemento `cColorPoUi`**.
Sem ele, o framework faz o de-para abaixo; cor fora da tabela (ex.: `CANCEL`, `BR_LARANJA`, `LBOK`, RGB)
**gera exceção** ("Cor inválida para a legenda"). Ícones não são aceitos.

| Cor atual | PO-UI | Cor atual | PO-UI |
|---|---|---|---|
| DISABLE | caption-tag-02 | BR_PRETO_0 | caption-tag-34 |
| ENABLE | caption-tag-12 | BR_PRETO_1 | caption-tag-32 |
| br_azul.bmp | caption-tag-19 | BR_PRETO_2 | caption-tag-30 |
| br_amarelo.bmp | caption-tag-06 | BR_PRETO_3 | caption-tag-29 |
| VERMELHO / RED | caption-tag-03 | BR_PRETO_4 | caption-tag-27 |
| LARANJA / ORANGE | caption-tag-07 | BR_PRETO_5 | caption-tag-26 |
| AMARELO / YELLOW | caption-tag-08 | BR_PRETO_6 | caption-tag-25 |
| BR_MARRON_OCEAN | caption-tag-09 | BR_PRETO_7 | caption-tag-04 |
| MARROM / BROWN | caption-tag-10 | BR_PRETO_8 | caption-tag-22 |
| VERDE / GREEN | caption-tag-13 | BR_PRETO_9 | caption-tag-21 |
| VERDE_ESCURO / HGREEN | caption-tag-14 | BR_PRETO_A | caption-tag-20 |
| AZUL_CLARO / LBLUE | caption-tag-17 | BR_PRETO_B | caption-tag-16 |
| AZUL / BLUE | caption-tag-18 | BR_PRETO_C | caption-tag-15 |
| VIOLETA / VIOLET | caption-tag-23 | ROXO | caption-tag-24 |
| PINK | caption-tag-28 | BRANCO / WHITE | caption-tag-31 |
| CINZA / GRAY | caption-tag-33 | PRETO / BLACK | caption-tag-35 |

Pontos de entrada de legenda no formato `{cCondição, cTítulo, cBitmapLegado, NIL, cCorPoUI}` (exemplo do
FAQ): a cor PO-UI vai no **5º** elemento e tem prioridade sobre o bitmap; o bitmap continua valendo na
visão clássica. Sempre conferir a estrutura do array que o PE devolve antes de escolher a posição.

Item "Legenda" do MenuDef é descartado no Smart X (a tag já mostra o texto).

## 3. MenuDef

- A **primeira** operação 3 (Incluir) vira `pageAction`; as demais viram `tableAction` (dependem de linha).
- "Pesquisar" é ignorado.
- Outra ação como `pageAction`: 10º elemento `.T.` no `aRotina` ou cláusula `PAGEACTION` no `ADD OPTION`.
- "Imprimir" padrão do browse exige **operação 8** (`OP_IMPRIMIR` de `fwmvcdef.ch`).
- `MenuDef` sem condicionais (é chamada fora da rotina).

```advpl
ADD OPTION aRotina TITLE 'Incluir'  ACTION 'VIEWDEF.COMP011_MVC' OPERATION 3 ACCESS 0
ADD OPTION aRotina TITLE 'Opc1'     ACTION 'xpto'                OPERATION 3 ACCESS 0 PAGEACTION
ADD OPTION aRotina TITLE 'Imprimir' ACTION 'VIEWDEF.COMP011_MVC' OPERATION OP_IMPRIMIR ACCESS 0
aAdd(aRotina, {'Incluir Complemento', 'COMPLE', 0, 3, 0,,,,, .T.})   // pageAction pelo array
```

## 4. Filtros

| Legado | No Smart X | Fazer |
|---|---|---|
| `DbSetFilter` / `IndRegua` na workarea | Ignorado (nova query limpa) | Converter para filtro SQL |
| `SetFilterDefault("U_Func()")` / expressão ADVPL | Para de funcionar | `SetFilterDefault("@ CAMPO = 'X'")` |
| `cFilterDefault` do `mBrowse` em ADVPL | Ignorado | SQL com `@` |
| Filtro oData | Novo | `oBrowse:AddFilterSmartX("@ ...")` (executado ao abrir) |
| Filtro do Papel de Trabalho | Ignorado | Levar a regra para o código |

## 5. Métodos do FWMBrowse que continuam valendo

`Activate`, `AddColumn`, `Report`, `SetAlias`, `SetDescription`, `SetUniqueKey`, `GetUniqueKey`,
`AddLegend`, `ColumnsFields`, `SetFields`, `SetOnlyFields`, `OptionReport`. Em desenvolvimento:
`SetFieldFilter`, `SetUseFilter`. Cores/fontes/estilo de linha do browse ou do Papel de Trabalho não são
aplicados.

## 6. Ativação para o usuário

- Política (SIGACFG → Usuários → Senhas → Política → aba Outros → Recursos do Sistema → "Abrir rotinas na
  visão clássica por padrão"): marcada = clássica; desmarcada = nova visão. Vem **marcada** em base nova.
- O estado inicial é gravado no perfil no **primeiro acesso**; mudar a política depois não altera quem já entrou.
- O usuário alterna a qualquer momento com **Shift+F6** (preferência guardada por rotina).
- Sem release 2610+ ou sem rotina compatibilizada, fica na clássica independentemente da política.

## 7. Checklist de migração

1. `#include "fwmbrowse.ch"` (atualizado) no fonte.
2. `If hasSmartX()` + `setSmartX(nIndex, lOrderAsc)` / `oBrowse:setSmartX(...)` antes do `mBrowse`/`Activate`.
3. Toda legenda com cor do de-para ou com `cColorPoUi` (6º parâmetro).
4. `DbSetFilter`, `SetFilterDefault` ADVPL e `cFilterDefault` ADVPL convertidos para SQL com `@`.
5. Uso do objeto do browse após `Activate` protegido com `isSmartX()`.
6. MenuDef: Imprimir com operação 8; `PAGEACTION` onde precisar; sem condicionais.
7. Sem tabela temporária, sem `SetBlkBackColor`, sem `aFixe`.
8. Rodar `/poui-specialist:lint <pasta>` — regras SX01–SX08.
