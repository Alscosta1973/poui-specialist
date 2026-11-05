# Template: migrar mBrowse / FWMBrowse para a nova visão Smart X

Recebe um fonte `.prw`/`.tlpp` existente com `mBrowse` ou `FWMBrowse` e devolve o **mesmo fonte**
ajustado para abrir o browse na nova visão Smart X quando o ambiente permitir (12.1.2610+), mantendo a
visão clássica funcionando. Os formulários (MVC/legado) não mudam.

> **Sem build Angular e sem spec Karma.** Referência: `skills/smartx/smartx-browse-migration.md`.
> Depois de migrar, rodar `/poui-specialist:lint <pasta>` — as regras SX01, SX05–SX08 e SX11 cobrem
> o que este template ajusta.

---

## Processo

1. **Ler o fonte inteiro** (pedir o caminho se não vier). Identificar: função que chama `mBrowse(` ou
   instancia `FWMBrowse():New()`, array/`AddLegend` de legendas, `MenuDef`, filtros
   (`DbSetFilter`, `SetFilterDefault`, `cFilterDefault`, `IndRegua`), uso do objeto do browse depois do
   `Activate`, tabela temporária, `SetBlkBackColor`, `aFixe`.
2. **Bloqueios** — se houver algo abaixo, avisar antes de alterar e perguntar se segue:
   - tabela temporária no browse (não suportado — arquitetura stateless);
   - AxCadastro (não convertido na 2610);
   - Tree, mais de um browse na mesma rotina, mestre/detalhe na mesma tela.
3. **Aplicar os ajustes** da tabela abaixo, editando o arquivo no lugar (Edit), sem reescrever o resto.
4. **Mostrar o diff resumido** e o checklist de `smartx-browse-migration.md` §7 com o que ficou para o
   desenvolvedor (ex.: cores que precisam de decisão de negócio).

## Ajustes

| # | Situação no fonte | Ajuste | Regra |
|---|---|---|---|
| 1 | Falta `#include "fwmbrowse.ch"` | Incluir depois de `protheus.ch`/`totvs.ch` | SX06 |
| 2 | `mBrowse(` | Antes dele, na **mesma função**: `If hasSmartX()` + `setSmartX(nIndex, .T.)` | SX05, SX11 |
| 3 | `FWMBrowse():New()` | Antes do `:Activate()`: `If hasSmartX()` + `oBrowse:setSmartX(nIndex, .T.)` | SX05 |
| 4 | Índice | `nIndex` = ordem do índice que o browse já usa (`DbSetOrder`/`SetOrder`); se não houver, 1. Comentar a chave (`// ZA0_FILIAL+ZA0_CODIGO`) | — |
| 5 | Legenda com cor do de-para | Manter; acrescentar `cColorPoUi` só se o usuário quiser outra cor | — |
| 6 | Legenda com cor fora do de-para (bitmap, `BR_LARANJA`, `LBOK`, RGB) | Acrescentar o 6º elemento/parâmetro `cColorPoUi` com a `caption-tag-NN` mais próxima e marcar `// TODO: confirmar cor` | SX01 |
| 7 | `SetFilterDefault`/`cFilterDefault` em ADVPL | Converter para SQL com `@` quando a expressão for traduzível (campo, operador, literal); senão manter e marcar `// TODO Smart X: filtro ADVPL ignorado` | SX07 |
| 8 | `DbSetFilter`/`IndRegua` antes do browse | Levar a condição para `SetFilterDefault("@ ...")` (FWMBrowse) ou `cFilterDefault` (mBrowse) | SX08 |
| 9 | Objeto do browse usado depois do `Activate` (`FwFilter`, `GetMBrowse`) | Envolver com `If !oBrowse:isSmartX()` | — |
| 10 | `MenuDef` — "Imprimir" com operação diferente de 8 | `OPERATION 8` / `OP_IMPRIMIR` (`fwmvcdef.ch`) | — |
| 11 | `MenuDef` — ação que precisa ficar no topo da página (não depende de linha) | Cláusula `PAGEACTION` ou 10º elemento `.T.` | — |
| 12 | `MenuDef` com condicionais | Não alterar; avisar (MenuDef é chamada fora da rotina) | — |
| 13 | Item "Legenda" no MenuDef | Manter (some sozinho na nova visão); avisar | — |

