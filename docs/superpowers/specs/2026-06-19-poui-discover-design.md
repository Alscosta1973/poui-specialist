# poui-discover — Auto-Discovery do Contrato Protheus

**Date:** 2026-06-19
**Status:** Aprovado
**Scope:** Nova skill `/poui-specialist:discover` que chama um endpoint REST Protheus, inspeciona o response e gera um manifesto pré-preenchido para uso com `/poui-specialist:generate-batch`

---

## Contexto e Motivação

O principal atrito no uso do `/poui-specialist:generate-batch` é escrever o manifesto manualmente: o usuário precisa listar os campos do endpoint sem nenhuma ajuda do plugin. Em projetos Protheus, os campos já estão definidos no backend — basta chamar o endpoint uma vez para descobri-los.

Nenhum gerador de código para Protheus/PO-UI faz isso hoje. A skill `/poui-specialist:discover` elimina completamente a etapa manual de inventário de campos.

---

## Arquivos

| Ação | Arquivo |
|------|---------|
| Criar | `skills/poui-discover/SKILL.md` |
| Modificar | `commands/generate.md` — adicionar referência cruzada para `/discover` |
| Sync | `sync-to-cache.ps1` — incluir após qualquer alteração nas skills |

---

## Comando

```
/poui-specialist:discover <caminho-relativo>
```

**Exemplos:**
```
/poui-specialist:discover /api/custom/v1/titulos
/poui-specialist:discover /api/custom/v1/parceiros
/poui-specialist:discover /rest/api/custom/v1/pedidos
```

O caminho pode incluir ou não o prefixo `/rest` — o plugin normaliza antes de chamar.

---

## Fluxo Completo

### Passo 1 — Localizar URL base

1. Buscar `proxy.conf.json` a partir da raiz do projeto Angular (subindo até 3 níveis)
2. Se encontrado: extrair o valor de `"/rest".target` (ou a primeira chave com `target`)
3. Se não encontrado: exibir prompt e aguardar entrada do usuário:

```
⚠ Nenhum proxy.conf.json encontrado.
Informe a URL base do AppServer Protheus (ex: http://192.168.1.100:8084):
>
```

### Passo 2 — Chamar o endpoint

Montar a URL completa e fazer `GET` com `pageSize=1`:

```
GET <base><caminho>?pageSize=1
```

Normalização do caminho:
- Se `<caminho>` já começa com `/rest` e `<base>` termina com `/rest` → remover duplicata
- Garantir que o separador entre base e caminho seja exatamente `/`

### Passo 3 — Inspecionar o response

**Detectar shape:**

| Shape do response | Interpretação |
|---|---|
| `{ "items": [...], "hasNext": ... }` | Lista — usar `items[0]` para extrair campos |
| Array direto `[{...}]` | Lista alternativa — usar `[0]` |
| Objeto plano `{ "codigo": ..., ... }` | Detalhe — usar o objeto diretamente |

**Extrair campos do primeiro registro** e para cada campo:

| Tipo JSON do valor | Classificação |
|---|---|
| `string` | campo de texto |
| `number` com `.` | valor decimal/monetário |
| `number` inteiro | código ou quantidade |
| `boolean` | flag |
| `null` | tipo desconhecido — incluir sem classificação |

**Inferências por nome de campo** (case-insensitive):

| Padrão no nome | Inferência |
|---|---|
| Começa com `Cd`, `Cod`, `Num` | Marcar como `(req)` no page-edit |
| Contém `Dt`, `Dat`, `Data` | Adicionar REGRA: `usar po-datepicker` |
| Contém `Vl`, `Vlr`, `Val`, `Valor` | Adicionar REGRA: `formatar como moeda BRL` |

**Detectar chave composta:**

Se o response contém simultaneamente campos com padrões `*cod*`+`*loj*` (ex: `codigo`+`loja`, `A1_COD`+`A1_LOJA`):
- Endpoint de detalhe: `/<caminho>/{codigo}/{loja}`
- Endpoint de edição: idem
- REGRA adicionada ao manifesto: `Chave composta: codigo + loja`

