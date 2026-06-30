---
description: Look up PO-UI component documentation — inputs, outputs, types, and usage examples
allowed-tools: Read, Skill, Bash
argument-hint: "<component-name>"
---

**IMPORTANT:** Always respond in the same language the user is writing in.

## Passo 0 — Verificação de licença

Invocar a skill `poui-specialist:poui-license-check` antes de qualquer outra ação.
Se a skill retornar `status: expirado` ou `status: revogado`, encerrar imediatamente.

---

# /poui-specialist:docs

Looks up PO-UI component documentation from the built-in reference skill.

## Examples

```bash
/poui-specialist:docs po-table
/poui-specialist:docs po-lookup
/poui-specialist:docs po-page-edit
/poui-specialist:docs po-input
/poui-specialist:docs po-select
```

## Process

1. **Parse component name** — normalize to kebab-case (e.g., `PoTable` → `po-table`)
2. **Load skill `poui-components`** — search across `page-components.md`, `form-fields.md`, `table-components.md`
3. **Present documentation** — all inputs, outputs, TypeScript types, and a usage example
4. **If not found** — list all available components and suggest the closest match
