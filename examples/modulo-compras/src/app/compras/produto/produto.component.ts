/**
 * @generated  poui-specialist v1.10.0
 * @author     Andre Costa <andre.andrelscosta@gmail.com>
 * @license    Uso permitido · redistribuição proibida sem autorização escrita
 * @see        https://github.com/Alscosta1973/poui-specialist
 */
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnDestroy,
  inject,
  signal,
  computed,
} from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
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
  PoStepComponent,
  PoStepperItem,
  PoStepperModule,
} from '@po-ui/ng-components';
import { ProdutoService } from '../produto.service';
import { Produto } from '../models/produto.model';

@Component({
  selector: 'app-produto',
  standalone: true,
  imports: [
    PoPageModule,
    PoStepperModule,
    PoDynamicModule,
    PoButtonModule,
    PoLoadingModule,
  ],
  templateUrl: './produto.component.html',
  styleUrl: './produto.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProdutoComponent implements AfterViewInit, OnDestroy {
  private readonly service      = inject(ProdutoService);
  private readonly router       = inject(Router);
  private readonly route        = inject(ActivatedRoute);
  private readonly notification = inject(PoNotificationService);
  private readonly destroyRef   = inject(DestroyRef);
  private readonly cdr          = inject(ChangeDetectorRef);

  readonly loading     = signal(false);
  readonly currentStep = signal(1);  // 1-based — po-stepper usa base 1

  // Plain property — NÃO usar signal (Quirk #15: re-init do form a cada keystroke).
  // Atualizado via (p-form)+valueChanges (Quirk #13: (p-value-change) não existe em PO-UI).
  formData: Partial<Produto> = {};

  private formSub: Subscription | null = null;

  // Signal com status explícito por item — necessário para que back() limpe
  // o estado 'done' dos steps posteriores ao alvo (po-stepper não faz isso sozinho).
  readonly steps = signal<PoStepperItem[]>([
    { label: 'Dados Gerais',             status: 'active'  as PoStepperItem['status'] },
    { label: 'Classificação e Unidade',  status: 'default' as PoStepperItem['status'] },
    { label: 'Preços e Estoque',         status: 'default' as PoStepperItem['status'] },
    { label: 'Confirmação',              status: 'default' as PoStepperItem['status'] },
  ]);

  readonly step1Fields: PoDynamicFormField[] = [
    {
      property: 'codigo',
      label: 'Código',
      divider: 'Dados Gerais',
      required: true,
      maxLength: 6,
      gridColumns: 3,
    },
    {
      property: 'descricao',
      label: 'Descrição',
      required: true,
      minLength: 3,
      maxLength: 60,
      gridColumns: 9,
    },
    {
      property: 'tipo',
      label: 'Tipo',
      required: true,
      options: [
        { label: 'Produto Acabado',          value: 'PA' },
        { label: 'Matéria-Prima',            value: 'MP' },
        { label: 'Mercadoria para Revenda',  value: 'MR' },
        { label: 'Serviço',                  value: 'SV' },
      ],
      gridColumns: 6,
    },
    {
      property: 'unidadeMedida',
      label: 'Unidade de Medida',
      required: true,
      maxLength: 2,
      gridColumns: 3,
    },
  ];

  readonly step2Fields: PoDynamicFormField[] = [
    {
      property: 'grupo',
      label: 'Grupo de Mercadorias',
      divider: 'Classificação e Unidade',
      required: true,
      optionsService: '/api/custom/v1/grupos-mercadorias',
      fieldLabel: 'descricao',
      fieldValue: 'codigo',
      gridColumns: 6,
    },
    {
      property: 'localPadrao',
      label: 'Local Padrão (Armazém)',
      optional: true,
      maxLength: 2,
      gridColumns: 3,
    },
    {
      property: 'ativo',
      label: 'Ativo',
      type: 'boolean',
      booleanTrue: 'S',
      booleanFalse: 'N',
      gridColumns: 3,
    },
  ];

  readonly step3Fields: PoDynamicFormField[] = [
    {
      property: 'precoVenda',
      label: 'Preço de Venda',
      divider: 'Preços e Estoque',
      type: 'currency',
      decimalsLength: 2,
      required: true,
      gridColumns: 4,
    },
    {
      property: 'custoPadrao',
      label: 'Custo Padrão',
      type: 'currency',
      decimalsLength: 2,
      gridColumns: 4,
    },
    {
      property: 'pesoLiquido',
      label: 'Peso Líquido (kg)',
      type: 'currency',
      decimalsLength: 3,
      optional: true,
      gridColumns: 4,
    },
    {
      property: 'estoqueMinimo',
      label: 'Estoque Mínimo',
      type: 'number',
      required: true,
      gridColumns: 4,
    },
    {
      property: 'estoqueMaximo',
      label: 'Estoque Máximo',
      type: 'number',
      optional: true,
      gridColumns: 4,
    },
    {
      property: 'controlaLote',
      label: 'Controla Lote',
      type: 'boolean',
      booleanTrue: 'S',
      booleanFalse: 'N',
      gridColumns: 4,
    },
  ];

  readonly confirmFields: PoDynamicViewField[] = [
    { property: 'codigo',         label: 'Código',            gridColumns: 3 },
    { property: 'descricao',      label: 'Descrição',         gridColumns: 9 },
    { property: 'tipo',           label: 'Tipo',               gridColumns: 4 },
    { property: 'unidadeMedida',  label: 'Unidade',            gridColumns: 3 },
    { property: 'grupo',          label: 'Grupo',              gridColumns: 5 },
    { property: 'ativo',          label: 'Ativo', type: 'boolean', booleanTrue: 'Sim', booleanFalse: 'Não', tag: true, color: 'color-11', gridColumns: 3 },
    { property: 'precoVenda',     label: 'Preço de Venda',    type: 'currency', gridColumns: 4 },
    { property: 'custoPadrao',    label: 'Custo Padrão',      type: 'currency', gridColumns: 4 },
    { property: 'estoqueMinimo',  label: 'Estoque Mínimo',    gridColumns: 4 },
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

  ngOnDestroy(): void {
    this.formSub?.unsubscribe();
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

  onStepChange(event: number | PoStepComponent): void {
    if (typeof event === 'number') {
      this.goToStep(event);
    }
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

  // (p-form) dispara após NgForm criado e novamente a cada mudança de fields (novo step).
  // Quirk #13: (p-value-change) NÃO existe em PO-UI → usar (p-form) + valueChanges.
  onFormInit(form: any): void {
    if (!form?.valueChanges) return;
    this.formSub?.unsubscribe();
    this.formSub = form.valueChanges.subscribe((vals: Partial<Produto>) => {
      this.onFormChange(vals);
    });
  }

  onFormChange(values: Partial<Produto>): void {
    this.formData = {
      ...this.formData,
      ...Object.fromEntries(
        Object.entries(values).filter(([, v]) => v !== null && v !== undefined),
      ) as Partial<Produto>,
    };
  }

  submit(): void {
    this.loading.set(true);
    const payload = this.formData as Produto;
    this.service.create(payload)
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.notification.success('Produto incluído com sucesso.');
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
