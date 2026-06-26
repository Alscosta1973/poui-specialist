/**
 * @generated  poui-specialist v1.3
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
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs/operators';
import {
  PoButtonModule,
  PoBreadcrumb,
  PoDynamicFormField,
  PoDynamicModule,
  PoLoadingModule,
  PoNotificationService,
  PoPageModule,
  PoStepperItem,
  PoStepperModule,
} from '@po-ui/ng-components';
import { FuncionariosService } from '../services/funcionarios.service';
import { FuncionarioForm } from '../models/funcionario.model';

@Component({
  selector: 'app-onboarding-funcionario',
  standalone: true,
  imports: [
    PoPageModule,
    PoStepperModule,
    PoDynamicModule,
    PoButtonModule,
    PoLoadingModule,
  ],
  templateUrl: './onboarding-funcionario.component.html',
  styleUrls: ['./onboarding-funcionario.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnboardingFuncionarioComponent implements AfterViewInit {

  // ---------------------------------------------------------------------------
  // Injeções
  // ---------------------------------------------------------------------------
  private readonly service      = inject(FuncionariosService);
  private readonly router       = inject(Router);
  private readonly notification = inject(PoNotificationService);
  private readonly destroyRef   = inject(DestroyRef);
  private readonly cdr          = inject(ChangeDetectorRef);

  // ---------------------------------------------------------------------------
  // Estado
  // ---------------------------------------------------------------------------
  readonly isLoading   = signal(false);
  readonly currentStep = signal(1);   // 1-based — po-stepper usa base 1

  // Propriedade simples (não signal) para [(p-value)] do po-dynamic-form.
  // Acumula todos os steps via two-way binding — evita reinicialização do
  // form causada por signal re-render a cada keystroke (Quirk #15).
  formData: Partial<FuncionarioForm> = {};

  // ---------------------------------------------------------------------------
  // Breadcrumb
  // ---------------------------------------------------------------------------
  readonly breadcrumb: PoBreadcrumb = {
    items: [
      { label: 'RH' },
      { label: 'Onboarding' },
    ],
  };

  // ---------------------------------------------------------------------------
  // Stepper — status gerenciado explicitamente para que "Anterior" limpe
  // o estado "done" dos steps à frente (po-stepper não faz isso via [p-step])
  // ---------------------------------------------------------------------------
  readonly steps = signal<PoStepperItem[]>([
    { label: 'Dados Pessoais',      status: 'active'  as PoStepperItem['status'] },
    { label: 'Dados Profissionais', status: 'default' as PoStepperItem['status'] },
    { label: 'Endereço',           status: 'default' as PoStepperItem['status'] },
    { label: 'Dados Bancários',    status: 'default' as PoStepperItem['status'] },
  ]);

  // ---------------------------------------------------------------------------
  // Step 1 — Dados Pessoais
  // ---------------------------------------------------------------------------
  readonly step1Fields: PoDynamicFormField[] = [
    {
      property: 'nome',
      label: 'Nome',
      divider: 'Dados Pessoais',
      required: true,
      maxLength: 40,
      gridColumns: 8,
    },
    {
      property: 'cpf',
      label: 'CPF',
      type: 'cpf',         // aplica máscara 999.999.999-99 + validação automática
      required: true,
      gridColumns: 4,
    },
    {
      property: 'dataNascimento',
      label: 'Data de Nascimento',
      type: 'date',
      required: true,
      format: 'dd/MM/yyyy',
      gridColumns: 4,
    },
    {
      property: 'escolaridade',
      label: 'Escolaridade',
      options: [
        { label: 'Fundamental',   value: '7'  },
        { label: 'Médio',         value: '8'  },
        { label: 'Superior',      value: '9'  },
        { label: 'Pós-Graduação', value: '10' },
      ],
      gridColumns: 4,
    },
    {
      property: 'deficiencia',
      label: 'Deficiência',
      options: [
        { label: 'Nenhuma',     value: '0' },
        { label: 'Física',      value: '1' },
        { label: 'Visual',      value: '2' },
        { label: 'Auditiva',    value: '3' },
        { label: 'Intelectual', value: '4' },
      ],
      gridColumns: 4,
    },
  ];

  // ---------------------------------------------------------------------------
  // Step 2 — Dados Profissionais
  // ---------------------------------------------------------------------------
  readonly step2Fields: PoDynamicFormField[] = [
    {
      property: 'cargo',
      label: 'Cargo',
      divider: 'Dados Profissionais',
      required: true,
      maxLength: 30,
      gridColumns: 6,
    },
    {
      property: 'departamento',
      label: 'Departamento',
      required: true,
      maxLength: 9,
      gridColumns: 6,
    },
    {
      property: 'centroCusto',
      label: 'Centro de Custo',
      maxLength: 9,
      gridColumns: 4,
    },
    {
      property: 'dataAdmissao',
      label: 'Data de Admissão',
      type: 'date',
      required: true,
      format: 'dd/MM/yyyy',
      gridColumns: 4,
    },
    {
      property: 'tipoContrato',
      label: 'Tipo de Contrato',
      required: true,
      options: [
        { label: 'CLT',        value: 'CLT' },
        { label: 'PJ',         value: 'PJ'  },
        { label: 'Estágio',    value: 'EST' },
        { label: 'Temporário', value: 'TMP' },
      ],
      gridColumns: 4,
    },
    {
      property: 'turno',
      label: 'Turno',
      options: [
        { label: 'Manhã',  value: '1' },
        { label: 'Tarde',  value: '2' },
        { label: 'Noite',  value: '3' },
      ],
      gridColumns: 4,
    },
    {
      property: 'salario',
      label: 'Salário',
      type: 'currency',
      required: true,
      decimalsLength: 2,
      gridColumns: 4,
    },
  ];

  // ---------------------------------------------------------------------------
  // Step 3 — Endereço
  // ---------------------------------------------------------------------------
  readonly step3Fields: PoDynamicFormField[] = [
    {
      property: 'cep',
      label: 'CEP',
      divider: 'Endereço',
      mask: '99999-999',
      gridColumns: 3,
    },
    {
      property: 'endereco',
      label: 'Endereço',
      maxLength: 40,
      gridColumns: 9,
    },
    {
      property: 'bairro',
      label: 'Bairro',
      maxLength: 12,
      gridColumns: 4,
    },
    {
      property: 'municipio',
      label: 'Município',
      maxLength: 15,
      gridColumns: 5,
    },
    {
      property: 'estado',
      label: 'Estado',
      options: [
        { label: 'AC', value: 'AC' }, { label: 'AL', value: 'AL' },
        { label: 'AP', value: 'AP' }, { label: 'AM', value: 'AM' },
        { label: 'BA', value: 'BA' }, { label: 'CE', value: 'CE' },
        { label: 'DF', value: 'DF' }, { label: 'ES', value: 'ES' },
        { label: 'GO', value: 'GO' }, { label: 'MA', value: 'MA' },
        { label: 'MG', value: 'MG' }, { label: 'MS', value: 'MS' },
        { label: 'MT', value: 'MT' }, { label: 'PA', value: 'PA' },
        { label: 'PB', value: 'PB' }, { label: 'PE', value: 'PE' },
        { label: 'PI', value: 'PI' }, { label: 'PR', value: 'PR' },
        { label: 'RJ', value: 'RJ' }, { label: 'RN', value: 'RN' },
        { label: 'RO', value: 'RO' }, { label: 'RR', value: 'RR' },
        { label: 'RS', value: 'RS' }, { label: 'SC', value: 'SC' },
        { label: 'SE', value: 'SE' }, { label: 'SP', value: 'SP' },
        { label: 'TO', value: 'TO' },
      ],
      gridColumns: 3,
    },
  ];

  // ---------------------------------------------------------------------------
  // Step 4 — Dados Bancários
  // ---------------------------------------------------------------------------
  readonly step4Fields: PoDynamicFormField[] = [
    {
      property: 'banco',
      label: 'Banco',
      divider: 'Dados Bancários',
      maxLength: 3,
      gridColumns: 3,
    },
    {
      property: 'agencia',
      label: 'Agência',
      maxLength: 5,
      gridColumns: 3,
    },
    {
      property: 'conta',
      label: 'Conta',
      maxLength: 13,
      gridColumns: 4,
    },
  ];

  // ---------------------------------------------------------------------------
  // Computeds
  // ---------------------------------------------------------------------------
  readonly currentFields = computed<PoDynamicFormField[]>(() => {
    switch (this.currentStep()) {
      case 1:  return this.step1Fields;
      case 2:  return this.step2Fields;
      case 3:  return this.step3Fields;
      case 4:  return this.step4Fields;
      default: return [];
    }
  });

  readonly isFirstStep = computed(() => this.currentStep() === 1);
  readonly isLastStep  = computed(() => this.currentStep() === this.steps().length);

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------
  // OnPush (Quirk #4): po-page-default não dispara CD automático após init
  // quando nenhum signal muda em ngOnInit. setTimeout força o ciclo após
  // todos os lifecycle hooks do componente host, garantindo projeção do
  // ng-content.
  ngAfterViewInit(): void {
    setTimeout(() => this.cdr.detectChanges());
  }

  // ---------------------------------------------------------------------------
  // Ações do stepper
  // ---------------------------------------------------------------------------

  // Atualiza status visual de cada step: steps antes do alvo → 'done',
  // alvo → 'active', steps após → 'default' (garante limpeza ao voltar)
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

  onFormChange(values: Partial<FuncionarioForm>): void {
    // Merge somente valores definidos — preserva dados dos steps anteriores
    this.formData = {
      ...this.formData,
      ...Object.fromEntries(
        Object.entries(values).filter(([, v]) => v !== null && v !== undefined),
      ) as Partial<FuncionarioForm>,
    };
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

  cancel(): void {
    this.router.navigate(['/rh/funcionarios']);
  }

  // ---------------------------------------------------------------------------
  // Submissão
  // ---------------------------------------------------------------------------
  save(): void {
    const payload = this.formData as FuncionarioForm;
    this.isLoading.set(true);

    this.service.create(payload)
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.notification.success('Funcionário cadastrado com sucesso.');
          this.router.navigate(['/rh/funcionarios']);
        },
        error: (err: unknown) => {
          this.notification.error(this.parseProtheusError(err));
        },
      });
  }


  // ---------------------------------------------------------------------------
  // Parser de erro Protheus
  // ---------------------------------------------------------------------------
  private parseProtheusError(err: unknown): string {
    try {
      const errObj = JSON.parse((err as { error?: { errorMessage?: string } }).error?.errorMessage ?? '{}');
      const decode = (s: string): string =>
        new TextDecoder('iso-8859-1').decode(
          Uint8Array.from(s, (c) => c.charCodeAt(0)),
        );
      const msg    = decode((errObj as { message?: string }).message ?? '');
      const detail = (errObj as { detailedMessage?: string }).detailedMessage
        ? ` — ${decode((errObj as { detailedMessage: string }).detailedMessage)}`
        : '';
      return `Erro ${(errObj as { code?: string | number }).code}: ${msg}${detail}`;
    } catch {
      return (err as { error?: { message?: string } }).error?.message
        ?? 'Erro ao processar a requisição.';
    }
  }
}
