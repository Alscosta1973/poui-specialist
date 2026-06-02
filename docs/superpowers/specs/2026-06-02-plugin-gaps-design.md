# Plugin Gaps — Design Spec
**Data:** 2026-06-02  
**Escopo:** poui-specialist — preenchimento de lacunas identificadas via análise de PDFs do curso POUI Protheus

---

## Contexto

Análise de 8 PDFs do curso POUI Protheus revelou lacunas no plugin atual. O plugin já tem: standalone components, OnPush, signals, ProAppConfigService, ProtheusLibCoreModule, angular.json styles, 5 templates de componente, service, module, composite key e error parsing. As lacunas são adições ou enriquecimentos — nada existente será removido ou reescrito.

---

## Abordagem escolhida

**Expansão focada (Opção 1):** adicionar exatamente o que está faltando sem tocar no que já funciona. 7 entregáveis: 3 arquivos novos + 4 edições incrementais.

Para o gap de backend ADVPL/TLPP: documentar o **contrato de API** esperado pelo frontend (endpoints, JSON shape, códigos HTTP, formato de erro) e referenciar o advpl-specialist para implementação — mantendo responsabilidades separadas e evitando duplicação.

---

## Entregáveis

### 1. `poui-patterns/deploy-protheus.md` — NOVO

Fluxo completo de build e deploy para o Protheus:

- `tsconfig.json`: `strict: false`, `noPropertyAccessFromIndexSignature: false`
- `angular.json` budgets: ajuste de `maximumError` para não falhar no build de produção (sugestão: `anyComponentStyle: 6kb`, `initial: 2mb`)
- Sequência: `ng build` → renomear `dist/<projeto>` → `<nome>.app`
- Estrutura de pastas no servidor Protheus:
  ```
  \web\<nome>\
    <nome>.app\        ← conteúdo do dist
  \src\<projeto>\
    <nome>.prw         ← rdmake com FWCallApp
  \web\<nome>\resource\  ← recursos estáticos opcionais
  ```
- Código ADVPL do rdmake com `FWCallApp()` (boilerplate fixo)
- `appserver.ini`: seção `[General]` com `BuildKillUsers=1` e configuração da porta multiprotocolo (MPP)
- `proxy.conf.json` para desenvolvimento local (já existe em protheus-rest.md — referenciar, não duplicar)

### 2. `poui-code-generation/templates-tlpp-contract.md` — NOVO

Contrato completo de API REST que o frontend gerado pelo plugin espera:

**Endpoints por operação:**
```
GET    /rest/api/custom/v1/<entidade>
  query: page (int), pageSize (int, default 10), q (string), order (string, prefixo - para desc)
  response 200: { items: T[], hasNext: boolean }

GET    /rest/api/custom/v1/<entidade>/{id}           ← chave simples
GET    /rest/api/custom/v1/<entidade>/{codigo}/{loja} ← chave composta
  response 200: T

POST   /rest/api/custom/v1/<entidade>
  body: Partial<T> (JSON)
  response 201: T

PUT    /rest/api/custom/v1/<entidade>/{id}
  body: Partial<T> (JSON)
  response 200: T

DELETE /rest/api/custom/v1/<entidade>/{id}
  response 204: No Content
```

**Formato de erro Protheus:**
```json
{ "errorMessage": "{\"code\":\"MA0001\",\"message\":\"...\",\"detailedMessage\":\"...\"}" }
```

**Skeleton WsRestFul / TLPP REST** — apenas declaração de classe e métodos (sem lógica de negócio):
```advpl
// ADVPL — WsRestFul skeleton
// WsRestFul suporta um método HTTP por bloco WSRESTFUL.
// Use WSDATA para id/chave composta — o método GET diferencia lista vs detalhe pelo valor do WSDATA.
#include "totvs.ch"
#include "restful.ch"

WSRESTFUL EntidadeAPI DESCRIPTION "Entidade API"
  WSDATA id       AS CHARACTER OPTIONAL
  WSDATA loja     AS CHARACTER OPTIONAL
  WSDATA page     AS INTEGER   OPTIONAL
  WSDATA pageSize AS INTEGER   OPTIONAL
  WSDATA q        AS CHARACTER OPTIONAL

  WSMETHOD GET    DESCRIPTION "Listar / Consultar" WSSYNTAX "/api/custom/v1/entidade"
  WSMETHOD POST   DESCRIPTION "Incluir"            WSSYNTAX "/api/custom/v1/entidade"
  WSMETHOD PUT    DESCRIPTION "Alterar"            WSSYNTAX "/api/custom/v1/entidade"
  WSMETHOD DELETE DESCRIPTION "Excluir"            WSSYNTAX "/api/custom/v1/entidade"
END WSRESTFUL
```

