# Test Base — Boilerplate Compartilhado

Prefixado a todos os specs exceto `other/service` (que tem setup próprio).
O agente insere este bloco antes dos cenários do template de família.

## Imports e setup

```typescript
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { PoNotificationService } from '@po-ui/ng-components';
import { {{ComponentClass}} } from './{{kebab-name}}.component';

describe('{{ComponentClass}}', () => {
  let component: {{ComponentClass}};
  let fixture: ComponentFixture<{{ComponentClass}}>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [{{ComponentClass}}],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();

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
- `fakeAsync` + `tick()` para observables RxJS e `takeUntilDestroyed`
- `httpMock.verify()` no `afterEach` garante que nenhuma request ficou sem flush
- Fechar o bloco `describe` com `});` na última linha do template de família
