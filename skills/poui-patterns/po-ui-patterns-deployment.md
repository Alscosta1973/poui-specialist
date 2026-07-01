# Guia de Deploy — Angular + PO-UI + Protheus

Cobre: build de produção, análise de bundle, opções de hospedagem, configuração CORS no Protheus,
autenticação em produção e deploy dentro do SmartClient/iframe.

---

## 1. Build de Produção

### Comando

```powershell
ng build --configuration production
```

Saída em `dist/<project-name>/browser/` (Angular 17) com:
- Minificação de JS/CSS
- Tree-shaking de imports não usados
- Hashing de nomes de arquivo (`main.abc123.js`) para cache-busting automático
- Source maps desabilitados por padrão

### Flags úteis

```powershell
# Build com source maps (para análise — não enviar para produção)
ng build --configuration production --source-map

# Build com stats.json para bundle analysis
ng build --configuration production --stats-json

# Build mostrando tamanho de cada bundle
ng build --configuration production --verbose
```

### Verificar budgets (limites de tamanho)

`angular.json` define limites que causam erro/warning se excedidos:

```json
"budgets": [
  { "type": "initial", "maximumWarning": "500kb", "maximumError": "1mb" },
  { "type": "anyComponentStyle", "maximumWarning": "2kb", "maximumError": "4kb" }
]
```

Ajustar conforme o projeto. Apps PO-UI com templates geralmente ficam entre 600kb–1.2mb
no bundle inicial após gzip.

---

## 2. Análise de Bundle

### Opção A — webpack-bundle-analyzer

```powershell
npm install -D webpack-bundle-analyzer
ng build --configuration production --stats-json
npx webpack-bundle-analyzer dist/<project-name>/browser/stats.json
```

Abre browser com mapa visual de tamanho por módulo. Identificar:
- `@po-ui/ng-components` importado inteiro (verificar se barrel imports desnecessários)
- `@totvs/protheus-lib-core` — pode ser grande; usar somente o necessário
- Módulos duplicados (ex: `rxjs` em múltiplas versões)

### Opção B — source-map-explorer (sem plugin extra)

```powershell
ng build --configuration production --source-map
npx source-map-explorer dist/<project-name>/browser/*.js
```

### Verificar lazy loading

Cada rota com `loadComponent: () => import(...)` gera um chunk separado.
Confirmar no output do build que existem arquivos `chunk-*.js` além do `main.js`:

```
Initial Chunk Files         | Names         |  Raw Size
main.js                     | main          | 850.00 kB
                            |               |
Lazy Chunk Files            | Names         |
chunk-PEDIDOS.js            | pedidos       |  42.00 kB
chunk-FORNECEDORES.js       | fornecedores  |  38.00 kB
```

Se não houver lazy chunks, verificar que `app.routes.ts` usa `loadComponent` (não `component`
direto).

---

## 3. Opções de Hospedagem

### Opção A — IIS (Windows Server — padrão corporativo)

Criar `web.config` na raiz do build para roteamento SPA:

```xml
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="Angular SPA" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
          </conditions>
          <action type="Rewrite" url="/index.html" />
        </rule>
      </rules>
    </rewrite>
    <staticContent>
      <mimeMap fileExtension=".json" mimeType="application/json" />
    </staticContent>
  </system.webServer>
</configuration>
```

Salvar em `src/web.config` e declarar em `angular.json`:

```json
"assets": [
  "src/favicon.ico",
  "src/assets",
  "src/web.config"
]
```

### Opção B — nginx

```nginx
server {
  listen 80;
  root /var/www/html/meu-app;
  index index.html;

  # Rotear tudo para index.html (Angular HTML5 routing)
  location / {
    try_files $uri $uri/ /index.html;
  }

  # Cache longo para assets com hash no nome
  location ~* \.(js|css|png|jpg|svg|ico|woff2)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
  }

  # Sem cache para index.html (sempre buscar versão nova)
  location = /index.html {
    add_header Cache-Control "no-cache";
  }
}
```

### Opção C — Deploy dentro do Protheus (iframe/SmartClient)

O Protheus pode servir arquivos estáticos diretamente do AppServer:

1. Copiar `dist/<project-name>/browser/` para o diretório `web/` do AppServer
2. Configurar rota no `appserver.ini`:
   ```ini
   [HTTP]
   ENABLE=1
   PORT=8080
   PATH=C:\TOTVS\AppServer\web
   ```
3. Acessar via `http://<server>:8080/<project-name>/`
4. Configurar a integração no Protheus (FWWEBVIEW ou iframe no ADVPL)

**Base href para subdiretório:**
```powershell
ng build --configuration production --base-href /meu-app/
```
Ou configurar em `angular.json`:
```json
"options": {
  "baseHref": "/meu-app/"
}
```

---

## 4. Configuração CORS no Protheus AppServer

Em desenvolvimento, o `proxy.conf.json` evita CORS. Em produção há três estratégias:

### Estratégia 1 — Mesma origem (sem CORS)

Angular e AppServer na mesma URL base:
- Angular em `http://server:8080/`
- REST em `http://server:8080/rest/api/...`
- Sem problema de CORS — recomendado para produção

