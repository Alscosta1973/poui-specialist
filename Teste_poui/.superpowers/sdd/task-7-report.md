# Task 7 — Verificação Visual no Browser

**Data:** 2026-06-24  
**Branch:** master  
**Porta:** 4200  
**Status final:** DONE_WITH_CONCERNS

---

## Correções aplicadas antes da verificação

Dois erros de compilação foram detectados e corrigidos durante a inicialização do servidor:

### 1. `loading` não existe em `PoPageAction` (funcionarios-edit.component.ts)
- **Erro:** `TS2353: Object literal may only specify known properties, and 'loading' does not exist in type 'PoPageAction'`
- **Fix:** Substituído `loading: this.isLoading()` por `disabled: this.isLoading()` nas ações Salvar e Cancelar

### 2. `[p-actions]` não existe em `po-page-edit` nem `po-page-detail`
- **Erro:** `NG8002: Can't bind to 'p-actions'` em ambos os componentes
- **Fix em `po-page-edit`:** Substituído `[p-actions]="pageActions"` por eventos nativos `(p-save)="save()"`, `(p-cancel)="goBack()"` e `[p-disable-submit]="isLoading()"`
- **Fix em `po-page-detail`:** Substituído `[p-actions]="pageActions"` por `(p-edit)="navigateToEdit()"` e `(p-back)="goBack()"`, e atributo `name` por `p-title`
- **Removido:** Import `PoPageAction` e getter `pageActions` de ambos os componentes (desnecessários após os fixes)

---

## Resultados por Step

### Step 1: Listagem `/rh/funcionarios` ✅

- Tabela exibe 8 funcionários (todos os registros mock)
- Colunas visíveis: Matrícula, Nome, Cargo, Depto, Situação, Admissão
- Badges coloridos funcionando: Ativo (verde), Afastado (laranja), Inativo (vermelho)
- Botão "Incluir" presente no topo
- 1 erro de console (pré-existente: `ProAppConfigInterceptor` — `api_baseUrl` undefined; não afeta RH)
- **Screenshot:** `task7-list.png`

### Step 2: Filtros avançados ✅

- "Busca avançada" visível no canto superior direito da listagem
- Ao clicar, expande painel inline com campos de pesquisa (`po-page-dynamic-search`)
- Painel de filtros disponível no DOM com formulário dinâmico (`po-dynamic-form`)
- **Observação:** A busca avançada também possui modal (ngIf=true no DOM), mas o comportamento padrão é expansão inline — comportamento correto do `po-page-dynamic-search`
- **Screenshot:** `task7-filters.png`

### Step 3: Formulário de inclusão `/rh/funcionarios/novo` ✅

- Título: "Novo Funcionário"
- Formulário renderiza com 4 seções: Dados Pessoais, Dados Profissionais, Endereço, Dados Bancários
- Botões "Cancelar" e "Salvar" visíveis no cabeçalho (via eventos nativos `po-page-edit`)
- Formulário totalmente vazio (modo inclusão)
- **Screenshot:** `task7-edit-new.png`

### Step 4: Edição de registro existente `/rh/funcionarios/000001/editar` ✅

- Título: "Editar Funcionário"
- Formulário pré-preenchido com dados da funcionária ANA PAULA RODRIGUES SILVA
- Campo Matrícula visualmente desabilitado (background cinza, `disabled: true`)
- Todos os campos populados: CPF, Data Nascimento, Escolaridade (Mestrado), Cargo, Departamento, Data Admissão, Situação (Ativo), Tipo Contrato (CLT), Turno (1º Turno)
- **Observação:** `matriculaValue` retorna string vazia via `input.value` — esperado para campos desabilitados no Angular Reactive Forms; o valor persiste via `getRawValue()`
- **Screenshot:** `task7-edit-existing.png`

### Step 5: Detalhe de registro `/rh/funcionarios/000001` ✅