### Passo 4 — Gerar manifesto pré-preenchido

Tripla padrão gerada automaticamente:

```
MODULO: <inferido do caminho — ex: financeiro/titulos>
API_BASE: /rest/api/custom/v1
PASTA_DESTINO: src/app/<modulo>

COMPONENTES:
| tipo      | classe               | endpoint         | campos                                      |
|-----------|----------------------|------------------|---------------------------------------------|
| page-list | <Entidade>ListComponent | /<entidade>   | <todos os campos descobertos>               |
| page-edit | <Entidade>EditComponent | /<entidade>/{id} | <campos com (req) inferidos>             |
| service   | <Entidade>Service    | /<entidade>      | -                                           |

REGRAS:
<regras inferidas de datas e moedas>
```

**Inferência do nome da entidade:** último segmento do caminho, em PascalCase.
- `/api/custom/v1/titulos` → entidade `Titulos`, classe `TitulosListComponent`
- `/api/custom/v1/contas-receber` → entidade `ContasReceber`, classe `ContasReceberListComponent`

**Inferência do módulo:** o plugin não consegue inferir o módulo de negócio a partir do endpoint. Preencher com `<modulo>` como placeholder — o usuário ajusta antes de confirmar.

### Passo 5 — Exibir e confirmar

Exibir o manifesto gerado e perguntar:

```
Manifesto gerado a partir de GET <URL>

<manifesto>

Deseja gerar os componentes agora? [S/n]
```

- Se **S**: despachar `/poui-specialist:generate-batch` passando o manifesto exatamente como exibido
- Se **n**: encerrar com instrução de como chamar generate-batch manualmente depois

---

## Tratamento de Erros

### Lista vazia

```
⚠ O endpoint retornou lista vazia — sem registros para inspecionar campos.

Opções:
  1. Tente com um endpoint que tenha ao menos um registro cadastrado
  2. Monte o manifesto manualmente com /poui-specialist:generate-batch
```

### Erro HTTP (4xx / 5xx)

```
❌ Não foi possível acessar <URL>
   Status: <código> <mensagem>

Verifique se o AppServer Protheus está rodando e se o caminho está correto.
Dica: teste no Postman ou curl antes de usar o /discover.
```

### Falha de conexão (timeout / connection refused)

```
❌ Sem resposta de <URL>
   Erro: Connection refused / Request timeout

Verifique se o AppServer está ativo na URL configurada em proxy.conf.json.
```

### proxy.conf.json com formato inesperado

Se o arquivo existe mas não tem o campo `target` no formato esperado:
```
⚠ proxy.conf.json encontrado mas não contém "target" no formato esperado.
Informe a URL base do AppServer Protheus (ex: http://192.168.1.100:8084):
>
```

---

## Integração com generate.md

Adicionar no `commands/generate.md`, na seção "Geração em Lote", uma linha de referência:

```markdown
Para descobrir os campos automaticamente a partir de um endpoint, use primeiro
`/poui-specialist:discover /api/custom/v1/<entidade>` — o plugin chama o endpoint,
inspeciona os campos e gera o manifesto pronto para revisão.
```

---

## Checklist de Validação

- [ ] Lê `proxy.conf.json` corretamente e extrai `target`
- [ ] Pede URL base quando `proxy.conf.json` não existe
- [ ] Chama `GET <url>?pageSize=1` e processa o response
- [ ] Extrai campos de `items[0]` quando response é lista Protheus padrão
- [ ] Marca `(req)` em campos com prefixo Cd/Cod/Num
- [ ] Adiciona REGRA de datepicker para campos com Dt/Dat
- [ ] Adiciona REGRA de moeda para campos com Vl/Vlr/Val
- [ ] Detecta padrão chave composta codigo + loja
- [ ] Gera tripla page-list + page-edit + service como padrão
- [ ] Exibe manifesto e pergunta se quer gerar
- [ ] Se confirmado, despacha generate-batch com o manifesto
- [ ] Trata lista vazia com mensagem clara
- [ ] Trata erros HTTP com status e instrução
- [ ] Trata falha de conexão com instrução
