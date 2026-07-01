---
description: Create a complete Angular + PO-UI project from scratch — ng new, installs packages, configures theme, generates a sample component and serves locally
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, PowerShell, AskUserQuestion, Skill
argument-hint: "<project-name> [--module <module>] [--protheus <url>] [--demo] [--skip-install]"
---

**IMPORTANT:** Always respond in the same language the user is writing in. If the user writes in Portuguese, respond in Portuguese.

## Passo 0 — Verificação de licença

Invocar a skill `poui-specialist:poui-license-check` antes de qualquer outra ação.
Se a skill retornar `status: expirado` ou `status: revogado`, encerrar imediatamente.

---

# /poui-specialist:scaffold

Cria um projeto Angular 17+ com PO-UI e integração Protheus **do zero**, pronto para rodar.

## Exemplos

```bash
# Projeto simples — mínimo configurado, sem demo
/poui-specialist:scaffold meu-projeto

# Com módulo demo pré-gerado
/poui-specialist:scaffold meu-projeto --demo

# Com URL do Protheus para proxy (sem --protheus usa localhost:8086)
/poui-specialist:scaffold meu-projeto --protheus http://192.168.1.10:8086 --demo

# Pular npm install (útil quando node_modules já existe ou rede lenta)
/poui-specialist:scaffold meu-projeto --skip-install
```

---

## Passo 1 — Coletar parâmetros

### 1.1 — Parse dos argumentos

| Argumento | Variável interna | Padrão |
|-----------|-----------------|--------|
| `<project-name>` (obrigatório) | `projectName` | — |
| `--module <module>` | `demoModule` | `financeiro` |
| `--protheus <url>` | `protheusUrl` | `http://localhost:8086` |
| `--demo` | `createDemo = true` | `false` |
| `--skip-install` | `skipInstall = true` | `false` |

Se `projectName` não for fornecido: perguntar antes de prosseguir.

### 1.2 — Verificar pré-requisitos

```powershell
# Verificar Angular CLI global
$ngVersion = (ng version 2>$null | Select-String "Angular CLI") -replace "Angular CLI: ", ""
if (-not $ngVersion) {
    Write-Host "⚠ Angular CLI não encontrado. Instale com: npm install -g @angular/cli"
    exit 1
}
Write-Host "✓ Angular CLI $ngVersion"

# Verificar Node.js (mínimo 18)
$nodeVersion = node --version
Write-Host "✓ Node.js $nodeVersion"
```

Se Angular CLI não estiver instalado: exibir instrução e encerrar.

---

## Passo 2 — Criar projeto Angular

```powershell
ng new $projectName `
  --standalone `
  --routing `
  --style scss `
  --skip-git `
  --skip-tests `
  --package-manager npm
```

Aguardar a conclusão. Se falhar: exibir erro completo e encerrar.

Entrar no diretório do projeto:
```powershell
Set-Location $projectName
```

---

## Passo 3 — Instalar pacotes PO-UI

Se `--skip-install` **não** foi fornecido:

```powershell
npm install `
  @po-ui/ng-components@^17 `
  @po-ui/ng-templates@^17 `
  @po-ui/style@^17 `
  @totvs/po-theme@^17 `
  @totvs/protheus-lib-core@^17
```

Exibir progresso. Se falhar com erro de peer dependency:
- Tentar novamente com `--legacy-peer-deps`
- Se ainda falhar: exibir erro e sugerir `npm install --force`

Se `--skip-install` foi fornecido:
```
⚠ npm install ignorado (--skip-install). Execute manualmente quando pronto:
   npm install @po-ui/ng-components @po-ui/ng-templates @po-ui/style @totvs/po-theme @totvs/protheus-lib-core
