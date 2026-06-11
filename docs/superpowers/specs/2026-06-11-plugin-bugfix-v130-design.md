# Plugin poui-specialist — Bugfix + Gaps v1.3.0
**Data:** 2026-06-11
**Escopo:** Correção de inconsistências críticas no agent + preenchimento de gaps estruturais

---

## Contexto

Revisão estrutural do plugin identificou 4 bugs (informação incorreta que gera código errado) e 4 gaps estruturais (cobertura incompleta de commands, versionamento parado em 1.0.0, sem CHANGELOG). A abordagem escolhida é patch cirúrgico (Opção A): corrigir sem reorganizar a arquitetura ou eliminar duplicações.

---

## Bugs a Corrigir

### B1 — `agents/code-generator.md`: po-table selection invertida

**Problema:** O agent instrui o Claude a usar `(p-selected-rows)` e proíbe `(p-selected)` / `(p-unselected)`. Ambas as instruções estão erradas — `p-selected-rows` não existe na biblioteca.

**Correção:** Substituir a seção `### po-table selection` pelo padrão correto (consistente com `SKILL.md` e `po-ui-quirks.md`):
- `p-selected-rows` não existe — nunca usar
- Usar eventos individuais: `(p-selected)`, `(p-unselected)`, `(p-all-selected)`, `(p-all-unselected)`
- Acumular seleção em array local com `signal<T[]>([])`

### B2 — `agents/code-generator.md`: `'tag'` listado como tipo válido de coluna

**Problema:** A lista de tipos válidos inclui `'tag'`, que não existe no `@po-ui/ng-components` instalado. A `SKILL.md` já proíbe explicitamente `'tag'`.

**Correção:** Remover `'tag'` da lista e adicionar os tipos válidos que faltavam: `'link'`, `'detail'`, `'subtitle'`. Adicionar nota explícita proibindo `'tag'`.

### B3 — `commands/generate.md`: templates `stacked-browse` e `two-panel-browse` ausentes

**Problema:** Os templates foram adicionados ao agent (conditonal load map) mas o comando `/generate` nunca foi atualizado. Usuários que consultam `/generate --help` não veem esses tipos.

**Correção:** Adicionar `stacked-browse` e `two-panel-browse` na tabela "List pages" com descrição e exemplos de uso.

### B4 — `skills/poui-patterns/SKILL.md`: `deploy-protheus.md` ausente do índice

**Problema:** O arquivo `deploy-protheus.md` existe e está completo, mas o índice da skill (`SKILL.md`) não o menciona — o Claude não o carrega ao consultar poui-patterns.

**Correção:** Adicionar entrada no índice de conteúdo da skill.

---

## Gaps Estruturais a Preencher

### G1 — `commands/generate.md`: `models` e `tlpp-contract` não listados

**Problema:** Os templates existem em `skills/poui-code-generation/` mas não constam no comando `/generate`. Usuários não sabem que podem gerá-los.

**Correção:** Adicionar ambos à seção "Other" com exemplos de uso.

### G2 — Versão parada em 1.0.0

**Problema:** `plugin.json` e `marketplace.json` declaram `"version": "1.0.0"` desde o início. O plugin recebeu 6+ templates, 11 quirks documentados e uma skill nova desde então.

**Correção:** Bump para `1.3.0` (semver minor por wave de features). Atualizar também o `@generated poui-specialist v1.0` nos attribution headers do `SKILL.md` e `code-generator.md`.

### G3 — Sem CHANGELOG

**Problema:** Impossível rastrear o que mudou entre "versões" do plugin.

**Correção:** Criar `CHANGELOG.md` na raiz do plugin com histórico retroativo das waves de desenvolvimento (1.0.0 → 1.1.0 → 1.2.0 → 1.3.0).

---

## Arquivos Modificados

| Arquivo | Operação | Motivo |
|---------|----------|--------|
| `agents/code-generator.md` | edit | B1 + B2 |
| `commands/generate.md` | edit | B3 + G1 |
| `skills/poui-patterns/SKILL.md` | edit | B4 |
| `.claude-plugin/plugin.json` | edit | G2 |
| `.claude-plugin/marketplace.json` | edit | G2 |
| `skills/poui-code-generation/SKILL.md` | edit | G2 (attribution header) |
| `CHANGELOG.md` | novo | G3 |

---

## Estratégia de Commit

Um único commit convencional após todas as edições:

```
fix(plugin): corrige inconsistências de API e atualiza cobertura de templates

- Corrige po-table selection no agent (p-selected-rows não existe)
- Remove 'tag' dos tipos válidos de PoTableColumn no agent
- Adiciona stacked-browse e two-panel-browse ao comando /generate
- Adiciona models e tlpp-contract ao comando /generate
- Adiciona deploy-protheus.md ao índice de poui-patterns
- Bump de versão 1.0.0 → 1.3.0
- Cria CHANGELOG.md retroativo
```

---

## Fora do Escopo

- Eliminar duplicação de `Critical Rules` e `attribution header` entre agent e SKILL.md
- Segmentar `po-ui-quirks.md` (600 linhas) em arquivos menores
- Otimização de tokens (redução de tamanho dos arquivos de skill)
- Reestruturação arquitetural (arquivo `SKILL.md` raiz, `critical-rules.md` compartilhado)

---

## Critérios de Sucesso

1. Nenhuma instrução incorreta sobre `p-selected-rows` ou `'tag'` permanece no agent
2. `/generate --help` lista todos os 14 tipos disponíveis
3. `poui-patterns` carrega `deploy-protheus.md` quando consultada
4. `plugin.json` reflete a versão atual com histórico em `CHANGELOG.md`
