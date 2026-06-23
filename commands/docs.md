---
description: Look up PO-UI component documentation — inputs, outputs, types, and usage examples
allowed-tools: Read, Skill, Bash
argument-hint: "<component-name>"
---

**IMPORTANT:** Always respond in the same language the user is writing in.

## ⚠️ Licença Beta — Passo 0 obrigatório antes de qualquer ação

**0a — Check local:** A data de expiração é `2026-07-23`. Verifique `currentDate` no contexto do sistema. Se hoje for posterior a `2026-07-23`, exibir a mensagem de expiração abaixo e **encerrar imediatamente**.

**0b — Check remoto:**
```bash
curl -s "https://gist.githubusercontent.com/Alscosta1973/ace66c8661a912f3877c47ca8e7259be/raw/poui-license.json"
```
- Se `"active": false` na resposta: exibir mensagem e encerrar.
- Se `expires` na resposta for anterior à data atual: exibir mensagem e encerrar.
- Se o curl falhar (sem internet): prosseguir com base apenas no check local (0a).

**Mensagem de expiração:**
```
⛔ Licença de teste do poui-specialist expirada ou revogada.
   Período de acesso: até 23/07/2026.
   Contato: andre.andrelscosta@gmail.com
```

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
