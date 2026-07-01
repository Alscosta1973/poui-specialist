# Task 1 Report — Model + Service de Funcionários

## Status
**DONE**

## Commits
| Hash | Mensagem |
|------|----------|
| `5e7c123` | `feat(rh): model e service de Funcionários — Wave 1` |

## Artefatos gerados

### `src/app/rh/models/funcionario.model.ts`
Gerado integralmente pelo plugin (poui-specialist v1.0). Contém:
- `interface Funcionario` — 22 campos mapeados (RA_MAT → RA_NUMCONT), com JSDoc de referência ao campo SRA
- `interface FuncionarioForm` — subset para POST/PUT; `matricula` como opcional (omitida no PUT via rota `/:mat`)
- `interface FuncionariosResponse` — `items: Funcionario[]`, `hasNext: boolean`, `page`, `pageSize`, `total?`
- `interface FuncionariosParams` — tipagem dos query params de `getAll`

Ajuste manual necessário: **nenhum** — todos os 22 campos e as 4 interfaces foram gerados corretamente.

### `src/app/rh/services/funcionarios.service.ts`
Gerado integralmente pelo plugin (poui-specialist v1.0). Contém:
- `@Injectable({ providedIn: 'root' })`
- `private readonly http = inject(HttpClient)` — injeção via `inject()`, sem construtor
- `private readonly baseUrl = '/rh/funcionarios'`
- Helper `headers(tenantId)` — adiciona `Content-Type` e `X-Tenant-Id` em todas as chamadas
- Métodos: `getAll(params)`, `getById(mat, filial)`, `create(data)`, `update(mat, data)`, `remove(mat)`
- `getAll` suporta `filial`, `page`, `pageSize`, `nome`, `situacao` via `HttpParams`

Ajuste manual necessário: **nenhum** — todos os requisitos atendidos.

## Conteúdo final

### funcionario.model.ts (127 linhas)
```typescript
// @generated poui-specialist v1.0
// Entidade: Funcionario | Tabela Protheus: SRA

export interface Funcionario {
  matricula: string;
  nome: string;
  cpf?: string;
  dataNascimento?: string;
  escolaridade?: string;
  deficiencia?: string;
  cargo?: string;
  departamento?: string;
  centroCusto?: string;
  dataAdmissao: string;
  situacao?: 'A' | 'I' | 'F';
  tipoContrato?: 'CLT' | 'PJ' | 'EST';
  turno?: string;
  salario?: number;
  endereco?: string;
  bairro?: string;
  municipio?: string;
  estado?: string;
  cep?: string;
  banco?: string;
  agencia?: string;
  conta?: string;
}

export interface FuncionarioForm { /* mesmos campos, matricula opcional */ }
export interface FuncionariosResponse { items: Funcionario[]; hasNext: boolean; page?: number; pageSize?: number; total?: number; }
export interface FuncionariosParams { filial?: string; page?: number; pageSize?: number; nome?: string; situacao?: 'A' | 'I' | 'F'; }
```

### funcionarios.service.ts (90 linhas)
```typescript
// @generated poui-specialist v1.0
@Injectable({ providedIn: 'root' })
export class FuncionariosService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/rh/funcionarios';

  private headers(tenantId = '01'): HttpHeaders { /* X-Tenant-Id */ }

  getAll(params: FuncionariosParams = {}): Observable<FuncionariosResponse> { /* filial, page, pageSize */ }
  getById(mat: string, filial = '01'): Observable<Funcionario> { /* GET /:mat?filial */ }
  create(data: FuncionarioForm): Observable<Funcionario> { /* POST */ }
  update(mat: string, data: FuncionarioForm): Observable<Funcionario> { /* PUT /:mat */ }
  remove(mat: string): Observable<void> { /* DELETE /:mat */ }
}
```

## Próximos passos (Task 2)
- Gerar `page-dynamic-search` (lista de funcionários com busca avançada)
- Gerar `page-edit` (formulário de cadastro/edição)
- Adicionar mocks em `src/app/rh/mocks/funcionarios.mock.ts`
