# Template: stepper-form

Formulário multi-etapas standalone com `po-stepper` — wizard com 3+ seções logicamente distintas.

> **Quando usar vs alternativas:**
> - `stepper-form` → 3+ etapas com validação distinta por etapa, UX estilo wizard
> - `page-edit` com `divider` → mesmo formulário, página única, entidade simples
> - `modal-crud` → lista+formulário integrados para entidades simples (até ~10 campos)

## {{kebab-name}}.component.ts

```typescript
import {
  Component,
  ChangeDetectionStrategy,
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
export class {{ComponentClass}} {
  private readonly service      = inject({{ServiceClass}});
  private readonly router       = inject(Router);
  private readonly route        = inject(ActivatedRoute);
  private readonly notification = inject(PoNotificationService);
  private readonly destroyRef   = inject(DestroyRef);

  readonly loading     = signal(false);
  readonly currentStep = signal(1);           // 1-based; po-stepper uses 1-based index
  readonly stepData    = signal<Partial<{{ModelInterface}}>>({});

  readonly steps: PoStepperItem[] = [
    { label: 'Identificação' },
    { label: 'Contato' },
    { label: 'Complemento' },
    { label: 'Confirmação' },
  ];

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
  readonly isLastStep    = computed(() => this.currentStep() === this.steps.length);
  readonly isConfirmStep = computed(() => this.currentStep() === this.steps.length);

  onStepChange(step: number): void {
    this.currentStep.set(step);
  }

  next(): void {
    if (!this.isLastStep()) {
      this.currentStep.update(s => s + 1);
    }
  }

  back(): void {
    if (!this.isFirstStep()) {
      this.currentStep.update(s => s - 1);
    }
  }

  onFormChange(values: Partial<{{ModelInterface}}>): void {
    this.stepData.update(prev => ({ ...prev, ...values }));
  }

  submit(): void {
    this.loading.set(true);
    const payload = this.stepData() as {{ModelInterface}};
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

  private parseProtheusError(err: any): string {
    try {
      const obj    = JSON.parse(err.error?.errorMessage ?? '{}');
      const msg    = decodeURIComponent(escape(obj.message ?? ''));
      const detail = obj.detailedMessage
        ? ` — ${decodeURIComponent(escape(obj.detailedMessage))}`
        : '';
      return `Erro ${obj.code}: ${msg}${detail}`;
    } catch {
      return err.error?.message ?? 'Erro ao processar a requisição.';
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
    [p-steps]="steps"
    [p-current-active-step]="currentStep()"
    (p-current-active-step)="onStepChange($event)">
  </po-stepper>

  @if (!isConfirmStep()) {
    <po-dynamic-form
      [p-fields]="currentFields()"
      [p-value]="stepData()"
      (p-value-change)="onFormChange($event)">
    </po-dynamic-form>
  }

  @if (isConfirmStep()) {
    <p class="po-font-text-large po-mt-3 po-mb-1">Revise os dados antes de confirmar:</p>
    <po-dynamic-view
      [p-fields]="confirmFields"
      [p-value]="stepData()">
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

## Notas sobre po-stepper

- `[p-current-active-step]` é 1-based
- Por padrão o usuário pode clicar em qualquer etapa diretamente — use `onStepChange()` para validar antes de avançar
- Para marcar etapas como concluídas/com erro use `PoStepperItem.status: 'done' | 'error'` e atualize o signal `steps`
