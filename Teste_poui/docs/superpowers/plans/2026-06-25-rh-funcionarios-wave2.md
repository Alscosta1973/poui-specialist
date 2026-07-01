# Wave 2 — RH Funcionários: Tech Debt & Cobertura de Testes

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminar o tech debt registrado ao final da Wave 1: specs ausentes para Edit e Detail, `breadcrumb` como `computed()`, `finalize()` no `loadFuncionario` do edit, `escape/unescape` deprecated e `tenantId` via token de injeção.

**Architecture:** Todas as mudanças estão em `src/app/rh/`. As specs são escritas ANTES das refatorações que as afetam, para estabelecer baseline. O token `TENANT_ID` usa `providedIn: 'root'` com factory `'01'`, eliminando a necessidade de provider explícito em módulos.

**Tech Stack:** Angular 17+ standalone, Karma + Jasmine, Reactive Forms, `@angular/core` signals (`signal`, `computed`), RxJS `finalize`.

## Global Constraints

- Componentes standalone com `ChangeDetectionStrategy.OnPush`
- Specs seguem o padrão de `funcionarios.service.spec.ts` e `funcionarios-list.component.spec.ts` (fixtures no topo, `afterEach(() => TestBed.resetTestingModule())`, `NO_ERRORS_SCHEMA`)
- Commits convencionais: `test(rh):`, `refactor(rh):`, `fix(rh):`, `feat(rh):`
- Nunca adicionar Claude como co-autor

---

### Task 1: Spec para FuncionariosEditComponent

**Files:**
- Create: `src/app/rh/funcionarios/funcionarios-edit.component.spec.ts`

**Interfaces:**
- Consumes: `FuncionariosEditComponent` — `isEdit()`, `isLoading()`, `form`, `breadcrumb` (getter), `save()`, `goBack()`
- Consumes: `FuncionariosService.getById()`, `.create()`, `.update()`
- Produces: baseline de 10 testes; Task 2 vai atualizar o teste de `breadcrumb` quando o getter vira `computed()`

- [ ] **Step 1: Criar o arquivo spec**

