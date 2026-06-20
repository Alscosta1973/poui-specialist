# poui-context Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar a skill `/poui-specialist:context` que escaneia `app.routes.ts` e serviços existentes do projeto Angular, produz um snapshot `CONTEXTO_PROJETO:` que o usuário cola no manifesto do `/generate` ou `/generate-batch` para evitar duplicatas e reutilizar serviços.

**Architecture:** Skill markdown (`skills/poui-context/SKILL.md`) com fluxo de 4 passos: localizar `angular.json`, scan de `app.routes.ts` + `*.service.ts` com `@generated  poui-specialist`, montar snapshot, exibir e confirmar. Três modificações pontuais: `code-generator.md` (seção Project Context), `generate-batch/SKILL.md` (campo `CONTEXTO_PROJETO:` no manifesto), `generate.md` (referência ao `/context`).

**Tech Stack:** Markdown skill file, PowerShell (`Get-ChildItem`, `Get-Content`, regex), plugin cache sync via `sync-to-cache.ps1`

## Global Constraints

- Plugin repo: `C:\TOTVS\Projetos\Claude\poui-specialist`
- Skill nova em: `skills/poui-context/SKILL.md`
- Frontmatter obrigatório: `name: poui-context` e `description:` de uma linha
- Header `@generated  poui-specialist` com dois espaços (igual ao restante do plugin)
- Filtro de leitura: só lê serviços que contenham `@generated  poui-specialist`
- Nunca modificar arquivos do projeto — scan somente leitura
- Após qualquer alteração em `skills/`, `agents/` ou `commands/`, executar `sync-to-cache.ps1`
- Commits: conventional commits sem co-author; autor: Andre Costa

---

### Task 1: Criar `skills/poui-context/SKILL.md`

**Files:**
- Create: `skills/poui-context/SKILL.md`

**Interfaces:**
- Consumes: nada (skill autônoma)
- Produces: skill `/poui-specialist:context` disponível no plugin; formato `CONTEXTO_PROJETO:` documentado para uso no manifesto

- [ ] **Step 1: Criar o diretório**

```powershell
New-Item -ItemType Directory -Path "C:\TOTVS\Projetos\Claude\poui-specialist\skills\poui-context" -Force
```

- [ ] **Step 2: Escrever o conteúdo completo do SKILL.md**

Criar `C:\TOTVS\Projetos\Claude\poui-specialist\skills\poui-context\SKILL.md` com o seguinte conteúdo **verbatim**:

````markdown
---
name: poui-context
description: Use before /generate or /generate-batch to scan the Angular project — reads app.routes.ts and existing services to detect registered routes and reusable services, producing a CONTEXTO_PROJETO: block to inject into the manifest | © Andre Costa — uso restrito · https://github.com/Alscosta1973/poui-specialist
---

# PO-UI Context — Scan de Projeto

Escaneia o projeto Angular e gera um snapshot de contexto reutilizável para evitar duplicatas e reutilizar serviços nas próximas gerações desta sessão.

## Uso

```
/poui-specialist:context
```

Invocar uma vez por sessão antes de usar `/generate` ou `/generate-batch`.

---

## Passo 1 — Localizar raiz do projeto Angular

Verificar o diretório atual e subir até 3 níveis procurando `angular.json`:

```powershell
$angularRoot = $null
$dir = (Get-Location).Path
for ($i = 0; $i -lt 4; $i++) {
    if (Test-Path (Join-Path $dir "angular.json")) {
        $angularRoot = $dir
        break
    }
    $dir = Split-Path $dir -Parent
}
```

**Se não encontrado:** exibir e encerrar:

```
⚠ Nenhum projeto Angular encontrado — scan de contexto ignorado.
```

---

## Passo 2 — Scan dirigido

**Fonte 1 — Rotas registradas:**

Ler `src/app/app.routes.ts` e extrair todos os valores de `path:`:

```powershell
$routesFile = Join-Path $angularRoot "src/app/app.routes.ts"
$routesContent = Get-Content $routesFile -Raw
$routes = [regex]::Matches($routesContent, "path:\s*'([^']+)'") |
    ForEach-Object { $_.Groups[1].Value } |
    Where-Object { $_ -ne '' }
```

**Fonte 2 — Serviços gerados pelo plugin:**

Listar todos os `*.service.ts` em `src/app/**` que contenham `@generated  poui-specialist`:

```powershell
$servicesDir = Join-Path $angularRoot "src/app"
$services = Get-ChildItem -Path $servicesDir -Filter "*.service.ts" -Recurse |
    Where-Object { (Get-Content $_.FullName -Raw) -match '@generated  poui-specialist' }
```

Para cada arquivo em `$services`, extrair:
- Nome da classe: `[regex]::Match(content, 'export class (\w+Service)').Groups[1].Value`
- `baseUrl`: `[regex]::Match(content, "baseUrl\s*=\s*'([^']+)'").Groups[1].Value`
- Módulo: segundo segmento do caminho após `src/app/` — ex: `src/app/financeiro/cad-taxa/cad-taxa.service.ts` → `financeiro`

