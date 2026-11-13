---
description: Compile an existing PO-UI Angular project and package it into a Resource/<project>.app ready to publish in Protheus
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, PowerShell, AskUserQuestion, Skill
argument-hint: "[project-path] [--skip-build] [--fontes]"
---

**IMPORTANT:** Always respond in the same language the user is writing in. If the user writes in Portuguese, respond in Portuguese.

## Passo 0 — Verificação de licença

Invocar a skill `poui-specialist:poui-license-check` antes de qualquer outra ação.
Se a skill retornar `status: expirado` ou `status: revogado`, encerrar imediatamente.

---

# /poui-specialist:package

Compila um projeto Angular + PO-UI **já pronto** (depois que os componentes já foram gerados,
testados e revisados) e empacota o resultado em `Resource/<projeto>.app`, pronto para copiar
ao AppServer do Protheus. Diferente do `/scaffold`, este comando não cria projeto novo — roda
em qualquer projeto Angular + PO-UI existente, na pasta atual ou em `[project-path]`.

## Exemplos

```bash
# Build de produção + empacotamento completo — pasta atual
/poui-specialist:package

# Informando a pasta do projeto — sem precisar entrar nela antes
/poui-specialist:package C:\TOTVS\Projetos\Claude\poui-specialist\Teste_poui

# Já rodei o build manualmente — só empacotar o dist/ existente
/poui-specialist:package --skip-build

# Combinando os dois
/poui-specialist:package C:\caminho\do\projeto --skip-build

# .app + zip dos fontes do projeto Angular para entregar ao cliente
/poui-specialist:package --fontes
```

`--fontes` gera também `Resource/<projeto>-fontes.zip` (Passo 4b): o projeto Angular que o cliente
precisa para ajustar, compilar e reempacotar o app, sem `node_modules`, `dist`, proxy local nem
configuração de editor, com `proxy.conf.example.json` e `LEIA-ME.md`.

---

## Passo 1 — Identificar o projeto

Se `[project-path]` foi informado:

```powershell
if (-not (Test-Path $projectPath)) {
    Write-Host "⚠ Pasta não encontrada: $projectPath"
    exit 1
}
Set-Location $projectPath
```

Se `[project-path]` **não** foi informado, usar o diretório atual sem trocar de local.

A partir daqui, todos os passos seguintes rodam relativos a essa pasta (atual ou
`[project-path]`).

Ler `angular.json` na raiz do diretório atual. Se não existir: informar que o comando deve
ser executado na raiz de um projeto Angular e encerrar.

```powershell
$ngConfig = Get-Content angular.json -Raw | ConvertFrom-Json
# @(...): com um único projeto o PowerShell 5.1 devolve string e [0] pegaria só o 1º caractere
$projectName = @($ngConfig.projects.PSObject.Properties.Name)[0]
$buildOptions = $ngConfig.projects.$projectName.architect.build.options
```

Se houver mais de um projeto em `angular.json`, perguntar qual usar antes de prosseguir.

---

## Passo 2 — Verificar/corrigir `outputPath`

O builder `@angular/build:application` (padrão desde Angular 17+) por padrão gera a saída em
`dist/<projeto>/browser/`, reservando a raiz de `dist/<projeto>/` para uma eventual build de
servidor (SSR). O Protheus (`FWCallApp`/`AjustaIndex` em `FWCALLAPP.PRW`) espera `index.html`
diretamente na raiz da pasta publicada — sem esse ajuste, o deploy falha com **"Falha ao
Ajustar os arquivos Index"**.

Verificar `architect.build.options.outputPath` em `angular.json`:

- Se já for um objeto com `"browser": ""` → nada a fazer, seguir para o Passo 3.
- Se for uma string (ex: `"dist/<projeto>"`) ou um objeto sem `browser: ""` → corrigir para:

```json
"outputPath": {
  "base": "dist/{{projectName}}",
  "browser": ""
}
```

Informar a correção aplicada antes de continuar.

---

## Passo 3 — Build de produção

Se `--skip-build` **não** foi fornecido:

```powershell
ng build --configuration production
```

**Observação Angular 19+/21+:** se o erro for `Could not find the @angular/build:dev-server builder's package`,
corrigir com `npm install -D @angular/build` e repetir o build. Se persistir, verificar em
`angular.json` se `architect.build.builder` aponta para `@angular/build:application`.

