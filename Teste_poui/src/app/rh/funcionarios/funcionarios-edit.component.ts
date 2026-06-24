/**
 * @generated  poui-specialist v1.3
 * @author     Andre Costa <andre.andrelscosta@gmail.com>
 * @license    Uso permitido · redistribuição proibida sem autorização escrita
 * @see        https://github.com/Alscosta1973/poui-specialist
 */
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import {
  PoButtonModule,
  PoDividerModule,
  PoFieldModule,
  PoNotificationService,
  PoPageAction,
  PoPageModule,
  PoBreadcrumb,
  PoSelectOption,
} from '@po-ui/ng-components';
import { FuncionariosService } from '../services/funcionarios.service';
import { FuncionarioForm } from '../models/funcionario.model';

@Component({
  selector: 'app-funcionarios-edit',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    PoPageModule,
    PoFieldModule,
    PoDividerModule,
    PoButtonModule,
  ],
  templateUrl: './funcionarios-edit.component.html',
  styleUrls: ['./funcionarios-edit.component.scss'],
})
export class FuncionariosEditComponent implements OnInit {
  // ---------------------------------------------------------------------------
  // Injeções
  // ---------------------------------------------------------------------------
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(FuncionariosService);
  private readonly notification = inject(PoNotificationService);
  private readonly destroyRef = inject(DestroyRef);

  // ---------------------------------------------------------------------------
  // Estado
  // ---------------------------------------------------------------------------
  readonly isEdit = signal(false);
  readonly isLoading = signal(false);
  private matParam = '';

  // ---------------------------------------------------------------------------
  // Breadcrumb
  // ---------------------------------------------------------------------------
  get breadcrumb(): PoBreadcrumb {
    return {
      items: [
        { label: 'RH' },
        { label: 'Funcionários', link: '/rh/funcionarios' },
        { label: this.isEdit() ? 'Editar' : 'Novo' },
      ],
    };
  }

  // ---------------------------------------------------------------------------
  // Ações da página
  // ---------------------------------------------------------------------------
  get pageActions(): PoPageAction[] {
    return [
      {
        label: 'Salvar',
        action: () => this.save(),
        loading: this.isLoading(),
      },
      {
        label: 'Cancelar',
        action: () => this.goBack(),
      },
    ];
  }

  // ---------------------------------------------------------------------------
  // Formulário
  // ---------------------------------------------------------------------------
  readonly form = this.fb.group({
    // Seção 1 — Dados Pessoais
    matricula:      ['', [Validators.required, Validators.maxLength(6)]],
    nome:           ['', [Validators.required, Validators.maxLength(40)]],
    cpf:            ['', Validators.maxLength(14)],
    dataNascimento: [''],
    escolaridade:   [''],
    deficiencia:    [''],
    // Seção 2 — Dados Profissionais
    cargo:          ['', Validators.maxLength(30)],
    departamento:   ['', Validators.maxLength(9)],
    centroCusto:    ['', Validators.maxLength(9)],
    dataAdmissao:   ['', Validators.required],
    situacao:       [''],
    tipoContrato:   [''],
    turno:          [''],
    salario:        [null as number | null],
    // Seção 3 — Endereço
    endereco:       ['', Validators.maxLength(40)],
    bairro:         ['', Validators.maxLength(12)],
    municipio:      ['', Validators.maxLength(15)],
    estado:         [''],
    cep:            ['', Validators.maxLength(9)],
    // Seção 4 — Dados Bancários
    banco:          ['', Validators.maxLength(3)],
    agencia:        ['', Validators.maxLength(5)],
    conta:          ['', Validators.maxLength(13)],
  });

  // ---------------------------------------------------------------------------
  // Opções de select
  // ---------------------------------------------------------------------------
  readonly escolaridadeOptions: PoSelectOption[] = [
    { value: '1',  label: 'Analfabeto' },
    { value: '2',  label: 'Fundamental Incompleto' },
    { value: '3',  label: 'Fundamental Completo' },
    { value: '4',  label: 'Médio Incompleto' },
    { value: '5',  label: 'Médio Completo' },
    { value: '6',  label: 'Superior Incompleto' },
    { value: '7',  label: 'Superior Completo' },
    { value: '8',  label: 'Pós-Graduação' },
    { value: '9',  label: 'Mestrado' },
    { value: '10', label: 'Doutorado' },
  ];

  readonly deficienciaOptions: PoSelectOption[] = [
    { value: '0', label: 'Não' },
    { value: '1', label: 'Física' },
    { value: '2', label: 'Auditiva' },
    { value: '3', label: 'Visual' },
    { value: '4', label: 'Mental' },
    { value: '5', label: 'Múltipla' },
  ];