**API base inferida:** módulo com mais serviços encontrados. Se empate, listar ambos separados por vírgula.

---

## Passo 3 — Montar snapshot

Produzir o bloco no seguinte formato:

```
## Contexto do Projeto Angular

### Rotas registradas (app.routes.ts)
- <path-1>
- <path-2>

### Serviços existentes (@generated poui-specialist)
- <NomeService> → <baseUrl>  (src/app/<módulo>/)

### Padrão de nomenclatura detectado
- Pasta: src/app/<módulo>/<entidade-kebab>/
- Serviço: <EntidadePascal>Service
- API base inferida: /api/<módulo-predominante>/
```

Se nenhum serviço `@generated  poui-specialist` for encontrado: omitir a seção de serviços e adicionar:
```
Nenhum serviço gerado pelo plugin detectado.
```

---

## Passo 4 — Exibir e confirmar

Exibir o snapshot completo e perguntar:

```
Contexto detectado. Usar nas próximas gerações desta sessão? [S/n]
```

**Se S (ou Enter):** exibir o bloco `CONTEXTO_PROJETO:` pronto para copiar:

```
Cole este bloco no seu próximo manifesto /generate-batch ou /generate:

CONTEXTO_PROJETO:
  rotas: [<path-1>, <path-2>, ...]
  servicos: [<NomeService> → <baseUrl>, ...]
  padrao: src/app/<módulo>/<entidade>/
```

**Se n:** exibir o snapshot como referência e encerrar sem o bloco de ativação.

---

## Restrições

- **Nunca modificar** arquivos do projeto — scan é somente leitura
- **Nunca escanear** serviços sem `@generated  poui-specialist` (exceto `app.routes.ts`)
- **Não persiste** entre sessões — re-executar a cada nova sessão Claude
````

- [ ] **Step 3: Verificar que as seções obrigatórias estão presentes**

```powershell
$file = "C:\TOTVS\Projetos\Claude\poui-specialist\skills\poui-context\SKILL.md"
$content = Get-Content $file -Raw

$checks = @(
    "name: poui-context",
    "angular\.json",
    "app\.routes\.ts",
    "@generated  poui-specialist",
    "Split-Path.*Parent",
    "service\.ts.*Recurse",
    "export class.*Service",
    "baseUrl",
    "CONTEXTO_PROJETO:",
    "rotas:",
    "servicos:",
    "padrao:",
    "S/n",
    "Nenhum projeto Angular"
)

$failed = @()
foreach ($check in $checks) {
    if ($content -notmatch $check) { $failed += $check }
}

if ($failed.Count -eq 0) {
    Write-Host "✅ Todas as seções verificadas ($($checks.Count)/$($checks.Count))"
} else {
    Write-Host "❌ Seções ausentes:"
    $failed | ForEach-Object { Write-Host "  - $_" }
}
```

Esperado: `✅ Todas as seções verificadas (14/14)`

- [ ] **Step 4: Sincronizar cache**

```powershell
& "C:\TOTVS\Projetos\Claude\poui-specialist\sync-to-cache.ps1"
```

Esperado: `OK  skills` para versões 1.0.0 e 1.3.0 e `Sincronizacao concluida.`

- [ ] **Step 5: Commitar**

```powershell
git -C "C:\TOTVS\Projetos\Claude\poui-specialist" add skills/poui-context/SKILL.md
git -C "C:\TOTVS\Projetos\Claude\poui-specialist" commit -m "feat(skill): adicionar poui-context — scan de projeto para geração codebase-aware"
```

---

### Task 2: Integrar `poui-context` em `code-generator.md`, `generate-batch/SKILL.md` e `generate.md` + push

**Files:**
- Modify: `agents/code-generator.md` — adicionar seção "Project Context" após a seção "No Project Scanning"
- Modify: `skills/poui-generate-batch/SKILL.md` — adicionar `CONTEXTO_PROJETO:` no manifesto e no Passo 2
- Modify: `commands/generate.md` — mencionar `/context` como pré-passo opcional

**Interfaces:**
- Consumes: `skills/poui-context/SKILL.md` criada na Task 1 (referência ao formato `CONTEXTO_PROJETO:`)

- [ ] **Step 1: Editar `agents/code-generator.md` — adicionar seção "Project Context"**

Localizar o seguinte bloco exato em `agents/code-generator.md`:

```
## Core Principles
```

Inserir **antes** desse bloco (após a seção "No Project Scanning") o seguinte conteúdo:

