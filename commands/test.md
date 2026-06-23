---
description: Generate Karma + Jasmine unit tests for PO-UI Angular components
allowed-tools: Read, Write, Glob, Grep, Skill, Bash
argument-hint: "<ComponentClass> --module <module>"
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
