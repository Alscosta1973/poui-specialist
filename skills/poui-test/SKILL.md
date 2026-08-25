---
name: poui-test
description: Generates Angular unit test spec files (Karma + Jasmine) for components created by poui-specialist — smoke, loading, HTTP, router, modals | © Andre Costa — uso restrito · https://github.com/Alscosta1973/poui-specialist
metadata:
  domain: PO-UI / Angular / Protheus
  author: Andre Costa
  version: '1.12.1'
  category: Testing
---

# PO-UI Test Generator

Gera `*.component.spec.ts` completo (Karma + Jasmine) para componentes gerados pelo plugin, cobrindo: smoke test, estados de loading/empty/error, chamadas HTTP via `HttpTestingController`, navegação via `Router`, e interações específicas por tipo.

## Uso

```
/poui-specialist:test <ComponentClass> --module <module>
```

**Exemplos:**
```
/poui-specialist:test ParceirosComponent --module faturamento/parceiros
/poui-specialist:test TitulosListComponent --module financeiro
/poui-specialist:test TitulosService --module financeiro
```

---

## Passo 0 — Garantir Karma configurado no projeto

Verificar se `angular.json` tem, em algum projeto, um target `test` com builder
`@angular/build:karma` ou `@angular-devkit/build-angular:karma`.

**Se não existir:** perguntar antes de configurar:
```
Este projeto ainda não tem Karma configurado — specs Jasmine não rodam sem ele
(comum em projetos Angular 20+, que podem vir escafoldados para Vitest ou sem
nenhum test runner). Deseja que eu configure agora — instala
zone.js/karma/jasmine, cria karma.conf.js e adiciona o target "test" ao
angular.json? [S/n]
```
Se confirmado, executar nesta ordem (parar e reportar o erro se algum passo falhar,
sem tentar os seguintes):
1. `npm install --save-dev zone.js karma karma-chrome-launcher karma-jasmine karma-coverage jasmine-core @types/jasmine`
   — **não** instalar `karma-jasmine-html-reporter`: esse plugin conflita com o
   builder esbuild `@angular/build:karma` do Angular 21+ (`Cannot assign to read
   only property 'describe'`), confirmado em teste real.
2. Criar `karma.conf.js` na raiz, com `frameworks: ['jasmine']`, `plugins` só com
   `karma-jasmine`/`karma-chrome-launcher`/`karma-coverage`, `reporters: ['progress']`
   (sem `kjhtml`).
3. Adicionar em `angular.json`, no(s) projeto(s) que já tem `architect.build` mas
   não tem `architect.test`, um target:
   ```json
   "test": {
     "builder": "@angular/build:karma",
     "options": {
       "tsConfig": "tsconfig.spec.json",
       "polyfills": ["zone.js", "zone.js/testing"],
       "karmaConfig": "karma.conf.js",
       "assets": /* copiar de architect.build.options.assets */,
       "styles": /* copiar de architect.build.options.styles */
     }
   }
   ```
4. Em `tsconfig.spec.json`, garantir `"types": ["jasmine"]` (substituir
   `"vitest/globals"` se estiver lá — o Vitest raramente está instalado quando
   isso acontece, então manter a referência é enganoso).
5. Em `tsconfig.json`, garantir que `references` inclua
   `{ "path": "./tsconfig.spec.json" }` (sem isso o editor não reconhece
   `describe`/`it`/`expect` nos arquivos `.spec.ts`, mesmo com o Karma rodando
   certo pela CLI).

Confirmar ao final: `✅ Karma configurado — dependências instaladas, karma.conf.js
criado, angular.json/tsconfig.spec.json/tsconfig.json ajustados.` Se recusado,
encerrar com instrução: `Configure manualmente (ex: ng generate config karma) e
tente novamente depois.`

**Se já existir:** seguir para o Passo 1.

---

## Passo 1 — Parse argumentos

Extrair `ComponentClass` e `--module`.

Derivar:
- `kebab-name` — PascalCase → kebab-case (`TitulosListComponent` → `titulos-list`)
- `isService` — verdadeiro se `ComponentClass` terminar em `Service`
- `componentPath`:
  - se `isService`: `src/app/<module>/<kebab-name>.service.ts`
  - senão: `src/app/<module>/<kebab-name>/<kebab-name>.component.ts`
- `specPath`: mesmo caminho mas com `.spec.ts`

Se o arquivo não existir:
```
⚠ Arquivo não encontrado: <componentPath>
   Verifique ComponentClass e --module e tente novamente.
```
Encerrar.

---

## Passo 2 — Ler arquivo e identificar família

Ler o arquivo `.component.ts` (ou `.service.ts`). Ler também o `.service.ts` associado para obter `apiPath`.

**Extrair:**
- `ServiceClass` — via `inject(<ServiceClass>)` no componente
- `serviceFile` — do import path (ex: `'../titulos.service'` → `titulos.service`)
- `apiPath` — `readonly apiUrl` ou `readonly apiUrl` no service
- `ModelInterface` — interface usada em `items: signal<ModelInterface[]>([])`

**Mapeamento tipo → família:**

| Indicadores no arquivo | Família |
|------------------------|---------|
| `@Injectable` (é serviço) | `other` |
| `PoChartModule` ou `PoWidgetModule` | `other` |
| `actions: ActionConfig[]` + `currentAction` + `actionLoading` | `complex` |
| `selectedLeft` + `selectedRight` | `complex` |
| `activeBrowse` | `complex` |
| `detailColumns` ou `p-detail-columns` | `complex` |
| `PoStepperModule` ou `currentStep` | `form` |
| `PoDynamicFormModule` + `ActivatedRoute` | `form` |
| `PoDynamicFormModule` sem `ActivatedRoute` | `form` |
| `ActivatedRoute` sem form | `detail` |
| `PoDisclaimerGroup` | `list` |
| `PoPageDynamicTableComponent` | `list` |
| `items` + `loading` + `hasNext` | `list` |

---

## Passo 3 — Carregar templates

Ler em sequência:
1. `skills/poui-test/templates-test-base.md` — exceto se família `other/service` (tem setup próprio)
2. `skills/poui-test/templates-test-<família>.md`
3. `skills/poui-test/templates-test-advanced.md` — **sempre** carregar; selecionar apenas blocos relevantes:
   - **HTTP errors (401/403/404)**: incluir se o service pode lançar erros de autenticação/permissão
   - **Edge cases (lista vazia, 1 item, última página)**: incluir em família `list`
   - **po-modal open/submit/cancel**: incluir se `@ViewChild` de `PoModalComponent` presente
   - **po-stepper**: incluir se família `form` com `currentStep` ou `PoStepperModule`

---

## Passo 4 — Gerar spec

Substituir todos os `{{placeholder}}` pelos valores derivados no Passo 2.

Preencher dados mock para `{{ModelInterface}}` baseado nos campos vistos nas `columns: PoTableColumn[]` e nos imports do modelo.

Substituir comentários `// Agente:` pelos métodos reais encontrados no `.component.ts`.

Escrever resultado em `<specPath>`.

Confirmar:
```
✅ Spec gerado: <specPath>
```

---

## Passo 5 — Executar e reportar

```powershell
ng test --include="<specPath>" --watch=false
```

Exibir:
```
✅ <ComponentClass> — N spec(s), 0 failures
```

Se falhar: exibir erros completos. O spec foi gerado e pode ser ajustado manualmente.
