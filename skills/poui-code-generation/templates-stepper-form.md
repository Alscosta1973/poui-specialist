# Template: stepper-form

Formulário multi-etapas standalone com `po-stepper` — wizard com 3+ seções logicamente distintas.

> **Quando usar vs alternativas:**
> - `stepper-form` → 3+ etapas com validação distinta por etapa, UX estilo wizard
> - `page-edit` com `divider` → mesmo formulário, página única, entidade simples
> - `modal-crud` → lista+formulário integrados para entidades simples (até ~10 campos)

## {{kebab-name}}.component.ts

```typescript
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
  signal,
  computed,
} from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs/operators';
import {
  PoButtonModule,
  PoDynamicFormField,
  PoDynamicModule,
  PoDynamicViewField,
  PoLoadingModule,
  PoNotificationService,
  PoPageModule,
  PoStepperItem,
  PoStepperModule,
} from '@po-ui/ng-components';
import { {{ServiceClass}} } from '../{{serviceFile}}';
import { {{ModelInterface}} } from '../models/{{modelFile}}.model';

@Component({
  selector: '{{selector}}',
  standalone: true,
  imports: [
    PoPageModule,
    PoStepperModule,
    PoDynamicModule,
    PoButtonModule,
    PoLoadingModule,
  ],
  templateUrl: './{{kebab-name}}.component.html',
  styleUrl: './{{kebab-name}}.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class {{ComponentClass}} implements AfterViewInit {
  private readonly service      = inject({{ServiceClass}});
  private readonly router       = inject(Router);
  private readonly route        = inject(ActivatedRoute);
  private readonly notification = inject(PoNotificationService);
  private readonly destroyRef   = inject(DestroyRef);
  private readonly cdr          = inject(ChangeDetectorRef);

  readonly loading     = signal(false);
  readonly currentStep = signal(1);  // 1-based — po-stepper usa base 1

  // Plain property (não signal) — evita re-init do po-dynamic-form a cada keystroke.
  // Sinal causaria re-render a cada update, destruindo o estado interno do form (Quirk #15).
  formData: Partial<{{ModelInterface}}> = {};

  // Signal com status explícito por item — necessário para que back() limpe
  // o estado 'done' dos steps posteriores ao alvo (po-stepper não faz isso sozinho).
  readonly steps = signal<PoStepperItem[]>([
    { label: 'Identificação', status: 'active'  as PoStepperItem['status'] },
    { label: 'Contato',      status: 'default' as PoStepperItem['status'] },
    { label: 'Complemento',  status: 'default' as PoStepperItem['status'] },
    { label: 'Confirmação',  status: 'default' as PoStepperItem['status'] },
  ]);

  // TODO: defina um array de campos por etapa correspondendo às propriedades de {{ModelInterface}}
  readonly step1Fields: PoDynamicFormField[] = [
    {
      property: 'codigo',
      label: 'Código',
      divider: 'Identificação',
      required: true,
      maxLength: 6,
      gridColumns: 4,
    },
    {
      property: 'nome',
      label: 'Nome / Razão Social',
      required: true,
      minLength: 3,
      maxLength: 40,
      gridColumns: 8,
    },
  ];

  readonly step2Fields: PoDynamicFormField[] = [
    {
      property: 'email',
      label: 'E-mail',
      divider: 'Contato',
      required: false,
      regex: '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$',
      errorMessage: 'Informe um e-mail válido',
      gridColumns: 8,
    },
    {
      property: 'telefone',
      label: 'Telefone',
      mask: '(99) 99999-9999',
      gridColumns: 4,
    },
  ];

  readonly step3Fields: PoDynamicFormField[] = [
    {
      property: 'observacoes',
      label: 'Observações',
      divider: 'Complemento',
      gridColumns: 12,
    },
  ];

  readonly confirmFields: PoDynamicViewField[] = [
    { property: 'codigo',      label: 'Código',       gridColumns: 4 },
    { property: 'nome',        label: 'Nome',         gridColumns: 8 },
    { property: 'email',       label: 'E-mail',       gridColumns: 8 },
    { property: 'telefone',    label: 'Telefone',     gridColumns: 4 },
    { property: 'observacoes', label: 'Observações',  gridColumns: 12 },
  ];

  readonly currentFields = computed<PoDynamicFormField[]>(() => {
    switch (this.currentStep()) {
      case 1: return this.step1Fields;
      case 2: return this.step2Fields;
      case 3: return this.step3Fields;
      default: return [];
    }
  });

  readonly isFirstStep   = computed(() => this.currentStep() === 1);
  readonly isLastStep    = computed(() => this.currentStep() === this.steps().length);
  readonly isConfirmStep = computed(() => this.currentStep() === this.steps().length);

  ngAfterViewInit(): void {
    setTimeout(() => this.cdr.detectChanges());
  }

  // Atualiza status visual: steps antes do alvo → 'done', alvo → 'active', após → 'default'.
  // Garante que back() limpe o estado 'done' — po-stepper não faz isso via [p-step].
  private goToStep(target: number): void {
    type S = PoStepperItem['status'];
    this.steps.update(items =>
      items.map((item, i) => ({
        ...item,
        status: (i + 1 < target ? 'done' : i + 1 === target ? 'active' : 'default') as S,
      }))
    );
    this.currentStep.set(target);
  }

  onStepChange(step: number): void {
    this.goToStep(step);
  }

  next(): void {
    if (!this.isLastStep()) {
      this.goToStep(this.currentStep() + 1);
    }
  }

  back(): void {
    if (!this.isFirstStep()) {
      this.goToStep(this.currentStep() - 1);
    }
  }

  onFormChange(values: Partial<{{ModelInterface}}>): void {
    // Merge somente valores definidos — preserva dados dos steps anteriores
    this.formData = {
      ...this.formData,
      ...Object.fromEntries(
        Object.entries(values).filter(([, v]) => v !== null && v !== undefined),
      ) as Partial<{{ModelInterface}}>,
    };
  }

  submit(): void {
    this.loading.set(true);
    const payload = this.formData as {{ModelInterface}};
    this.service.create(payload)
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.notification.success('Registro incluído com sucesso.');
          this.router.navigate(['../'], { relativeTo: this.route });
        },
        error: (err) => this.notification.error(this.parseProtheusError(err)),
      });
  }

  cancel(): void {
    this.router.navigate(['../'], { relativeTo: this.route });
  }

  private parseProtheusError(err: unknown): string {
    try {
      const errObj = JSON.parse((err as any).error?.errorMessage ?? '{}');
      const decode = (s: string) => new TextDecoder('iso-8859-1').decode(
        Uint8Array.from(s, c => c.charCodeAt(0))
      );
      const msg    = decode(errObj.message ?? '');
      const detail = errObj.detailedMessage ? ` — ${decode(errObj.detailedMessage)}` : '';
      return `Erro ${errObj.code}: ${msg}${detail}`;
    } catch {
      return (err as any).error?.message ?? 'Erro ao processar a requisição.';
    }
  }
}
```

