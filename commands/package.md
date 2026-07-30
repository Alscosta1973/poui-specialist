---
description: Compile an existing PO-UI Angular project and package it into a Resource/<project>.app ready to publish in Protheus
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, PowerShell, Skill
argument-hint: "[project-path] [--skip-build]"
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
```

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
$projectName = ($ngConfig.projects.PSObject.Properties.Name)[0]
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

```powershell
$distPath = "dist/$projectName"
$zipPath  = "$projectName.zip"

if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

$sevenZip = Get-Command 7z.exe -ErrorAction SilentlyContinue
if ($sevenZip) {
    & $sevenZip.Source a -tzip $zipPath "$distPath\*" | Out-Null
} else {
    Write-Host "⚠ 7-Zip não encontrado — usando Compress-Archive (PowerShell) como fallback."
    Write-Host "  Zips gerados por Compress-Archive são conhecidos por falhar ao extrair no"
    Write-Host "  Protheus (UNZIPAPP FError: 161 / 'Falha ao renomear'). Se o deploy falhar,"
    Write-Host "  instale o 7-Zip (https://www.7-zip.org/) e rode este comando de novo."
    Compress-Archive -Path "$distPath/*" -DestinationPath $zipPath
}

$resourceDir = "Resource"
if (-not (Test-Path $resourceDir)) {
    New-Item -ItemType Directory -Path $resourceDir | Out-Null
    Write-Host "✓ Pasta Resource criada"
}

$appPath = Join-Path $resourceDir "$projectName.app"
Copy-Item -Path $zipPath -Destination $appPath -Force
Write-Host "✓ Pacote gerado: $appPath"
```

> `$projectName.zip` permanece na raiz do projeto; a cópia renomeada para `.app` fica em
> `Resource/$projectName.app`.
> Se `Compress-Archive` falhar por já existir handle aberto no zip anterior, remover
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

## Passo 5 — Relatório e próximos passos

Exibir:

```
✅ Pacote gerado — {{projectName}}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📦 Resource/{{projectName}}.app — pronto para publicar

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
