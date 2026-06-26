# Test Base — Boilerplate Compartilhado

Prefixado a todos os specs exceto `other/service` (que tem setup próprio).
O agente insere este bloco antes dos cenários do template de família.

> **IMPORTANTE — Compatibilidade PO-UI**: Componentes PO-UI registram `setTimeout` internos ao
> renderizar. Use SEMPRE `waitForAsync` + `fixture.whenStable()`. NUNCA use `fakeAsync`/`tick()` —
> causa o erro "N timer(s) still in the queue" com módulos PO-UI.

## Imports e setup

```typescript
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { PoNotificationService } from '@po-ui/ng-components';
import { {{ComponentClass}} } from './{{kebab-name}}.component';

describe('{{ComponentClass}}', () => {
  let component: {{ComponentClass}};
  let fixture: ComponentFixture<{{ComponentClass}}>;
  let httpMock: HttpTestingController;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [{{ComponentClass}}],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent({{ComponentClass}});
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  // ── cenários do template de família abaixo ────────────────────────────────
```

## Notas

- `OnPush`: chamar `fixture.detectChanges()` após qualquer flush HTTP
- `waitForAsync` + `fixture.whenStable()` para observables RxJS, `takeUntilDestroyed` e módulos PO-UI
- `httpMock.verify()` no `afterEach` garante que nenhuma request ficou sem flush
- Fechar o bloco `describe` com `});` na última linha do template de família
- **`provideHttpClient()` sempre obrigatório**: módulos PO-UI requerem `HttpClient` internamente (ícones, recursos). Mesmo que o service do componente use `of(...)` sem HTTP, omitir `provideHttpClient()` gera `NullInjectorError: No provider for HttpClient!`. Sempre incluir ambos: `provideHttpClient()` + `provideHttpClientTesting()`.
