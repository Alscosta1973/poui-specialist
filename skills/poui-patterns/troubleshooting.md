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