## Exemplo — mBrowse

Antes:

```advpl
#include "protheus.ch"

User Function ZA0BRW()
    Local aCores := {}
    aAdd(aCores, {"ZA0_STATUS == '1'", "ENABLE",  "Ativo"})
    aAdd(aCores, {"ZA0_STATUS == '2'", "DISABLE", "Inativo"})
    aAdd(aCores, {"ZA0_STATUS == '3'", "BR_LARANJA", "Suspenso"})
    DbSelectArea("ZA0")
    DbSetOrder(1)
    mBrowse(6, 1, 22, 75, "ZA0",,,,,, aCores)
Return
```

Depois:

```advpl
#include "protheus.ch"
#include "fwmbrowse.ch"

User Function ZA0BRW()
    Local aCores := {}
    aAdd(aCores, {"ZA0_STATUS == '1'", "ENABLE",  "Ativo"})
    aAdd(aCores, {"ZA0_STATUS == '2'", "DISABLE", "Inativo"})
    aAdd(aCores, {"ZA0_STATUS == '3'", "BR_LARANJA", "Suspenso",,, "caption-tag-07"}) // TODO: confirmar cor (BR_LARANJA fora do de-para)
    DbSelectArea("ZA0")
    DbSetOrder(1)
    If hasSmartX()
        setSmartX(1, .T.)   // ZA0_FILIAL+ZA0_CODIGO — mesma funcao do mBrowse (SX11)
    EndIf
    mBrowse(6, 1, 22, 75, "ZA0",,,,,, aCores)
Return
```

## Exemplo — FWMBrowse

```advpl
#include "protheus.ch"
#include "fwmbrowse.ch"
#include "fwmvcdef.ch"

User Function ZA0MVC()
    Local oBrowse := FWMBrowse():New()
    oBrowse:SetAlias("ZA0")
    oBrowse:SetDescription("Autores")
    oBrowse:AddLegend("ZA0_STATUS == '1'", "GREEN", "Ativo")
    oBrowse:AddLegend("ZA0_STATUS == '3'", "BR_LARANJA", "Suspenso",,, "caption-tag-07") // TODO: confirmar cor
    oBrowse:SetFilterDefault("@ ZA0_STATUS <> '9'")   // SQL com @ (antes: "ZA0_STATUS <> '9'")
    If hasSmartX()
        oBrowse:setSmartX(1, .T.)
    EndIf
    oBrowse:Activate()
Return

Static Function MenuDef()
    Local aRotina := {}
    ADD OPTION aRotina TITLE 'Visualizar' ACTION 'VIEWDEF.ZA0MVC' OPERATION 2 ACCESS 0
    ADD OPTION aRotina TITLE 'Incluir'    ACTION 'VIEWDEF.ZA0MVC' OPERATION 3 ACCESS 0
    ADD OPTION aRotina TITLE 'Alterar'    ACTION 'VIEWDEF.ZA0MVC' OPERATION 4 ACCESS 0
    ADD OPTION aRotina TITLE 'Excluir'    ACTION 'VIEWDEF.ZA0MVC' OPERATION 5 ACCESS 0
    ADD OPTION aRotina TITLE 'Imprimir'   ACTION 'VIEWDEF.ZA0MVC' OPERATION OP_IMPRIMIR ACCESS 0
Return aRotina
```

## Relatório final ao usuário

```
Smart X — ZA0BRW.prw migrado
✓ fwmbrowse.ch incluído
✓ hasSmartX() + setSmartX(1, .T.) na função do mBrowse
✓ 1 legenda com cor PO-UI adicionada (TODO: confirmar caption-tag-07 para BR_LARANJA)
⚠ Filtro ADVPL mantido em SetFilterDefault (linha 18) — não traduzível para SQL
Próximos passos: compilar, abrir a rotina na 12.1.2610+ e alternar com Shift+F6;
ativação padrão pela Política do SIGACFG ("Abrir rotinas na visão clássica por padrão").
```
