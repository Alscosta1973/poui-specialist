# Plugin Gaps Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preencher as lacunas do poui-specialist plugin adicionando 3 arquivos novos e editando 3 existentes, cobrindo deploy Protheus, contrato TLPP REST, models, tsconfig e NgModule vs Standalone.

**Architecture:** Adições puras — nenhum arquivo existente é reescrito, apenas estendido. Três arquivos novos (`deploy-protheus.md`, `templates-tlpp-contract.md`, `templates-models.md`). Três edições cirúrgicas (`templates-module.md`, `module-structure.md`, `templates-page-edit.md`). A paginação (`p-show-more`) já está presente nos templates page-list e page-dynamic-search — não requer alteração.

**Tech Stack:** Markdown (plugin templates), ADVPL (skeleton WsRestFul), Angular 17+ TypeScript (snippets de validação)

---

## Mapa de arquivos

| Arquivo | Ação | Responsabilidade |
|---------|------|-----------------|
| `skills/poui-patterns/deploy-protheus.md` | Criar | Fluxo ng build → .app → rdmake → Protheus |
| `skills/poui-code-generation/templates-tlpp-contract.md` | Criar | Contrato REST que o frontend espera do backend |
| `skills/poui-code-generation/templates-models.md` | Criar | Padrões de model: simples, chave composta, flat relacional |
| `skills/poui-code-generation/templates-module.md` | Editar | Adicionar bloco tsconfig.json |
| `skills/poui-patterns/module-structure.md` | Editar | Adicionar nota NgModule vs Standalone |
| `skills/poui-code-generation/templates-page-edit.md` | Editar | Enriquecer exemplos de validação nos fields |

---

## Task 1: Criar `deploy-protheus.md`

**Files:**
- Create: `skills/poui-patterns/deploy-protheus.md`

- [ ] **Criar o arquivo com o seguinte conteúdo completo:**

```markdown
# Deploy: Angular → Protheus

Fluxo completo para compilar o projeto Angular e publicá-lo dentro do Protheus.

---

## 1. tsconfig.json — desabilitar strict mode

Todos os projetos PO-UI com Protheus desabilitam o strict mode para evitar erros de
compilação com os padrões da lib:

```json
{
  "compilerOptions": {
    "strict": false,
    "noPropertyAccessFromIndexSignature": false
  }
}
```

---

## 2. angular.json — ajustar budgets

O build de produção falha se os bundles ultrapassam os limites padrão. Ajuste em
`architect.build.configurations.production.budgets`:

```json
"budgets": [
  {
    "type": "initial",
    "maximumWarning": "1mb",
    "maximumError": "2mb"
  },
  {
    "type": "anyComponentStyle",
    "maximumWarning": "4kb",
    "maximumError": "6kb"
  }
]
```

---

## 3. Build de produção

```bash
ng build --configuration production
```

Isso gera a pasta `dist/<nome-projeto>/browser/` (Angular 17+).

---

## 4. Renomear para .app

O Protheus exige que o bundle Angular tenha extensão `.app`:

```bash
# Windows (PowerShell)
Rename-Item "dist\<nome-projeto>\browser" "<nome-projeto>.app"
```

Resultado: `dist\<nome-projeto>\<nome-projeto>.app\`

---

## 5. Estrutura de pastas no servidor Protheus

```
<rootpath>\web\<nome-projeto>\
  <nome-projeto>.app\         ← conteúdo do dist (index.html, main.js, etc.)
  resource\                   ← recursos estáticos opcionais (imagens, fontes extras)

<rootpath>\src\<nome-projeto>\
  <nome-projeto>.prw           ← rdmake que chama FWCallApp
```

> `<rootpath>` é o caminho raiz do AppServer (ex: `C:\TOTVS\Microsiga\Protheus_Data`).

---

## 6. rdmake ADVPL com FWCallApp

Crie `<nome-projeto>.prw` com o seguinte conteúdo:

```advpl
#include "totvs.ch"

