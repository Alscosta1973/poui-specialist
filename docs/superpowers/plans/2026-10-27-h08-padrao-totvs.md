# Plano — H08 (po-combo filtrado) + Padrão visual TOTVS (plugin 1.18.0 / extensão 1.5.0)

Pedido do Andre em 27/10/2026. Origem: Monitor RCA (combo abria só com "Todos") e `P4_New/FFM/Padrao.docx`
(telas do Novo Gestor Financeiro FINA710 e da Análise de Crédito FINAPP001).

Decisões do Andre:
- Tamanho/fonte = **igual à TOTVS** (fonte do tema NunitoSans, tokens do tema sem redução; sem Open Sans).
- Depois do plugin, aplicar o padrão **também no RCA** (testes + `.app`).
- Release como a 1.17: commit + push + tag (gist `latest_version` fica com o Andre).

## Evidência (apps TOTVS extraídos em `protheus_data_CLI/http-root/app-root`)
- Shell FINAPP001: `po-toolbar [p-title]="<NOME> - v<versão>" [p-profile]="{avatar,title:displayName,subtitle:userName}"
  [p-profile-actions]="[{icon:'an an-sign-out',label:'Sair',type:'danger',separator:true,action}]"` +
  `po-menu #poMenu [p-logo] [p-menus] [p-collapsed]="true"`; `poMenu.collapse()` a cada `NavigationEnd`.
  Itens de menu com `label` + `shortLabel` + `icon: 'an an-*'`; FINA710 põe "Home" (`an an-house-line`) primeiro.
- Fontes: NunitoSans/Animalia do tema; `--font-size-default:1rem`, `--target-size-aaa:2.75rem` (sem override).
- Tabela: `p-striped`, `p-sort`, `p-height`, scroll infinito/show-more; colunas estreitas com `width:'100px'`
  (cabeçalho com reticências + tooltip nativo da po-table); status em `type:'label'` (tag colorida,
  `color-07` vermelho / `color-10|11` verde / `color-08` laranja); legenda em `type:'subtitle'` com `subtitles`
  (bolinha na célula + legenda no rodapé da tabela, nativo).
- Logos: `@totvs/common-assets/common-assets/logos/totvs/{totvs.svg,totvs-short-symbol.svg}`.

## Fase 1 — H08 lint (po-combo com valor sem p-remove-initial-filter)
- [x] `poui-vscode/src/lintRules.ts` H08 WARNING fixable: `<po-combo` com ligação de valor (`ngModel`,
      `formControlName`, `[formControl]`) e sem `p-remove-initial-filter`.
- [x] `lintFixes.ts` fixH08: insere `[p-remove-initial-filter]="true"`.
- [x] Testes unit (avisa / não avisa sem ligação / não avisa com atributo / fix + relint limpo).
- [x] `commands/lint.md`: H08 na tabela + seção de fix; quirk 19 aponta para H08.

## Fase 2 — Padrão TOTVS no plugin
- [x] `skills/poui-patterns/padrao-totvs.md` (shell, fontes, menu, tabela/legenda, cores) + índice no SKILL.md.
- [x] `commands/scaffold.md`: shell TOTVS (logo, versão, perfil, collapse), `styles.scss` sem Open Sans, assets dos logos.
- [x] `module-structure.md`, templates de lista (status `label`/`subtitle`), agentes geradores citam o padrão.
- [x] lint S01 (styles.scss com Open Sans / font-family / redução de tokens) e H09 (po-menu sem p-collapsed / sem p-logo).

## Fase 3 — Extensão
- [x] `scaffolding.ts` com os mesmos modelos; lint S01/H09 (lintRules + runLint lê `src/styles.scss|css`).
- [x] Testes unit + integração; README/CHANGELOG/DESENVOLVIMENTO.

## Fase 4 — Release
- [x] plugin 1.18.0 (CHANGELOG, README, troubleshooting/quickstart se couber), extensão 1.5.0 (.vsix), tag, push.

## Fase 5 — RCA
- [x] Shell TOTVS, fonte/tamanhos do tema, status/legenda nativos; Karma + E2E; `/poui-specialist:package`; compilar RPO; smoke.

## Status
Concluído em 27/10/2026: plugin v1.18.0 (tag), extensão 1.5.0 (.vsix em poui-vscode/), RCA a2a5a4e7 + 2894983e (logo FFM). Smoke no Protheus OK.
