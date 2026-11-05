# Smart X oficial (TDN) no poui-specialist — design

**Data:** 2026-11-05 · **Autor:** Andre Costa · **Status:** implementado (aguardando release)

## Contexto

O `skills/poui-patterns/smartx.md` (81 linhas) foi escrito antes da documentação oficial do Smart X
estar no TDN. Ela agora está publicada (página central `framework/Smart+X` + 23 páginas de
desenvolvimento + FAQ). O plugin só compara "PO-UI próprio × Smart X" e avisa no `/generate`;
não gera nem revisa código Smart X. Parte do conteúdo atual está desatualizada (legendas
`color-01..12`; o oficial é `caption-tag-01..35` / tokens `red1..gray5`).

## Escopo (decidido com o Andre)

1. **Referência atualizada** — reescrever `smartx.md` (decisão PO-UI × Smart X, mantida) e criar
   `skills/smartx/` com a referência técnica oficial.
2. **`/generate smartx`** — rotina Smart X nova: Modelo + Interface (TLPP) + Launcher (+ PE opcional).
3. **`/generate smartx-browse`** — migração de `mBrowse`/`FWMBrowse` existente para a nova visão
   (`hasSmartX()` + `setSmartX()`, legenda PO-UI, filtro SQL `@`, MenuDef `PAGEACTION`/`OP_IMPRIMIR`).
4. **Regras de lint/review Smart X** (`SX01..SX11` + `SXR1..SXR8` só no review) em `/lint` e `/review` (foco `smartx`).
5. **Extensão poui-vscode** — comando "PO-UI: Smart X (Protheus)" com Gerar rotina, Migrar browse,
   Lint Smart X (determinístico, TS + testes) e Revisar Smart X.

## Arquivos

### Plugin
| Arquivo | Ação |
|---|---|
| `skills/smartx/SKILL.md` | novo — índice + quando usar |
| `skills/smartx/smartx-reference.md` | novo — arquitetura, classes, Modelo, Interface, eventos, ações, expressões, lookups, legendas, PEs, validações, divergências do TDN |
| `skills/smartx/smartx-browse-migration.md` | novo — mBrowse/FWMBrowse → Smart X, tabela de de-para de cores, o que deixa de funcionar |
| `skills/smartx/smartx-rules.md` | novo — regras SX01..SX11 + SXR1..SXR8 (fonte única para lint, review e extensão) |
| `skills/poui-code-generation/templates-smartx.md` | novo — template da rotina |
| `skills/poui-code-generation/templates-smartx-browse.md` | novo — template da migração |
| `skills/poui-patterns/smartx.md` | atualizar — fontes oficiais, legendas corretas, ponteiro p/ `skills/smartx` |
| `commands/generate.md`, `agents/code-generator-infra.md`, `skills/poui-code-generation/SKILL.md` | tipos `smartx` e `smartx-browse` |
| `commands/lint.md` | seção "Fontes Protheus (.prw/.tlpp) — Smart X" |
| `commands/review.md`, `agents/code-reviewer.md` | foco `smartx` |
| `.claude-plugin/marketplace.json`, `README.md`, `CHANGELOG` | contagem 31 → 33 templates, novos tipos |
| `scripts/test-plugin.js` | novo teste: regras SX numeradas e citadas em lint/review/extensão |

### Extensão
| Arquivo | Ação |
|---|---|
| `src/smartxLintRules.ts` | novo — regras determinísticas SX01..SX11 + fixes SX02/SX06 (latin1, preserva cp1252) |
| `src/smartxLint.ts` | novo — varre `.prw/.tlpp/.prx`, relatório |
| `src/smartxPromptBuilder.ts` | novo — prompts de gerar/migrar/revisar |
| `src/generateSmartx.ts` | novo — `poui.smartx` (gerar / migrar / revisar, com licença) e `poui.smartx.lint` (grátis, sem CLI) |
| `src/menuLogic.ts`, `src/extension.ts`, `package.json` | registrar comando |
| `scripts/sync-prompts.mjs` | copiar os novos arquivos de referência |
| `src/test/unit/smartxLintRules.test.ts`, `smartxPromptBuilder.test.ts`, `menuLogic.test.ts` | testes |