/*/{Protheus.doc} <NomeProjeto>
    Abre o aplicativo Angular <NomeProjeto> dentro do Protheus.
    @type User Function
    @author Andre Costa
/*/
User Function <NomeProjeto>()
    Local cApp  := "web/<nome-projeto>/<nome-projeto>.app"
    Local cParm := ""
    FWCallApp(cApp, cParm)
Return
```

> Substitua `<NomeProjeto>` pelo nome da função (máx. 10 caracteres) e
> `<nome-projeto>` pelo nome da pasta criada no passo 5.

---

## 7. appserver.ini — porta multiprotocolo (MPP)

Para que o AppServer sirva arquivos estáticos do `.app`, a porta HTTP deve ser
configurada como multiprotocolo:

```ini
[General]
BuildKillUsers=1

[HTTPV11]
Enable=1
Sockets=MPSOCKET

[MPSOCKET]
Port=8084
```

> Reinicie o AppServer após alterar o `.ini`.

---

## 8. proxy.conf.json — desenvolvimento local

Durante o desenvolvimento, use proxy para evitar CORS ao chamar `/rest`:

```json
{
  "/rest": {
    "target": "http://localhost:8084",
    "secure": false,
    "changeOrigin": true,
    "logLevel": "debug"
  }
}
```

Certifique-se de que o script `start` no `package.json` inclui `--proxy-config`:

```json
"start": "ng serve --proxy-config proxy.conf.json"
```

---

## 9. Acessar a rotina no Protheus

Compile o `.prw` no RPO e execute a `User Function` pelo menu ou pelo SmartClient.
O Protheus abrirá o app Angular no browser embutido ou no browser padrão do sistema,
dependendo da configuração do `FWCallApp`.

**Referências TDN:**
- FWCallApp: https://tdn.totvs.com.br/display/public/framework/FwCallApp
- Porta Multiprotocolo: https://tdn.totvs.com/display/tec/Application+Server+-+Porta+Multiprotocolo
```

- [ ] **Verificar que o arquivo foi criado:**

```powershell
Test-Path "skills\poui-patterns\deploy-protheus.md"
```
Esperado: `True`

- [ ] **Commitar:**

```bash
git add skills/poui-patterns/deploy-protheus.md
git commit -m "docs(plugin): add deploy-protheus pattern — ng build to .app, rdmake, MPP"
```

---

## Task 2: Criar `templates-tlpp-contract.md`

**Files:**
- Create: `skills/poui-code-generation/templates-tlpp-contract.md`

- [ ] **Criar o arquivo com o seguinte conteúdo completo:**

```markdown
# Template: TLPP REST Contract

Define o contrato de API REST que o frontend Angular gerado pelo plugin espera.
Use este documento como especificação para criar o backend no Protheus via
`/advpl-specialist:generate rest`.

---

## Endpoints por operação CRUD

### Listar (GET com paginação)

```
GET /rest/api/custom/v1/<entidade>
```

Query parameters:

| Parâmetro | Tipo | Padrão | Descrição |
|-----------|------|--------|-----------|
| `page` | integer | 1 | Número da página |
| `pageSize` | integer | 10 | Itens por página (máx. 50) |
| `q` | string | — | Busca rápida em todos os campos texto |
| `order` | string | — | Campo de ordenação; prefixo `-` para desc (ex: `-nome`) |

Response `200 OK`:

```json
{
  "items": [ { "codigo": "000001", "nome": "Exemplo" } ],
  "hasNext": true
}
```

---

### Consultar por chave (GET por ID)

**Chave simples:**
```
GET /rest/api/custom/v1/<entidade>/{id}
```

**Chave composta Protheus (código + loja):**
```
GET /rest/api/custom/v1/<entidade>/{codigo}/{loja}
```

Response `200 OK`: objeto completo da entidade (mesmo shape de `items[0]`).

---

### Incluir (POST)

```
POST /rest/api/custom/v1/<entidade>
Content-Type: application/json

{ "codigo": "000001", "nome": "Exemplo", ... }
```

Response `201 Created`: objeto criado (mesmo shape do GET por ID).

---

### Alterar (PUT)

```
PUT /rest/api/custom/v1/<entidade>/{id}
Content-Type: application/json

