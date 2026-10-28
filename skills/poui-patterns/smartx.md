# PO-UI próprio × SmartX (Protheus 12.1.2610+)

O **SmartX** é o novo framework de telas da TOTVS (Protheus, RM e Datasul). A tela não é
programada: o desenvolvedor descreve dados, regras e layout em contratos (classes TLPP de
**Objeto**, **Modelo** e **Interface** + um **Launcher** de menu) e o motor gera a interface web
em Angular + PO-UI. No Protheus estreia na **release 12.1.2610** (Lib ≥ 20260418, dicionário no
banco, Expedição Contínua atualizada).

O plugin **não concorre** com o SmartX: o SmartX moderniza rotinas padrão e cadastros simples;
o poui-specialist cobre telas sob medida e tudo o que o SmartX ainda não faz.

> Fontes (out/2026): TDN "Smart X no módulo Estoque/Custos" (https://tdn.totvs.com/x/g441Pg),
> palestras do Universo TOTVS 2026 e artigos técnicos. A documentação oficial completa do
> SmartX ainda não estava no TDN — revisar esta página quando for publicada.

---

## Quando usar cada um

| Situação | Use |
|---|---|
| Cliente em release **anterior à 12.1.2610** | PO-UI próprio (plugin) |
| Rotina padrão TOTVS que já tem versão SmartX | SmartX (customizar via Custom Merge / SmartLink) |
| Cadastro simples sobre tabela do dicionário (SX2/SX3), release ≥ 2610 | SmartX |
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
- Legendas BMP — viram tags de cor (`color-01` a `color-12`), como o plugin já gera.
- Busca rápida só pesquisa a página já carregada; busca no banco é pelo filtro avançado.
- Pontos de entrada MVC mudam: FORMPRE → `formPre`, FORMPOS → `beforeCommit`/`beforeCommitInTransaction`,
  MODELCOMMIT → `afterCommitInTransaction`, MODELPRE ignorado, BUTTONBAR não existe.

## Backend do plugin pronto para o SmartX

O que o plugin gera no `tlpp-contract` já segue o mesmo modelo. Mantenha estas regras nos
fontes TLPP das APIs para que a regra de negócio possa ser reaproveitada no **Modelo** SmartX:

1. **Sem estado:** nada de `Static`/`Private` guardando valor entre requisições; abrir e fechar a área em cada chamada.
2. `DbSeek` em vez de `MsSeek` (o `MsSeek` usa cache por thread e devolve dado velho no REST).
3. Toda query com `%notDel%` e `%xfilial%`.
4. **Regra de negócio em classe de serviço** separada da classe/função REST (a API só lê parâmetros e devolve JSON).
5. Validação de campo no servidor, devolvendo JSON (`{code, message, detailedMessage}`).
6. Resposta de lista no formato `items` / `hasNext` (+ `remainingRecords`).
7. Filtro no padrão **oData** quando o cliente estiver na 2610+ ou quiser seguir o padrão TOTVS — ver
   a seção "Filtro oData (opcional)" em `skills/poui-code-generation/templates-tlpp-contract.md` (`--odata`).

## Aviso no /generate

Quando o usuário informar (ou o pedido indicar) que o cliente está na **12.1.2610 ou superior** e o
tipo pedido for um cadastro/lista simples sobre **uma** tabela do dicionário, exibir antes do plano:

```
ℹ Cliente na 12.1.2610+: se esta tela for um cadastro simples sobre uma tabela do dicionário,
  o SmartX pode gerá-la sem código. Use o plugin se precisar de tela sob medida, mestre/detalhe
  na mesma tela, árvore, seleção em itens filhos ou mais de um browse (ver skills/poui-patterns/smartx.md).
```

Não bloquear: é só um aviso; seguir com a geração normalmente.
