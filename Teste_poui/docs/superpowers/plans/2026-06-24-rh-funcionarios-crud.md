# RH — CRUD de Funcionários (Wave 1) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gerar e validar um CRUD completo de Funcionários (módulo RH) usando o plugin poui-specialist, sem tocar nenhum dos módulos existentes no projeto.

**Architecture:** Módulo isolado em `src/app/rh/` com lazy-loading via `app.routes.ts`. O plugin gera model, service, page-list, page-edit e page-detail. Um interceptor HTTP manual simula o backend Protheus enquanto os endpoints REST não existem. O interceptor é registrado via `HTTP_INTERCEPTORS` no `app.config.ts` — abordagem compatível com o `withInterceptorsFromDi()` já em uso no projeto.

**Tech Stack:** Angular 17+, PO-UI (`@po-ui/ng-components`, `@po-ui/ng-templates`), Protheus-lib-core, Karma/Jasmine

## Global Constraints

- Todos os componentes: `standalone: true`, `ChangeDetectionStrategy.OnPush`
- Injeção de dependência via `inject()` — nunca via construtor
- Signals para estado mutável: `signal<T>()`
- `takeUntilDestroyed(this.destroyRef)` para cancelar subscriptions
- Imports de `@po-ui/ng-components` e `@po-ui/ng-templates` em cada componente que os usa (não module-level)
- Cabeçalho `@generated poui-specialist v1.0` em todos os arquivos gerados pelo plugin
- Nenhum arquivo dos módulos existentes (financeiro, faturamento, compras, ecommerce) deve ser modificado, exceto `app.routes.ts` e `app.config.ts`
- Tabela Protheus de referência: `SRA` (Funcionários)

---

## Mapa de arquivos

| Arquivo | Responsabilidade | Origem |
|---------|-----------------|--------|
| `src/app/rh/models/funcionario.model.ts` | Interfaces `Funcionario`, `FuncionarioForm`, `FuncionariosResponse` | Plugin |
| `src/app/rh/services/funcionarios.service.ts` | CRUD HTTP TOTVS com filial e paginação | Plugin |
| `src/app/rh/mocks/funcionarios.interceptor.ts` | Mock HTTP com 8 funcionários fictícios | Manual |
| `src/app/rh/funcionarios/funcionarios-list.component.ts/html/scss` | `po-page-dynamic-search` + tabela + ações | Plugin |
| `src/app/rh/funcionarios/funcionarios-edit.component.ts/html/scss` | `po-page-edit` com 4 seções via `po-divider` | Plugin |
| `src/app/rh/funcionarios/funcionarios-detail.component.ts/html/scss` | `po-page-detail` somente-leitura | Plugin |
| `src/app/app.routes.ts` | Adiciona 4 rotas `/rh/funcionarios/...` | Modificar |
| `src/app/app.config.ts` | Registra `FuncionariosInterceptor` | Modificar |

---

## Task 1: Model + Service (via plugin)

**Files:**
- Create: `src/app/rh/models/funcionario.model.ts`
- Create: `src/app/rh/services/funcionarios.service.ts`

**Interfaces:**
- Produz: `Funcionario`, `FuncionarioForm`, `FuncionariosResponse`, `FuncionariosService`

- [ ] **Step 1: Criar estrutura de diretórios**

```powershell
New-Item -ItemType Directory -Force src/app/rh/models
New-Item -ItemType Directory -Force src/app/rh/services
New-Item -ItemType Directory -Force src/app/rh/mocks
New-Item -ItemType Directory -Force src/app/rh/funcionarios
```

- [ ] **Step 2: Rodar o plugin para gerar model e service**

Executar o comando `/poui-specialist:generate` com o seguinte brief:

