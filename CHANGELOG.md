# Changelog

Todas as mudanças notáveis do plugin poui-specialist são documentadas aqui.

## [1.4.0] — 2026-06-23

### Added
- Comando `/poui-specialist:test`: gerador de `*.component.spec.ts` / `*.service.spec.ts` Karma + Jasmine
- Skill `poui-test` com 6 templates por família: `base`, `list`, `form`, `detail`, `complex`, `other`
- Skill `poui-preview`: abre componente gerado no browser via Angular dev server + Playwright (portas 4200–4209)
- Skill `poui-build-fix`: verificação de build automática com `ng build` após geração e correção de erros TypeScript/template
- Skill `poui-quality`: auditoria de qualidade pós-geração (boas práticas, acessibilidade, performance)
- Skill `poui-context`: geração codebase-aware com snapshot de projeto existente
- Skill `poui-discover`: auto-discovery de contrato Protheus a partir de fonte `.prw`/`.tlpp`
- Skill `poui-generate-batch`: geração em lote de múltiplos artifacts em sequência
- Skill `poui-screenshot`: captura de screenshot do componente gerado via Playwright

### Changed
- `commands/generate.md`: adicionado Passo 4 (verificação de build automática) e Passo 5 (preview no browser)

## [1.3.0] — 2026-06-11

### Fixed
- Corrige instrução incorreta de `p-selected-rows` no agent (não existe na biblioteca)
- Remove `'tag'` da lista de tipos válidos de `PoTableColumn` no agent
- Adiciona `stacked-browse` e `two-panel-browse` ao comando `/generate`
- Adiciona `deploy-protheus.md` ao índice da skill `poui-patterns`

### Added
- Tipos `models` e `tlpp-contract` listados no comando `/generate` com exemplos
- `CHANGELOG.md` (este arquivo)

## [1.2.0] — 2026-06-09

### Added
- Template `stacked-browse`: dois po-table empilhados com navegação por teclado (ArrowUp/Down, Tab)
- Template `two-panel-browse`: painéis lado a lado para conciliação/matching
- Template `refactor-from-tlpp`: converte `.prw`/`.tlpp` existente para PO-UI
- `po-ui-quirks.md` com 11 quirks documentados de produção
- `deploy-protheus.md`: build, pasta `.app`, rdmake, `appserver.ini`
- Template `tlpp-contract`: contrato REST backend com skeleton WsRestFul
- Template `models`: interfaces TypeScript (simples, chave composta, flat relational)

## [1.1.0] — 2026-06-03

### Added
- Skill `poui-components` com 9 arquivos de referência de componentes
- Skill `poui-patterns` com `module-structure.md`, `protheus-rest.md`, `reactive-forms.md`, `po-ui-quirks.md`
- Template `master-detail`: lista com linhas filho expansíveis via `po-table detail`
- Template `stepper-form`: formulário wizard multi-etapas com `po-stepper`
- Template `page-detail`: tela de detalhe read-only com rota `:id`
- Template `page-dynamic`: lista zero-boilerplate via `PoPageDynamicTableComponent`
- Template `dashboard`: página de analytics com `po-widget` + `po-chart`

## [1.0.0] — 2026-05-28

### Added
- Versão inicial do plugin
- Templates: `page-list`, `page-dynamic-search`, `page-edit`, `modal-crud`, `service`, `module`
- Skill `poui-code-generation` com guia de seleção de template e regras críticas
- Agent `code-generator` e `code-reviewer`
- Comandos `/generate`, `/review`, `/docs`
