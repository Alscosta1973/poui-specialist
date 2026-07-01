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

Gera `*.component.spec.ts` completo (Karma + Jasmine) para componentes e serviços Angular / PO-UI, cobrindo smoke test, HTTP, router e interações específicas por tipo.

> **Funciona com qualquer componente** — não apenas com código gerado pelo plugin. Aponte para qualquer `*.component.ts` ou `*.service.ts` do projeto e o comando lê o arquivo, identifica a família (list, form, detail, service…) e gera o spec correspondente.

## Exemplos

```bash
# Componente gerado pelo plugin
/poui-specialist:test ParceirosComponent --module faturamento/parceiros

# Componente legado (não gerado pelo plugin)
/poui-specialist:test ClientesComponent --module cadastro/clientes

# Service qualquer do projeto
/poui-specialist:test PedidosService --module financeiro

# Componente existente sem spec (detecta automaticamente a família)
/poui-specialist:test AprovacaoComponent --module compras/aprovacao
```

## Processo

1. **Invocar skill `poui-specialist:poui-test`** — executa os 5 passos: parse de argumentos, leitura do componente (gerado pelo plugin ou legado), seleção de template por família, geração do spec com dados mock realistas, execução de `ng test`.
