---
description: Review PO-UI Angular code for best practices, performance, and accessibility — and Smart X Protheus sources (.prw/.tlpp) with --focus smartx
allowed-tools: Read, Glob, Grep, Skill, Agent, Bash
argument-hint: "<file|directory> [--focus <category>]"
---

**IMPORTANT:** Always respond in the same language the user is writing in.

## Passo 0 — Verificação de licença

Invocar a skill `poui-specialist:poui-license-check` antes de qualquer outra ação.
Se a skill retornar `status: expirado` ou `status: revogado`, encerrar imediatamente.

---

# /poui-specialist:review

Reviews PO-UI Angular code against established rules for best practices, performance, and accessibility.

## Focus Categories

| Focus | Rules Applied |
|-------|---------------|
| `boas-praticas` | OnPush, tipagem, signals, unsubscribe, inject(), computed() |
| `performance` | trackBy, computed(), lazy loading, mutação de array |
| `acessibilidade` | p-label, aria-label, p-help |
| `seguranca` | bypassSecurityTrust*, URL hardcoded, concatenação em HTTP |
| `poui` | po-table selection, loading state, column types, po-modal dismiss |
| `qualidade` | cobertura de testes (spec files ausentes) |
| `smartx` | fontes Protheus Smart X: regras SX01–SX11 e SXR1–SXR8 de `skills/smartx/smartx-rules.md` (eventos no Modelo, contextos separados, legenda PO-UI, `setSmartX`/`hasSmartX`, filtro SQL `@`, arquitetura stateless) |
| `all` | Todas as categorias (padrão) |

## Examples

```bash
/poui-specialist:review src/app/pedidos
/poui-specialist:review src/app/pedido/pedido-list.component.ts --focus performance
/poui-specialist:review src/ --focus seguranca
/poui-specialist:review src/app/ --focus poui
/poui-specialist:review src/app/ --focus qualidade
/poui-specialist:review protheus/ --focus smartx
```

## Process

1. **Parse arguments** — identify target path and optional `--focus`
2. **Delegate to `code-reviewer` agent** — systematic analysis by file and category
3. **Present report** — findings grouped by file and severity, with corrected code suggestions