Se o build falhar por outro motivo: exibir os erros e encerrar — não prosseguir para o
empacotamento com um build quebrado.

Se `--skip-build` foi fornecido: verificar se `dist/{{projectName}}/index.html` existe.
Se não existir, avisar que não há build para empacotar e encerrar.

---

## Passo 4 — Empacotar em `Resource/<projeto>.app`

**Usar 7-Zip, não `Compress-Archive`.** O ZIP gerado pelo `Compress-Archive` do PowerShell
(.NET `System.IO.Compression`) é conhecido por falhar na extração pela função interna
`UNZIPAPP` do Protheus (`FWCALLAPP.PRW`) — erro `FError: 161`, "Falha ao renomear". O 7-Zip
gera um ZIP compatível.

**Crítico: o zip precisa ter a pasta `<projeto>/` como raiz — não achatado, e não com prefixo
`dist/<projeto>/`.** Confirmado empiricamente com um `.app` que funcionou no Protheus: o
`UNZIPAPP` (`FWCALLAPP.PRW`) extrai o zip esperando encontrar uma pasta com o nome do projeto
para processar/renomear; um zip achatado (arquivos direto na raiz, sem essa pasta) causa
"Falha ao renomear" por não haver o que renomear. A estrutura correta dentro do zip é:

```
<projeto>.app (zip)
└── <projeto>/
    ├── index.html
    ├── main.js
    └── ...
```

```powershell
$distPath = "dist/$projectName"
$zipPath  = "$projectName.zip"
$zipFullPath = Join-Path (Get-Location).Path $zipPath

if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

$sevenZipPath = $null
$sevenZipCmd = Get-Command 7z.exe -ErrorAction SilentlyContinue
if ($sevenZipCmd) {
    $sevenZipPath = $sevenZipCmd.Source
} else {
    # Get-Command só acha o que está no PATH — 7-Zip é comumente instalado sem
    # adicionar-se ao PATH, então checar os locais padrão de instalação também.
    foreach ($candidate in @("$env:ProgramFiles\7-Zip\7z.exe", "${env:ProgramFiles(x86)}\7-Zip\7z.exe")) {
        if ($candidate -and (Test-Path $candidate)) { $sevenZipPath = $candidate; break }
    }
}

if ($sevenZipPath) {
    # Entrar em dist/ (pai) e compactar a pasta do projeto pelo nome — preserva
    # "<projeto>/" como raiz do zip, sem incluir "dist/" no caminho.
    Push-Location "dist"
    & $sevenZipPath a -tzip $zipFullPath $projectName | Out-Null
    Pop-Location
} else {
    Write-Host "⚠ 7-Zip não encontrado (nem no PATH, nem em C:\Program Files\7-Zip)."
    Write-Host "  O fallback (Compress-Archive do PowerShell) é CONHECIDO por gerar um .app que"
    Write-Host "  o Protheus falha ao extrair (UNZIPAPP FError: 161 / 'Falha ao renomear')."
}
```

Se `$sevenZipPath` não foi encontrado: **parar e perguntar ao usuário** (via `AskUserQuestion`)
se deseja instalar o 7-Zip agora e repetir, ou prosseguir mesmo assim com `Compress-Archive`
sabendo que o pacote provavelmente falhará no Protheus. Nunca empacotar com `Compress-Archive`
silenciosamente — o usuário precisa saber que está recebendo um artefato de risco conhecido.

Se o usuário optar por prosseguir mesmo assim (mesma estrutura — **sem** `/*`, para preservar
`<projeto>/` como pasta raiz do zip):
```powershell
Compress-Archive -Path $distPath -DestinationPath $zipPath
```

```powershell
$resourceDir = "Resource"
if (-not (Test-Path $resourceDir)) {
    New-Item -ItemType Directory -Path $resourceDir | Out-Null
    Write-Host "✓ Pasta Resource criada"
}

$appPath = Join-Path $resourceDir "$projectName.app"
Copy-Item -Path $zipPath -Destination $appPath -Force

# $zipPath era só um artefato intermediário para chegar no .app em Resource/ — remover
# para não deixar um .zip solto na raiz do projeto a cada empacotamento.
Remove-Item $zipPath -Force
```

