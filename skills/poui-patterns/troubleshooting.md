# Troubleshooting — Problemas Comuns

Soluções para os erros mais frequentes ao usar o plugin poui-specialist com Angular + PO-UI + Protheus.

---

## Erros de build Angular

### `Error: The Angular Compiler requires TypeScript >=5.9.0`

**Causa:** `package.json` com TypeScript antigo (ex: `~5.7.0`).

**Fix:**
```json
"typescript": "~5.9.0"
```
Depois: `npm install`

---

### `Budget exceeded — Initial total budget 2 MB exceeded by X`

**Causa:** Bundle grande é esperado em apps PO-UI com muitos módulos carregados eagerly.

**Fix:** Usar lazy loading nos módulos de feature em `app.routes.ts`:
```typescript
{ path: 'pedidos', loadComponent: () => import('./compras/pedidos-list/pedidos-list.component').then(m => m.PedidosListComponent) }
```

Se quiser aumentar o budget temporariamente para desenvolvimento:
```json
// angular.json → architect.build.options.budgets
{ "type": "initial", "maximumWarning": "3mb", "maximumError": "5mb" }
```

---

### `NG8002: Can't bind to 'p-maxlength' since it isn't a known property`

**Causa:** Quirk #4 — PO-UI usa `p-maxlength` (minúsculo), não `p-max-length`.

**Fix:** Substituir `p-max-length` por `p-maxlength` no template HTML.

---

### `TS2353: Object literal may only specify known properties, and 'width' does not exist in type 'PoTableDetail'`

**Causa:** Quirk #11 — `PoTableDetail` não tem propriedade `width` no tipo.

**Fix:** Usar type assertion: `{ columns: [...] } as any`

---

## Erros visuais em runtime

### Tela em branco ao navegar pelo menu (OnPush)

**Causa:** Quirk #1 — `ng-content` + `ChangeDetectionStrategy.OnPush` + `po-page-*`.

**Fix:** Adicionar em todo componente que usa `po-page-*`:
```typescript
import { AfterViewInit, ChangeDetectorRef, inject } from '@angular/core';

private readonly cdr = inject(ChangeDetectorRef);

ngAfterViewInit(): void {
  setTimeout(() => this.cdr.detectChanges());
}
```

---

### `po-table` invisível no primeiro carregamento

**Causa:** Quirk #12 — `po-table` sem `[p-height]` em componente OnPush.

**Fix:** Adicionar altura explícita ou dinâmica:
```html
<po-table [p-height]="tableHeight()" ...>
```
```typescript
readonly tableHeight = computed(() => Math.max(300, window.innerHeight - 320));
```

---

### Colunas numéricas alinhadas à esquerda

**Causa:** Quirk #16 — `po-table` não alinha automaticamente colunas numéricas sem `type`.

**Fix:** Sempre declarar `type` na coluna:
```typescript
{ property: 'valor', label: 'Valor', type: 'currency', format: 'BRL' }
{ property: 'qtd',   label: 'Qtd',   type: 'number' }
```

---

### Formulário com `po-dynamic-form` não captura valores

**Causa:** Quirk #13 — `(p-value-change)` não existe. Handler nunca é chamado.

**Fix:**
```html
<po-dynamic-form (p-form)="onFormInit($event)"></po-dynamic-form>
```
```typescript
onFormInit(form: NgForm): void {
  form.valueChanges?.subscribe(values => this.formValues.set(values));
}
```

---

## Erros de integração Protheus

### `CORS error` ao fazer requisição do Angular para o Protheus

**Causa:** Protheus não está configurado para aceitar requisições de `localhost:4200`.

**Fix em `appserver.ini`:**
```ini
[HTTP_CROSS_ORIGIN]
Enable=1
AccessControlAllowOrigin=http://localhost:4200
AccessControlAllowMethods=GET,POST,PUT,DELETE,OPTIONS
AccessControlAllowHeaders=Content-Type,Authorization,X-TOTVS-TenantId
```

> Em desenvolvimento, use o proxy Angular (`proxy.conf.json`) para evitar CORS totalmente.

---

### Erro `400` com mensagem ilegível (caracteres estranhos)

**Causa:** Protheus retorna mensagens de erro em Latin-1 (ISO-8859-1), não UTF-8.

**Fix no service:**
```typescript
import { HttpErrorResponse } from '@angular/common/http';

private parseError(err: HttpErrorResponse): string {
  if (err.error instanceof ArrayBuffer) {
    return new TextDecoder('iso-8859-1').decode(err.error);
  }
  return err.error?.message ?? err.message ?? 'Erro desconhecido';
}
```

---

### `Falha ao Ajustar os arquivos Index` ao publicar no Protheus

**Causa:** O builder `@angular/build:application` (padrão desde Angular 17+) gera a saída de build em `dist/<projeto>/browser/`, reservando a raiz de `dist/<projeto>/` para uma eventual build de servidor (SSR). O `FWCallApp`/`AjustaIndex` (`FWCALLAPP.PRW`) espera `index.html` diretamente na raiz da pasta publicada e não encontra o arquivo dentro da subpasta `browser/`.

