# PO-UI Known Quirks — Índice

18 comportamentos documentados com diferenças de implementação, detalhes internos e overrides CSS
descobertos em uso de produção do PO-UI com Protheus.

## Arquivos por família

Carregar apenas a família relevante para o tipo de componente que está gerando:

| Família | Arquivo | Quando carregar |
|---|---|---|
| **OnPush / Change Detection** | `skills/poui-patterns/po-ui-quirks-onpush.md` | Qualquer componente com `po-page-*` ou `po-table` em OnPush |
| **po-table** | `skills/poui-patterns/po-ui-quirks-table.md` | `page-list`, `page-dynamic-search`, `master-detail`, `stacked-browse`, `two-panel-browse`, `action-list`, `dashboard` |
| **Forms / Inputs** | `skills/poui-patterns/po-ui-quirks-forms.md` | `page-edit`, `modal-crud`, `stepper-form`, `page-detail` |

---

## Quick Reference — 18 Known Quirks

| # | Componente / API | Sintoma | Família |
|---|---|---|---|
| 1 | po-page-content | Conteúdo invisível no load (OnPush + ng-content) | onpush |
| 2 | po-input | Botões 8px abaixo da borda do campo | forms |
| 3 | po-table | Scroll horizontal em painéis lado a lado | table |
| 4 | po-input | `NG8002` em `p-max-length` → usar `p-maxlength` | forms |
| 5 | po-table | Scrollbar de página aparece | table |
| 6 | po-table | Seleção nunca acumula (`p-selected-rows` não existe) | table |
| 7 | po-table | Coluna checkbox congela todas as colunas | table |
| 8 | po-table | `$selected: false` síncrono é ignorado | table |
| 9 | po-table | Sem navegação por teclado nativa (ArrowUp/Down) | table |
| 10 | po-table (dual) | Dois browses empilhados com nav independente | table |
| 11 | PoTableDetail | `width` não existe no tipo (TS2353) | table |
| 12 | po-table | Invisível no primeiro load em OnPush (sem `[p-height]`) | onpush |
| 13 | po-dynamic-form | `(p-value-change)` não existe — handler nunca chamado | forms |
| 14 | PO-UI @Input() | Signal não desembrulhada → `[object Object]` | onpush |
| 15 | po-stepper | `[p-current-active-step]` não existe (NG8002); `back()` não limpa 'done' | forms |
| 16 | po-table | Colunas numéricas sem `type` alinhadas à esquerda | table |
| 17 | po-decimal / po-number | Input numérico alinhado à esquerda em formulários | forms |
| 21 | po-table (detail) | Linhas de detalhe expandidas invisíveis em OnPush | onpush |

---

> Para detalhes completos, código de fix e exemplos, consultar o arquivo da família correspondente.
