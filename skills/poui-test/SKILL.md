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