**Fix:** Achatar a saída do build em `angular.json` → `architect.build.options`:
```json
"outputPath": {
  "base": "dist/<projeto>",
  "browser": ""
}
```
Com isso, `ng build` entrega `index.html`, `main.js` etc. direto em `dist/<projeto>/`, sem subpasta. Projetos criados via `/poui-specialist:scaffold` já saem configurados assim — o ajuste só é necessário em projetos existentes.

Em vez de aplicar manualmente, rode `/poui-specialist:package` — ele detecta e corrige o `outputPath`, builda em produção e já empacota em `Resource/<projeto>.app`. Ver fluxo completo de deploy em `skills/poui-patterns/deploy-protheus.md`.

---

### `UnZipApp: Não foi possível extrair` / `FError: 161 on UNZIPAPP` ao abrir o `.app` no Protheus

```
UnZipApp: Não foi possível extrair o arquivo \http-root\app-root\<projeto>.app no diretório \http-root\app-root\ .
Falha ao renomear, FError: 161 on UNZIPAPP(FWCALLAPP.PRW)
```

Esse mesmo sintoma teve **três causas raiz** encontradas em sequência ao investigar um caso real
em produção — confirme a estrutura interna do `.app` (é um zip) com `7z l arquivo.app` antes de
supor qual delas se aplica:

1. **ZIP gerado com `Compress-Archive` do PowerShell.** O `.NET System.IO.Compression` produz
   um formato que o `UNZIPAPP` não extrai corretamente — trocar por **7-Zip** resolve o formato,
   mas não basta sozinho (ver causa 3).
2. **`index.html` dentro de `dist\<projeto>\` no zip.** Acontece se o `7z a` for chamado da raiz
   do projeto apontando para `dist\<projeto>\*` — o 7-Zip preserva esse caminho de origem dentro
   do zip. Descartado, mas não era a causa final.
3. **A causa real: o zip precisa ter a pasta `<projeto>/` como raiz, não vir achatado.**
   Confirmado comparando um `.app` gerado manualmente (que funcionou) com o gerado pelo plugin
   (que falhava mesmo já com formato e caminho corretos): o `UNZIPAPP` extrai o `.app` esperando
   encontrar uma pasta com o nome do projeto para processar/renomear. Um zip **achatado**
   (arquivos direto na raiz, sem essa pasta — o que as duas correções anteriores produziam)
   também causa "Falha ao renomear", só que por não haver pasta nenhuma para renomear.

**Estrutura correta dentro do zip:**
```
<projeto>.app (zip)
└── <projeto>/
    ├── index.html
    ├── main.js
    └── ...
```

**Fix:** `/poui-specialist:package` e o Passo 10.5 do `/poui-specialist:scaffold` (a partir da
v1.15.4) entram (`Push-Location`) em `dist/` (a pasta **pai**) e compactam a pasta `<projeto>`
inteira pelo nome — isso preserva `<projeto>/` como raiz do zip, sem incluir `dist/` no caminho
e sem achatar o conteúdo. `Compress-Archive` (fallback, sem 7-Zip) usa o mesmo princípio: apontar
para a pasta `dist/<projeto>` sem o sufixo `/*`.

Se você ainda tiver um `.app` com qualquer uma das três estruturas incorretas, regenere:

1. Confirmar o 7-Zip instalado (`C:\Program Files\7-Zip\7z.exe` ou no `PATH`).
2. Rodar `/poui-specialist:package` de novo — ou manualmente, de dentro da pasta `dist/`:
   ```powershell
   cd dist
   & "C:\Program Files\7-Zip\7z.exe" a -tzip ..\<projeto>.zip <projeto>
   cd ..
   ```
   (nunca zipar de dentro de `dist\<projeto>\` com `*` — isso acha o conteúdo e perde a pasta
   `<projeto>/` que o Protheus precisa encontrar)
3. Copiar o zip para `Resource/` e renomear para `<projeto>.app`.

---

### Paginação retorna sempre os mesmos registros

**Causa:** Endpoint TLPP não está lendo o parâmetro `page` corretamente.

**Fix no TLPP:**
```tlpp
Local nPage     := Val(GetRestParamByName("page", Self:oRest))
Local nPageSize := Val(GetRestParamByName("pageSize", Self:oRest))
If nPage     <= 0 : nPage     := 1  : EndIf
If nPageSize <= 0 : nPageSize := 20 : EndIf
// offset = (nPage - 1) * nPageSize registros
SC6->(%SkipFilter((nPage - 1) * nPageSize))
```

---

## Problemas com o plugin

### Plugin não encontra o comando

**Causa:** Plugin não está instalado ou não está atualizado.

**Fix:**
```
/plugin marketplace add Alscosta1973/poui-specialist
/plugin install poui-specialist@Alscosta1973-poui-specialist
```

### Geração produz placeholders não substituídos (`{{ComponentClass}}`)

**Causa:** Nome do componente não foi fornecido no comando.

**Fix:** Sempre fornecer nome:
```
/poui-specialist:generate page-list Pedidos --module compras
                          ^^^^^^^^^ ^^^^^^^ ^^^^^^^^^^^^^^^^
                          tipo      nome    módulo
```