```typescript
// src/app/rh/funcionarios/funcionarios-edit.component.spec.ts
import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { of, throwError } from 'rxjs';
import { PoNotificationService } from '@po-ui/ng-components';
import { FuncionariosEditComponent } from './funcionarios-edit.component';
import { FuncionariosService } from '../services/funcionarios.service';
import { Funcionario } from '../models/funcionario.model';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const mockFuncionario: Funcionario = {
  matricula: '000001',
  nome: 'João da Silva',
  dataAdmissao: '2020-01-15',
  cargo: 'Analista',
  departamento: 'TI',
  situacao: 'A',
};

function makeRoute(mat: string | null = null) {
  return { snapshot: { paramMap: { get: () => mat } } };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('FuncionariosEditComponent', () => {
  let component: FuncionariosEditComponent;
  let fixture: ComponentFixture<FuncionariosEditComponent>;
  let service: jasmine.SpyObj<FuncionariosService>;
  let notification: jasmine.SpyObj<PoNotificationService>;
  let router: jasmine.SpyObj<Router>;

  function setup(
    mat: string | null = null,
    getByIdResult = of(mockFuncionario),
  ) {
    service = jasmine.createSpyObj('FuncionariosService', [
      'getById', 'create', 'update', 'remove',
    ]);
    notification = jasmine.createSpyObj('PoNotificationService', [
      'success', 'warning', 'error',
    ]);
    router = jasmine.createSpyObj('Router', ['navigate']);
    service.getById.and.returnValue(getByIdResult);

    TestBed.configureTestingModule({
      imports: [FuncionariosEditComponent, ReactiveFormsModule],
      providers: [
        { provide: FuncionariosService,   useValue: service },
        { provide: PoNotificationService, useValue: notification },
        { provide: Router,                useValue: router },
        { provide: ActivatedRoute,        useValue: makeRoute(mat) },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    });
    fixture   = TestBed.createComponent(FuncionariosEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges(); // dispara ngOnInit
  }

  afterEach(() => TestBed.resetTestingModule());

  // -------------------------------------------------------------------------
  // Modo criar
  // -------------------------------------------------------------------------

  describe('modo criar (sem matrícula na rota)', () => {
    beforeEach(() => setup(null));

    it('deve instanciar o componente', () => {
      expect(component).toBeTruthy();
    });

    it('isEdit deve ser false', () => {
      expect(component.isEdit()).toBeFalse();
    });

    it('não deve chamar getById', () => {
      expect(service.getById).not.toHaveBeenCalled();
    });

    it('breadcrumb deve conter "Novo" no último item', () => {
      expect(component.breadcrumb.items.at(-1)?.label).toBe('Novo');
    });
  });

  // -------------------------------------------------------------------------
  // Modo editar
  // -------------------------------------------------------------------------

  describe('modo editar (com matrícula na rota)', () => {
    beforeEach(() => setup('000001'));

    it('isEdit deve ser true', () => {
      expect(component.isEdit()).toBeTrue();
    });

    it('deve chamar getById com a matrícula da rota', () => {
      expect(service.getById).toHaveBeenCalledWith('000001');
    });

    it('deve preencher o form com os dados carregados', fakeAsync(() => {
      tick();
      expect(component.form.get('nome')?.value).toBe('João da Silva');
    }));

    it('breadcrumb deve conter "Editar" no último item', () => {
      expect(component.breadcrumb.items.at(-1)?.label).toBe('Editar');
    });
  });

  // -------------------------------------------------------------------------
  // Erro no carregamento
  // -------------------------------------------------------------------------

  describe('erro no carregamento em modo editar', () => {
    beforeEach(() =>
      setup('000001', throwError(() => new Error('fail'))),
    );

    it('deve exibir notificação de erro', fakeAsync(() => {
      tick();
      expect(notification.error).toHaveBeenCalled();
    }));

    it('isLoading deve ser false após o erro', fakeAsync(() => {
      tick();
      expect(component.isLoading()).toBeFalse();
    }));
  });

  // -------------------------------------------------------------------------
  // save()
  // -------------------------------------------------------------------------

  describe('save()', () => {
    it('deve exibir warning quando o form é inválido', () => {
      setup(null);
      component.save();
      expect(notification.warning).toHaveBeenCalledWith(
        'Preencha todos os campos obrigatórios.',
      );
    });

    it('deve chamar service.create e notificar sucesso em modo criar', fakeAsync(() => {
      setup(null);
      service.create.and.returnValue(of(mockFuncionario));
      component.form.patchValue({
        matricula: '000002',
        nome: 'Maria Souza',
        dataAdmissao: '2024-01-01',
      });
      component.save();
      tick();
      expect(service.create).toHaveBeenCalled();
      expect(notification.success).toHaveBeenCalledWith(
        'Funcionário criado com sucesso.',
      );
      expect(router.navigate).toHaveBeenCalledWith(['/rh/funcionarios']);
    }));

    it('deve exibir erro quando create falha', fakeAsync(() => {
      setup(null);
      service.create.and.returnValue(throwError(() => new Error('fail')));
      component.form.patchValue({
        matricula: '000002',
        nome: 'Maria Souza',
        dataAdmissao: '2024-01-01',
      });
      component.save();
      tick();
      expect(notification.error).toHaveBeenCalledWith('Erro ao criar funcionário.');
    }));

    it('deve chamar service.update e notificar sucesso em modo editar', fakeAsync(() => {
      setup('000001');
      service.update.and.returnValue(of(mockFuncionario));
      tick(); // aguarda loadFuncionario
      component.form.patchValue({ nome: 'João Editado', dataAdmissao: '2020-01-15' });
      component.save();
      tick();
      expect(service.update).toHaveBeenCalledWith(
        '000001',
        jasmine.objectContaining({ nome: 'João Editado' }),
      );
      expect(notification.success).toHaveBeenCalledWith(
        'Funcionário atualizado com sucesso.',
      );
    }));
  });

  // -------------------------------------------------------------------------
  // goBack()
  // -------------------------------------------------------------------------

  describe('goBack()', () => {
    beforeEach(() => setup(null));

    it('deve navegar para /rh/funcionarios', () => {
      component.goBack();
      expect(router.navigate).toHaveBeenCalledWith(['/rh/funcionarios']);
    });
  });
});
```

- [ ] **Step 2: Rodar os testes para confirmar que passam**

```
ng test --include src/app/rh/funcionarios/funcionarios-edit.component.spec.ts --watch=false
```
Expected: todos os testes passando (sem falhas).

- [ ] **Step 3: Commit**

