---
name: poui-context
description: Use before /generate or /generate-batch to scan the Angular project — reads app.routes.ts and existing services to detect registered routes and reusable services, producing a CONTEXTO_PROJETO: block to inject into the manifest | © Andre Costa — uso restrito · https://github.com/Alscosta1973/poui-specialist
metadata:
  domain: PO-UI / Angular / Protheus
  author: Andre Costa
  version: '1.12.1'
  category: Planning
---

# PO-UI Context — Scan de Projeto

Escaneia o projeto Angular e gera um snapshot de contexto reutilizável para evitar duplicatas e reutilizar serviços nas próximas gerações desta sessão.

## Uso

```
/poui-specialist:context [--max-components N]
```

Invocar uma vez por sessão antes de usar `/generate` ou `/generate-batch`.

- `--max-components N` — limitar o scan de serviços aos primeiros N encontrados (útil em projetos grandes). Se houver mais do que N, exibir ao final: `⚠ Scan limitado a N serviços (--max-components). Há X serviços adicionais não incluídos no contexto.`

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
if (-not (Test-Path $routesFile)) {
    Write-Host "⚠ app.routes.ts não encontrado — rotas não detectadas."
    $routes = @()
} else {
    $routesContent = Get-Content $routesFile -Raw
    $routes = [regex]::Matches($routesContent, "path:\s*'([^']+)'") |
        ForEach-Object { $_.Groups[1].Value } |
        Where-Object { $_ -ne '' }
}
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