**Nunca reportar sucesso sem verificar a estrutura de verdade.** Abrir o zip gerado (com
caminho absoluto — `Environment.CurrentDirectory` não segue `Set-Location`/`Push-Location`,
então caminhos relativos aqui podem resolver contra o diretório errado) e confirmar que a
primeira entrada é a pasta do projeto:

```powershell
$appFullPath = (Resolve-Path $appPath).Path
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead($appFullPath)
$firstEntry = $zip.Entries | Select-Object -First 1
$hasProjectRoot = $zip.Entries | Where-Object { $_.FullName -eq "$projectName/" -or $_.FullName -like "$projectName/*" } | Select-Object -First 1
$zip.Dispose()

if ($hasProjectRoot) {
    Write-Host "✓ Pacote gerado e verificado: $appPath ($($projectName)/ confirmado como raiz)"
} else {
    Write-Host "✗ ESTRUTURA INCORRETA — $appPath NÃO tem '$projectName/' como raiz do zip."
    Write-Host "  Primeira entrada encontrada: $($firstEntry.FullName)"
    Write-Host "  Não declarar sucesso — este .app provavelmente falhará no Protheus (UNZIPAPP FError: 161)."
}
```

> `$projectName.zip` é removido da raiz do projeto após a cópia para `Resource/$projectName.app` —
> só o `.app` final permanece.
> Se o `7z`/`Compress-Archive` falhar por já existir handle aberto no zip anterior, remover
> manualmente e repetir.

Verificar `.gitignore` — adicionar os artefatos de build/empacotamento se ainda não existirem:
```powershell
foreach ($pattern in @("dist/", "*.zip", "Resource/")) {
    if (-not (Select-String -Path ".gitignore" -Pattern ([regex]::Escape($pattern)) -Quiet -ErrorAction SilentlyContinue)) {
        Add-Content ".gitignore" "`n$pattern"
    }
}
```

---

## Passo 4b — Zip dos fontes para o cliente (somente com `--fontes`)

O cliente precisa dos fontes do projeto Angular para qualquer ajuste futuro — o `.app` é só o
resultado compilado. Gerar `Resource/<projeto>-fontes.zip` com a pasta `<projeto>/` na raiz.

**Entra:** os arquivos do projeto versionados ou não ignorados pelo git (`git ls-files --cached
--others --exclude-standard`; fora do git, percorrer a pasta) — `src/`, `public/`, `package.json`,
**`package-lock.json`** (fixa as versões: o cliente instala com `npm ci`), `angular.json`,
`tsconfig*.json`, specs, `README.md`, `.gitignore`, `.editorconfig`, `.npmrc`, `.prettierrc`.

**Não entra:** pastas `node_modules`, `dist`, `.angular`, `Resource`, `coverage`, `.vscode`, `.idea`,
`.git`, `test-results`, `playwright-report`, `out-tsc`, `tmp`; arquivos `proxy.conf.json/.js`
(proxy local — aponta para o servidor de quem desenvolveu e pode levar credencial), `*.secret`
(ex.: `protheus-dev.secret` do `/connect`), `.env*`, `*.zip`, `*.app`, `*.log`.

**Gerados no zip:**
- `proxy.conf.example.json` — mesmos contextos do `proxy.conf.json` local (ou `/rest`), com
  `target: "http://<servidor-rest>:<porta>"`, `secure: false`, `changeOrigin: true` e **sem**
  `headers`/`auth`.
- `LEIA-ME.md` — versões (Node `node -v`, `@angular/core` e `@po-ui/ng-components` do `package.json`)
  e os passos: `npm ci` → copiar o proxy de exemplo → `npm start` → `npm test` →
  `ng build --configuration production` → empacotar com 7-Zip (pasta `<projeto>/` na raiz, como no
  Passo 4) → compilar `Resource/<projeto>.app` no RPO pelo TDS junto da rotina com
  `FwCallApp("<projeto>")`. **Nunca citar o plugin** no LEIA-ME nem em nenhum arquivo do zip.

```powershell
$stage = Join-Path $env:TEMP ("poui-fontes-" + [guid]::NewGuid().ToString('N'))
$base  = Join-Path $stage $projectName
New-Item -ItemType Directory -Path $base -Force | Out-Null