{ "nome": "Novo nome", ... }
```

Response `200 OK`: objeto atualizado.

---

### Excluir (DELETE)

```
DELETE /rest/api/custom/v1/<entidade>/{id}
```

Response `204 No Content` (sem body).

---

## Formato de erro Protheus

O frontend do plugin decodifica erros neste formato específico:

```json
{
  "errorMessage": "{\"code\":\"MA0001\",\"message\":\"Registro j\\u00e1 existe\",\"detailedMessage\":\"\"}"
}
```

O campo `errorMessage` é uma **string JSON serializada** com os campos `code`,
`message` e `detailedMessage`. O texto é URI-encoded — o frontend usa
`decodeURIComponent(escape(...))` para decodificar.

**Todos os endpoints de escrita (POST, PUT, DELETE) devem retornar este formato
em caso de erro (4xx/5xx).**

---

## Códigos HTTP esperados

| Status | Quando usar |
|--------|-------------|
| 200 | GET por ID, PUT com sucesso |
| 201 | POST com sucesso |
| 204 | DELETE com sucesso |
| 400 | Validação falhou / dados inválidos |
| 401 | Não autenticado |
| 403 | Sem permissão |
| 404 | Registro não encontrado |
| 409 | Conflito (registro duplicado) |
| 500 | Erro interno do servidor |

---

## Skeleton WsRestFul ADVPL

Estrutura mínima da classe REST no lado Protheus. Use como ponto de partida
ou gere o código completo com `/advpl-specialist:generate rest`:

```advpl
#include "totvs.ch"
#include "restful.ch"

// WsRestFul suporta um método HTTP por bloco.
// Use WSDATA para receber id/chave-composta; o método GET
// diferencia lista vs detalhe pelo valor do WSDATA id.
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

> Para implementar a lógica de negócio (paginação, filtro, ExecAuto, tratamento
> de erros), use: `/advpl-specialist:generate rest --entity <Entidade>`

---

## TypeScript — shape esperado no frontend

O service Angular espera exatamente este contrato:

```typescript
// Response do GET lista
interface ProtheusListResponse<T> {
  items: T[];
  hasNext: boolean;
}

// Exemplo de service consumindo os endpoints acima
// getAll  → GET  /rest/api/custom/v1/entidade?page=1&pageSize=10&q=...
// getById → GET  /rest/api/custom/v1/entidade/{id}
// create  → POST /rest/api/custom/v1/entidade
// update  → PUT  /rest/api/custom/v1/entidade/{id}
// delete  → DELETE /rest/api/custom/v1/entidade/{id}
```
```

- [ ] **Verificar que o arquivo foi criado:**

```powershell
Test-Path "skills\poui-code-generation\templates-tlpp-contract.md"
```
Esperado: `True`

- [ ] **Commitar:**

```bash
git add skills/poui-code-generation/templates-tlpp-contract.md
git commit -m "docs(plugin): add TLPP REST contract template — endpoints, error format, WsRestFul skeleton"
```

---

## Task 3: Criar `templates-models.md`

**Files:**
- Create: `skills/poui-code-generation/templates-models.md`

- [ ] **Criar o arquivo com o seguinte conteúdo completo:**

```markdown
# Template: Models

Padrões TypeScript para interfaces de modelo em projetos PO-UI / Protheus.

---

## Model simples

Para entidades com chave única e campos primitivos:

```typescript
// src/app/<modulo>/models/<entidade>.model.ts
export interface Produto {
  codigo: string;       // chave — sempre string no Protheus
  descricao: string;
  unidade: string;      // ex: 'UN', 'KG', 'CX'
  preco: number;
  estoque: number;
  ativo: string;        // 'S' | 'N' — padrão Protheus para boolean
}
```

---

## Model com chave composta Protheus (código + loja)

A maioria das entidades do módulo de Compras/Vendas usa chave composta:

```typescript
// src/app/<modulo>/models/<entidade>.model.ts
export interface ProtheusKey {
  codigo: string;   // 6 chars (A1_COD, A2_COD, etc.)
  loja: string;     // 2 chars (A1_LOJA, A2_LOJA, etc.)
}

export interface Fornecedor extends ProtheusKey {
  razaoSocial: string;
  cnpj: string;
  email: string;
  telefone: string;
  cidade: string;
  estado: string;
  ativo: string;    // 'S' | 'N'
}

export interface Cliente extends ProtheusKey {
  nomeFantasia: string;
  razaoSocial: string;
  cnpj: string;
  email: string;
  limiteCredito: number;
}
```

No service, as operações por chave usam ambos os campos:

```typescript
// Em <entidade>.service.ts
getByKey(codigo: string, loja: string): Observable<Fornecedor> {
  return this.http.get<Fornecedor>(`${this.baseUrl}/${codigo}/${loja}`);
}

deleteByKey(codigo: string, loja: string): Observable<void> {
  return this.http.delete<void>(`${this.baseUrl}/${codigo}/${loja}`);
}
```

---

## Model com relacionamento (campos flat — padrão Protheus)

> **Importante:** Protheus **não** retorna objetos aninhados.
> Retorna campos "achatados" com prefixo. Não use objetos compostos
> como `{ fornecedor: { codigo, nome } }` — o backend Protheus retornará
> `fornecedorCodigo` e `fornecedorNome` no mesmo nível do objeto raiz.

```typescript
// src/app/<modulo>/models/nota-fiscal.model.ts
export interface NotaFiscal {
  numero: string;
  serie: string;
  dataEmissao: string;        // ISO 8601: 'YYYY-MM-DD'
  valorTotal: number;

  // Relacionamento fornecedor — campos flat com prefixo
  fornecedorCodigo: string;
  fornecedorLoja: string;
  fornecedorNome: string;     // desnormalizado para exibição

  // Relacionamento filial
  filialCodigo: string;
  filialDescricao: string;
}
```

Este padrão flat simplifica o binding no template e evita navegação
opcional (`?.`) em toda a view:

```typescript
// Coluna na po-table — campo flat, sem navegação de objeto
{ property: 'fornecedorNome', label: 'Fornecedor' },
{ property: 'dataEmissao',    label: 'Emissão', type: 'date' },
{ property: 'valorTotal',     label: 'Valor',   type: 'currency' },
```

---

## Tipos de campo comuns no Protheus

| Campo Protheus | Tipo TypeScript | Observação |
|----------------|----------------|-----------|
| Código (6 chars) | `string` | Nunca `number` — pode ter zeros à esquerda |
| Loja (2 chars) | `string` | Sempre string |
| Data | `string` | ISO 8601 (`'YYYY-MM-DD'`) ou formato Protheus (`'YYYYMMDD'`) |
| Valor monetário | `number` | |
| Quantidade | `number` | |
| Flag S/N | `string` | `'S'` \| `'N'` — não boolean |
| Descrição | `string` | |
```

- [ ] **Verificar que o arquivo foi criado:**

```powershell
Test-Path "skills\poui-code-generation\templates-models.md"
```
Esperado: `True`

- [ ] **Commitar:**

```bash
git add skills/poui-code-generation/templates-models.md
git commit -m "docs(plugin): add models template — simple, composite key, flat relational patterns"
```

---

## Task 4: Editar `templates-module.md` — adicionar bloco tsconfig

**Files:**
- Modify: `skills/poui-code-generation/templates-module.md` (após o bloco `proxy.conf.json`, linha ~232)

- [ ] **Adicionar o seguinte bloco ao final do arquivo** (após o bloco `proxy.conf.json`):

```markdown

---

## tsconfig.json — desabilitar strict mode

Todos os projetos PO-UI / Protheus devem desabilitar o strict mode para evitar
erros de compilação gerados pelas restrições do TypeScript strict com os padrões
de criação de objetos usados pelas libs do Protheus:

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

