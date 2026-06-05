---
description: Generate PO-UI Angular 17+ components, services and modules for Protheus REST integration
allowed-tools: Read, Write, Glob, Grep, Skill, Agent
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
```

## Process

1. **Parse arguments** — identify `<type>`, `<Name>`, and optional `--module`
2. **Delegate to `code-generator` agent** — full planning, validation, and generation workflow
3. **Confirm output** — list created files with their absolute paths and suggested route addition
