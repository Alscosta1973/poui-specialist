# Plugin Testing Strategy — poui-specialist

**Data:** 2026-06-24
**Objetivo:** Testar o plugin poui-specialist de forma progressiva usando um domínio novo (RH), sem reutilizar código dos projetos existentes (financeiro, faturamento, compras, ecommerce).

---

## Abordagens avaliadas

| # | Abordagem | Decisão |
|---|-----------|---------|
| 1 | Teste isolado por template — criar projeto Angular mínimo para cada template | Descartada — muito fragmentado |
| 2 | Reutilizar projetos existentes (Financeiro / Compras / Ecommerce) | Descartada — não testa o plugin com domínio novo |
| 3 | Domínio progressivo RH — um único domínio novo, waves incrementais | **Escolhida** |

---

## Waves de validação

Cada wave exercita templates do plugin ainda não testados, usando o módulo RH (`src/app/rh/`) como veículo.

| Wave | Template(s) do plugin | Feature RH | Status |
|------|-----------------------|------------|--------|
| **1** | `service`, `page-dynamic-search`, `page-edit`, `page-detail` | CRUD Funcionários | ✅ Concluída |
| **2** | — (tech debt Wave 1) | Specs EditComponent + DetailComponent, `computed()` breadcrumb, `finalize()`, `escape/unescape`, `TENANT_ID` token | ▶ Em andamento |
| **3** | `modal-crud` | Cadastro rápido de Departamento via modal inline | Pendente |
| **4** | `stepper-form` | Onboarding de novo funcionário em etapas | Pendente |
| **5** | `master-detail` | Departamento com lista de funcionários aninhada | Pendente |
| **6** | `stacked-browse` / `two-panel-browse` | Navegação hierárquica Filial → Depto → Funcionário | Pendente |
| **7** | `dashboard` | Painel de indicadores RH | Pendente |
| **8** | `action-list` | Processos em lote (ex: férias coletivas) | Pendente |
| **9** | `page-dynamic` | Formulário dinâmico por metadados | Pendente |

---

## Critérios de conclusão por wave

1. Build sem erros (`ng build`)
2. Verificação visual no browser (Playwright ou manual)
3. Testes Karma/Jasmine gerados via `/poui-specialist:test` e passando (green)
4. Bugs encontrados documentados e corrigidos no plugin antes de avançar

---

## Referências

- Plano Wave 1: `docs/superpowers/plans/2026-06-24-rh-funcionarios-crud.md`
- Design Wave 1: `docs/superpowers/specs/2026-06-24-rh-funcionarios-crud-design.md`
- Plano Wave 2: `docs/superpowers/plans/2026-06-25-rh-funcionarios-wave2.md`