$exclDirs  = @('node_modules','dist','.angular','Resource','coverage','.vscode','.idea','.git',
               'test-results','playwright-report','out-tsc','tmp')
$exclFiles = '^(proxy\.conf\.(json|js|cjs|mjs)|\.env(\..*)?)$|\.(zip|app|log|secret)$'

$files = @(git ls-files --cached --others --exclude-standard 2>$null)
if ($LASTEXITCODE -ne 0 -or $files.Count -eq 0) {
    $root  = (Get-Location).Path
    $files = Get-ChildItem -Recurse -File -Force |
             ForEach-Object { $_.FullName.Substring($root.Length + 1) -replace '\\','/' }
}
$files = $files | Where-Object {
    $parts = $_ -split '[\\/]'
    -not ($parts[0..($parts.Count - 2)] | Where-Object { $exclDirs -contains $_ }) -and
    ($parts[-1] -notmatch $exclFiles) -and (Test-Path $_ -PathType Leaf)
}
foreach ($f in $files) {
    $dest = Join-Path $base $f
    New-Item -ItemType Directory -Path (Split-Path $dest) -Force | Out-Null
    Copy-Item $f $dest
}
# + gravar proxy.conf.example.json e LEIA-ME.md em $base (conteúdo descrito acima, UTF-8)

$zipFontes = Join-Path (Resolve-Path 'Resource').Path "$projectName-fontes.zip"
if (Test-Path $zipFontes) { Remove-Item $zipFontes -Force }
Push-Location $stage
& $sevenZipPath a -tzip $zipFontes $projectName | Out-Null   # sem 7-Zip: Compress-Archive serve para fontes
Pop-Location
Remove-Item $stage -Recurse -Force
```

**Conferir antes de declarar pronto** (listar o zip):
- a raiz é `<projeto>/` e tem `package.json`, `package-lock.json`, `angular.json`, `LEIA-ME.md` e
  `proxy.conf.example.json`;
- **não** há `node_modules/`, `dist/`, `proxy.conf.json`, `*.secret` nem `.app`.

**Avisos (não bloqueiam, mas mostrar ao usuário antes de ele enviar ao cliente)** — procurar nos
arquivos de texto do zip, exceto os locks de dependências (`package-lock.json`, `yarn.lock`,
`pnpm-lock.yaml` — nomes como `@inquirer/password` dariam falso positivo):
- `(poui|advpl)-specialist` ou `@generated` → fonte cita a ferramenta de geração (remover);
- `Basic <base64>` ou `password|senha|psw` com valor literal → credencial escrita no código.

Opcional, recomendado na primeira entrega de um projeto: extrair o zip numa pasta vazia, rodar
`npm ci` e `ng build --configuration production` para provar que os fontes compilam sozinhos.

---

## Passo 5 — Relatório e próximos passos

Exibir:

```
✅ Pacote gerado — {{projectName}}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📦 Resource/{{projectName}}.app — pronto para publicar
🗂 Resource/{{projectName}}-fontes.zip — fontes para o cliente (só com --fontes; N arquivos, avisos: X)

🔧 Próximos passos (dentro do Protheus):
   1. Copiar Resource/{{projectName}}.app para
      <rootpath>\web\{{projectName}}\{{projectName}}.app\ no AppServer
   2. Criar/confirmar o .prw com FWCallApp apontando para
      "web/{{projectName}}/{{projectName}}.app"
   3. Confirmar a porta multiprotocolo (MPP) no appserver.ini
   4. Compilar o .prw no RPO e executar a rotina no SmartClient

Guia completo: skills/poui-patterns/deploy-protheus.md
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Notas para o agente

- **Não roda `ng new` nem instala pacotes** — assume que o projeto já existe e já tem
  `@po-ui/ng-components` funcionando. Se `angular.json` não existir, não é um projeto Angular
  válido — encerrar com instrução clara em vez de tentar adivinhar.
- **Idempotente:** pode ser executado várias vezes seguidas (ex: depois de cada nova leva de
  componentes) — sempre sobrescreve o `.zip`/`.app` anteriores.
- **A correção do `outputPath` no Passo 2 é permanente** (grava no `angular.json`) — nas
  próximas execuções desse comando o Passo 2 não terá mais nada a corrigir.