Edite o arquivo `tsconfig.json` na raiz do projeto e altere `"strict": true` para
`"strict": false` e `"noPropertyAccessFromIndexSignature": true` para `false`.
As demais flags (`noImplicitOverride`, `noImplicitReturns`, `noFallthroughCasesInSwitch`)
podem ser mantidas pois não causam incompatibilidades.
```

- [ ] **Commitar:**

```bash
git add skills/poui-code-generation/templates-module.md
git commit -m "docs(plugin): add tsconfig strict:false guidance to module template"
```

---

## Task 5: Editar `module-structure.md` — nota NgModule vs Standalone

**Files:**
- Modify: `skills/poui-patterns/module-structure.md` (após o bloco `## Escolha do padrão de componente`, linha ~118)

- [ ] **Adicionar a seguinte seção após o bloco `## Toolbar: shell vs por componente`** (após a linha com "Permite título dinâmico por página."):

```markdown

---

## NgModule vs Standalone — qual usar?

Este plugin gera **Standalone Components** (padrão Angular 17+):

```typescript
@Component({
  standalone: true,       // ← standalone
  imports: [PoTableModule],
  ...
})
```

**O curso POUI usa `ng new --no-standalone`** (NgModules) por compatibilidade com
versões de Angular anteriores ao 17. Ambos funcionam com PO-UI e Protheus.

| | Standalone (este plugin) | NgModules (curso) |
|---|---|---|
| Angular mínimo | 14+ (estável no 17) | Todas as versões |
| Padrão oficial | ✅ Angular 17+ recomendado | ⚠️ Legado |
| Geração | `ng new <projeto>` | `ng new <projeto> --no-standalone` |
| Bootstrap | `bootstrapApplication()` | `platformBrowserDynamic().bootstrapModule()` |
| Providers | `app.config.ts` | `app.module.ts` |

**Para projetos novos: use Standalone.** Para integrar em projetos NgModule
existentes, envolva o componente em um `NgModule` wrapper e importe nos
módulos que precisam dele.
```

- [ ] **Commitar:**

```bash
git add skills/poui-patterns/module-structure.md
git commit -m "docs(plugin): add NgModule vs Standalone comparison to module-structure"
```

---

## Task 6: Editar `templates-page-edit.md` — enriquecer validação de campos

**Files:**
- Modify: `skills/poui-code-generation/templates-page-edit.md` (bloco `fields`, linhas 54-77)

- [ ] **Substituir o bloco `readonly fields` atual** pelo bloco enriquecido com mais exemplos de validação:

Substituir de:
```typescript
  // TODO: define fields matching {{ModelInterface}} properties
  // Use `divider` to create section headers, `options` for selects,
  // `type: 'cpf'|'cnpj'|'cep'` for masked fields.
  readonly fields: PoDynamicFormField[] = [
    {
      property: 'codigo',
      label: 'Código',
      divider: 'Dados Principais',
      maxLength: 6,
      required: true,
    },
    {
      property: 'nome',
      label: 'Nome',
      maxLength: 40,
      required: true,
    },
    // Example select:
    // {
    //   property: 'situacao',
    //   label: 'Situação',
    //   options: [
    //     { label: 'Ativo',    value: '1' },
    //     { label: 'Inativo',  value: '2' },
    //   ],
    // },
  ];
```