```markdown
## Project Context (optional)

When the user's manifest or prompt contains a `CONTEXTO_PROJETO:` block (produced by `/poui-specialist:context`), use it to avoid duplicates and reuse existing artifacts:

| Situation | Action |
|-----------|--------|
| Route `<path>` already exists in `rotas:` | Warn: *"Rota `<path>` já registrada — não será adicionada ao app.routes.ts"* and skip route addition |
| Service with same `baseUrl` already exists in `servicos:` | Import the existing service instead of generating a new file; mention the reuse in the plan |
| `API_BASE` not specified in manifest | Suggest the value from `padrao:` |
| No conflict | Generate normally — context is informational only |

**Context does not block generation.** It only warns and adjusts. The user can override any suggestion by editing the manifest.

```

- [ ] **Step 2: Verificar que a seção foi inserida**

```powershell
Select-String -Path "C:\TOTVS\Projetos\Claude\poui-specialist\agents\code-generator.md" -Pattern "CONTEXTO_PROJETO" | Select-Object -First 1
```

Esperado: linha contendo `CONTEXTO_PROJETO`.

- [ ] **Step 3: Editar `skills/poui-generate-batch/SKILL.md` — adicionar `CONTEXTO_PROJETO:` no manifesto**

Localizar o bloco exato do formato do manifesto:

```
PASTA_DESTINO: src/app/<modulo>

COMPONENTES:
```

Substituir por:

```
PASTA_DESTINO: src/app/<modulo>

CONTEXTO_PROJETO: (opcional — gerado por /poui-specialist:context)
  rotas: [rota-existente-1, rota-existente-2]
  servicos: [NomeService → /api/modulo/entidade]
  padrao: src/app/<modulo>/<entidade>/

COMPONENTES:
```

- [ ] **Step 4: Editar `skills/poui-generate-batch/SKILL.md` — passar contexto no Passo 2**

Localizar o bloco do prompt do subagente no Passo 2:

```
Regras de negócio:
<REGRAS>

Salve todos os arquivos gerados em PASTA_DESTINO.
```

Substituir por:

```
Regras de negócio:
<REGRAS>

Contexto do projeto (se presente no manifesto):
<CONTEXTO_PROJETO se fornecido, caso contrário omitir este campo>

Salve todos os arquivos gerados em PASTA_DESTINO.
```

- [ ] **Step 5: Editar `commands/generate.md` — mencionar `/context` como pré-passo opcional**

Localizar o bloco exato do Process:

```
## Process

1. **Parse arguments** — identify `<type>`, `<Name>`, and optional `--module`
```

Substituir por:

```
## Process

> **Pré-passo opcional:** Se o projeto Angular já tem serviços e rotas cadastradas, execute `/poui-specialist:context` antes para gerar um snapshot de contexto e evitar duplicatas.

1. **Parse arguments** — identify `<type>`, `<Name>`, and optional `--module`
```

- [ ] **Step 6: Verificar as três modificações**

```powershell
$repo = "C:\TOTVS\Projetos\Claude\poui-specialist"

# code-generator.md
$cg = Select-String -Path "$repo\agents\code-generator.md" -Pattern "CONTEXTO_PROJETO" | Measure-Object
Write-Host "code-generator.md: $($cg.Count) ocorrência(s) de CONTEXTO_PROJETO"

# generate-batch/SKILL.md
$gb = Select-String -Path "$repo\skills\poui-generate-batch\SKILL.md" -Pattern "CONTEXTO_PROJETO" | Measure-Object
Write-Host "generate-batch SKILL.md: $($gb.Count) ocorrência(s) de CONTEXTO_PROJETO"

# generate.md
$gm = Select-String -Path "$repo\commands\generate.md" -Pattern "poui-specialist:context" | Measure-Object
Write-Host "generate.md: $($gm.Count) ocorrência(s) de poui-specialist:context"
```

Esperado: `code-generator.md: 1`, `generate-batch SKILL.md: 2`, `generate.md: 2` (a referência no Process + a existente no final do Geração em Lote).

- [ ] **Step 7: Sincronizar cache**

```powershell
& "C:\TOTVS\Projetos\Claude\poui-specialist\sync-to-cache.ps1"
```

Esperado: `OK  agents`, `OK  commands`, `OK  skills` para ambas as versões e `Sincronizacao concluida.`

- [ ] **Step 8: Verificar cache**

```powershell
$base = "C:\Users\andre\.claude\plugins\cache\poui-specialist-marketplace\poui-specialist\1.3.0"
Test-Path "$base\skills\poui-context\SKILL.md"
```

Esperado: `True`

- [ ] **Step 9: Commitar e fazer push**

```powershell
$repo = "C:\TOTVS\Projetos\Claude\poui-specialist"
git -C $repo add agents/code-generator.md skills/poui-generate-batch/SKILL.md commands/generate.md
git -C $repo commit -m "feat(commands): integrar poui-context — campo CONTEXTO_PROJETO no manifesto e referência em /generate"
git -C $repo push origin master
```

Esperado: push bem-sucedido sem erros.
