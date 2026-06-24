# Changelog

Todas as mudanças notáveis do plugin poui-specialist são documentadas aqui.

## [1.5.0] — 2026-06-24

### Added — Expansão de referência de componentes (Waves 4–10)

**Wave 4 — Campos de data/hora**
- `po-datepicker-range`: seleção de período com `p-start-date` / `p-end-date`
- `po-datetimepicker`: campo data + hora combinados
- `po-timepicker`: seletor de hora com painel flutuante de colunas

**Wave 5 — Chips, Árvore e Notificações**
- `po-chips`: campo de tags com `p-separator` e `(p-change): string[]`
- `po-tree-view` + `PoTreeViewItem`: navegação hierárquica com subItems e eventos de expansão
- `PoNotificationService`: 4 métodos (success/error/warning/information), interface `PoNotification`, action e duration

**Wave 6 — Busca, Menu Panel e Helper**
- `po-search`: busca com `p-search-type` (action/input), `p-filter-keys`, `(p-change-model)`
- `po-menu-panel`: navegação ícone-based compacta; comparação vs `po-menu`
- `po-helper`: ícone `?` com popover de ajuda contextual; alternativa via `p-help` no po-input

**Wave 7 — Template directives**
- `[p-combo-option-template]`: dropdown rico com avatar + nome + departamento + status tag
- `[p-multiselect-option-template]`: opções customizadas com cor + label + contagem
- `[p-list-view-content-template]`: card completamente personalizado com `po-info` em grid
- `[p-list-view-detail-template]`: detalhe master-detail expansível (ex: tabela de pedidos aninhada)

**Wave 8 — Serviços**
- `PoHttpInterceptorService`: loading overlay automático para HttpClient, suprimir por request via header
- `PoThemeService`: `changeCurrentTheme(light/dark)`, tema customizado com tokens HSL
- `PoI18nService`: `providePoI18n()` com contextos lazy-loaded, `getLiterals()` reativo por contexto

**Wave 9 — Componentes restantes**
- `po-breadcrumb`: componente visual standalone com `[p-items]`, integração via `[p-breadcrumb]` em page-edit
- `po-checkbox`: tabela de inputs enriquecida com `p-indeterminate` e `p-checkboxes-proportion`
- `po-page-login`: template de autenticação com `p-loading`, `p-custom-field`, integração Protheus

**Wave 10 — Template de cabeçalho do menu**
- `[p-menu-header-template]`: user card (avatar + nome + e-mail + papel) no cabeçalho do `po-menu`

### Changed
- `SKILL.md`: índices de Page, Navigation e Utilities atualizados com todos os novos componentes
- Repositório tornado **público** no GitHub — instalação sem necessidade de chave SSH ou conta

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
