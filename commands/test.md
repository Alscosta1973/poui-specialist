---
description: Generate Karma + Jasmine unit tests for PO-UI Angular components
allowed-tools: Read, Write, Glob, Grep, Skill, Bash
argument-hint: "<ComponentClass> --module <module>"
---

**IMPORTANT:** Always respond in the same language the user is writing in.

## Passo 0 — Verificação de licença

Invocar a skill `poui-specialist:poui-license-check` antes de qualquer outra ação.
Se a skill retornar `status: expirado` ou `status: revogado`, encerrar imediatamente.

---

# /poui-specialist:test

Gera `*.component.spec.ts` completo (Karma + Jasmine) para um componente gerado pelo plugin, cobrindo smoke test, HTTP, router e interações específicas por tipo.

## Exemplos

```bash
/poui-specialist:test ParceirosComponent --module faturamento/parceiros
/poui-specialist:test TitulosListComponent --module financeiro
/poui-specialist:test TitulosService --module financeiro
```

## Processo

1. **Invocar skill `poui-specialist:poui-test`** — executa os 5 passos: parse de argumentos, leitura do componente, seleção de template por família, geração do spec com dados mock realistas, execução de `ng test`.