```

---

## Passo 4 — Configurar angular.json

Ler `angular.json`, localizar o array `projects.<projectName>.architect.build.options.styles` e adicionar as folhas CSS do PO-UI **antes** de `"src/styles.scss"`:

```json
"styles": [
  "node_modules/@totvs/po-theme/css/po-theme-default-variables.min.css",
  "node_modules/@totvs/po-theme/css/po-theme-default.min.css",
  "node_modules/@po-ui/style/css/po-theme-core.min.css",
  "src/styles.scss"
]
```

> **Crítico:** sem estes arquivos os componentes PO-UI são renderizados sem nenhum estilo.

---

## Passo 5 — Atualizar tsconfig.json

Localizar `"strict": true` e substituir por `"strict": false`.
Localizar `"noPropertyAccessFromIndexSignature": true` e substituir por `false`.

```json
{
  "compilerOptions": {
    "strict": false,
    "noPropertyAccessFromIndexSignature": false,
    "noImplicitOverride": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

---

## Passo 6 — Substituir arquivos de scaffold

### 6.1 — src/app/app.config.ts

```typescript
import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { ProtheusLibCoreModule } from '@totvs/protheus-lib-core';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptorsFromDi()),
    provideAnimations(),
    importProvidersFrom(ProtheusLibCoreModule),
  ],
};
```

### 6.2 — src/app/app.routes.ts

```typescript
import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'inicio', pathMatch: 'full' },
  // As rotas de feature serão adicionadas aqui via /generate
  { path: '**', redirectTo: 'inicio' },
];
```

### 6.3 — src/app/app.component.ts

```typescript
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PoMenuModule, PoToolbarModule, PoMenuItem } from '@po-ui/ng-components';
import { ProAppConfigService } from '@totvs/protheus-lib-core';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, PoMenuModule, PoToolbarModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  constructor(private proAppConfigService: ProAppConfigService) {
    if (!this.proAppConfigService.insideProtheus()) {
      this.proAppConfigService.loadAppConfig();
    }
  }

  readonly menus: PoMenuItem[] = [
    { label: 'Sair', shortLabel: 'Sair', icon: 'po-icon-exit', action: this.closeApp.bind(this) },
  ];

  private closeApp(): void {
    if (this.proAppConfigService.insideProtheus()) {
      this.proAppConfigService.callAppClose();
    }
  }
}
```

### 6.4 — src/app/app.component.html

```html
<div class="po-wrapper">
  <po-toolbar p-title="{{projectName | titlecase}}"></po-toolbar>
  <po-menu [p-menus]="menus" [p-filter]="true" [p-collapsed]="true"></po-menu>
  <div class="container-fluid">
    <router-outlet></router-outlet>
  </div>
</div>
```

### 6.5 — src/styles.scss

```scss
@import url('https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700;800&display=swap');

* { box-sizing: border-box; }

body {
  margin: 0;
  font-family: 'Open Sans', Arial, sans-serif;
}

/* Quirk #17 — po-decimal e po-number não alinham à direita por padrão (PO-UI v17) */
po-decimal input,
po-number input {
  text-align: right;
}
```

### 6.6 — src/index.html

Substituir `<title>` pelo nome do projeto.

```html
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>{{projectName | titlecase}}</title>
  <base href="/">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="icon" type="image/x-icon" href="favicon.ico">
</head>
<body>
  <app-root></app-root>
</body>
</html>
```

---

## Passo 7 — Criar proxy.conf.json

```json
{
  "/rest": {
    "target": "{{protheusUrl}}",
    "secure": false,
    "changeOrigin": true,
    "logLevel": "debug"
  }
}
```

Atualizar `package.json` — script `start`:
```json
"start": "ng serve --proxy-config proxy.conf.json"
```

Verificar `.gitignore` — adicionar `proxy.conf.json` se não existir:
```powershell
if (-not (Select-String -Path ".gitignore" -Pattern "proxy\.conf\.json" -Quiet)) {
    Add-Content ".gitignore" "`n# Proxy — pode conter endereços internos`nproxy.conf.json"
}
```

---

## Passo 8 — Componente demo (flag --demo)

Se `--demo` foi fornecido: invocar o gerador de componente demo.

### 8.1 — Criar componente de boas-vindas

Criar `src/app/home/home.component.ts`:

```typescript
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PoPageModule, PoToolbarModule, PoWidgetModule } from '@po-ui/ng-components';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [PoPageModule, PoToolbarModule, PoWidgetModule],
  template: `
    <po-toolbar p-title="Bem-vindo"></po-toolbar>
    <po-page-default p-title="Projeto PO-UI + Protheus">
      <div class="po-row">
        <po-widget class="po-md-12 po-lg-4 po-mt-2" p-title="Próximos passos">
          <p>1. Gere um componente: <code>/poui-specialist:generate page-list Pedidos --module compras</code></p>
          <p>2. Gere os testes: <code>/poui-specialist:test PedidosComponent --module compras</code></p>
          <p>3. Revise o código: <code>/poui-specialist:review src/app/compras</code></p>
        </po-widget>
        <po-widget class="po-md-12 po-lg-4 po-mt-2" p-title="Tipos disponíveis">
          <ul>
            <li>page-list / page-dynamic-search</li>
            <li>modal-crud / page-edit / stepper-form</li>
            <li>dashboard / upload / po-tree</li>
            <li>infinite-scroll / action-list</li>
          </ul>
        </po-widget>
        <po-widget class="po-md-12 po-lg-4 po-mt-2" p-title="Plugin instalado">
          <p>✓ PO-UI configurado</p>
          <p>✓ Proxy para Protheus: <strong>{{protheusUrl}}</strong></p>
          <p>✓ OnPush habilitado</p>
          <p>✓ strict: false (compatível com libs Protheus)</p>
        </po-widget>
      </div>
    </po-page-default>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {}
```