```
Gerar model + service para CRUD de Funcionários (tabela SRA do Protheus).

Entidade: Funcionario
Tabela Protheus: SRA

Campos:
- matricula (RA_MAT) — string, obrigatório
- nome (RA_NOME) — string, obrigatório
- cpf (RA_CIC) — string
- dataNascimento (RA_NASC) — string (ISO date)
- escolaridade (RA_ESCOL) — string
- deficiencia (RA_DEFFI) — string
- cargo (RA_CARGO) — string
- departamento (RA_DEPTO) — string
- centroCusto (RA_CCUSTO) — string
- dataAdmissao (RA_ADMISSA) — string, obrigatório
- situacao (RA_SITFOLH) — string ('A'|'I'|'F')
- tipoContrato (RA_TPCONTR) — string ('CLT'|'PJ'|'EST')
- turno (RA_TURNO) — string
- salario (RA_SALARIO) — number
- endereco (RA_END) — string
- bairro (RA_BAIRRO) — string
- municipio (RA_MUN) — string
- estado (RA_EST) — string (UF)
- cep (RA_CEP) — string
- banco (RA_BANCO) — string
- agencia (RA_AGENCIA) — string
- conta (RA_NUMCONT) — string

Endpoints (padrão TOTVS com filial):
- GET    /rh/funcionarios?filial=01&page=1&pageSize=20
- GET    /rh/funcionarios/:mat?filial=01
- POST   /rh/funcionarios
- PUT    /rh/funcionarios/:mat
- DELETE /rh/funcionarios/:mat

Header obrigatório: X-Tenant-Id

Paths de saída:
- model:   src/app/rh/models/funcionario.model.ts
- service: src/app/rh/services/funcionarios.service.ts
```

- [ ] **Step 3: Verificar model gerado**

O arquivo `src/app/rh/models/funcionario.model.ts` deve conter:
- Interface `Funcionario` com todos os 22 campos listados acima
- Interface `FuncionarioForm` (subset para POST/PUT — sem campos read-only)
- Interface `FuncionariosResponse` com `items: Funcionario[]` e `hasNext: boolean`

Se algum campo estiver faltando, adicionar manualmente.

- [ ] **Step 4: Verificar service gerado**

O arquivo `src/app/rh/services/funcionarios.service.ts` deve conter:
- `@Injectable({ providedIn: 'root' })`
- Injeção via `inject(HttpClient)`
- `baseUrl = '/rh/funcionarios'`
- `tenantId` como header `X-Tenant-Id`
- Métodos: `getAll(params)`, `getById(mat)`, `create(data)`, `update(mat, data)`, `remove(mat)`
- Parâmetros `filial`, `page`, `pageSize` no `getAll`

- [ ] **Step 5: Commit**

```bash
git add src/app/rh/models/funcionario.model.ts src/app/rh/services/funcionarios.service.ts
git commit -m "feat(rh): model e service de Funcionários — Wave 1"
```

---

## Task 2: Mock Interceptor (manual)

**Files:**
- Create: `src/app/rh/mocks/funcionarios.interceptor.ts`
- Modify: `src/app/app.config.ts`

**Interfaces:**
- Consome: `Funcionario` de `../models/funcionario.model`
- Produz: `FuncionariosInterceptor` (classe `HttpInterceptor`)

- [ ] **Step 1: Criar o interceptor**

Criar `src/app/rh/mocks/funcionarios.interceptor.ts` com o conteúdo:

```typescript
/**
 * @author     Andre Costa <andre.andrelscosta@gmail.com>
 */
import { Injectable } from '@angular/core';
import {
  HttpEvent, HttpHandler, HttpInterceptor,
  HttpRequest, HttpResponse,
} from '@angular/common/http';
import { Observable, delay, of } from 'rxjs';
import { Funcionario } from '../models/funcionario.model';

const MOCK_FUNCIONARIOS: Funcionario[] = [
  {
    matricula: '000001', nome: 'ANA PAULA RODRIGUES SILVA', cpf: '123.456.789-01',
    dataNascimento: '1990-03-15', escolaridade: '9', deficiencia: '0',
    cargo: 'ANALISTA DE RH', departamento: '001', centroCusto: '0101',
    dataAdmissao: '2018-07-02', situacao: 'A', tipoContrato: 'CLT',
    turno: '1', salario: 5800.00,
    endereco: 'RUA DAS FLORES, 123', bairro: 'CENTRO', municipio: 'SAO PAULO',
    estado: 'SP', cep: '01310-100',
    banco: '001', agencia: '1234', conta: '56789-0',
  },
  {
    matricula: '000002', nome: 'CARLOS HENRIQUE MENDES', cpf: '987.654.321-00',
    dataNascimento: '1985-11-22', escolaridade: '10', deficiencia: '0',
    cargo: 'GERENTE FINANCEIRO', departamento: '002', centroCusto: '0201',
    dataAdmissao: '2015-01-10', situacao: 'A', tipoContrato: 'CLT',
    turno: '1', salario: 12000.00,
    endereco: 'AV. PAULISTA, 1000 APTO 52', bairro: 'BELA VISTA', municipio: 'SAO PAULO',
    estado: 'SP', cep: '01310-200',
    banco: '237', agencia: '5678', conta: '12345-6',
  },
  {
    matricula: '000003', nome: 'FERNANDA COSTA LIMA', cpf: '111.222.333-44',
    dataNascimento: '1995-06-30', escolaridade: '9', deficiencia: '0',
    cargo: 'DESENVOLVEDORA FRONTEND', departamento: '003', centroCusto: '0301',
    dataAdmissao: '2022-03-14', situacao: 'A', tipoContrato: 'PJ',
    turno: '2', salario: 8500.00,
    endereco: 'RUA AUGUSTA, 500', bairro: 'CONSOLACAO', municipio: 'SAO PAULO',
    estado: 'SP', cep: '01304-001',
    banco: '341', agencia: '9012', conta: '34567-8',
  },
  {
    matricula: '000004', nome: 'JOAO VITOR SANTOS OLIVEIRA', cpf: '555.666.777-88',
    dataNascimento: '1992-08-18', escolaridade: '8', deficiencia: '0',
    cargo: 'AUXILIAR DE PRODUCAO', departamento: '004', centroCusto: '0401',
    dataAdmissao: '2020-09-01', situacao: 'F', tipoContrato: 'CLT',
    turno: '3', salario: 2200.00,
    endereco: 'RUA DAS INDUSTRIAS, 77', bairro: 'VILA LEOPOLDINA', municipio: 'SAO PAULO',
    estado: 'SP', cep: '05305-060',
    banco: '104', agencia: '3456', conta: '78901-2',
  },
  {
    matricula: '000005', nome: 'MARIANA SOUZA PEREIRA', cpf: '222.333.444-55',
    dataNascimento: '1988-12-05', escolaridade: '10', deficiencia: '1',
    cargo: 'COORDENADORA DE COMPRAS', departamento: '005', centroCusto: '0501',
    dataAdmissao: '2017-04-03', situacao: 'A', tipoContrato: 'CLT',
    turno: '1', salario: 9200.00,
    endereco: 'RUA VERGUEIRO, 2000', bairro: 'PARAISO', municipio: 'SAO PAULO',
    estado: 'SP', cep: '04101-000',
    banco: '033', agencia: '7890', conta: '23456-7',
  },
  {
    matricula: '000006', nome: 'ROBERTO ALVES CARVALHO', cpf: '444.555.666-77',
    dataNascimento: '1979-02-28', escolaridade: '10', deficiencia: '0',
    cargo: 'DIRETOR COMERCIAL', departamento: '006', centroCusto: '0601',
    dataAdmissao: '2010-08-15', situacao: 'A', tipoContrato: 'CLT',
    turno: '1', salario: 22000.00,
    endereco: 'ALAMEDA SANTOS, 300 APTO 141', bairro: 'JARDINS', municipio: 'SAO PAULO',
    estado: 'SP', cep: '01419-001',
    banco: '001', agencia: '2345', conta: '67890-1',
  },
  {
    matricula: '000007', nome: 'PATRICIA NOGUEIRA RAMOS', cpf: '777.888.999-00',
    dataNascimento: '1997-09-14', escolaridade: '7', deficiencia: '0',
    cargo: 'ESTAGIARIA MARKETING', departamento: '007', centroCusto: '0701',
    dataAdmissao: '2025-02-01', situacao: 'A', tipoContrato: 'EST',
    turno: '1', salario: 1320.00,
    endereco: 'RUA BELA CINTRA, 400', bairro: 'CERQUEIRA CESAR', municipio: 'SAO PAULO',
    estado: 'SP', cep: '01415-001',
    banco: '237', agencia: '4567', conta: '89012-3',
  },
  {
    matricula: '000008', nome: 'GUSTAVO FERREIRA TEIXEIRA', cpf: '000.111.222-33',
    dataNascimento: '1983-07-09', escolaridade: '9', deficiencia: '0',
    cargo: 'ANALISTA DE SUPORTE TI', departamento: '003', centroCusto: '0302',
    dataAdmissao: '2019-11-25', situacao: 'I', tipoContrato: 'CLT',
    turno: '2', salario: 4500.00,
    endereco: 'AV. REBOUCAS, 1500', bairro: 'PINHEIROS', municipio: 'SAO PAULO',
    estado: 'SP', cep: '05401-300',
    banco: '104', agencia: '6789', conta: '01234-5',
  },
];

@Injectable()
export class FuncionariosInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (!req.url.includes('/rh/funcionarios')) {
      return next.handle(req);
    }

    const mat = this.extractMat(req.url);

    if (req.method === 'GET' && !mat) {
      const page     = Number(new URL(req.url, 'http://x').searchParams.get('page') ?? 1);
      const pageSize = Number(new URL(req.url, 'http://x').searchParams.get('pageSize') ?? 20);
      const q        = new URL(req.url, 'http://x').searchParams.get('q') ?? '';
      const filtered = q
        ? MOCK_FUNCIONARIOS.filter(f =>
            f.nome.toLowerCase().includes(q.toLowerCase()) ||
            f.matricula.includes(q))
        : MOCK_FUNCIONARIOS;
      const start  = (page - 1) * pageSize;
      const items  = filtered.slice(start, start + pageSize);
      return of(new HttpResponse({ status: 200, body: { items, hasNext: start + pageSize < filtered.length } }))
        .pipe(delay(500));
    }

    if (req.method === 'GET' && mat) {
      const item = MOCK_FUNCIONARIOS.find(f => f.matricula === mat) ?? MOCK_FUNCIONARIOS[0];
      return of(new HttpResponse({ status: 200, body: item })).pipe(delay(500));
    }

    if (req.method === 'POST' || req.method === 'PUT') {
      return of(new HttpResponse({ status: 200, body: { status: 'ok', ...req.body as object } })).pipe(delay(500));
    }

    if (req.method === 'DELETE') {
      return of(new HttpResponse({ status: 204, body: null })).pipe(delay(300));
    }

    return next.handle(req);
  }

  private extractMat(url: string): string | null {
    const match = url.match(/\/rh\/funcionarios\/([^?]+)/);
    return match ? match[1] : null;
  }
}
```