```bash
git add src/app/rh/funcionarios/funcionarios-edit.component.spec.ts
git commit -m "test(rh): spec FuncionariosEditComponent — Wave 2 Task 1"
```

---

### Task 2: Refatorar FuncionariosEditComponent (computed + finalize)

**Files:**
- Modify: `src/app/rh/funcionarios/funcionarios-edit.component.ts`
- Modify: `src/app/rh/funcionarios/funcionarios-edit.component.spec.ts` (atualizar acesso ao breadcrumb)

**Interfaces:**
- Consumes: spec da Task 1 como guarda de regressão
- Produces: `breadcrumb` como `Signal<PoBreadcrumb>` via `computed()`; `loadFuncionario` com `finalize()`

- [ ] **Step 1: Adicionar `computed` e `finalize` aos imports**

Em `funcionarios-edit.component.ts`:

Linha 8 — adicionar `computed` ao import de `@angular/core`:
```typescript
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
```

Após a linha de `takeUntilDestroyed` — adicionar import de `finalize`:
```typescript
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs/operators';
```

- [ ] **Step 2: Converter getter `breadcrumb` para `computed()`**

Substituir as linhas 65–73 (getter `breadcrumb`):
```typescript
// DE:
get breadcrumb(): PoBreadcrumb {
  return {
    items: [
      { label: 'RH' },
      { label: 'Funcionários', link: '/rh/funcionarios' },
      { label: this.isEdit() ? 'Editar' : 'Novo' },
    ],
  };
}

// PARA:
readonly breadcrumb = computed<PoBreadcrumb>(() => ({
  items: [
    { label: 'RH' },
    { label: 'Funcionários', link: '/rh/funcionarios' },
    { label: this.isEdit() ? 'Editar' : 'Novo' },
  ],
}));
```

- [ ] **Step 3: Refatorar `loadFuncionario` com `finalize()`**

Substituir o método `loadFuncionario` (linhas 183–220):
```typescript
private loadFuncionario(mat: string): void {
  this.isLoading.set(true);

  this.service.getById(mat)
    .pipe(
      finalize(() => this.isLoading.set(false)),
      takeUntilDestroyed(this.destroyRef),
    )
    .subscribe({
      next: (funcionario) => {
        this.form.patchValue({
          nome:           funcionario.nome,
          cpf:            funcionario.cpf ?? '',
          dataNascimento: funcionario.dataNascimento ?? '',
          escolaridade:   funcionario.escolaridade ?? '',
          deficiencia:    funcionario.deficiencia ?? '',
          cargo:          funcionario.cargo ?? '',
          departamento:   funcionario.departamento ?? '',
          centroCusto:    funcionario.centroCusto ?? '',
          dataAdmissao:   funcionario.dataAdmissao,
          situacao:       funcionario.situacao ?? '',
          tipoContrato:   funcionario.tipoContrato ?? '',
          turno:          funcionario.turno ?? '',
          salario:        funcionario.salario ?? null,
          endereco:       funcionario.endereco ?? '',
          bairro:         funcionario.bairro ?? '',
          municipio:      funcionario.municipio ?? '',
          estado:         funcionario.estado ?? '',
          cep:            funcionario.cep ?? '',
          banco:          funcionario.banco ?? '',
          agencia:        funcionario.agencia ?? '',
          conta:          funcionario.conta ?? '',
        });
      },
      error: () => {
        this.notification.error('Erro ao carregar dados do funcionário.');
      },
    });
}
```

- [ ] **Step 4: Atualizar os testes de `breadcrumb` no spec**

`breadcrumb` agora é um Signal — precisa de `()` no TypeScript. Em `funcionarios-edit.component.spec.ts` substituir as duas ocorrências de `component.breadcrumb.items`:

```typescript
// DE:
expect(component.breadcrumb.items.at(-1)?.label).toBe('Novo');
// ...
expect(component.breadcrumb.items.at(-1)?.label).toBe('Editar');

// PARA:
expect(component.breadcrumb().items.at(-1)?.label).toBe('Novo');
// ...
expect(component.breadcrumb().items.at(-1)?.label).toBe('Editar');
```

Nota: o template HTML (`[p-breadcrumb]="breadcrumb"`) não precisa ser alterado — Angular faz auto-unwrap de signals em templates.

- [ ] **Step 5: Rodar todos os specs do edit e verificar que passam**

