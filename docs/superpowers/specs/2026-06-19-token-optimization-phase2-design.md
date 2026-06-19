# Token Optimization Phase 2 — generate-batch + Compressão Wave 1

**Date:** 2026-06-19  
**Status:** Aprovado  
**Scope:** Plugin poui-specialist — Wave 1 de compressão (pendente da spec anterior) + nova skill de orquestração + formato de prompt manifesto  
**Spec anterior:** `2026-06-11-token-optimization-design.md` (Waves 2 e 3 já concluídas)

---

## Contexto e Motivação

A spec de jun/11 concluiu Wave 2 (Quick Reference em `po-ui-quirks.md`) e Wave 3 (split dos templates stacked-browse e two-panel-browse). Ficou pendente:

- **Wave 1:** Compressão in-place dos 12 arquivos de 200–400 linhas (ainda em 10–12 KB cada)
- **Novo:** Skill de orquestração `generate-batch` para isolar contexto por componente
- **Novo:** Formato de prompt manifesto estruturado para o usuário
- **Novo:** Página de documentação no site poui-specialist-docs

### Problema central

Usuários que geram múltiplos componentes por sessão acumulam contexto rapidamente:

```
Turno 1: ~25 KB de contexto (plugin + prompt)
Turno 3: ~60 KB (histórico + código gerado anterior)
Turno 5: ~120 KB+ (crescimento exponencial)
```

Mesmo com os arquivos enxutos, o histórico de conversa domina o custo após o 2º componente.

### Meta desta fase

| Métrica | Antes | Meta |
|---|---|---|
| Tokens por arquivo Wave 1 (média) | ~2.800 | ~1.400 |
| Custo de sessão com 3 componentes | ~60.000 tokens | ~25.000 tokens |
| Custo de sessão com 5 componentes | ~120.000 tokens | ~35.000 tokens |

---

## Parte 1 — Wave 1: Compressão dos 12 Arquivos (Pendente)

### Regras de compressão (da spec anterior, aplicar agora)

**Regra 1 — Remover blocos de código `❌ Errado`**  
Manter apenas o código correto. O texto já explica o que evitar.  
Exceção: manter o bloco errado se o símbolo incorreto É a informação (ex: `p-selected-rows` não existe).

**Regra 2 — Root cause em 1–2 linhas**  
Converter explicações de causa raiz em frases concisas preservando valores técnicos (px, nomes de métodos).

**Regra 3 — Remover comentários explicativos que reafirmam o nome do código**  
Manter apenas comentários com valores não-óbvios (offsets px, delays, razões de workaround).

### Arquivos em escopo (Wave 1)

| Arquivo | Tamanho atual | Meta |
|---|---|---|
| `reactive-forms.md` | 12,1 KB | ~6 KB |
| `dynamic-form-fields.md` | 11,8 KB | ~6 KB |
| `dynamic-pages.md` | 10,9 KB | ~5,5 KB |
| `templates-master-detail.md` | 9,9 KB | ~5 KB |
| `templates-stepper-form.md` | 8,5 KB | ~4,5 KB |
| `templates-modal-crud.md` | 9,0 KB | ~4,5 KB |
| `navigation-components.md` | 12,8 KB | ~6,5 KB |
| `module-structure.md` | 8,3 KB | ~4 KB |
| `templates-page-edit.md` | 5,7 KB | ~3 KB |
| `templates-page-detail.md` | 6,7 KB | ~3,5 KB |
| `templates-page-dynamic-search.md` | 6,7 KB | ~3,5 KB |
| `feedback-components.md` | 5,9 KB | ~3 KB |

### Preservação obrigatória

- Todo código correto (TypeScript, HTML, SCSS) intacto e verbatim
- Todos os valores numéricos (px, ms, limites)
- Todos os avisos `⚠️` e blocos `Never use`
- Símbolos de APIs incorretas nos casos de exceção da Regra 1

---

## Parte 2 — Skill `generate-batch` (Nova)

### Objetivo

Permitir que o usuário gere múltiplos componentes com um único prompt manifesto, onde cada componente é gerado em um subagente isolado com contexto próprio e descartável.

### Arquivo a criar

```
skills/poui-generate-batch/SKILL.md
```

### Fluxo da skill

```
Usuário invoca /poui-specialist:generate-batch com o manifesto

Orquestrador (skill):
  1. Lê e valida o manifesto (pasta destino, módulo, lista de componentes)
  2. Para cada componente na lista:
     a. Monta prompt compacto: tipo + classe + endpoint + campos + regras relevantes
     b. Despacha subagente poui-specialist:code-generator com esse prompt
     c. Subagente gera e salva os arquivos (contexto isolado, sem histórico)
     d. Subagente encerra — contexto descartado
  3. Relatório final: arquivos gerados, pasta, avisos
```

### Comportamento do orquestrador

- Valida que `PASTA_DESTINO` existe antes de despachar qualquer subagente
- Se um subagente falhar, registra o erro e continua com os próximos
- Ao final, lista: ✅ gerados com sucesso | ⚠️ com aviso | ❌ com falha
- Não gera código diretamente — apenas orquestra subagentes