- [ ] **Step 2: Registrar o interceptor em app.config.ts**

Adicionar os imports e o provider em `src/app/app.config.ts`:

```typescript
// Adicionar ao bloco de imports existente:
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { FuncionariosInterceptor } from './rh/mocks/funcionarios.interceptor';

// Adicionar ao array providers (após o provideHttpClient existente):
{ provide: HTTP_INTERCEPTORS, useClass: FuncionariosInterceptor, multi: true },
```

- [ ] **Step 3: Verificar compilação**

```bash
npx ng build --configuration development 2>&1 | tail -20
```

Esperado: nenhum erro de compilação.

- [ ] **Step 4: Commit**

```bash
git add src/app/rh/mocks/funcionarios.interceptor.ts src/app/app.config.ts
git commit -m "feat(rh): mock interceptor HTTP para Funcionários — Wave 1"
```

---

## Task 3: Funcionários List (via plugin)

**Files:**
- Create: `src/app/rh/funcionarios/funcionarios-list.component.ts`
- Create: `src/app/rh/funcionarios/funcionarios-list.component.html`
- Create: `src/app/rh/funcionarios/funcionarios-list.component.scss`

**Interfaces:**
- Consome: `FuncionariosService.getAll()`, `FuncionariosService.remove(mat)`
- Produz: `FuncionariosListComponent` (seletor `app-funcionarios-list`)

- [ ] **Step 1: Rodar o plugin**

Executar `/poui-specialist:generate` com o brief:

```
Gerar page-list (po-page-dynamic-search) para Funcionários (RH).

Componente: FuncionariosListComponent
Seletor: app-funcionarios-list
Rota base: /rh/funcionarios
Service: FuncionariosService (src/app/rh/services/funcionarios.service.ts)
Model: Funcionario (src/app/rh/models/funcionario.model.ts)

Colunas na tabela:
- matricula  → label 'Matrícula',  width '10%', sortable true
- nome       → label 'Nome',       sortable true
- cargo      → label 'Cargo',      width '18%'
- departamento → label 'Depto',    width '10%'
- situacao   → label 'Situação',   width '10%', type 'label',
               labels: [
                 { value: 'A', color: 'color-11', label: 'Ativo' },
                 { value: 'I', color: 'color-07', label: 'Inativo' },
                 { value: 'F', color: 'color-08', label: 'Afastado' },
               ]
- dataAdmissao → label 'Admissão', width '12%', type 'date', format 'dd/MM/yyyy'

Filtros avançados (p-filters no po-page-dynamic-search):
- nome          → label 'Nome',         gridColumns 6
- situacao      → label 'Situação',     gridColumns 6, options [{value:'A',label:'Ativo'},{value:'I',label:'Inativo'},{value:'F',label:'Afastado'}]
- departamento  → label 'Departamento', gridColumns 6
- admissaoDe   → label 'Admissão De',  gridColumns 6, type 'date'
- admissaoAte  → label 'Admissão Até', gridColumns 6, type 'date'

Ações de página: [ { label: 'Incluir', icon: 'po-icon-plus', navega para /rh/funcionarios/novo } ]

Ações por linha:
- Editar    → navega para /rh/funcionarios/:matricula/editar
- Visualizar → navega para /rh/funcionarios/:matricula
- Excluir   → confirmação dialog, chama service.remove(matricula), recarrega lista

Paths de saída:
- src/app/rh/funcionarios/funcionarios-list.component.ts
- src/app/rh/funcionarios/funcionarios-list.component.html
- src/app/rh/funcionarios/funcionarios-list.component.scss
```

- [ ] **Step 2: Verificar pontos críticos**

Abrir `funcionarios-list.component.ts` e confirmar:
- `standalone: true`, `ChangeDetectionStrategy.OnPush`
- Import de `PoPageDynamicSearchModule` de `@po-ui/ng-templates`
- Import de `PoTableModule`, `PoToolbarModule` de `@po-ui/ng-components`
- `inject(FuncionariosService)`, `inject(Router)`, `inject(PoDialogService)`, `inject(PoNotificationService)`, `inject(DestroyRef)`
- `readonly items = signal<Funcionario[]>([])`
- `readonly loading = signal(false)`
- Método `load()` que chama `this.service.getAll(...)` e usa `takeUntilDestroyed(this.destroyRef)`
- Handler `onAdvancedSearch`, `onQuickSearch`, `onChangeDisclaimers`, `onShowMore`

- [ ] **Step 3: Commit**

```bash
git add src/app/rh/funcionarios/funcionarios-list.component.*
git commit -m "feat(rh): page-list de Funcionários — Wave 1"
```

---

## Task 4: Funcionários Edit (via plugin)

**Files:**
- Create: `src/app/rh/funcionarios/funcionarios-edit.component.ts`
- Create: `src/app/rh/funcionarios/funcionarios-edit.component.html`
- Create: `src/app/rh/funcionarios/funcionarios-edit.component.scss`

**Interfaces:**
- Consome: `FuncionariosService.getById(mat)`, `FuncionariosService.create(data)`, `FuncionariosService.update(mat, data)`
- Produz: `FuncionariosEditComponent` (seletor `app-funcionarios-edit`)

- [ ] **Step 1: Rodar o plugin**

Executar `/poui-specialist:generate` com o brief:

```
Gerar page-edit (po-page-edit) para Funcionários (RH).

Componente: FuncionariosEditComponent
Seletor: app-funcionarios-edit
Rota: /rh/funcionarios/novo (novo) | /rh/funcionarios/:mat/editar (edição)
Parâmetro de rota: mat
Rota de retorno: /rh/funcionarios
Service: FuncionariosService (src/app/rh/services/funcionarios.service.ts)
Model: Funcionario, FuncionarioForm (src/app/rh/models/funcionario.model.ts)

Breadcrumb: [ { label: 'RH' }, { label: 'Funcionários', link: '/rh/funcionarios' }, { label: 'Novo' / 'Editar' } ]

Seções do formulário (po-divider separando cada grupo):

[Seção 1 — Dados Pessoais]
- matricula     → po-input,       label 'Matrícula',       required, maxlength 6,   disabled no modo edição
- nome          → po-input,       label 'Nome',             required, maxlength 40
- cpf           → po-input,       label 'CPF',              mask '999.999.999-99',  maxlength 14
- dataNascimento → po-datepicker, label 'Data Nascimento'
- escolaridade  → po-select,      label 'Escolaridade',
                  options: [
                    {value:'1',label:'Analfabeto'},{value:'2',label:'Fundamental Incompleto'},
                    {value:'3',label:'Fundamental Completo'},{value:'4',label:'Médio Incompleto'},
                    {value:'5',label:'Médio Completo'},{value:'6',label:'Superior Incompleto'},
                    {value:'7',label:'Superior Completo'},{value:'8',label:'Pós-Graduação'},
                    {value:'9',label:'Mestrado'},{value:'10',label:'Doutorado'},
                  ]
- deficiencia   → po-select,      label 'Deficiência',
                  options: [
                    {value:'0',label:'Não'},{value:'1',label:'Física'},{value:'2',label:'Auditiva'},
                    {value:'3',label:'Visual'},{value:'4',label:'Mental'},{value:'5',label:'Múltipla'},
                  ]

[Seção 2 — Dados Profissionais]
- cargo         → po-input,       label 'Cargo',            maxlength 30
- departamento  → po-input,       label 'Departamento',     maxlength 9
- centroCusto   → po-input,       label 'Centro de Custo',  maxlength 9
- dataAdmissao  → po-datepicker,  label 'Data Admissão',    required
- situacao      → po-select,      label 'Situação',
                  options: [{value:'A',label:'Ativo'},{value:'I',label:'Inativo'},{value:'F',label:'Afastado'}]
- tipoContrato  → po-select,      label 'Tipo Contrato',
                  options: [{value:'CLT',label:'CLT'},{value:'PJ',label:'PJ'},{value:'EST',label:'Estagiário'}]
- turno         → po-select,      label 'Turno',
                  options: [{value:'1',label:'1º Turno'},{value:'2',label:'2º Turno'},{value:'3',label:'3º Turno'}]
- salario       → po-decimal,     label 'Salário',          decimalsLength 2, thousandMaxlength 12

[Seção 3 — Endereço]
- endereco      → po-input,       label 'Endereço',         maxlength 40
- bairro        → po-input,       label 'Bairro',           maxlength 12
- municipio     → po-input,       label 'Município',        maxlength 15
- estado        → po-select,      label 'Estado (UF)',
                  options: [{value:'AC',label:'AC'},{value:'AL',label:'AL'},{value:'AM',label:'AM'},
                    {value:'BA',label:'BA'},{value:'CE',label:'CE'},{value:'DF',label:'DF'},
                    {value:'ES',label:'ES'},{value:'GO',label:'GO'},{value:'MA',label:'MA'},
                    {value:'MG',label:'MG'},{value:'MS',label:'MS'},{value:'MT',label:'MT'},
                    {value:'PA',label:'PA'},{value:'PB',label:'PB'},{value:'PE',label:'PE'},
                    {value:'PI',label:'PI'},{value:'PR',label:'PR'},{value:'RJ',label:'RJ'},
                    {value:'RN',label:'RN'},{value:'RO',label:'RO'},{value:'RR',label:'RR'},
                    {value:'RS',label:'RS'},{value:'SC',label:'SC'},{value:'SE',label:'SE'},
                    {value:'SP',label:'SP'},{value:'TO',label:'TO'}]
- cep           → po-input,       label 'CEP',              mask '99999-999', maxlength 9

[Seção 4 — Dados Bancários]
- banco         → po-input,       label 'Banco',    maxlength 3
- agencia       → po-input,       label 'Agência',  maxlength 5
- conta         → po-input,       label 'Conta',    maxlength 13

Paths de saída:
- src/app/rh/funcionarios/funcionarios-edit.component.ts
- src/app/rh/funcionarios/funcionarios-edit.component.html
- src/app/rh/funcionarios/funcionarios-edit.component.scss
```

- [ ] **Step 2: Verificar pontos críticos**

Abrir `funcionarios-edit.component.ts` e confirmar:
- `FormBuilder` via `inject(FormBuilder)`, formulário reativo com `Validators.required` nos campos obrigatórios
- `isEdit = signal(false)` — detecta modo pelo parâmetro `:mat` na rota
- Campo `matricula` com `disabled: true` no modo edição
- Método `save()` chama `service.create(payload)` ou `service.update(mat, payload)` conforme `isEdit()`
- Método `goBack()` navega para `/rh/funcionarios`
- `takeUntilDestroyed(this.destroyRef)` em todas as subscriptions

- [ ] **Step 3: Commit**

```bash
git add src/app/rh/funcionarios/funcionarios-edit.component.*
git commit -m "feat(rh): page-edit de Funcionários — Wave 1"
```

---

## Task 5: Funcionários Detail (via plugin)

