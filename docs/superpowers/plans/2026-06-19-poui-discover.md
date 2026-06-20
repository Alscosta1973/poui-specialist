# poui-discover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar a skill `/poui-specialist:discover` que chama um endpoint REST Protheus, inspeciona o JSON e gera um manifesto pré-preenchido para uso com `generate-batch`.

**Architecture:** Uma única skill markdown (`skills/poui-discover/SKILL.md`) com fluxo de 5 passos: localizar URL base via `proxy.conf.json`, chamar o endpoint com `pageSize=1`, inspecionar campos do response, gerar manifesto com tripla page-list + page-edit + service, confirmar e despachar `generate-batch`. Atualização pontual em `commands/generate.md` para referência cruzada.

**Tech Stack:** Markdown skill file, PowerShell (`Invoke-RestMethod`), plugin cache sync via `sync-to-cache.ps1`

## Global Constraints

- Plugin repo: `C:\TOTVS\Projetos\Claude\poui-specialist`
- Skill nova em: `skills/poui-discover/SKILL.md`
- Frontmatter obrigatório com `name: poui-discover` e `description:` de uma linha
- Após qualquer alteração em `skills/` ou `commands/`, executar `sync-to-cache.ps1` antes de commitar
- Commits: conventional commits (`feat(skill):`, `docs(commands):`) sem co-author
- Autor: Andre Costa

---

### Task 1: Criar `skills/poui-discover/SKILL.md`

**Files:**
- Create: `skills/poui-discover/SKILL.md`

**Interfaces:**
- Consumes: nada (skill autônoma)
- Produces: skill `/poui-specialist:discover` disponível no plugin — invoca `/poui-specialist:generate-batch` ao confirmar

- [ ] **Step 1: Criar o diretório e o arquivo**

```powershell
New-Item -ItemType Directory -Path "C:\TOTVS\Projetos\Claude\poui-specialist\skills\poui-discover" -Force
```

- [ ] **Step 2: Escrever o conteúdo completo do SKILL.md**

Criar `C:\TOTVS\Projetos\Claude\poui-specialist\skills\poui-discover\SKILL.md` com o seguinte conteúdo **verbatim**:

````markdown
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
````

- [ ] **Step 3: Verificar que todas as seções obrigatórias estão presentes**

```powershell
$file = "C:\TOTVS\Projetos\Claude\poui-specialist\skills\poui-discover\SKILL.md"
$content = Get-Content $file -Raw

$checks = @(
    "name: poui-discover",
    "proxy.conf.json",
    "pageSize=1",
    "items\[0\]",
    "\(req\)",
    "po-datepicker",
    "moeda BRL",
    "codigo.*loja",
    "page-list",
    "page-edit",
    "service",
    "Deseja gerar os componentes agora",
    "generate-batch",
    "Lista vazia",
    "Erro HTTP"
)

$failed = @()
foreach ($check in $checks) {
    if ($content -notmatch $check) { $failed += $check }
}

if ($failed.Count -eq 0) {
    Write-Host "✅ Todas as seções verificadas"
} else {
    Write-Host "❌ Seções ausentes:"
    $failed | ForEach-Object { Write-Host "  - $_" }
}
```

Esperado: `✅ Todas as seções verificadas`

- [ ] **Step 4: Sincronizar cache**

```powershell
& "C:\TOTVS\Projetos\Claude\poui-specialist\sync-to-cache.ps1"
```

Esperado: linhas `OK  skills` para ambas as versões (1.0.0 e 1.3.0) e `Sincronizacao concluida.`

- [ ] **Step 5: Commitar**

```powershell
git -C "C:\TOTVS\Projetos\Claude\poui-specialist" add skills/poui-discover/SKILL.md
git -C "C:\TOTVS\Projetos\Claude\poui-specialist" commit -m "feat(skill): adicionar poui-discover — auto-discovery do contrato REST Protheus"
```

---

### Task 2: Atualizar `commands/generate.md` com referência ao `/discover`

**Files:**
- Modify: `commands/generate.md` — adicionar 3 linhas antes do final da seção "Geração em Lote"

**Interfaces:**
- Consumes: `skills/poui-discover/SKILL.md` criada na Task 1 (referência cruzada)
- Produces: `commands/generate.md` com referência ao `/discover`

O arquivo `commands/generate.md` tem atualmente (linhas 76–99) a seção "Geração em Lote" que termina com:

```
Consulte a [documentação de Otimização de Tokens](https://alscosta1973.github.io/poui-specialist-docs/docs/otimizacao-tokens) para o formato completo.
```

- [ ] **Step 1: Adicionar referência ao /discover no final da seção "Geração em Lote"**

Localizar a linha:
```
Consulte a [documentação de Otimização de Tokens](https://alscosta1973.github.io/poui-specialist-docs/docs/otimizacao-tokens) para o formato completo.
```

Substituir por:
```
Consulte a [documentação de Otimização de Tokens](https://alscosta1973.github.io/poui-specialist-docs/docs/otimizacao-tokens) para o formato completo.

Para descobrir os campos automaticamente a partir de um endpoint, use primeiro `/poui-specialist:discover /api/custom/v1/<entidade>` — o plugin chama o endpoint, inspeciona os campos e gera o manifesto pronto para revisão e geração.
```

- [ ] **Step 2: Verificar que a referência foi inserida**

```powershell
$file = "C:\TOTVS\Projetos\Claude\poui-specialist\commands\generate.md"
Select-String -Path $file -Pattern "poui-specialist:discover" | Select-Object -First 1
```

Esperado: linha contendo `/poui-specialist:discover`.

- [ ] **Step 3: Sincronizar cache**

```powershell
& "C:\TOTVS\Projetos\Claude\poui-specialist\sync-to-cache.ps1"
```

Esperado: `OK  commands` para ambas as versões e `Sincronizacao concluida.`

- [ ] **Step 4: Verificar que o arquivo está no cache**

```powershell
$cached = "C:\Users\andre\.claude\plugins\cache\poui-specialist-marketplace\poui-specialist\1.3.0\skills\poui-discover\SKILL.md"
Test-Path $cached
```

Esperado: `True`

- [ ] **Step 5: Commitar e fazer push**

```powershell
$repo = "C:\TOTVS\Projetos\Claude\poui-specialist"
git -C $repo add commands/generate.md
git -C $repo commit -m "docs(commands): referenciar poui-discover na seção de geração em lote"
git -C $repo push origin master
```

Esperado: push bem-sucedido sem erros.