  readonly situacaoOptions: PoSelectOption[] = [
    { value: 'A', label: 'Ativo' },
    { value: 'I', label: 'Inativo' },
    { value: 'F', label: 'Afastado' },
  ];

  readonly tipoContratoOptions: PoSelectOption[] = [
    { value: 'CLT', label: 'CLT' },
    { value: 'PJ',  label: 'PJ' },
    { value: 'EST', label: 'Estagiário' },
  ];

  readonly turnoOptions: PoSelectOption[] = [
    { value: '1', label: '1º Turno' },
    { value: '2', label: '2º Turno' },
    { value: '3', label: '3º Turno' },
  ];

  readonly estadoOptions: PoSelectOption[] = [
    { value: 'AC', label: 'AC' }, { value: 'AL', label: 'AL' },
    { value: 'AM', label: 'AM' }, { value: 'BA', label: 'BA' },
    { value: 'CE', label: 'CE' }, { value: 'DF', label: 'DF' },
    { value: 'ES', label: 'ES' }, { value: 'GO', label: 'GO' },
    { value: 'MA', label: 'MA' }, { value: 'MG', label: 'MG' },
    { value: 'MS', label: 'MS' }, { value: 'MT', label: 'MT' },
    { value: 'PA', label: 'PA' }, { value: 'PB', label: 'PB' },
    { value: 'PE', label: 'PE' }, { value: 'PI', label: 'PI' },
    { value: 'PR', label: 'PR' }, { value: 'RJ', label: 'RJ' },
    { value: 'RN', label: 'RN' }, { value: 'RO', label: 'RO' },
    { value: 'RR', label: 'RR' }, { value: 'RS', label: 'RS' },
    { value: 'SC', label: 'SC' }, { value: 'SE', label: 'SE' },
    { value: 'SP', label: 'SP' }, { value: 'TO', label: 'TO' },
  ];

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------
  ngOnInit(): void {
    const mat = this.route.snapshot.paramMap.get('mat');

    if (mat) {
      this.matParam = mat;
      this.isEdit.set(true);
      this.form.get('matricula')?.disable();
      this.loadFuncionario(mat);
    }
  }

  // ---------------------------------------------------------------------------
  // Carregamento
  // ---------------------------------------------------------------------------
  private loadFuncionario(mat: string): void {
    this.isLoading.set(true);

    this.service.getById(mat)
      .pipe(takeUntilDestroyed(this.destroyRef))
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
          this.isLoading.set(false);
        },
        error: () => {
          this.notification.error('Erro ao carregar dados do funcionário.');
          this.isLoading.set(false);
        },
      });
  }

  // ---------------------------------------------------------------------------
  // Ações
  // ---------------------------------------------------------------------------
  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notification.warning('Preencha todos os campos obrigatórios.');
      return;
    }

    const raw = this.form.getRawValue();
    const payload: FuncionarioForm = {
      nome:           raw.nome ?? '',
      dataAdmissao:   raw.dataAdmissao ?? '',
      cpf:            raw.cpf ?? undefined,
      dataNascimento: raw.dataNascimento ?? undefined,
      escolaridade:   raw.escolaridade ?? undefined,
      deficiencia:    raw.deficiencia ?? undefined,
      cargo:          raw.cargo ?? undefined,
      departamento:   raw.departamento ?? undefined,
      centroCusto:    raw.centroCusto ?? undefined,
      situacao:       (raw.situacao as 'A' | 'I' | 'F') || undefined,
      tipoContrato:   (raw.tipoContrato as 'CLT' | 'PJ' | 'EST') || undefined,
      turno:          raw.turno ?? undefined,
      salario:        raw.salario ?? undefined,
      endereco:       raw.endereco ?? undefined,
      bairro:         raw.bairro ?? undefined,
      municipio:      raw.municipio ?? undefined,
      estado:         raw.estado ?? undefined,
      cep:            raw.cep ?? undefined,
      banco:          raw.banco ?? undefined,
      agencia:        raw.agencia ?? undefined,
      conta:          raw.conta ?? undefined,
    };

    if (!this.isEdit()) {
      payload.matricula = raw.matricula ?? undefined;
    }

    this.isLoading.set(true);

    const request$ = this.isEdit()
      ? this.service.update(this.matParam, payload)
      : this.service.create(payload);

    request$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          const msg = this.isEdit()
            ? 'Funcionário atualizado com sucesso.'
            : 'Funcionário criado com sucesso.';
          this.notification.success(msg);
          this.isLoading.set(false);
          this.goBack();
        },
        error: () => {
          const msg = this.isEdit()
            ? 'Erro ao atualizar funcionário.'
            : 'Erro ao criar funcionário.';
          this.notification.error(msg);
          this.isLoading.set(false);
        },
      });
  }

  goBack(): void {
    this.router.navigate(['/rh/funcionarios']);
  }
}