**Files:**
- Create: `src/app/rh/funcionarios/funcionarios-detail.component.ts`
- Create: `src/app/rh/funcionarios/funcionarios-detail.component.html`
- Create: `src/app/rh/funcionarios/funcionarios-detail.component.scss`

**Interfaces:**
- Consome: `FuncionariosService.getById(mat)`
- Produz: `FuncionariosDetailComponent` (seletor `app-funcionarios-detail`)

- [ ] **Step 1: Rodar o plugin**

Executar `/poui-specialist:generate` com o brief:

```
Gerar page-detail (po-page-detail) para Funcionários (RH).

Componente: FuncionariosDetailComponent
Seletor: app-funcionarios-detail
Rota: /rh/funcionarios/:mat
Parâmetro de rota: mat
Rota de retorno: /rh/funcionarios
Rota de edição: /rh/funcionarios/:mat/editar
Service: FuncionariosService (src/app/rh/services/funcionarios.service.ts)
Model: Funcionario (src/app/rh/models/funcionario.model.ts)

Breadcrumb: [ { label: 'RH' }, { label: 'Funcionários', link: '/rh/funcionarios' }, { label: 'Detalhe' } ]

Ações: [ { label: 'Editar', action: navegar para /rh/funcionarios/:mat/editar } ]

Campos exibidos (po-info ou grid de leitura):
Seção Dados Pessoais: matricula, nome, cpf, dataNascimento, escolaridade, deficiencia
Seção Dados Profissionais: cargo, departamento, centroCusto, dataAdmissao, situacao, tipoContrato, turno, salario
Seção Endereço: endereco, bairro, municipio, estado, cep
Seção Dados Bancários: banco, agencia, conta

Paths de saída:
- src/app/rh/funcionarios/funcionarios-detail.component.ts
- src/app/rh/funcionarios/funcionarios-detail.component.html
- src/app/rh/funcionarios/funcionarios-detail.component.scss
```

- [ ] **Step 2: Verificar pontos críticos**

- `standalone: true`, `ChangeDetectionStrategy.OnPush`
- `readonly funcionario = signal<Funcionario | null>(null)`
- Carrega dados em `ngOnInit` via `service.getById(mat).pipe(takeUntilDestroyed(...))`
- Ação **Editar** navega para `/rh/funcionarios/${mat}/editar`

- [ ] **Step 3: Commit**

```bash
git add src/app/rh/funcionarios/funcionarios-detail.component.*
git commit -m "feat(rh): page-detail de Funcionários — Wave 1"
```

---

## Task 6: Registrar rotas

**Files:**
- Modify: `src/app/app.routes.ts`

**Interfaces:**
- Consome: `FuncionariosListComponent`, `FuncionariosEditComponent`, `FuncionariosDetailComponent`

- [ ] **Step 1: Adicionar rotas em app.routes.ts**

Abrir `src/app/app.routes.ts` e adicionar antes do `];` final:

```typescript
// ------------------------------------------------------------------
// RH — Funcionários (Wave 1 — teste plugin poui-specialist)
// ------------------------------------------------------------------
{
  path: 'rh/funcionarios',
  loadComponent: () =>
    import('./rh/funcionarios/funcionarios-list.component')
      .then(m => m.FuncionariosListComponent),
},
{
  path: 'rh/funcionarios/novo',
  loadComponent: () =>
    import('./rh/funcionarios/funcionarios-edit.component')
      .then(m => m.FuncionariosEditComponent),
},
{
  path: 'rh/funcionarios/:mat',
  loadComponent: () =>
    import('./rh/funcionarios/funcionarios-detail.component')
      .then(m => m.FuncionariosDetailComponent),
},
{
  path: 'rh/funcionarios/:mat/editar',
  loadComponent: () =>
    import('./rh/funcionarios/funcionarios-edit.component')
      .then(m => m.FuncionariosEditComponent),
},
```

**Atenção:** a rota `/rh/funcionarios/novo` deve vir ANTES de `/rh/funcionarios/:mat` para não ser engolida pelo parâmetro dinâmico.

- [ ] **Step 2: Verificar compilação**

```bash
npx ng build --configuration development 2>&1 | tail -20
```

Esperado: `Build at:` sem erros. Se houver erros de import, corrigir os paths.

- [ ] **Step 3: Commit**

```bash
git add src/app/app.routes.ts
git commit -m "feat(rh): rotas lazy-loaded para Funcionários — Wave 1"
```

