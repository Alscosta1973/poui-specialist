# Feature 6 — action-list: Lista com Ações Procedurais Protheus

**Data:** 2026-06-21
**Status:** Aprovado — aguardando implementação
**Plugin:** poui-specialist v1.x

---

## Contexto e motivação

O plugin já cobre 9 tipos de componentes para CRUD e navegação. O padrão ausente é a **lista com ação procedural Protheus**: telas onde o usuário seleciona um ou mais registros e dispara uma operação de negócio no backend (baixar título, processar NF, confirmar pedido) que exige confirmação explícita, retorna resultado por linha e pode ter sucesso parcial.

O `page-list` atual tem `PoTableAction[]` com loading global e confirmação via `PoDialogService` — sem `po-modal`, sem loading isolado por botão, sem tratamento de resposta estruturada.

---

## Decisões de design

| Decisão | Escolha | Motivo |
|---|---|---|
| Novo tipo vs extensão de `page-list` | **Novo tipo `action-list`** | O plugin usa tipo como seletor 1:1 de template; adicionar lógica condicional ao `page-list` tornaria o template frágil |
| Quantidade de ações por tela | **N ações independentes** | Casos reais Protheus têm múltiplas operações por tela (ex: Regularizar + Revalidar) |
| Conteúdo do modal | **Texto fixo com interpolação de campos da linha** | Cobre o caso comum sem complexidade de formulário no modal |
| Formato de resposta | **Resposta estruturada por linha** | Operações Protheus frequentemente têm sucesso parcial — necessário mostrar o que falhou |
| Escopo de seleção | **Configurável por ação: `single` ou `multi`** | Algumas ações operam linha a linha, outras em lote |
| Arquitetura do componente | **Modal único + estado ativo (Abordagem B)** | Escala para N ações; HTML limpo; padrão idiomático Angular 17+ com signals |

---

## Manifest

### Sintaxe

```
COMPONENTES:
| tipo        | classe                 | endpoint            | campos                        |
|-------------|------------------------|---------------------|-------------------------------|
| action-list | TitulosListComponent   | /financeiro/titulos | numero, parceiro, valor, venc |
| service     | TitulosService         | /financeiro/titulos | -                             |

ACOES:
- id: baixar | label: Baixar Título | icon: po-icon-ok | mode: single
  endpoint: /financeiro/titulos/baixar
  modal_title: Confirmar Baixo
  modal_message: Confirma o baixo do título {{numero}} de {{parceiro}}?
  danger: false

- id: cancelar | label: Cancelar | icon: po-icon-close | mode: multi
  endpoint: /financeiro/titulos/cancelar
  modal_title: Cancelar Títulos
  modal_message: Confirma o cancelamento de {{_count}} título(s) selecionado(s)?
  danger: true
```

### Convenções de interpolação

| Token | Substituto | Disponível em |
|---|---|---|
| `{{campo}}` | Valor do campo na linha ativa | `single` e `multi` (usa primeira linha) |
| `{{_count}}` | Número de linhas selecionadas | `multi` |

### Campo `mode`

| Valor | Comportamento |
|---|---|
| `single` | Botão na coluna de ações da tabela; opera na linha clicada |
| `multi` | Botão na barra de ações da página; requer ao menos uma linha selecionada via checkbox |

---

## Arquitetura do componente

### Interfaces TypeScript

```typescript
interface ActionConfig {
  id: string;
  label: string;
  icon: string;
  mode: 'single' | 'multi';
  endpoint: string;
  modalTitle: string;
  modalMessage: string;         // template com {{campo}} ou {{_count}}
  danger?: boolean;
}

interface ActionDraft {
  config: ActionConfig;
  rows: ModelInterface[];       // [linha] para single, seleção para multi
  resolvedMessage: string;      // mensagem com interpolação já aplicada
}

interface ActionResponse {
  sucesso: number;
  falha: number;
  itens: ActionItemResult[];
}

interface ActionItemResult {
  id: string;
  status: 'ok' | 'erro';
  mensagem?: string;
}

interface ActionResultSummary extends ActionResponse {
  actionLabel: string;
}
```

### Signals adicionais (além do padrão page-list)

```typescript
readonly currentAction  = signal<ActionDraft | null>(null);
readonly actionLoading  = signal<Record<string, boolean>>({});
readonly actionResults  = signal<ActionResultSummary | null>(null);
readonly errorRows      = signal<Set<string>>(new Set());
```

### Actions geradas a partir do ActionConfig[]