Para:
```typescript
  // TODO: define fields matching {{ModelInterface}} properties.
  // Use `divider` to create section headers.
  // Use `gridColumns` (1-12) to control width in the form grid.
  readonly fields: PoDynamicFormField[] = [
    // --- Texto com comprimento obrigatório ---
    {
      property: 'codigo',
      label: 'Código',
      divider: 'Dados Principais',  // cria cabeçalho de seção acima deste campo
      required: true,
      maxLength: 6,
      gridColumns: 6,
    },
    {
      property: 'nome',
      label: 'Nome / Razão Social',
      required: true,
      minLength: 3,
      maxLength: 40,
      gridColumns: 12,
    },

    // --- E-mail com regex ---
    {
      property: 'email',
      label: 'E-mail',
      required: false,
      regex: '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$',
      errorMessage: 'Informe um e-mail válido',
      gridColumns: 12,
    },

    // --- Valor monetário ---
    {
      property: 'valor',
      label: 'Valor',
      type: 'currency',
      required: true,
      min: 0,
      gridColumns: 6,
    },

    // --- Campos com máscara nativa PO-UI ---
    // {
    //   property: 'cnpj',
    //   label: 'CNPJ',
    //   type: 'cnpj',     // aplica máscara e validação automática
    //   required: true,
    //   gridColumns: 6,
    // },
    // {
    //   property: 'cpf',
    //   label: 'CPF',
    //   type: 'cpf',
    //   required: true,
    //   gridColumns: 6,
    // },
    // {
    //   property: 'cep',
    //   label: 'CEP',
    //   type: 'cep',
    //   gridColumns: 4,
    // },
    // {
    //   property: 'telefone',
    //   label: 'Telefone',
    //   mask: '(99) 99999-9999',
    //   gridColumns: 4,
    // },

    // --- Select (options fixas) ---
    // {
    //   property: 'situacao',
    //   label: 'Situação',
    //   divider: 'Status',
    //   options: [
    //     { label: 'Ativo',   value: '1' },
    //     { label: 'Inativo', value: '2' },
    //   ],
    //   gridColumns: 6,
    // },

    // --- Data ---
    // {
    //   property: 'dataEmissao',
    //   label: 'Data de Emissão',
    //   type: 'date',
    //   required: true,
    //   gridColumns: 4,
    // },

    // --- Número inteiro com limites ---
    // {
    //   property: 'quantidade',
    //   label: 'Quantidade',
    //   type: 'number',
    //   min: 0,
    //   max: 9999,
    //   gridColumns: 4,
    // },
  ];
```

- [ ] **Commitar:**

```bash
git add skills/poui-code-generation/templates-page-edit.md
git commit -m "docs(plugin): enrich page-edit fields with regex, currency, mask and validation examples"
```

---

## Task 7: Atualizar SKILL.md do poui-code-generation com novos templates

**Files:**
- Modify: `skills/poui-code-generation/SKILL.md`

- [ ] **Adicionar os dois novos templates na tabela `### Other`:**

Substituir:
```markdown
| **service** | `templates-service.md` | Angular service consuming Protheus REST CRUD |
| **module** | `templates-module.md` | App scaffold: config, routes, shell, package.json, proxy |
| **dashboard** | `templates-dashboard.md` | Analytics page: po-widget KPIs + po-chart |
```

Por:
```markdown
| **service** | `templates-service.md` | Angular service consuming Protheus REST CRUD |
| **module** | `templates-module.md` | App scaffold: config, routes, shell, package.json, proxy, tsconfig |
| **dashboard** | `templates-dashboard.md` | Analytics page: po-widget KPIs + po-chart |
| **models** | `templates-models.md` | TypeScript model interfaces: simple, composite key, flat relational |
| **tlpp-contract** | `templates-tlpp-contract.md` | Backend REST contract: endpoints, error format, WsRestFul skeleton |
```

- [ ] **Commitar:**

```bash
git add skills/poui-code-generation/SKILL.md
git commit -m "docs(plugin): register models and tlpp-contract templates in SKILL.md index"
```

---

## Task 8: Verificação final

- [ ] **Listar todos os arquivos do plugin para confirmar estrutura:**

```powershell
Get-ChildItem -Recurse "skills" -Filter "*.md" | Select-Object FullName
```

Esperado — deve aparecer (entre outros):
```
skills\poui-code-generation\templates-models.md
skills\poui-code-generation\templates-tlpp-contract.md
skills\poui-patterns\deploy-protheus.md
```

- [ ] **Confirmar que todos os 7 commits foram criados:**

```bash
git log --oneline -8
```

Esperado: 7 commits de `docs(plugin): ...` mais recentes.

- [ ] **Verificar ausência de arquivos temporários ou indesejados:**

```bash
git status
```

Esperado: `nothing to commit, working tree clean`
