---
description: Generate a real Playwright E2E test spec for a PO-UI Angular component (live dev server + browser)
allowed-tools: Read, Write, Glob, Grep, Skill, Bash, mcp__plugin_playwright_playwright__browser_navigate, mcp__plugin_playwright_playwright__browser_snapshot, mcp__plugin_playwright_playwright__browser_wait_for
argument-hint: "<ComponentClass> --module <module>"
---

**IMPORTANT:** Always respond in the same language the user is writing in.

## Passo 0 — Verificação de licença

Invocar a skill `poui-specialist:poui-license-check` antes de qualquer outra ação.
Se a skill retornar `status: expirado` ou `status: revogado`, encerrar imediatamente.

---

# /poui-specialist:e2e

Gera um spec `@playwright/test` real (`e2e/<kebab-name>.e2e.spec.ts`) para um componente Angular
gerado pelo plugin — sobe o dev server, inspeciona o DOM real via Playwright para descobrir
seletores, escreve o spec e roda `npx playwright test` para validar.

> Complementa `/poui-specialist:test` (unitário, HTTP mockado) com um teste ponta-a-ponta
> contra o app real rodando no browser.

## Exemplos

```bash
/poui-specialist:e2e TitulosListComponent --module financeiro/titulos-list
/poui-specialist:e2e ParceirosEditComponent --module faturamento/parceiros
```

## Processo

1. **Invocar skill `poui-specialist:poui-e2e`** — executa os 8 passos: parse de argumentos,
   identificação de família, garantia do ambiente Playwright Test, subida do dev server
   (reaproveitando `poui-preview`), inspeção do DOM real, geração do spec, execução e relatório.
