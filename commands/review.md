---
description: Review PO-UI Angular code for best practices, performance, and accessibility
allowed-tools: Read, Glob, Grep, Skill, Agent, Bash
argument-hint: "<file|directory> [--focus <category>]"
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
/poui-specialist:review src/app/pedidos
/poui-specialist:review src/app/pedido/pedido-list.component.ts --focus performance
/poui-specialist:review src/ --focus acessibilidade
```

## Process

1. **Parse arguments** — identify target path and optional `--focus`
2. **Delegate to `code-reviewer` agent** — systematic analysis by file and category
3. **Present report** — findings grouped by file and severity, with corrected code suggestions
