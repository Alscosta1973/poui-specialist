---
description: Review PO-UI Angular code for best practices, performance, and accessibility
allowed-tools: Read, Glob, Grep, Skill, Agent
argument-hint: "<file|directory> [--focus <category>]"
---

**IMPORTANT:** Always respond in the same language the user is writing in.

# /poui-specialist:review

Reviews PO-UI Angular code against established rules for best practices, performance, and accessibility.

## Focus Categories

| Focus | Rules Applied |
|-------|---------------|
| `boas-praticas` | OnPush, tipagem, signals, unsubscribe |
| `performance` | trackBy, AsyncPipe, lazy loading |
| `acessibilidade` | p-label, aria-label |
| `all` | All categories (default) |

## Examples

```bash
/poui-specialist:review src/app/clientes
/poui-specialist:review src/app/pedido/pedido-list.component.ts --focus performance
/poui-specialist:review src/ --focus acessibilidade
```

## Process

1. **Parse arguments** — identify target path and optional `--focus`
2. **Delegate to `code-reviewer` agent** — systematic analysis by file and category
3. **Present report** — findings grouped by file and severity, with corrected code suggestions