### 8.2 — Adicionar rota home em app.routes.ts

```typescript
{ path: 'inicio', loadComponent: () => import('./home/home.component').then(m => m.HomeComponent) },
```

### 8.3 — Adicionar item de menu em app.component.ts

```typescript
readonly menus: PoMenuItem[] = [
  { label: 'Início', link: '/inicio', shortLabel: 'Início', icon: 'po-icon-home' },
  { label: 'Sair', shortLabel: 'Sair', icon: 'po-icon-exit', action: this.closeApp.bind(this) },
];
```

---

## Passo 9 — Inicializar git (opcional)

Se o projeto foi criado com `--skip-git`, inicializar git e fazer o primeiro commit:

```powershell
git init
git add .
git commit -m "chore: scaffold Angular 17 + PO-UI via poui-specialist"
```

---

## Passo 10 — Verificação de build

```powershell
ng build --configuration development 2>&1 | Select-Object -Last 10
```

Se falhar: exibir erros, tentar correção automática via skill `poui-specialist:build-fix`.

---

## Passo 11 — Relatório e próximos passos

Exibir:

```
✅ Scaffold concluído — {{projectName}}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📁 Estrutura criada:
   {{projectName}}/
   ├── src/app/app.config.ts     — providers (HTTP, Router, Protheus)
   ├── src/app/app.routes.ts     — roteamento lazy
   ├── src/app/app.component.*   — shell com po-toolbar + po-menu
   ├── src/styles.scss           — Open Sans + Quirk #17 fix
   ├── proxy.conf.json           — proxy /rest → {{protheusUrl}}
   └── angular.json              — estilos PO-UI configurados

📦 Dependências:
   @po-ui/ng-components    17.x
   @po-ui/ng-templates     17.x
   @totvs/po-theme         17.x
   @totvs/protheus-lib-core 17.x

🚀 Para iniciar o servidor:
   cd {{projectName}}
   npm start

🔧 Próximos comandos sugeridos:
   /poui-specialist:generate page-dynamic-search Pedidos --module compras
   /poui-specialist:discover /api/custom/v1/pedidos
   /poui-specialist:review src/app/
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Perguntar ao usuário:

```
Deseja iniciar o servidor de desenvolvimento agora?
  [S] Sim — executar npm start
  [N] Não — encerrar
```

Se **S**: executar `npm start` em background e exibir a URL.

---

## Notas para o agente

- **Não fazer `cd` no shell** — usar caminhos absolutos ou prefixar com `Set-Location` quando necessário
- **`ng new` é lento** — informar o usuário que pode levar 1-3 minutos
- **`npm install` pode ter warnings** de peer deps — não tratar como erro a menos que o install falhe com exit code não-zero
- **O `proxy.conf.json` é sensível** — sempre adicionar ao `.gitignore`
- **`--skip-git` no `ng new`** evita conflito com o git do diretório pai; o passo 9 inicializa o git do projeto novo
- **Se o diretório já existir**: avisar o usuário antes de sobrescrever qualquer arquivo