- Ações `mode: 'single'` → entram em `tableActions: PoTableAction[]`
- Ações `mode: 'multi'` → entram em `pageActions: PoPageAction[]` com `disabled` quando nenhuma linha selecionada

---

## Fluxo de confirmação

```
Usuário clica na ação
        ↓
interpolateMessage(config, rows)
currentAction.set({ config, rows, resolvedMessage })
        ↓
po-modal de confirmação abre   (driven by currentAction() !== null)
        ↓
Usuário clica "Confirmar"
        ↓
actionLoading.update(m => ({ ...m, [config.id]: true }))
service.executarAcao(config.endpoint, payload).subscribe(...)
        ↓
    ┌── HTTP 200 ─────────────────────────────────────────────┐
    │  actionResults.set({ ...res, actionLabel: label })      │
    │  currentAction.set(null)                                │
    │  reload()                                               │
    │  falha === 0 → notification.success(...)                │
    │  falha  > 0 → modal de resultados abre                  │
    └─────────────────────────────────────────────────────────┘
    ┌── HTTP 4xx/5xx ─────────────────────────────────────────┐
    │  notification.error(parseProtheusError(err))            │
    │  currentAction.set(null)                                │
    └─────────────────────────────────────────────────────────┘
        ↓ (sempre)
actionLoading.update(m => ({ ...m, [config.id]: false }))
```

### Botões do modal de confirmação

| Botão | Ação | Estado |
|---|---|---|
| Confirmar | Executa a ação | `[p-loading]="actionLoading()[currentAction()?.config.id]"` / disabled enquanto carregando |
| Cancelar | `currentAction.set(null)` | Sempre habilitado |

---

## Resposta estruturada e exibição de resultados

### Contrato de resposta

O endpoint de ação deve retornar `ActionResponse`. Se o backend retornar HTTP 200 sem esse formato (endpoint legado), o componente trata como `{ sucesso: payload.ids.length, falha: 0, itens: [] }` — sem quebrar.

### Exibição pós-execução

**Sucesso total (`falha === 0`):**
- `notification.success("N registro(s) processado(s) com sucesso.")`
- Modal de confirmação fecha
- Tabela recarrega

**Sucesso parcial ou falha total (`falha > 0`):**
- Modal de resultados abre automaticamente
- Exibe resumo: `"X processado(s) · Y com erro"`
- `po-table` inline com colunas: `id`, `status` (label: ok=verde / erro=vermelho), `mensagem`
- Botão único: **Fechar** → `actionResults.set(null)`
- Linhas com erro são marcadas em `errorRows` para destaque visual na tabela principal

Os dois modais (confirmação e resultados) nunca ficam abertos simultaneamente.

### Payload enviado ao Protheus

| mode | payload |
|---|---|
| `single` | `{ [campoChave]: row[campoChave] }` |
| `multi` | `{ ids: rows.map(r => r[campoChave]) }` |

O `campoChave` é o primeiro campo listado no manifesto (convenção).

---

## Integração no plugin

### Arquivos novos

| Arquivo | Descrição |
|---|---|
| `skills/poui-code-generation/templates-action-list.md` | Template completo: `.ts` + `.html` + `.scss` + `model.ts` + método `executarAcao` no service |

### Arquivos modificados

| Arquivo | Mudança |
|---|---|
| `skills/poui-code-generation/SKILL.md` | Adicionar `action-list` na tabela de tipos com referência ao template |
| `skills/poui-generate-batch/SKILL.md` | Adicionar `action-list` nos Tipos Válidos + documentar sintaxe da seção `ACOES:` |
| `commands/generate.md` | Sugerir `action-list` quando o usuário descrever tela com ações procedurais |

### Arquivos não modificados

- `templates-page-list.md` e demais templates existentes — sem impacto

---

## Critérios de aceitação

1. O manifesto com `action-list` + `ACOES:` é validado pelo `generate-batch` sem erro
2. O template gerado compila sem erros com `ng build`
3. Ações `single` aparecem como `PoTableAction` na linha; `multi` como `PoPageAction` na barra
4. Botão de ação mostra spinner isolado enquanto processa (tabela não trava)
5. Modal de confirmação exibe mensagem com campos da linha interpolados corretamente
6. Resposta com `falha > 0` abre modal de resultados com tabela de itens
7. Resposta legada (HTTP 200 sem `ActionResponse`) não causa erro no componente
8. Dois modais nunca ficam abertos ao mesmo tempo
