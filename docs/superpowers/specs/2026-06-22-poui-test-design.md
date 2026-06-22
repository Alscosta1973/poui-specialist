# poui-test — Design Spec
**Data:** 2026-06-22
**Escopo:** poui-specialist — skill de geração de testes unitários Karma + Jasmine para todos os tipos de componente

---

## Contexto

O plugin gera componentes PO-UI com qualidade verificada pelo `/quality`, mas não gera testes. O `/test` fecha esse ciclo: dado um componente já gerado, produz um `*.component.spec.ts` completo (smoke + comportamental + HTTP + router + modais) ao lado do componente.

---

## Abordagem escolhida

**Templates em camadas (Opção B):** `templates-test-base.md` com boilerplate compartilhado + 5 arquivos de família. ~6 arquivos em vez de 14 individuais — sem duplicação de TestBed/spy setup, agrupamento natural por padrão de teste.

---

## Arquitetura

### Novo diretório: `skills/poui-test/`

| Arquivo | Papel |
|---------|-------|
| `SKILL.md` | Skill principal — 5 passos, mapeamento tipo→família, placeholders |
| `templates-test-base.md` | Boilerplate: TestBed, `jasmine.createSpyObj`, `HttpClientTestingModule`, `RouterTestingModule` |
| `templates-test-list.md` | Família list: page-list, page-dynamic-search, page-dynamic |
| `templates-test-form.md` | Família form: page-edit, modal-crud, stepper-form |
| `templates-test-detail.md` | Família detail: page-detail |
| `templates-test-complex.md` | Família complex: master-detail, stacked-browse, two-panel-browse, action-list |
| `templates-test-other.md` | Família other: dashboard, service |

### Arquivos modificados

| Arquivo | Mudança |
|---------|---------|
| `commands/generate.md` | Adiciona referência ao `/test` após nota de `/quality` |
| Agent definition | Registra `poui-test` como agente no plugin |

---

## Invocação

```bash
/poui-specialist:test TitulosListComponent --module financeiro/titulos
```

O agente localiza `src/app/<module>/<kebab>/<kebab>.component.ts`, lê o arquivo existente para identificar serviços/signals/imports, escolhe a família e gera `<kebab>.component.spec.ts` no mesmo diretório.

---

## Fluxo de execução — 5 passos do SKILL.md

1. **Parse** — extrai `<ComponentClass>` e `--module`; monta path `src/app/<module>/<kebab>/<kebab>.component.ts`
2. **Read** — lê o `.component.ts`: identifica `ServiceClass`, signals, imports PO-UI, uso de `Router`, `PoNotificationService`, modais; determina a família
3. **Load templates** — carrega `templates-test-base.md` + template da família
4. **Generate** — substitui placeholders e escreve `<kebab>.component.spec.ts`
5. **Run** — executa `ng test --include=<path> --watch=false`; exibe relatório (passed / failed / skipped)

---

## Conteúdo dos testes por família

### Base (compartilhado)

```typescript
TestBed.configureTestingModule({
  imports: [ComponentClass, HttpClientTestingModule, RouterTestingModule],
  providers: [{ provide: ServiceClass, useValue: jasmine.createSpyObj(...) }]
})
// fixture.detectChanges() inicial; afterEach: httpMock.verify()
```

### Família list (page-list, page-dynamic-search, page-dynamic)

1. Cria componente sem crash
2. `ngOnInit` → GET `?page=1` → flush items → `items()` atualizado
3. `loading()` true durante request, false após
4. Empty state: flush `[]` → texto de estado vazio visível
5. Error state: HTTP 500 → `po-notification` com `type: 'danger'`
6. Filtro: campo preenchido → novo GET com `?q=valor`
7. `hasNext: true` → botão "Carregar mais" habilitado; `loadMore()` → GET com `page=2`

### Família form (page-edit, modal-crud, stepper-form)

1. Cria componente sem crash
2. Carrega item por `:id` → GET → form preenchido
3. Submit válido → POST/PUT → notification success → `router.navigate` (page-edit) ou modal fechado (modal-crud)
4. Campos obrigatórios vazios → form inválido → submit desabilitado

### Família detail (page-detail)

1. Cria sem crash; GET por route param → campos exibidos
2. Botão "Editar" → `router.navigate(['edit'])` chamado
3. Botão "Excluir" → confirmação → DELETE → `router.navigate` back

### Família complex (master-detail, stacked-browse, two-panel-browse, action-list)

1. Cria sem crash; load inicial
2. Seleção de linha → signal atualizado (`selectedRows()` / `selectedLeft()` / `selectedRight()`)
3. **action-list:** botão de ação → modal de confirmação aberto → confirm → POST → modal de resultado
4. **two-panel-browse:** seleção em ambos os painéis → botão confirmar habilitado
5. **stacked-browse:** signal `activeBrowse` alterna via Tab

### Família other (dashboard, service)

- **Dashboard:** GET de KPIs → `po-widget` valores atualizados
- **Service:** cada método (`getAll`, `getById`, `create`, `update`, `delete`) → verifica método HTTP, URL e body

---

## Integração no workflow

- **Sem integração automática** — o `/test` é sempre sob demanda; o `/generate` não o chama
- **Referência leve** em `generate.md` após a nota de `/quality`:
  > Para gerar testes unitários completos (Karma + Jasmine), use `/poui-specialist:test <ComponentClass> --module <module>`.

---

## Runner e setup esperado

- **Karma + Jasmine** (padrão `ng new`, sem Jest)
- `HttpClientTestingModule` + `HttpTestingController` para asserções HTTP
- `RouterTestingModule` para navegação
- `jasmine.createSpyObj` para mock de serviços

---

## Placeholders

Mesmos do `poui-code-generation`:

| Placeholder | Exemplo |
|-------------|---------|
| `{{ComponentClass}}` | `TitulosListComponent` |
| `{{kebab-name}}` | `titulos-list` |
| `{{ServiceClass}}` | `TitulosService` |
| `{{serviceFile}}` | `titulos` |
| `{{apiPath}}` | `/rest/api/custom/v1/titulos` |
| `{{moduleName}}` | `financeiro/titulos` |

---

## Critérios de sucesso

1. `/poui-specialist:test TitulosListComponent --module financeiro/titulos` gera spec sem intervenção manual
2. Spec gerado passa `ng test --watch=false` sem modificações
3. Cobre os 7 cenários da família list (e equivalentes por família)
4. Funciona para os 13 tipos de componente testáveis (todos exceto refactor)

---

## Fora do escopo

- Geração de testes e2e (Cypress/Playwright)
- Integração com Jest
- Cobertura de código (Istanbul/nyc) — a configuração é responsabilidade do projeto
- Testes para `refactor` — conteúdo variável demais para template fixo
- Testes para `module` — scaffold de aplicação, não componente testável
- Testes para `models` — interfaces TypeScript puras, sem runtime
- Testes para `tlpp-contract` — skeleton backend ADVPL/TLPP, fora do Angular
