---
description: Generate PO-UI Angular 17+ components, services and modules for Protheus REST integration
allowed-tools: Read, Write, Glob, Grep, Skill, Agent
argument-hint: "<type> <Name> [--module <module>]"
---

**IMPORTANT:** Always respond in the same language the user is writing in. If the user writes in Portuguese, respond in Portuguese.

# /poui-specialist:generate

Generates standalone Angular 17+ artifacts using PO-UI components, integrated with TOTVS Protheus REST API.

## Valid Types

| Type | Generated Files | `--module` required? |
|------|----------------|----------------------|
| `page-list` | `*.component.ts`, `*.component.html`, `*.component.scss` | Yes |
| `page-edit` | `*.component.ts`, `*.component.html`, `*.component.scss` | Yes |
| `service`   | `*.service.ts` | Yes |
| `module`    | `app.routes.ts`, `app.config.ts` | No |

## Examples

```bash
/poui-specialist:generate page-list Clientes --module financeiro
/poui-specialist:generate page-edit Pedido --module faturamento
/poui-specialist:generate service PedidoService --module faturamento
/poui-specialist:generate module Faturamento
```

## Process

1. **Parse arguments** — identify `<type>`, `<Name>`, and optional `--module`
2. **Delegate to `code-generator` agent** — full planning, validation, and generation workflow
3. **Confirm output** — list created files with their absolute paths and suggested route addition