```
ng test --include src/app/rh/funcionarios/funcionarios-edit.component.spec.ts --watch=false
```
Expected: todos os testes passando.

- [ ] **Step 6: Build de verificação**

```
ng build --configuration development
```
Expected: saída `Build at: ... - Time: ...ms` sem erros TypeScript.

- [ ] **Step 7: Commit**

```bash
git add src/app/rh/funcionarios/funcionarios-edit.component.ts \
        src/app/rh/funcionarios/funcionarios-edit.component.spec.ts
git commit -m "refactor(rh): breadcrumb como computed() e finalize() em loadFuncionario"
```

---

### Task 3: Spec para FuncionariosDetailComponent

**Files:**
- Create: `src/app/rh/funcionarios/funcionarios-detail.component.spec.ts`

**Interfaces:**
- Consumes: `FuncionariosDetailComponent` — `funcionario()`, `isLoading()`, `breadcrumb`, `navigateToEdit()`, `goBack()`, helpers `label()`, `currency()`, `text()`; mapas públicos `escolaridadeMap`, `situacaoMap`
- Produces: cobertura de carregamento, navegação e helpers

- [ ] **Step 1: Criar o arquivo spec**

```typescript
// src/app/rh/funcionarios/funcionarios-detail.component.spec.ts
import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { Router, ActivatedRoute } from '@angular/router';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { of, throwError } from 'rxjs';
import { PoNotificationService } from '@po-ui/ng-components';
import { FuncionariosDetailComponent } from './funcionarios-detail.component';
import { FuncionariosService } from '../services/funcionarios.service';
import { Funcionario } from '../models/funcionario.model';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const mockFuncionario: Funcionario = {
  matricula: '000001',
  nome: 'João da Silva',
  dataAdmissao: '2020-01-15',
  cargo: 'Analista',
  departamento: 'TI',
  situacao: 'A',
  salario: 5000,
  escolaridade: '9',
  deficiencia: '0',
  tipoContrato: 'CLT',
};

function makeRoute(mat: string | null = '000001') {
  return { snapshot: { paramMap: { get: () => mat } } };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('FuncionariosDetailComponent', () => {
  let component: FuncionariosDetailComponent;
  let fixture: ComponentFixture<FuncionariosDetailComponent>;
  let service: jasmine.SpyObj<FuncionariosService>;
  let notification: jasmine.SpyObj<PoNotificationService>;
  let router: jasmine.SpyObj<Router>;

  function setup(
    mat: string | null = '000001',
    serviceResult = of(mockFuncionario),
  ) {
    service = jasmine.createSpyObj('FuncionariosService', [
      'getById', 'create', 'update', 'remove',
    ]);
    notification = jasmine.createSpyObj('PoNotificationService', [
      'success', 'warning', 'error',
    ]);
    router = jasmine.createSpyObj('Router', ['navigate']);
    service.getById.and.returnValue(serviceResult);

    TestBed.configureTestingModule({
      imports: [FuncionariosDetailComponent],
      providers: [
        { provide: FuncionariosService,   useValue: service },
        { provide: PoNotificationService, useValue: notification },
        { provide: Router,                useValue: router },
        { provide: ActivatedRoute,        useValue: makeRoute(mat) },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    });
    fixture   = TestBed.createComponent(FuncionariosDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges(); // dispara ngOnInit
  }

  afterEach(() => TestBed.resetTestingModule());

  // -------------------------------------------------------------------------
  // Carregamento
  // -------------------------------------------------------------------------

  describe('carregamento', () => {
    it('deve instanciar o componente', () => {
      setup();
      expect(component).toBeTruthy();
    });

    it('deve chamar getById com a matrícula da rota', () => {
      setup('000001');
      expect(service.getById).toHaveBeenCalledWith('000001');
    });

    it('deve preencher o signal funcionario após carregamento', fakeAsync(() => {
      setup('000001');
      tick();
      expect(component.funcionario()).toEqual(mockFuncionario);
    }));

    it('isLoading deve ser false após carregamento com sucesso', fakeAsync(() => {
      setup('000001');
      tick();
      expect(component.isLoading()).toBeFalse();
    }));

    it('sem matrícula na rota deve exibir erro e navegar de volta', fakeAsync(() => {
      setup(null);
      tick();
      expect(notification.error).toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalledWith(['/rh/funcionarios']);
    }));

    it('erro na API deve exibir notificação e navegar de volta', fakeAsync(() => {
      setup('000001', throwError(() => new Error('fail')));
      tick();
      expect(notification.error).toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalledWith(['/rh/funcionarios']);
    }));

    it('isLoading deve ser false após erro da API', fakeAsync(() => {
      setup('000001', throwError(() => new Error('fail')));
      tick();
      expect(component.isLoading()).toBeFalse();
    }));
  });

  // -------------------------------------------------------------------------
  // Breadcrumb
  // -------------------------------------------------------------------------

  describe('breadcrumb', () => {
    it('deve ter "Detalhe" no último item', () => {
      setup();
      expect(component.breadcrumb.items.at(-1)?.label).toBe('Detalhe');
    });
  });

  // -------------------------------------------------------------------------
  // Navegação
  // -------------------------------------------------------------------------

  describe('navegação', () => {
    beforeEach(() => setup('000001'));

    it('navigateToEdit deve navegar para a rota de edição', () => {
      component.navigateToEdit();
      expect(router.navigate).toHaveBeenCalledWith([
        '/rh/funcionarios', '000001', 'editar',
      ]);
    });

    it('goBack deve navegar para /rh/funcionarios', () => {
      component.goBack();
      expect(router.navigate).toHaveBeenCalledWith(['/rh/funcionarios']);
    });
  });

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  describe('helpers', () => {
    beforeEach(() => setup());

    it('label() deve retornar o rótulo do mapa', () => {
      expect(component.label('9', component.escolaridadeMap)).toBe('Mestrado');
    });

    it('label() deve retornar "—" para value undefined', () => {
      expect(component.label(undefined, component.escolaridadeMap)).toBe('—');
    });

    it('label() deve retornar o valor original quando não encontrado no mapa', () => {
      expect(component.label('XPTO', component.escolaridadeMap)).toBe('XPTO');
    });

    it('label() deve mapear situação corretamente', () => {
      expect(component.label('A', component.situacaoMap)).toBe('Ativo');
      expect(component.label('F', component.situacaoMap)).toBe('Afastado');
    });

    it('currency() deve formatar valor em BRL', () => {
      const result = component.currency(5000);
      expect(result).toContain('5.000');
    });

    it('currency() deve retornar "—" para undefined', () => {
      expect(component.currency(undefined)).toBe('—');
    });

    it('text() deve retornar "—" para undefined', () => {
      expect(component.text(undefined)).toBe('—');
    });

    it('text() deve retornar a string original', () => {
      expect(component.text('Analista')).toBe('Analista');
    });
  });
});
```