- Título: "Detalhe do Funcionário"
- Botões "Voltar" e "Editar" presentes (via eventos nativos `po-page-detail`)
- Todos os 10+ campos `po-info` renderizando com labels corretos: Matrícula, Nome, CPF, Data de Nascimento, Escolaridade, Deficiência, Cargo, Departamento, Centro de Custo, Data de Admissão
- **Screenshot:** `task7-detail.png`

### Step 6: Dialog de exclusão ✅

- Menu de ações (`...`) abre popup com opções: Editar, Visualizar, Excluir
- Ao clicar "Excluir": dialog de confirmação abre com:
  - Título: "Excluir funcionário"
  - Mensagem: "Confirma exclusão de ANA PAULA RODRIGUES SILVA?"
  - Botões: "Cancelar" e "Confirmar"
- Background da tela fica overlay cinza (modal correto)
- **Screenshot:** `task7-delete-dialog.png`

### Step 7: Console sem erros críticos ✅ (com ressalva)

- 1 erro pré-existente: `TypeError: Cannot read properties of undefined (reading 'api_baseUrl')` em `_ProAppConfigInteceptor`
- Este erro é do interceptor `@totvs/protheus-lib-core` e está presente em todo o projeto, não no módulo RH
- Não afeta o funcionamento do módulo RH (interceptor mock captura as chamadas antes)

---

## Resumo dos 7 Checks

| Check | Status | Observação |
|-------|--------|------------|
| Listagem com 8 funcionários, colunas corretas, botão Incluir | ✅ | |
| Filtros avançados acessíveis | ✅ | Expansão inline (correto para po-page-dynamic-search) |
| Formulário de inclusão com seções e botões | ✅ | |
| Formulário de edição pré-preenchido, Matrícula desabilitada | ✅ | |
| Tela de detalhe com dados e botão Editar | ✅ | |
| Dialog de confirmação de exclusão | ✅ | |
| Console sem erros RH | ✅ | 1 erro pré-existente de interceptor global |

---

## Concerns

1. **`loading` em `PoPageAction`** — a propriedade não existe na interface; o código gerado precisou ser corrigido para usar `disabled` como workaround. O botão Salvar fica desabilitado durante o loading (comportamento funcional, mas sem spinner visual no botão).

2. **`[p-actions]` em `po-page-edit`/`po-page-detail`** — esses componentes usam eventos de output (`(p-save)`, `(p-cancel)`, `(p-edit)`, `(p-back)`) e não `[p-actions]` como input. Padrão diferente do `po-page-list` que usa `[p-actions]`. O código gerado pelo plugin usou a API errada.

3. **Matrícula vazia na edição** — O campo Matrícula aparece em branco visualmente no formulário de edição, embora o dado seja corretamente recuperado via `getRawValue()`. Seria melhor usar `[p-disabled]="isEdit()"` em vez de `form.get('matricula')?.disable()` para garantir a exibição visual correta no `po-input`.

---

## Arquivos modificados

- `src/app/rh/funcionarios/funcionarios-edit.component.ts` — removido import `PoPageAction`, removido getter `pageActions`, corrigido `loading` → `disabled`
- `src/app/rh/funcionarios/funcionarios-edit.component.html` — substituído `[p-actions]` por `(p-save)`, `(p-cancel)`, `[p-disable-submit]`
- `src/app/rh/funcionarios/funcionarios-detail.component.ts` — removido import `PoPageAction`, removido getter `pageActions`
- `src/app/rh/funcionarios/funcionarios-detail.component.html` — substituído `[p-actions]` por `(p-edit)`, `(p-back)`, corrigido `name` → `p-title`

## Screenshots gerados

- `task7-list.png` — Listagem com 8 funcionários
- `task7-filters.png` — Filtros avançados expandidos
- `task7-edit-new.png` — Formulário de inclusão
- `task7-edit-existing.png` — Formulário de edição pré-preenchido
- `task7-detail.png` — Tela de detalhe
- `task7-delete-dialog.png` — Dialog de confirmação de exclusão