## {{kebab-name}}.component.html

```html
<po-page-default p-title="Novo {{ModelInterface}}">

  @if (loading()) {
    <po-loading-overlay p-text="Salvando..."></po-loading-overlay>
  }

  <po-stepper
    [p-steps]="steps()"
    (p-change-step)="onStepChange($event)">
  </po-stepper>

  @if (!isConfirmStep()) {
    <po-dynamic-form
      [p-fields]="currentFields()"
      [p-value]="formData"
      (p-value-change)="onFormChange($event)">
    </po-dynamic-form>
  }

  @if (isConfirmStep()) {
    <p class="po-font-text-large po-mt-3 po-mb-1">Revise os dados antes de confirmar:</p>
    <po-dynamic-view
      [p-fields]="confirmFields"
      [p-value]="formData">
    </po-dynamic-view>
  }

  <div class="po-row po-mt-3">
    <div class="po-md-12">

      <po-button
        p-label="Cancelar"
        p-kind="secondary"
        (p-click)="cancel()">
      </po-button>

      @if (!isFirstStep()) {
        <po-button
          p-label="Anterior"
          p-kind="secondary"
          (p-click)="back()"
          class="po-ml-1">
        </po-button>
      }

      @if (!isLastStep()) {
        <po-button
          p-label="Próximo"
          p-kind="primary"
          (p-click)="next()"
          class="po-ml-1">
        </po-button>
      }

      @if (isLastStep()) {
        <po-button
          p-label="Confirmar e Salvar"
          p-kind="primary"
          [p-loading]="loading()"
          (p-click)="submit()"
          class="po-ml-1">
        </po-button>
      }

    </div>
  </div>

</po-page-default>
```

## {{kebab-name}}.component.scss

```scss
// Adicione estilos específicos do componente aqui
```

## Configuração de rota

```typescript
// No arquivo de rotas da sua feature
{
  path: 'novo',
  loadComponent: () =>
    import('./{{kebab-name}}/{{kebab-name}}.component')
      .then(m => m.{{ComponentClass}}),
},
```

## Notas sobre o comportamento do po-stepper

- **Input para step ativo:** `[p-step]="N"` (1-based) — `[p-current-active-step]` NÃO existe (NG8002)
- **Output de mudança:** `(p-change-step)` — `(p-current-active-step)` NÃO existe
- **`steps` como signal obrigatório:** `back()` não redefine o status 'done' via `[p-step]` — é necessário gerenciar o `status` de cada item explicitamente no signal. O método `goToStep()` já faz isso.
- Por padrão, o usuário pode clicar em qualquer etapa diretamente — proteja a navegação com validação em `onStepChange()` se necessário

## Variante: validação passo a passo antes de avançar

```typescript
// Substitua next() por uma versão com validação:
next(): void {
  if (this.isLastStep()) return;
  const isValid = this.validateCurrentStep();
  if (!isValid) {
    this.notification.warning('Preencha os campos obrigatórios antes de continuar.');
    return;
  }
  this.currentStep.update(s => s + 1);
}

private validateCurrentStep(): boolean {
  // Inspect stepData() for required fields of the current step
  const data = this.stepData();
  switch (this.currentStep()) {
    case 1: return !!(data['codigo'] && data['nome']);
    case 2: return true;  // contato é opcional
    default: return true;
  }
}
```