O Gerar Componente atual não é usado: ele exige `angular.json`, pergunta módulo Angular/endpoint e
roda `ng build`. Uma rotina Smart X é só TLPP, normalmente num repositório de fontes Protheus.

## Regras Smart X (lint determinístico + review)

| ID | Sev. | Regra | Fonte TDN |
|---|---|---|---|
| SX01 | ERROR | Legenda (array do `mBrowse`, `AddLegend`) com cor fora do de-para e sem cor PO-UI (`caption-tag-NN`/`color-NN`) em fonte com `setSmartX` → "Cor inválida para a legenda" | mBrowse/FWMBrowse, FAQ |
| SX02 | WARNING | `addOnChange` com contextos agrupados (`{"dataNew","dataEdit"}`) registrado em `addTriggers` → trigger não dispara em campo com X3_VALID | Validators/Triggers, FAQ |
| SX03 | ERROR | `addOnChange` com mais de um campo no array → framework exige 1 campo | Validators/Triggers |
| SX04 | ERROR | `setEvents(` no objeto de Interface → eventos só no Modelo | Adição de eventos |
| SX05 | WARNING | `setSmartX` sem `hasSmartX()` no fonte | Funções de contexto |
| SX06 | WARNING | `hasSmartX`/`setSmartX` sem `#include "fwmbrowse.ch"` | Funções de contexto |
| SX07 | WARNING | `SetFilterDefault` sem `@` em fonte com `setSmartX` | Mudança de comportamento |
| SX08 | WARNING | `DbSetFilter` em fonte com `setSmartX` (ignorado) | mBrowse/FWMBrowse |
| SX09 | INFO | `addValidators` substitui o X3_VALID do campo | Validators/Triggers |
| SX10 | WARNING | `BuildAdvplAction` com `setAction(` sem `setHasResponse(.T.)` | Validators/Triggers |
| SX11 | ERROR | `setSmartX(` (função) fora da função que chama o `mBrowse` → exceção | mBrowse |

## Padrões do código gerado (decisão: igual ao TDN)

- Includes como no TDN: `fw-tlpp-core.th`, `protheus.ch`, `totvs.framework.structure.model.th` /
  `totvs.framework.structure.Interface.th`; launcher `.prw` com `protheus.ch`.
- Launcher como no TDN (`function <ROTINA>SX()`), com nota: em RPO de cliente `Function` exige
  autorização TOTVS — usar `User Function` (≤ 8 chars) quando compilar fora do produto.
- Namespace no padrão TDN `<produto>.<modulo>.model` / `.interface`; custom usa `custom.<modulo>...`;
  PE: `custom.entrypoint.<...>`. Headers Protheus.doc com `@author Andre Costa` (padrão dos templates do plugin).
- Nomes de PE (`formPre`, `beforeCommitInTransaction`…) são fixos do framework e vivem em namespace
  TLPP — exceção documentada à regra de 10 caracteres.
- Chaves de `addObject`/`addArray`: o TDN diverge (página "Criação de um modelo" = filho → pai,
  breaking change; exemplos do FINA050 = pai → filho). Template segue filho → pai e avisa.
- `loadEventsFromMetadata()`: segundo "Criação de um modelo", eventos do dicionário carregam sozinhos;
  manter a chamada é inofensivo nos exemplos oficiais — template não chama e explica.

## Testes

- Plugin: `npm test` (`scripts/test-plugin.js`) — contagem de templates, frontmatter, novo teste SX.
- Extensão: `npm run test:unit` — regras SX01..SX11 com casos positivos e negativos, fixes, runner, prompts, menu.

## Resultado (05/11/2026)

- Plugin: `node scripts/test-plugin.js` → 86 passaram, 0 falharam (teste [9] novo).
- Extensão: `npm run test:unit` → 571 passing; `tsc --noEmit` limpo.
- Blocos de código de templates e referência passam limpos pelo lint SX.
- Pendente: release (plugin 1.24.0 + gist `latest_version`; extensão 1.11.0 + `.vsix`) e `sync-to-cache.ps1`.