Configurar nginx como proxy reverso:
```nginx
location /rest/ {
  proxy_pass http://appserver:8084/rest/;
  proxy_set_header Host $host;
}
```

### Estratégia 2 — Cabeçalhos CORS no ADVPL

Se Angular e AppServer ficarem em origens diferentes, adicionar CORS headers no endpoint TLPP:

```advpl
// No método WsRestFul — antes de qualquer resposta
Method SetCorsHeaders() Class MinhaAPIService

  Local cOrigin := oRest:GetHeader("Origin")

  // Validar origem — nunca usar * em produção com credentials
  If AllTrim(cOrigin) == "https://meuapp.empresa.com.br"
    oRest:SetHeader("Access-Control-Allow-Origin",  cOrigin)
    oRest:SetHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
    oRest:SetHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-PO-SCREEN-ID")
    oRest:SetHeader("Access-Control-Allow-Credentials", "true")
  EndIf

Return
```

**Preflight OPTIONS:** Protheus responde automaticamente a `OPTIONS` com 200; verificar
se os headers CORS aparecem também na resposta OPTIONS.

### Estratégia 3 — Parâmetro MV_CORSORI

Alguns builds do Protheus suportam o parâmetro `MV_CORSORI` para configurar origens
permitidas sem alterar código ADVPL. Consultar documentação da versão específica.

---

## 5. Autenticação em Produção

### Fluxo Protheus (Basic Auth ou JWT)

Em desenvolvimento, credenciais ficam no `proxy.conf.json`. Em produção, o Angular
envia o token via `Authorization` header em cada request — configurado no interceptor.

**Template A do http-interceptor** (gerado pelo plugin) já cobre este fluxo:
- Captura o token do `ProAppConfigService`
- Injeta no header `Authorization: Bearer <token>`
- Decodifica erros Latin-1 do Protheus

**Se o projeto não usar o interceptor do plugin**, implementar manualmente:

```typescript
// src/app/core/interceptors/auth.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { ProAppConfigService } from '@totvs/protheus-lib-core';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const proConfig = inject(ProAppConfigService);
  const token     = proConfig.getTokenProtheus?.() ?? '';

  if (!token || !req.url.includes('/rest/')) return next(req);

  return next(req.clone({
    setHeaders: { Authorization: `Bearer ${token}` },
  }));
};
```

Registrar em `app.config.ts`:
```typescript
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './core/interceptors/auth.interceptor';

providers: [
  provideHttpClient(withInterceptors([authInterceptor])),
]
```

### `po-upload` e autenticação

`po-upload` usa `XMLHttpRequest` internamente — o interceptor Angular **não** intercepta.
Em produção, fornecer o token via `[p-headers]`:

```typescript
readonly uploadHeaders = signal<Record<string, string>>({});

ngOnInit(): void {
  const token = this.proConfig.getTokenProtheus?.() ?? '';
  if (token) this.uploadHeaders.set({ Authorization: `Bearer ${token}` });
}
```

```html
<po-upload [p-url]="uploadUrl" [p-headers]="uploadHeaders()"></po-upload>
```

---

## 6. Configuração de Ambientes

### src/environments/environment.ts (desenvolvimento)

```typescript
export const environment = {
  production: false,
  apiBaseUrl: '/rest',                  // proxy local resolve para AppServer
  appVersion: '0.0.0-dev',
};
```

### src/environments/environment.prod.ts (produção)

```typescript
export const environment = {
  production: true,
  apiBaseUrl: '/rest',                  // mesmo origin ou via proxy reverso nginx
  appVersion: '1.0.0',
};
```

> **Nunca hardcode credenciais** (usuário/senha, tokens, IPs internos) em `environment.prod.ts`.
> Credenciais vêm do `ProAppConfigService` em runtime.

### Declarar em angular.json

```json
"configurations": {
  "production": {
    "fileReplacements": [
      {
        "replace": "src/environments/environment.ts",
        "with":    "src/environments/environment.prod.ts"
      }
    ]
  }
}
```

---

## 7. Checklist pré-deploy

```
□ ng build --configuration production passa sem erros
□ Nenhum console.error / alert() no código de produção (BP-007)
□ Sem URLs hardcoded em services — usar environment.apiBaseUrl
□ Sem credenciais em código ou arquivos de ambiente versionados
□ proxy.conf.json está no .gitignore
□ Base href configurado corretamente se deploy em subdiretório
□ web.config (IIS) ou try_files nginx configurado para SPA routing
□ CORS testado com origem exata de produção (não '*' com credentials)
□ po-upload com [p-headers] configurado para Bearer token
□ Bundle inicial < 1 MB (sem gzip) — verificar com stats.json
□ Lazy chunks existem para cada módulo feature
□ Cache headers configurados (1 year para assets, no-cache para index.html)
□ ng test --watch=false passa 100%
```

---

## 8. Pipeline CI/CD (GitHub Actions — referência)

```yaml
# .github/workflows/build.yml
name: Build & Deploy

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      - run: npm test -- --watch=false --browsers=ChromeHeadless

      - run: npm run build -- --configuration production

      - name: Upload build artifact
        uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist/*/browser/
```

> **Secrets no CI:** URLs de AppServer, tokens de deploy — sempre em `Settings > Secrets`,
> nunca em arquivos do repositório.
