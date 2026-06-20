---
name: poui-discover
description: Use before /generate-batch when you have a Protheus REST endpoint but no manifest — calls the endpoint with pageSize=1, inspects JSON fields, and generates a pre-filled manifest ready to review | © Andre Costa — uso restrito · https://github.com/Alscosta1973/poui-specialist
---

# PO-UI Discover — Auto-Discovery do Contrato Protheus

Descobre os campos de um endpoint REST Protheus e gera um manifesto pré-preenchido para uso com `/poui-specialist:generate-batch`.

## Uso

```
/poui-specialist:discover <caminho-relativo>
```

Exemplos:
```
/poui-specialist:discover /api/custom/v1/titulos
/poui-specialist:discover /api/custom/v1/parceiros
/poui-specialist:discover /rest/api/custom/v1/pedidos
```

O caminho pode incluir ou não o prefixo `/rest` — o plugin normaliza antes de chamar.

---

## Passo 1 — Localizar URL base

Buscar `proxy.conf.json` subindo até 3 níveis a partir do diretório atual:

```powershell
Get-ChildItem -Path . -Filter proxy.conf.json -Recurse -Depth 3 | Select-Object -First 1 FullName
```

**Se encontrado:** ler o arquivo JSON e extrair o `target` da primeira chave que o contenha:

```json
{ "/rest": { "target": "http://192.168.1.100:8084", "secure": false } }
```

→ `$baseUrl = "http://192.168.1.100:8084"`

**Se não encontrado ou sem campo `target`:** exibir e aguardar input do usuário:

```
⚠ Nenhum proxy.conf.json encontrado (ou sem "target" no formato esperado).
Informe a URL base do AppServer Protheus (ex: http://192.168.1.100:8084):
>
```

---

## Passo 2 — Chamar o endpoint

Normalizar o caminho para evitar `/rest/rest`:
- Se `$caminho` começa com `/rest` **e** `$baseUrl` termina com `/rest` → remover o `/rest` inicial do caminho
- Garantir exatamente um `/` de separação entre base e caminho

Montar a URL e chamar com `pageSize=1`:

```powershell
$url = $baseUrl.TrimEnd('/') + '/' + $caminho.TrimStart('/') + '?pageSize=1'
$response = Invoke-RestMethod -Uri $url -Method GET -TimeoutSec 10
```

Se a chamada lançar exceção → ir para **Tratamento de Erros** abaixo.

---

## Passo 3 — Inspecionar o response

**Detectar shape e extrair o primeiro item (`$item`):**

| Shape do response | Como extrair |
|---|---|
| `{ "items": [...], "hasNext": ... }` | `$item = $response.items[0]` |
| Array direto `[{...}]` | `$item = $response[0]` |
| Objeto plano `{ "codigo": ..., ... }` | `$item = $response` |

Se `$item` for nulo ou a lista estiver vazia → ir para **Lista vazia** no Tratamento de Erros.

**Para cada campo (propriedade) de `$item`, aplicar as regras:**

1. **Marcação `(req)`:** nome começa com `Cd`, `Cod` ou `Num` (case-insensitive) → campo obrigatório no page-edit
2. **REGRA de datepicker:** nome contém `Dt`, `Dat` ou `Data` (case-insensitive) → adicionar em REGRAS: `<campo>: usar po-datepicker`
3. **REGRA de moeda:** nome contém `Vl`, `Vlr`, `Val` ou `Valor` (case-insensitive) → adicionar em REGRAS: `<campo>: formatar como moeda BRL`

**Detectar chave composta:** se `$item` tem campos que combinam padrões `*cod*` + `*loj*` (ex: `codigo`+`loja`, `A1_COD`+`A1_LOJA`):
- Endpoint do page-edit: `/<entidade>/{codigo}/{loja}` em vez de `/<entidade>/{id}`
- Adicionar em REGRAS: `Chave composta: codigo + loja`

---

## Passo 4 — Gerar manifesto

**Inferir nome da entidade:** último segmento do caminho, em PascalCase:
- `/api/custom/v1/titulos` → entidade `Titulos` → classes `TitulosListComponent`, `TitulosEditComponent`, `TitulosService`
- `/api/custom/v1/contas-receber` → entidade `ContasReceber` → classes `ContasReceberListComponent`, `ContasReceberEditComponent`, `ContasReceberService`

**Campos para page-list:** todos os campos de `$item`, separados por vírgula.

**Campos para page-edit:** mesmos campos, com `(req)` anotado nos marcados no Passo 3.

Gerar o manifesto no seguinte formato:

```
MODULO: <modulo>
API_BASE: /rest/api/custom/v1
PASTA_DESTINO: src/app/<modulo>

COMPONENTES:
| tipo      | classe                      | endpoint                 | campos                      |
|-----------|-----------------------------|--------------------------|------------------------------|
| page-list | <Entidade>ListComponent     | /<entidade>              | <campos-list>                |
| page-edit | <Entidade>EditComponent     | /<entidade>/{id}         | <campos-edit>                |
| service   | <Entidade>Service           | /<entidade>              | -                            |

REGRAS:
<regras-inferidas>
```

> `MODULO` e `PASTA_DESTINO` usam `<modulo>` como placeholder — substitua pelo módulo real antes de confirmar (ex: `financeiro/titulos`).

Se nenhuma regra foi inferida, usar `- Sem regras inferidas automaticamente`.

---

## Passo 5 — Exibir e confirmar

Exibir o manifesto e perguntar:

```
Manifesto gerado a partir de GET <url>

<manifesto completo>

Ajuste MODULO e PASTA_DESTINO conforme necessário, então confirme.
Deseja gerar os componentes agora? [S/n]
```

- **S** (ou Enter): invocar `/poui-specialist:generate-batch` passando o manifesto exatamente como exibido
- **n**: encerrar com:
  ```
  Manifesto pronto. Quando quiser gerar, use:
  /poui-specialist:generate-batch
  <cole o manifesto acima>
  ```

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
❌ Não foi possível acessar <url>
   Status: <código> <mensagem>

Verifique se o AppServer Protheus está rodando e se o caminho está correto.
Dica: teste no Postman ou curl antes de usar o /discover.
```

### Falha de conexão (timeout / connection refused)

```
❌ Sem resposta de <url>
   Erro: <mensagem do erro de rede>

Verifique se o AppServer está ativo na URL configurada em proxy.conf.json.
```