- [ ] **Step 2: Rodar os testes para confirmar que passam**

```
ng test --include src/app/rh/funcionarios/funcionarios-detail.component.spec.ts --watch=false
```
Expected: todos os testes passando.

- [ ] **Step 3: Commit**

```bash
git add src/app/rh/funcionarios/funcionarios-detail.component.spec.ts
git commit -m "test(rh): spec FuncionariosDetailComponent — Wave 2 Task 3"
```

---

### Task 4: Corrigir escape/unescape deprecated em parseProtheusError

**Files:**
- Modify: `src/app/rh/funcionarios/funcionarios-list.component.ts` (método `parseProtheusError`, linhas 216–226)

**Interfaces:**
- Consumes: nenhum (método privado)
- Produces: `parseProtheusError` sem `escape()`/`unescape()` — usa `TextDecoder('iso-8859-1')` para decodificação correta de strings Latin-1 retornadas pelo REST do Protheus

- [ ] **Step 1: Localizar as ocorrências**

```
grep -n "escape" src/app/rh/funcionarios/funcionarios-list.component.ts
```
Expected: linhas 219 e 221 com `decodeURIComponent(escape(...))`.

- [ ] **Step 2: Substituir o método `parseProtheusError`**

Em `funcionarios-list.component.ts`, substituir integralmente o método (linhas 216–226):

