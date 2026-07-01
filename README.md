# poui-specialist

Plugin para [Claude Code](https://claude.ai/code) especializado em **PO-UI (Portinari)** — geração de componentes Angular 17–21+, review de código e referência de API, integrados ao **TOTVS Protheus** via REST.

> © 2025–2026 Andre Costa. Todos os direitos reservados.

---

## Instalação

Execute os dois comandos dentro do Claude Code (não no terminal do sistema):

```
/plugin marketplace add Alscosta1973/poui-specialist
/plugin install poui-specialist@poui-specialist-marketplace
```

O primeiro comando registra o repositório como marketplace local com o nome `poui-specialist-marketplace`. O segundo instala e ativa o plugin na sessão atual.

### Verificar instalação

```
/poui-specialist:generate --help
/poui-specialist:docs po-table
/poui-specialist:review --help
```

### Atualizar

```
/plugin update poui-specialist@poui-specialist-marketplace
```

### Desinstalar

```
/plugin uninstall poui-specialist@poui-specialist-marketplace
```

---

## Comandos

### `/poui-specialist:generate`

Gera artefatos Angular 17–21+ standalone com PO-UI, integrados à API REST do Protheus.

```
/poui-specialist:generate <type> <Name> [--module <module>]
```

| Tipo | Descrição |
|------|-----------|
| `page-list` | Lista simples com busca rápida |
| `page-dynamic-search` | Lista + busca avançada + disclaimers — padrão Protheus |
| `page-dynamic` | Lista zero-boilerplate via `PoPageDynamicTableComponent` |
| `master-detail` | Lista com linhas filho expansíveis (pedido/itens, NF/itens) |
| `stacked-browse` | Dois `po-table` empilhados com navegação por teclado |
| `two-panel-browse` | Dois `po-table` lado a lado para conciliação/matching |
| `page-edit` | Formulário com rota |
| `page-detail` | Visualização read-only com rota `:id/detalhe` |
| `modal-crud` | Lista + modal de adição/edição em um componente |
| `stepper-form` | Wizard multi-etapas com `po-stepper` |
| `service` | Angular service consumindo REST do Protheus |
| `module` | Scaffold completo de aplicação |
| `dashboard` | Página analítica com `po-widget` + `po-chart` |
| `refactor` | Converte `.prw`/`.tlpp` existente para PO-UI |
| `models` | Interfaces TypeScript (simples, chave composta, flat relational) |
| `tlpp-contract` | Skeleton REST backend WsRestFul para implementar com advpl-specialist |

**Exemplos:**

```
/poui-specialist:generate page-dynamic-search Pedidos --module financeiro
/poui-specialist:generate modal-crud Produtos --module estoque
/poui-specialist:generate master-detail PedidoCompra --module compras
/poui-specialist:generate dashboard Estoque --module estoque
/poui-specialist:generate module Faturamento
/poui-specialist:generate refactor --module financeiro
```

---

### `/poui-specialist:docs`

Consulta a documentação de componentes PO-UI: inputs, outputs, tipos e exemplos de uso.

```
/poui-specialist:docs <component-name>
```

**Exemplos:**

```
/poui-specialist:docs po-table
/poui-specialist:docs po-lookup
/poui-specialist:docs po-page-edit
/poui-specialist:docs po-input
```

---

### `/poui-specialist:review`

Revisa código Angular/PO-UI contra regras de boas práticas, performance e acessibilidade.

```
/poui-specialist:review <file|directory> [--focus <category>]
```

| Foco | Regras aplicadas |
|------|-----------------|
| `boas-praticas` | OnPush, tipagem, signals, unsubscribe |
| `performance` | trackBy, AsyncPipe, lazy loading |
| `acessibilidade` | p-label, aria-label |
| `all` | Todas as categorias (padrão) |

---

## Agentes

| Agente | Descrição |
|--------|-----------|
| `poui-specialist:code-generator` | Geração de componentes seguindo convenções PO-UI e Protheus |
| `poui-specialist:code-reviewer` | Review com sugestões de correção acionáveis |

---

## Pré-requisitos

- [Claude Code](https://claude.ai/code) instalado e autenticado
- Projeto Angular com `@totvs/po-ui` ou `@po-ui/ng-components`
- Node.js 18+

---

## Documentação

Documentação completa em: **https://alscosta1973.github.io/poui-specialist-docs/**

## Changelog

Consulte o [CHANGELOG.md](CHANGELOG.md) para o histórico de versões.

## Licença

Proprietário — © 2025–2026 Andre Costa. Todos os direitos reservados.  
Contato: andre.andrelscosta@gmail.com
