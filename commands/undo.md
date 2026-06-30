---
description: Reverte a última geração do poui-specialist — lista componentes gerados e remove os arquivos escolhidos + rota correspondente
allowed-tools: Read, Edit, Glob, Grep, Bash, AskUserQuestion, Skill
argument-hint: "[<module>/<kebab-name>] [--list]"
---

**IMPORTANT:** Always respond in the same language the user is writing in. If the user writes in Portuguese, respond in Portuguese.

## Passo 0 — Verificação de licença

Invocar a skill `poui-specialist:poui-license-check` antes de qualquer outra ação.
Se a skill retornar `status: expirado` ou `status: revogado`, encerrar imediatamente.

---

# /poui-specialist:undo

Reverte componentes gerados pelo plugin — remove arquivos e desfaz a rota adicionada em `app.routes.ts`.

## Uso

```bash
/poui-specialist:undo --list                        # lista todos os componentes gerados
/poui-specialist:undo financeiro/pedidos-list        # remove componente específico
/poui-specialist:undo                               # modo interativo — lista e pergunta qual remover
```

## Processo

Invocar a skill `poui-specialist:poui-undo` com os argumentos fornecidos.
