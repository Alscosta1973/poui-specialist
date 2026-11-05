---
name: smartx
description: Use when generating, migrating, reviewing or diagnosing TOTVS Smart X code (Protheus 12.1.2610+) — Objeto/Modelo/Interface/Launcher em TLPP, eventos (addTriggers/addValidators), ações, expressões, lookups, legendas caption-tag, pontos de entrada formPre/formPos/beforeCommit, mBrowse/FWMBrowse com setSmartX e as regras SX01–SX10 | © Andre Costa — uso restrito · https://github.com/Alscosta1973/poui-specialist
metadata:
  domain: Smart X / TLPP / Protheus
  author: Andre Costa
  version: '1.24.0'
  category: Reference
---

# Smart X (framework TOTVS de telas por metadados)

Smart X gera a tela web (Angular + PO-UI) a partir de contratos TLPP: o desenvolvedor descreve
dados, regras e layout; o framework renderiza. Não há código Angular a escrever.

Fonte oficial: TDN `https://tdn.totvs.com/display/public/framework/Smart+X` (página central,
5 documentações, seção "5. Desenvolvimento com Smart X" com 23 páginas e FAQ). Conteúdo revisado em
**05/11/2026** — quando o TDN mudar, atualizar estes arquivos.

## Conteúdo

- **Referência técnica** (estrutura Objeto → Modelo → Interface → Launcher, classes, métodos do Modelo e
  da Interface, eventos, ações, expressões, lookups, legendas, totalizadores, validações, pontos de
  entrada, funções de contexto, divergências entre páginas do TDN): see `smartx-reference.md`
- **Migração de browse legado** (`mBrowse` / `FWMBrowse` → nova visão com `setSmartX`, de-para de
  cores, MenuDef, filtros, o que deixa de funcionar, ativação no SIGACFG): see `smartx-browse-migration.md`
- **Regras SX01–SX10** (lint determinístico + review — mesma fonte para `/lint`, `/review` e a extensão
  VS Code): see `smartx-rules.md`
- **Decisão PO-UI próprio × Smart X** (quando usar cada um, o que o Smart X 2610 não faz): see
  `skills/poui-patterns/smartx.md`

## Templates de geração

| Tipo `/generate` | Template | Gera |
|---|---|---|
| `smartx` | `skills/poui-code-generation/templates-smartx.md` | Modelo `.tlpp` + Interface `.tlpp` + Launcher `.prw` (+ PE opcional) |
| `smartx-browse` | `skills/poui-code-generation/templates-smartx-browse.md` | Fonte `mBrowse`/`FWMBrowse` existente migrado para a nova visão |

## Pré-requisitos (resumo)

- Release **12.1.2610+** em produção (2510+ para eventos customizados no Modelo, segundo o TDN).
- Rotina convertida/compatibilizada; tabelas reais (sem tabela temporária — arquitetura stateless).
- Nova visão ligada pela Política (SIGACFG) ou pelo usuário com **Shift+F6**.
- Nunca usar a rotina reescrita em Smart X junto com a versão legada MVC/ADVPL (lock e sobrescrita).
