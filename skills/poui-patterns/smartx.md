# PO-UI próprio × SmartX (Protheus 12.1.2610+)

O **SmartX** é o novo framework de telas da TOTVS (Protheus, RM e Datasul). A tela não é
programada: o desenvolvedor descreve dados, regras e layout em contratos (classes TLPP de
**Objeto**, **Modelo** e **Interface** + um **Launcher** de menu) e o motor gera a interface web
em Angular + PO-UI. No Protheus estreia na **release 12.1.2610** (Lib ≥ 20260418, dicionário no
banco, Expedição Contínua atualizada).

O plugin **não concorre** com o SmartX: o SmartX moderniza rotinas padrão e cadastros simples;
o poui-specialist cobre telas sob medida e tudo o que o SmartX ainda não faz.

> Fonte oficial (revisada em 05/11/2026): TDN https://tdn.totvs.com/display/public/framework/Smart+X
> (Introdução, Conhecendo a visão, Ativação, Filtros, "5. Desenvolvimento com Smart X" e FAQ).
> **Para gerar, migrar ou revisar código Smart X** use a skill `skills/smartx/` (referência técnica,
> migração de browse e regras SX01–SX11) e os tipos `/generate smartx` e `/generate smartx-browse`.

---

## Quando usar cada um

| Situação | Use |
|---|---|
| Cliente em release **anterior à 12.1.2610** | PO-UI próprio (plugin) |
| Rotina padrão TOTVS que já tem versão SmartX | SmartX (customizar por ponto de entrada `custom.entrypoint.*` — `skills/smartx/smartx-reference.md` §11) |
| Cadastro simples sobre tabela do dicionário (SX2/SX3), release ≥ 2610 | SmartX (`/generate smartx`) |
| Rotina legada com `mBrowse`/`FWMBrowse` que só precisa do browse novo | SmartX (`/generate smartx-browse`) |
| Tela sob medida: conciliação, painel, ações em lote, fluxo com várias etapas | PO-UI próprio |
| Precisa de algo da tabela abaixo ("não existe no SmartX 2610") | PO-UI próprio |

## O que o SmartX 2610 não faz — e o tipo do plugin que cobre

| Falta no SmartX 2610 | Tipo do plugin |
|---|---|
| Árvore hierárquica (Tree) | `po-tree` |
| Mestre/detalhe na mesma tela (o SmartX abre o detalhe em outra página) | `master-detail`, `stacked-browse` |
| Seleção múltipla em grade de itens filhos (MarkBrowse só na lista principal) | `po-table` com `p-selectable` |
| Mais de um browse na mesma rotina | `two-panel-browse`, `stacked-browse` |
| Conciliação lado a lado | `two-panel-browse` |
| Painel analítico | `dashboard` |
| Ações procedurais com resultado por linha | `action-list` |
| AxCadastro | qualquer tipo de lista + `modal-crud` |

## O que deixa de funcionar no SmartX (motivo: arquitetura sem estado)

- Variáveis `Static`/`Private`, área de trabalho aberta e cursor posicionado entre requisições.
- `aHeader`/`aCols`, `ViewDef` com layout manual, `AddOtherObject`, tabelas temporárias, variáveis de memória.
- `X3_WHEN` dinâmico — validação vai para o servidor (campo novo `X3_VLDSMX`).
- `DbSetFilter` e filtro com expressão ADVPL — só SQL com prefixo `@` em `SetFilterDefault` ou **oData**.
- Papel de Trabalho do SIGACFG (é ignorado).
- Legendas BMP — viram tags de cor `caption-tag-01` a `caption-tag-35` (tokens `red1`…`gray5`;
  `color-01`…`color-12` só por compatibilidade). Cor fora do de-para sem o parâmetro `cColorPoUi`
  gera exceção "Cor inválida para a legenda" (regra SX01).
- Busca rápida só pesquisa a página já carregada; busca no banco é pelo filtro avançado.
- Pontos de entrada MVC mudam: FORMPRE → `formPre`, FORMPOS → `beforeCommit`/`beforeCommitInTransaction`,
  MODELCOMMIT → `afterCommitInTransaction`, MODELPRE ignorado, BUTTONBAR não existe.
- Rotina reescrita em SmartX **não** pode ser usada junto com a versão legada MVC/ADVPL (lock e sobrescrita).

## Backend do plugin pronto para o SmartX

O que o plugin gera no `tlpp-contract` já segue o mesmo modelo. Mantenha estas regras nos
fontes TLPP das APIs para que a regra de negócio possa ser reaproveitada no **Modelo** SmartX:

1. **Sem estado:** nada de `Static`/`Private` guardando valor entre requisições; abrir e fechar a área em cada chamada.
2. `DbSeek` em vez de `MsSeek` (o `MsSeek` usa cache por thread e devolve dado velho no REST).
3. Toda query com `%notDel%` e `%xfilial%`.
4. **Regra de negócio em classe de serviço** separada da classe/função REST (a API só lê parâmetros e devolve JSON).
5. Validação de campo no servidor, devolvendo JSON (`{code, message, detailedMessage}`).
6. Resposta de lista no formato `items` / `hasNext` (+ `remainingRecords`).
7. **Rotina que já tem MVC:** gravar pelo próprio modelo (FWRestModel, `--mvc <FONTE>`, ver
   `skills/poui-code-generation/templates-mvc-rest.md`) em vez de duplicar a regra numa API — mesma ideia
   do Modelo SmartX. Em `ModelDef` novo, usar `oModel:GetOperation()` e nunca `INCLUI`/`ALTERA`.
8. Filtro no padrão **oData** quando o cliente estiver na 2610+ ou quiser seguir o padrão TOTVS — ver
   a seção "Filtro oData (opcional)" em `skills/poui-code-generation/templates-tlpp-contract.md` (`--odata`).

## Aviso no /generate

Quando o usuário informar (ou o pedido indicar) que o cliente está na **12.1.2610 ou superior** e o
tipo pedido for um cadastro/lista simples sobre **uma** tabela do dicionário, exibir antes do plano:

```
ℹ Cliente na 12.1.2610+: se esta tela for um cadastro simples sobre uma tabela do dicionário,
  o SmartX pode gerá-la sem código Angular (/poui-specialist:generate smartx). Use PO-UI próprio se
  precisar de tela sob medida, mestre/detalhe na mesma tela, árvore, seleção em itens filhos ou mais
  de um browse (ver skills/poui-patterns/smartx.md).
```

Não bloquear: é só um aviso; seguir com a geração normalmente.
