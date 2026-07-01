# SDD Progress — RH Funcionários Wave 1

Plan: docs/superpowers/plans/2026-06-24-rh-funcionarios-crud.md
Branch start commit: 4b3a6207831a106a5b8236cb0d1af599e6bb8e31

## Tasks

- [x] Task 1: Model + Service (via plugin) — commit 5e7c123, review clean. Minor: tenantId hardcoded, FuncionariosParams sem spec explícita, filial inconsistente entre métodos
- [x] Task 2: Mock Interceptor (manual) — commit c228011, review clean. Minor: fallback implícito no GET detalhe, req.body cast genérico, hasNext nunca true com 8 mocks
- [x] Task 3: Funcionários List (via plugin) — commits efabc3d+da0c620, review clean após fix. Critical: departamento/filial mismatch em onAdvancedSearch; Important: takeUntilDestroyed ausente no delete
- [x] Task 4: Funcionários Edit (via plugin) — commit 4415505, review aprovado. Minor: getters breadcrumb/pageActions poderiam ser computed(); dirty tracking no cancel fora do spec
- [x] Task 5: Funcionários Detail (via plugin) — commit 1cd2714, review clean, zero findings
- [x] Task 6: Registrar rotas — commit 9136694, review clean, 4 rotas corretas em ordem
- [x] Task 7: Verificação no browser — 7/7 checks ✅, 3 bugs corrigidos (commit df67fff): po-page-edit/detail usam eventos nativos; matricula usa [p-disabled]. Plugin code-gen bug: loading em PoPageAction não existe (→ disabled workaround)
- [x] Task 8: Testes (via plugin) — commit 731c7f5, 35/35 passando, review approved. Important: deleteRecord error test não valida que reload não é chamado; remove() deveria estar no createSpyObj inicial

## Wave 2 — Tech Debt

- [x] Wave 2 Task 1: Spec FuncionariosEditComponent — commits bdbe920..bd23dbc, review clean. 15/15 testes. Fix: notificationSpy suite-level, router.navigate em update path, erro-carregamento assertion.
- [x] Wave 2 Task 2: Refatorar EditComponent — commit bd23dbc..1039113, review clean. breadcrumb=computed(), finalize() em loadFuncionario. Bug plugin: PO-UI não faz auto-unwrap de signals — template precisa breadcrumb() explícito.
- [x] Wave 2 Task 3: Spec FuncionariosDetailComponent — commit 1039113..0eae618, review clean. 18/18 testes. configure() helper para spy antes de detectChanges em testes de navegação no ngOnInit.
- [x] Wave 2 Task 4: Fix escape/unescape — commit 0eae618..8218563, review clean. TextDecoder('iso-8859-1'), err: unknown, decode() helper sem duplicação.
- [x] Wave 2 Task 5: TENANT_ID InjectionToken — commit 8218563..4381229, review clean. 68/68 testes, build limpo.
- [x] Wave 2 Fix final: finalize() no detail + edit spec isLoading + update error path — commit 4381229..77e3e47, re-review clean. 69/69 testes.

## Wave 2 — Concluída (commits bdbe920..77e3e47)
Branch pronto para merge. 69 testes passando.
Bug plugin descoberto: PO-UI @Input() não faz auto-unwrap de signals — template precisa signal() explícito (ex: breadcrumb()).
Tech debt para Wave 3 (minor): save() no edit ainda usa isLoading inline em vez de finalize().

## Revisão final — Wave 1 completa

Branch pronto para merge. Commits e6a5e15..3ceafbf (12 commits de produção).

Fixes obrigatórios aplicados (commit 3ceafbf):
- FuncionariosParams: adicionados departamento, admissaoDe, admissaoAte
- Interceptor: filtro por 'nome' (não 'q') — alinhado com service

Tech debt para Wave 2:
- Specs para FuncionariosEditComponent e FuncionariosDetailComponent
- breadcrumb como computed() no edit
- finalize() consistente no edit (loadFuncionario)
- tenantId via token de injeção
- escape/unescape deprecated no parseProtheusError

## Minor findings log
(accumulated during task reviews — presented to final reviewer)