**Instrução de implementação:** usar `/advpl-specialist:generate rest --entity <Entidade>` para implementar cada método com lógica de negócio, paginação e tratamento de erros no padrão Protheus.

### 3. `poui-code-generation/templates-models.md` — NOVO

Três padrões de model TypeScript:

**Model simples:**
```typescript
export interface Produto {
  codigo: string;
  descricao: string;
  preco: number;
  estoque: number;
  ativo: string; // 'S' | 'N' — padrão Protheus
}
```

**Model com chave composta Protheus:**
```typescript
export interface ProtheusKey {
  codigo: string;
  loja: string;
}

export interface Fornecedor extends ProtheusKey {
  razaoSocial: string;
  cnpj: string;
  email: string;
  telefone: string;
}
```

**Model com relacionamento (campos flat):**
```typescript
// Protheus NÃO retorna objetos aninhados.
// Retorna campos "achatados" com prefixo — ex: fornecedorNome, estadoDescricao.
export interface NotaFiscal {
  numero: string;
  serie: string;
  dataEmissao: string;        // ISO 8601
  fornecedorCodigo: string;   // chave — não objeto aninhado
  fornecedorLoja: string;
  fornecedorNome: string;     // desnormalizado para exibição
  valorTotal: number;
}
```

**Nota sobre o curso:** o curso usa `stateModel → cityModel → addressModel` com objetos aninhados — isso é adequado para projetos com backend Node/REST genérico. Em integrações Protheus, o padrão real são campos flat. Sempre prefer o padrão flat ao trabalhar com APIs Protheus.

### 4. `poui-code-generation/templates-module.md` — EDIÇÃO

Adicionar bloco `tsconfig.json` completo com:
```json
{
  "strict": false,
  "noPropertyAccessFromIndexSignature": false
}
```
Posicionado após o bloco `angular.json`, com nota: todos os projetos do curso desabilitam o strict mode para evitar erros de compilação com os padrões Protheus.

### 5. `poui-patterns/module-structure.md` — EDIÇÃO

Adicionar seção "NgModule vs Standalone" após o bloco de estrutura de pastas:

> O plugin usa **Standalone Components** (Angular 17+, padrão oficial). O curso POUI usa `ng new --no-standalone` (NgModules) por compatibilidade com versões anteriores. Ambos funcionam com PO-UI e Protheus. Para projetos novos, use Standalone. Para integrar em projetos NgModule existentes, os templates precisam de `NgModule` wrapper — consulte a [documentação oficial Angular](https://angular.io/guide/standalone-migration).

### 6. `templates-page-list.md` + `templates-page-dynamic-search.md` — EDIÇÃO

Adicionar padrão de paginação com `hasNext` e botão "Carregar mais" (show-more):

```html
<!-- No template HTML -->
<po-table
  [p-items]="items()"
  [p-loading]="loading()"
  [p-show-more-disabled]="!hasNext()"
  (p-show-more)="loadMore()">
</po-table>
```

```typescript
// No component TS
readonly page = signal(1);

loadMore(): void {
  this.page.update(p => p + 1);
  this.load({ page: this.page() });
}
```

E variável `page` no serviço para compor a query com `page` e `pageSize`.

### 7. `templates-page-edit.md` — EDIÇÃO

Enriquecer o array de fields do `PoDynamicForm` com exemplos de validação inline:

```typescript
readonly fields: PoDynamicFormField[] = [
  {
    property: 'codigo',
    label: 'Código',
    required: true,
    maxLength: 6,
    gridColumns: 6,
  },
  {
    property: 'email',
    label: 'E-mail',
    type: 'string',
    required: false,
    regex: '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$',
    errorMessage: 'E-mail inválido',
    gridColumns: 12,
  },
  {
    property: 'valor',
    label: 'Valor',
    type: 'currency',
    required: true,
    min: 0,
    gridColumns: 6,
  },
];
```

---

## O que NÃO está no escopo

- Directives (`ng g directive`) — caso de uso muito específico, cobertura já existe no advpl-specialist
- LocalStorage — não é padrão em apps Protheus (estado no servidor)
- NgModule-based scaffold completo — Standalone é o padrão correto para novos projetos

---

## Critérios de sucesso

- Um usuário que abriu o plugin pela primeira vez consegue:
  1. Criar um projeto novo seguindo `templates-module.md` + `deploy-protheus.md`
  2. Gerar um componente com paginação funcional
  3. Entender o contrato de API e criar o backend com `/advpl-specialist:generate rest`
  4. Fazer o deploy do `.app` no Protheus com o rdmake
