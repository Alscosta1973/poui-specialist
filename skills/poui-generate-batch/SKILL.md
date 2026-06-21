---
name: poui-generate-batch
description: Use to generate multiple PO-UI components in one command — parses a structured manifest and dispatches one isolated subagent per component, keeping token cost fixed regardless of session length | © Andre Costa — uso restrito · https://github.com/Alscosta1973/poui-specialist
---

# PO-UI Generate Batch — Orquestrador de Geração em Lote

Gera múltiplos componentes Angular/PO-UI a partir de um manifesto estruturado, despachando um subagente isolado por componente para manter custo fixo de tokens independentemente do tamanho da sessão.

## Formato do Manifesto

```
MODULO: <pasta-feature/sub-pasta>
API_BASE: /rest/api/custom/v1
PASTA_DESTINO: src/app/<modulo>

CONTEXTO_PROJETO: (opcional — gerado por /poui-specialist:context)
  rotas: [rota-existente-1, rota-existente-2]
  servicos: [NomeService → /api/modulo/entidade]
  padrao: src/app/<modulo>/<entidade>/

COMPONENTES:
| tipo              | classe                  | endpoint        | campos                              |
|-------------------|-------------------------|-----------------|-------------------------------------|
| page-list         | {{Classe}}ListComponent | /recurso        | campo1, campo2, campo3              |
| page-edit         | {{Classe}}EditComponent | /recurso/{id}   | campo1(req), campo2(req), campo3    |
| service           | {{Classe}}Service       | /recurso        | -                                   |

REGRAS:
- <regra de negócio 1>
- <regra de negócio 2>
```

## Convenções

| Elemento | Significado |
|---|---|
| `(req)` após campo | Campo obrigatório no formulário |
| `-` em campos | Sem campos específicos — usar padrão do template |
| `REGRAS:` | Apenas regras que afetam código gerado (status, formatação, validações) |

## Tipos Válidos

`page-list` · `page-edit` · `page-detail` · `page-dynamic-search` · `page-dynamic` · `modal-crud` · `stepper-form` · `master-detail` · `stacked-browse` · `two-panel-browse` · `action-list` · `service` · `dashboard`

## Seção ACOES: (obrigatória para `action-list`)

Quando o manifesto contém um componente do tipo `action-list`, a seção `ACOES:` define cada ação procedural:

```
ACOES:
- id: <id-unico> | label: <Rótulo> | icon: <po-icon-*> | mode: <single|multi> | campoChave: <campo>
  endpoint: <endpoint-relativo>
  modal_title: <Título do Modal>
  modal_message: <Mensagem com {{campo}} ou {{_count}}>
  danger: <true|false>
```

| Campo | Descrição |
|---|---|
| `id` | Chave única da ação (usada no `actionLoading` map) |
| `label` | Rótulo do botão |
| `icon` | Ícone PO-UI (`po-icon-*`) |
| `mode` | `single` = opera na linha clicada (vira `PoTableAction`); `multi` = opera na seleção (vira `PoPageAction`) |
| `campoChave` | Campo primário do modelo para montar o payload do POST |
| `endpoint` | Endpoint relativo ao `API_BASE` para o POST |
| `modal_title` | Título do `po-modal` de confirmação |
| `modal_message` | Mensagem com interpolação: `{{campo}}` = valor da linha; `{{_count}}` = número de linhas selecionadas (somente `multi`) |
| `danger` | `true` aplica `type: 'danger'` no botão |

A seção `ACOES:` é passada integralmente no bloco `Regras de negócio:` do prompt do subagente.

## Processo

### Passo 1 — Validar manifesto

Antes de despachar qualquer subagente, verificar:
1. `PASTA_DESTINO` existe no sistema de arquivos
2. Todos os `tipo` na tabela são valores da lista de Tipos Válidos acima
3. Todos os `endpoint` começam com `/`

Se qualquer validação falhar, reportar o erro e encerrar sem gerar código.

### Passo 2 — Despachar subagente por componente

Para cada linha da tabela `COMPONENTES`, montar o prompt do subagente:

```
Gere um componente PO-UI Angular 17+ com as seguintes especificações:

Tipo: <tipo>
Classe: <classe>
Endpoint: <API_BASE><endpoint>
Módulo: <MODULO>
Pasta destino: <PASTA_DESTINO>
Campos: <campos>
  - Campos marcados com (req) são obrigatórios no formulário

Regras de negócio:
<REGRAS>

Contexto do projeto (incluir somente se CONTEXTO_PROJETO estiver presente no manifesto):
<CONTEXTO_PROJETO>

Salve todos os arquivos gerados em PASTA_DESTINO.
```

> **Para o orquestrador:** substituir `<CONTEXTO_PROJETO>` pelo bloco real do manifesto antes de despachar o subagente. Se não houver `CONTEXTO_PROJETO:` no manifesto, remover as duas linhas "Contexto do projeto" e `<CONTEXTO_PROJETO>` do prompt.

Despachar como subagente `poui-specialist:code-generator`.

**Importante:** Despachar UM subagente por vez, aguardar conclusão antes de despachar o próximo. Não despachar em paralelo — cada componente pode depender do service gerado anteriormente.

### Passo 3 — Registrar resultado de cada componente

Para cada componente, registrar:
- ✅ Sucesso: listar arquivos gerados com caminho completo
- ⚠️ Aviso: subagente concluiu mas reportou problema (falha de lint, arquivo existente sobrescrito etc.)
- ❌ Falha: subagente falhou — registrar erro e continuar com o próximo componente

### Passo 4 — Relatório final

Após concluir todos os componentes, exibir:

```
## Relatório de Geração em Lote

Módulo: <MODULO>
Pasta: <PASTA_DESTINO>

| Componente           | Status | Arquivos gerados                      |
|----------------------|--------|---------------------------------------|
| <classe>             | ✅     | <lista de arquivos com caminho>       |

Total: X gerados · Y com aviso · Z com falha
```

### Passo 5 — Verificação de build

Após o relatório de geração em lote, invocar automaticamente a skill `/poui-specialist:build-fix` para compilar todos os componentes gerados e corrigir erros TypeScript/template. Não perguntar ao usuário.