```typescript
// DE:
private parseProtheusError(err: any): string {
  try {
    const errObj = JSON.parse(err.error?.errorMessage ?? '{}');
    const msg    = decodeURIComponent(escape(errObj.message ?? ''));
    const detail = errObj.detailedMessage
      ? ` — ${decodeURIComponent(escape(errObj.detailedMessage))}`
      : '';
    return `Erro ${errObj.code}: ${msg}${detail}`;
  } catch {
    return err.error?.message ?? 'Erro ao processar a requisição.';
  }
}

// PARA:
private parseProtheusError(err: unknown): string {
  const decode = (s: string): string => {
    try {
      return new TextDecoder('iso-8859-1').decode(
        Uint8Array.from(s, (c) => c.charCodeAt(0)),
      );
    } catch {
      return s;
    }
  };
  try {
    const e = (err as { error?: { errorMessage?: string; message?: string } }).error;
    const errObj = JSON.parse(e?.errorMessage ?? '{}');
    const msg    = decode(errObj.message ?? '');
    const detail = errObj.detailedMessage
      ? ` — ${decode(errObj.detailedMessage)}`
      : '';
    return `Erro ${errObj.code}: ${msg}${detail}`;
  } catch {
    return (err as { error?: { message?: string } }).error?.message
      ?? 'Erro ao processar a requisição.';
  }
}
```

- [ ] **Step 3: Verificar que os testes do list não regridem**

```
ng test --include src/app/rh/funcionarios/funcionarios-list.component.spec.ts --watch=false
```
Expected: todos os testes passando.

- [ ] **Step 4: Commit**

```bash
git add src/app/rh/funcionarios/funcionarios-list.component.ts
git commit -m "fix(rh): substituir escape/unescape deprecated por TextDecoder em parseProtheusError"
```

---

### Task 5: tenantId via InjectionToken

**Files:**
- Create: `src/app/rh/rh.tokens.ts`
- Modify: `src/app/rh/services/funcionarios.service.ts`
- Modify: `src/app/rh/services/funcionarios.service.spec.ts`

**Interfaces:**
- Produces: `TENANT_ID: InjectionToken<string>` com `providedIn: 'root'` e factory `'01'`
- Consumes: `FuncionariosService` injeta `TENANT_ID` em vez de usar o parâmetro default `'01'` hardcoded

- [ ] **Step 1: Criar rh.tokens.ts**

```typescript
// src/app/rh/rh.tokens.ts
import { InjectionToken } from '@angular/core';

export const TENANT_ID = new InjectionToken<string>('TENANT_ID', {
  providedIn: 'root',
  factory: () => '01',
});
```

- [ ] **Step 2: Atualizar FuncionariosService**

Em `src/app/rh/services/funcionarios.service.ts`, adicionar o import do token após os imports existentes:

```typescript
import { TENANT_ID } from '../rh.tokens';
```

Dentro da classe, adicionar a injeção e remover o parâmetro de `headers()`:

```typescript
@Injectable({ providedIn: 'root' })
export class FuncionariosService {
  private readonly http     = inject(HttpClient);
  private readonly tenantId = inject(TENANT_ID);
  private readonly baseUrl  = '/rh/funcionarios';

  private headers(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'X-Tenant-Id': this.tenantId,
    });
  }
  // ... restante inalterado
```

Remover o parâmetro `tenantId = '01'` da assinatura anterior — a linha que era `private headers(tenantId = '01'): HttpHeaders` vira `private headers(): HttpHeaders`.

- [ ] **Step 3: Atualizar o spec do service para fornecer o token**

Em `src/app/rh/services/funcionarios.service.spec.ts`, adicionar o import:

```typescript
import { TENANT_ID } from '../rh.tokens';
```

No `TestBed.configureTestingModule`, adicionar o provider explícito:

```typescript
TestBed.configureTestingModule({
  imports: [HttpClientTestingModule],
  providers: [
    FuncionariosService,
    { provide: TENANT_ID, useValue: '01' },
  ],
});
```

- [ ] **Step 4: Rodar todos os testes do módulo RH**

```
ng test --include "src/app/rh/**/*.spec.ts" --watch=false
```
Expected: todos os testes passando — 35 existentes + os novos das Tasks 1 e 3 (deve totalizar ~55 testes).

- [ ] **Step 5: Build final**

```
ng build --configuration development
```
Expected: build limpo, sem erros ou warnings de compilação TypeScript.

- [ ] **Step 6: Commit**

```bash
git add src/app/rh/rh.tokens.ts \
        src/app/rh/services/funcionarios.service.ts \
        src/app/rh/services/funcionarios.service.spec.ts
git commit -m "feat(rh): tenantId via InjectionToken TENANT_ID — elimina hardcode no service"
```
