# Design — Wave 1: CRUD de Funcionários (RH)

**Data:** 2026-06-24
**Objetivo:** Testar o plugin poui-specialist com um domínio novo (RH), sem reuso de código dos projetos existentes (financeiro, faturamento, compras, ecommerce).

---

## 1. Arquitetura e estrutura de arquivos

Módulo isolado em `src/app/rh/`, lazy-loaded via router. Sem dependência de nenhum módulo existente no projeto.

```
src/app/rh/
├── funcionarios/
│   ├── funcionarios-list.component.ts
│   ├── funcionarios-list.component.html
│   ├── funcionarios-list.component.scss
│   ├── funcionarios-edit.component.ts
│   ├── funcionarios-edit.component.html
│   ├── funcionarios-edit.component.scss
│   └── funcionarios-detail.component.ts
│   └── funcionarios-detail.component.html
│   └── funcionarios-detail.component.scss
├── models/
│   └── funcionario.model.ts
├── services/
│   └── funcionarios.service.ts
├── mocks/
│   └── funcionarios.interceptor.ts
└── rh.routes.ts
```

O interceptor fica dentro do próprio módulo RH para não contaminar o `app.config.ts` principal.

---

## 2. Modelo de dados (tabela SRA do Protheus)

### Interface TypeScript (`funcionario.model.ts`)

Campos agrupados em 4 seções refletindo o formulário:

#### Dados Pessoais
| Campo SRA  | Propriedade TS   | Label             | Tipo Angular       | Regras         |
|------------|------------------|-------------------|--------------------|----------------|
| `RA_MAT`   | `matricula`      | Matrícula         | `po-input`         | obrigatório    |
| `RA_NOME`  | `nome`           | Nome              | `po-input`         | obrigatório    |
| `RA_CIC`   | `cpf`            | CPF               | `po-input` c/ másc | —              |
| `RA_NASC`  | `dataNascimento` | Data Nascimento   | `po-datepicker`    | —              |
| `RA_ESCOL` | `escolaridade`   | Escolaridade      | `po-select`        | —              |
| `RA_DEFFI` | `deficiencia`    | Deficiência       | `po-select`        | —              |

#### Dados Profissionais
| Campo SRA    | Propriedade TS  | Label           | Tipo Angular    | Regras      |
|--------------|-----------------|-----------------|-----------------|-------------|
| `RA_CARGO`   | `cargo`         | Cargo           | `po-input`      | —           |
| `RA_DEPTO`   | `departamento`  | Departamento    | `po-input`      | —           |
| `RA_CCUSTO`  | `centroCusto`   | Centro de Custo | `po-input`      | —           |
| `RA_ADMISSA` | `dataAdmissao`  | Data Admissão   | `po-datepicker` | obrigatório |
| `RA_SITFOLH` | `situacao`      | Situação        | `po-select`     | Ativo / Inativo / Afastado |
| `RA_TPCONTR` | `tipoContrato`  | Tipo Contrato   | `po-select`     | CLT / PJ / Estagiário |
| `RA_TURNO`   | `turno`         | Turno           | `po-select`     | —           |
| `RA_SALARIO` | `salario`       | Salário         | `po-decimal`    | —           |

#### Endereço
| Campo SRA  | Propriedade TS | Label      | Tipo Angular |
|------------|----------------|------------|--------------|
| `RA_END`   | `endereco`     | Endereço   | `po-input`   |
| `RA_BAIRRO`| `bairro`       | Bairro     | `po-input`   |
| `RA_MUN`   | `municipio`    | Município  | `po-input`   |
| `RA_EST`   | `estado`       | Estado     | `po-select` (UF) |
| `RA_CEP`   | `cep`          | CEP        | `po-input` c/ másc |

#### Dados Bancários
| Campo SRA     | Propriedade TS | Label   | Tipo Angular |
|---------------|----------------|---------|--------------|
| `RA_BANCO`    | `banco`        | Banco   | `po-input`   |
| `RA_AGENCIA`  | `agencia`      | Agência | `po-input`   |
| `RA_NUMCONT`  | `conta`        | Conta   | `po-input`   |

### Colunas na listagem (`po-table`)
Matrícula · Nome · Cargo · Departamento · Situação · Data Admissão

### Filtros avançados (painel do `po-page-dynamic-search`)
Nome, Situação, Departamento, faixa de Data Admissão (de / até) — definidos via `p-filters` do componente

---

## 3. REST e Mock Interceptor

### Endpoints (padrão TOTVS com filial)

| Operação | Método | Endpoint                                              |
|----------|--------|-------------------------------------------------------|
| Listar   | GET    | `/rh/funcionarios?filial=01&page=1&pageSize=20`       |
| Detalhar | GET    | `/rh/funcionarios/:mat?filial=01`                     |
| Criar    | POST   | `/rh/funcionarios`                                    |
| Editar   | PUT    | `/rh/funcionarios/:mat`                               |
| Excluir  | DELETE | `/rh/funcionarios/:mat`                               |

Header obrigatório em todas as chamadas: `X-Tenant-Id: {tenantId}`

### Mock Interceptor (`funcionarios.interceptor.ts`)

- Intercepta qualquer URL que contenha `/rh/funcionarios`
- Identifica o método HTTP e devolve JSON correspondente com delay simulado de 500ms
- **GET lista:** retorna array de 8 funcionários fictícios com todos os campos preenchidos
- **GET detalhe:** retorna o funcionário correspondente à matrícula na URL
- **POST / PUT:** retornam `{ status: 'ok' }` com o objeto enviado
- **DELETE:** retorna `204 No Content`
- Registrado no array `providers` da definição de rota em `rh.routes.ts`, isolado do `app.config.ts` principal — não altera o `provideHttpClient` global

---

## 4. Componentes

### `funcionarios-list` (`po-page-dynamic-search`)
- `po-page-dynamic-search` **é** o componente de página — substitui o `po-page-list` quando há filtros avançados; não é um painel separado
- Ações de página: **Novo**
- Ações por linha: **Editar**, **Detalhar**, **Excluir** (com confirmação)
- Filtro rápido embutido na barra de busca do próprio `po-page-dynamic-search`
- Painel de filtros avançados: Nome, Situação, Departamento, faixa de Data Admissão

### `funcionarios-edit` (`po-page-edit`)
- Formulário reativo com 4 `po-divider` separando as seções
- Validação de campos obrigatórios antes de salvar
- Modo **novo** (POST) e modo **edição** (PUT) pelo parâmetro de rota `:mat`
- Breadcrumb: RH > Funcionários > Novo / Editar

### `funcionarios-detail` (`po-page-detail`)
- Exibe os mesmos campos em modo somente-leitura
- Ação **Editar** navega para `funcionarios-edit`
- Breadcrumb: RH > Funcionários > Detalhe

---

## 5. Roteamento (`rh.routes.ts`)

```
/rh/funcionarios          → FuncionariosListComponent
/rh/funcionarios/novo     → FuncionariosEditComponent
/rh/funcionarios/:mat     → FuncionariosDetailComponent
/rh/funcionarios/:mat/editar → FuncionariosEditComponent
```

---

## 6. Sequência de geração com o plugin

1. `/poui-specialist:generate` — gerar service + model + interceptor
2. `/poui-specialist:generate` — gerar page-list
3. `/poui-specialist:generate` — gerar page-edit
4. `/poui-specialist:generate` — gerar page-detail
5. Ajustar `rh.routes.ts` e registrar interceptor
6. Rodar `ng serve` e validar visualmente no browser
7. `/poui-specialist:test` — gerar testes Karma/Jasmine para o service e o list component
