---
description: Generate PO-UI Angular 17+ components, services and modules for Protheus REST integration
allowed-tools: Read, Write, Glob, Grep, Skill, Agent, Bash, mcp__plugin_playwright_playwright__browser_navigate, mcp__plugin_playwright_playwright__browser_take_screenshot, mcp__plugin_playwright_playwright__browser_wait_for
argument-hint: "<type> <Name> [--module <module>]"
---

**IMPORTANT:** Always respond in the same language the user is writing in. If the user writes in Portuguese, respond in Portuguese.

# /poui-specialist:generate

Generates standalone Angular 17+ artifacts using PO-UI components, integrated with TOTVS Protheus REST API.

## Valid Types

### List pages
| Type | Generated Files | `--module` required? | When to use |
|------|----------------|----------------------|-------------|
| `page-list` | `*.component.ts/html/scss` | Yes | Simple list with quick search only |
| `page-dynamic-search` | `*.component.ts/html/scss` | Yes | List + advanced search + disclaimers — **padrão Protheus** |
| `page-dynamic` | `*.component.ts/html` | Yes | Zero-boilerplate via PoPageDynamicTableComponent — API must follow plugin contract |
| `master-detail` | `*.component.ts/html/scss` + model | Yes | List with expandable child rows (pedido/itens, NF/itens) |
| `stacked-browse` | `*.component.ts/html/scss` | Yes | Dois po-table empilhados (master/detail) com navegação por teclado ArrowUp/Down e Tab para alternar |
| `two-panel-browse` | `*.component.ts/html/scss` | Yes | Dois po-table lado a lado para conciliação/matching (seleciona um de cada e confirma) |

### Edit / Detail pages
| Type | Generated Files | `--module` required? | When to use |
|------|----------------|----------------------|-------------|
| `page-edit` | `*.component.ts/html/scss` | Yes | Form with many fields, navigates via route |
| `page-detail` | `*.component.ts/html/scss` | Yes | Read-only detail view, route `:id/detalhe` |
| `modal-crud` | `*.component.ts/html/scss` | Yes | All-in-one list + modal add/edit (up to ~10 fields) |
| `stepper-form` | `*.component.ts/html/scss` | Yes | Multi-step wizard with po-stepper (3+ distinct sections) |

### Other
| Type | Generated Files | `--module` required? | When to use |
|------|----------------|----------------------|-------------|
| `service` | `*.service.ts` | Yes | Angular service consuming Protheus REST |
| `module` | `app.routes.ts`, `app.config.ts`, `app.component.ts`, `package.json`, `proxy.conf.json`, `index.html` | No | Full application scaffold |
| `dashboard` | `*.component.ts/html/scss` | Yes | Analytics page with po-widget + po-chart |
| `refactor` | `*.component.ts/html/scss` + service + model | Yes | Convert existing `.prw`/`.tlpp` to PO-UI (provide source file) |
| `models` | `<entity>.model.ts` | Yes | TypeScript interfaces: simple, composite key, flat relational (padrão Protheus) |
| `tlpp-contract` | skeleton WsRestFul `.tlpp` | Yes | Contrato REST backend para implementar com `/advpl-specialist:generate rest` |

## Examples

```bash
/poui-specialist:generate page-dynamic-search Pedidos --module financeiro
/poui-specialist:generate page-dynamic Parceiros --module compras
/poui-specialist:generate modal-crud Produtos --module estoque
/poui-specialist:generate page-edit Pedido --module faturamento
/poui-specialist:generate page-detail Pedido --module faturamento
/poui-specialist:generate stepper-form CadastroPedido --module financeiro
/poui-specialist:generate master-detail PedidoCompra --module compras
/poui-specialist:generate page-list Parceiros --module compras
/poui-specialist:generate service PedidoService --module faturamento
/poui-specialist:generate dashboard Estoque --module estoque
/poui-specialist:generate module Faturamento
/poui-specialist:generate refactor --module financeiro   # will ask for .prw/.tlpp file
/poui-specialist:generate stacked-browse AprovacaoPedido --module compras
/poui-specialist:generate two-panel-browse ConciliacaoCartao --module financeiro
/poui-specialist:generate models Pedido --module compras
/poui-specialist:generate tlpp-contract Pedido --module compras
```

## Process

> **Pré-passo opcional:** Se o projeto Angular já tem serviços e rotas cadastradas, execute `/poui-specialist:context` antes para gerar um snapshot de contexto e evitar duplicatas.

1. **Parse arguments** — identify `<type>`, `<Name>`, and optional `--module`
2. **Delegate to `code-generator` agent** — full planning, validation, and generation workflow
3. **Confirm output** — list created files with their absolute paths and suggested route addition
4. **Build verification** — após confirmar os arquivos, invocar automaticamente a skill `poui-specialist:build-fix`. Não perguntar ao usuário — executar direto e exibir o relatório de build.
5. **Preview no browser** — após a verificação de build, perguntar:

   > "Deseja visualizar a tela no browser? [S/n]"

   - Se **sim**: invocar a skill `poui-specialist:poui-preview` passando `<module>`, `<kebab-name>` e `<ComponentClass>` gerados no Passo 2.
   - Se **não**: encerrar normalmente.

> **Auditoria periódica:** Use `/poui-specialist:quality` após gerar para verificar se os componentes atendem os 4 critérios de qualidade do plugin (OnPush, loading state, error handling, cleanup de observables) e se as rotas usam lazy loading.

## Geração em Lote

Para gerar múltiplos componentes com custo fixo por componente (sem acúmulo de contexto por sessão), use o comando `/poui-specialist:generate-batch` com o formato manifesto.

Exemplo:
```
/poui-specialist:generate-batch

MODULO: financeiro/titulos
API_BASE: /rest/api/custom/v1
PASTA_DESTINO: src/app/financeiro/titulos

COMPONENTES:
| tipo      | classe               | endpoint      | campos                        |
|-----------|----------------------|---------------|-------------------------------|
| page-list | TitulosListComponent | /titulos      | codTit, nomCli, valor, status |
| service   | TitulosService       | /titulos      | -                             |

REGRAS:
- Status: A=Aberto B=Baixado
```

Consulte a [documentação de Otimização de Tokens](https://alscosta1973.github.io/poui-specialist-docs/docs/otimizacao-tokens) para o formato completo.

Para descobrir os campos automaticamente a partir de um endpoint, use primeiro `/poui-specialist:discover /api/custom/v1/<entidade>` — o plugin chama o endpoint, inspeciona os campos e gera o manifesto pronto para revisão e geração.
