---
description: Diagnose a PO-UI app published in Protheus via FwCallApp — checks Resource/<project>.app structure and what the AppServer extracted in http-root/app-root (loose files, <app>_env_* folder, stale build)
allowed-tools: Read, Glob, Grep, Bash, PowerShell, AskUserQuestion, Skill
argument-hint: "[project-path] [--rootpath <RootPath do ambiente>]"
---

**IMPORTANT:** Always respond in the same language the user is writing in. If the user writes in Portuguese, respond in Portuguese.

## Passo 0 — Verificação de licença

Invocar a skill `poui-specialist:poui-license-check` antes de qualquer outra ação.
Se a skill retornar `status: expirado` ou `status: revogado`, encerrar imediatamente.

---

# /poui-specialist:doctor

Diagnostica um app PO-UI que **não abre** (ou abre desatualizado) no Protheus — tipicamente a
rotina que fica em **"Verificando atualizações..."**. Não altera nenhum arquivo: só lê e relata,
com a causa provável e o comando que corrige.

## Exemplos

```bash
# Só o pacote (Resource/<projeto>.app) — pasta atual
/poui-specialist:doctor

# Pacote + o que o AppServer extraiu (RootPath do ambiente no appserver.ini)
/poui-specialist:doctor --rootpath C:\TOTVS12\Protheus\protheus_data

# Informando a pasta do projeto Angular
/poui-specialist:doctor C:\caminho\do\projeto --rootpath D:\Protheus\protheus_data
```

---

## Passo 1 — Projeto e pacote

Se `[project-path]` foi informado, usar essa pasta; senão, a pasta atual. Ler `angular.json` e pegar
o primeiro projeto (`$projectName`). Sem `angular.json`: informar que não é um projeto Angular e
encerrar.

Se `Resource/$projectName.app` não existir → **✗** "pacote não gerado" → orientar
`/poui-specialist:package` e seguir só para o Passo 3 se houver `--rootpath`.

## Passo 2 — Estrutura do `.app`

```powershell
Add-Type -AssemblyName System.IO.Compression.FileSystem
$appFull = (Resolve-Path "Resource/$projectName.app").Path
$zip = [System.IO.Compression.ZipFile]::OpenRead($appFull)
$entries = @($zip.Entries | ForEach-Object { $_.FullName -replace '\\', '/' })
$zip.Dispose()
$root = "$projectName/"
$soltos   = @($entries | Where-Object { $_ -notmatch '/' })
$comDist  = @($entries | Where-Object { $_ -like 'dist/*' })
$raizes   = @($entries | ForEach-Object { ($_ -split '/')[0] } | Select-Object -Unique)
$temIndex = $entries -contains "${root}index.html"
```

Avaliar nesta ordem (o primeiro que bater é o erro do pacote):

| Condição | Resultado |
|---|---|
| `$entries.Count -eq 0` | ✗ pacote vazio |
| `$comDist.Count -gt 0` | ✗ prefixo `dist/` no zip — a raiz precisa ser `<projeto>/` |
| `$soltos.Count -gt 0` | ✗ **arquivos soltos na raiz do zip** — o FwCallApp extrai direto em `app-root/` e a rotina trava em "Verificando atualizações..." |
| `$raizes -notcontains $projectName` | ✗ pasta raiz `<outra>/` diferente de `<projeto>/` |
| `-not $temIndex` | ✗ `<projeto>/index.html` ausente — build em `dist/<projeto>/browser/`; corrigir `outputPath` para `{ "base": "dist/<projeto>", "browser": "" }` |
| nenhuma | ✓ pacote com `<projeto>/` na raiz e `index.html` |

Para todos os ✗: **fix** = `/poui-specialist:package` + recompilar o `.app` no RPO.

## Passo 3 — O que o AppServer extraiu (só com `--rootpath`)

Se `--rootpath` não foi informado, perguntar (opcional) o RootPath do ambiente — é o `RootPath` da
seção do ambiente no `appserver.ini`. Em branco: pular este passo.

```powershell
$appRoot = Join-Path $rootPath "http-root\app-root"
$itens = Get-ChildItem $appRoot -Force
```

1. **Itens soltos (⚠):** nomes de primeiro nível do pacote (sem o prefixo `<projeto>/`) + o próprio
   `<projeto>.app` que existam soltos em `app-root/` (fora de pastas `*_env_*`) → sobra de um
   pacote achatado. Fix: mover para fora de `app-root/` (backup). **Nunca** apagar pastas
   `*_env_*` de outros apps.
2. **Pasta extraída:** `Get-ChildItem $appRoot -Directory -Filter "$projectName`_env_*"`.
   - Nenhuma → ℹ o app ainda não foi extraído neste RootPath (abrir a rotina uma vez).
   - Para cada pasta: comparar o bundle `main-<hash>.js` do pacote com o da pasta. Diferentes → ⚠
     versão extraída desatualizada → recompilar o `.app` no RPO e reabrir a rotina.
   - **Não comparar `index.html`:** o FwCallApp reescreve o `index.html` na extração (troca o
     `<base href>` e injeta os scripts do `preindex`) — sempre difere do pacote.

## Passo 4 — Relatório

```
🩺 Diagnóstico — <projeto>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Pacote com <projeto>/ na raiz e <projeto>/index.html (29 entradas)
⚠ Itens do app soltos em app-root/: index.html, main-ABC.js, rca-poui.app
   → Mova para fora de app-root/ (backup) — não apague *_env_* de outros apps
✓ <projeto>_env_protheus_local: extraído (main-ABC.js)

1 problema(s) encontrado(s).
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Notas para o agente

- **Somente leitura.** Não mover, apagar nem reempacotar nada — apenas orientar.
- Se o pacote está ✓, a pasta extraída está ✓ e a rotina ainda não abre: sugerir o
  `/poui-specialist:smoke-protheus` (abre pelo menu e captura rede/console do navegador).
- "Verificando atualizações..." **não** é problema de REST/CORS: o app chama a API pelo canal do
  próprio FwCallApp (`:<porta TCP>/app-root/<rota>`).
- Ver `skills/poui-patterns/troubleshooting.md` → "Rotina fica em Verificando atualizações...".