---

## Task 7: Verificação no browser

**Files:** nenhum (apenas execução e observação)

- [ ] **Step 1: Iniciar o servidor de desenvolvimento**

```bash
npx ng serve --open
```

- [ ] **Step 2: Verificar a listagem**

Navegar para `http://localhost:4200/rh/funcionarios`.

Verificar:
- Tabela exibe os 8 funcionários mock
- Colunas corretas: Matrícula, Nome, Cargo, Depto, Situação (badge colorido), Admissão (data formatada)
- Botão **Incluir** visível no topo direito
- Campo de busca rápida presente
- Ações por linha: Editar, Visualizar, Excluir

Se a lista não carregar (erro 404 no console), verificar se o interceptor está registrado corretamente em `app.config.ts`.

- [ ] **Step 3: Verificar filtros avançados**

Clicar no botão de filtros avançados.
Verificar que o painel lateral abre com: Nome, Situação (select), Departamento, Admissão De, Admissão Até.

- [ ] **Step 4: Verificar o formulário de inclusão**

Clicar em **Incluir**.
Verificar:
- 4 seções separadas por divisores: Dados Pessoais, Dados Profissionais, Endereço, Dados Bancários
- Campos obrigatórios marcados (asterisco)
- Salvar com formulário vazio exibe notificação de validação
- Salvar com dados válidos exibe notificação de sucesso e retorna à lista

- [ ] **Step 5: Verificar edição**

Clicar em **Editar** em um registro da lista.
Verificar:
- Formulário carregado com os dados do mock
- Campo Matrícula desabilitado
- Salvar atualiza e retorna à lista com notificação de sucesso

- [ ] **Step 6: Verificar detalhe**

Clicar em **Visualizar** em um registro.
Verificar:
- Todos os campos exibidos em modo leitura
- Botão **Editar** navega para o formulário de edição

- [ ] **Step 7: Verificar exclusão**

Clicar em **Excluir** em um registro.
Verificar:
- Dialog de confirmação abre
- Confirmar remove o item da lista com notificação de sucesso

---

## Task 8: Testes (via plugin)

**Files:**
- Create: `src/app/rh/services/funcionarios.service.spec.ts`
- Create: `src/app/rh/funcionarios/funcionarios-list.component.spec.ts`

**Interfaces:**
- Consome: `FuncionariosService`, `FuncionariosListComponent`

- [ ] **Step 1: Rodar o plugin para testes do service**

Executar `/poui-specialist:test` com o brief:

```
Gerar testes Karma/Jasmine para FuncionariosService.

Service: src/app/rh/services/funcionarios.service.ts
Usar HttpClientTestingModule + HttpTestingController.

Cobrir:
- getAll() faz GET /rh/funcionarios com params filial, page, pageSize
- getById(mat) faz GET /rh/funcionarios/:mat?filial=01
- create(data) faz POST /rh/funcionarios com body
- update(mat, data) faz PUT /rh/funcionarios/:mat com body
- remove(mat) faz DELETE /rh/funcionarios/:mat

Path de saída: src/app/rh/services/funcionarios.service.spec.ts
```

- [ ] **Step 2: Rodar o plugin para testes do list component**

Executar `/poui-specialist:test` com o brief:

```
Gerar testes Karma/Jasmine para FuncionariosListComponent.

Component: src/app/rh/funcionarios/funcionarios-list.component.ts
Usar TestBed + RouterTestingModule + stub do FuncionariosService.

Cobrir:
- renderiza a tabela com os itens retornados pelo service
- onQuickSearch chama load() com o termo correto
- ação Incluir navega para /rh/funcionarios/novo
- ação Excluir abre dialog de confirmação

Path de saída: src/app/rh/funcionarios/funcionarios-list.component.spec.ts
```

- [ ] **Step 3: Rodar os testes**

```bash
npx ng test --include="src/app/rh/**/*.spec.ts" --watch=false --browsers=ChromeHeadless 2>&1 | tail -30
```

Esperado: `X specs, 0 failures`.

Se houver falhas, analisar a mensagem de erro e corrigir o spec ou o código.

- [ ] **Step 4: Commit**

```bash
git add src/app/rh/services/funcionarios.service.spec.ts
git add src/app/rh/funcionarios/funcionarios-list.component.spec.ts
git commit -m "test(rh): testes do service e list component de Funcionários — Wave 1"
```