### Integração com generate.md

Adicionar no `commands/generate.md` uma seção de referência cruzada:

```markdown
## Geração em Lote

Para gerar múltiplos componentes com custo fixo por componente (sem acúmulo de contexto),
use `/poui-specialist:generate-batch` com o formato manifesto descrito na documentação.
```

---

## Parte 3 — Formato do Prompt Manifesto (Novo)

### Propósito

Substituir prompts narrativos longos por um formato tabular compacto que:
- Elimina repetição (API base declarada uma vez)
- Determina o template sem necessidade de brainstorming
- Passa apenas campos relevantes por componente
- É legível para o usuário e parseável pelo orquestrador

### Formato canônico

```
/poui-specialist:generate-batch

MODULO: <pasta-feature/sub-pasta>
API_BASE: /rest/api/custom/v1
PASTA_DESTINO: src/app/<modulo>

COMPONENTES:
| tipo              | classe                  | endpoint        | campos                                          |
|-------------------|-------------------------|-----------------|-------------------------------------------------|
| page-list         | {{Classe}}ListComponent | /recurso        | campo1, campo2, campo3                          |
| page-edit         | {{Classe}}EditComponent | /recurso/{id}   | campo1(req), campo2(req), campo3, campo4        |
| service           | {{Classe}}Service       | /recurso        | -                                               |
| modal-crud        | {{Classe}}ModalComponent| /recurso        | campo1(req), campo2                             |

REGRAS:
- <regra de negócio 1>
- <regra de negócio 2>
```

### Convenções do manifesto

| Elemento | Convenção | Exemplo |
|---|---|---|
| `(req)` após campo | Campo obrigatório no formulário | `nome(req)` |
| `-` em campos | Sem campos específicos (usar padrão) | `service` usa `-` |
| `REGRAS:` | Apenas regras que afetam geração de código | Status, formatação, validações |
| Tipos válidos | `page-list`, `page-edit`, `page-detail`, `page-dynamic-search`, `page-dynamic`, `modal-crud`, `stepper-form`, `master-detail`, `stacked-browse`, `two-panel-browse`, `service`, `dashboard` | — |

### Exemplo real

```
/poui-specialist:generate-batch

MODULO: financeiro/contas-receber
API_BASE: /rest/api/custom/v1
PASTA_DESTINO: src/app/financeiro/contas-receber

COMPONENTES:
| tipo      | classe                  | endpoint      | campos                                        |
|-----------|-------------------------|---------------|-----------------------------------------------|
| page-list | TitulosListComponent    | /titulos      | codTit, nomCli, valor, vencto, status         |
| page-edit | TitulosEditComponent    | /titulos/{id} | codTit(req), nomCli(req), valor(req), vencto(req), obs |
| service   | TitulosService          | /titulos      | -                                             |

REGRAS:
- Status: A=Aberto B=Baixado C=Cancelado
- Apenas status=A pode ser editado
- Valor formatado como moeda BRL
```

---

## Parte 4 — Página de Documentação (Nova)

### Localização

```
poui-specialist-docs/content/docs/otimizacao-tokens.mdx
```

### Estrutura da página

1. **Por que otimizar?** — breve explicação do problema de acúmulo de tokens
2. **Prompt Manifesto** — formato completo com anotações explicativas
3. **Tipos de componente disponíveis** — tabela de referência rápida
4. **Exemplos completos** — módulo financeiro + módulo de parceiros
5. **Boas práticas** — como escrever regras de negócio de forma compacta

### Navegação

Adicionar entrada em `meta.json` de documentação:

```json
{ "title": "Otimização de Tokens", "slug": "otimizacao-tokens" }
```

---

## Ordem de Implementação

### Wave 1 — Compressão dos arquivos (sem risco, sem mudança estrutural)
Aplicar as 3 regras de compressão nos 12 arquivos listados. Validar que nenhum código correto foi alterado.

### Wave 2 — Skill generate-batch
Criar `skills/poui-generate-batch/SKILL.md`. Atualizar `commands/generate.md` com referência cruzada. Sincronizar via `sync-to-cache.ps1`.

### Wave 3 — Documentação
Criar `otimizacao-tokens.mdx` no site. Atualizar `meta.json`. Commitar e fazer deploy.

---

## Checklist de Validação

### Wave 1
- [ ] Nenhum bloco de código TypeScript/HTML/SCSS correto foi modificado
- [ ] Todos os valores numéricos (px, ms) preservados
- [ ] Todos os avisos `⚠️` e `Never use` preservados
- [ ] Redução de tamanho ≥ 40% em cada arquivo

### Wave 2
- [ ] Skill `generate-batch` carrega o manifesto corretamente
- [ ] Cada componente gera em subagente isolado (sem compartilhar histórico)
- [ ] Falha em um componente não interrompe os demais
- [ ] Relatório final lista todos os arquivos gerados com caminho completo

### Wave 3
- [ ] Página exibe o formato manifesto com sintaxe highlighting
- [ ] Todos os tipos de componente listados com link para template
- [ ] Exemplos são copiáveis e funcionais (testados manualmente)
- [ ] Navegação do site inclui a nova página
