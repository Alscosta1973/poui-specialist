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
import { Router, ActivatedRoute } from '@angular/router';
import {
  PoInfoModule,
  PoDividerModule,
  PoNotificationService,
  PoPageModule,
  PoBreadcrumb,
  PoLoadingModule,
} from '@po-ui/ng-components';
import { FuncionariosService } from '../services/funcionarios.service';
import { Funcionario } from '../models/funcionario.model';

@Component({
  selector: 'app-funcionarios-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PoPageModule,
    PoInfoModule,
    PoDividerModule,
    PoLoadingModule,
  ],
  templateUrl: './funcionarios-detail.component.html',
  styleUrls: ['./funcionarios-detail.component.scss'],
})
export class FuncionariosDetailComponent implements OnInit {
  // ---------------------------------------------------------------------------
  // Injeções
  // ---------------------------------------------------------------------------
  private readonly router       = inject(Router);
  private readonly route        = inject(ActivatedRoute);
  private readonly service      = inject(FuncionariosService);
  private readonly notification = inject(PoNotificationService);
  private readonly destroyRef   = inject(DestroyRef);

  // ---------------------------------------------------------------------------
  // Estado
  // ---------------------------------------------------------------------------
  readonly funcionario = signal<Funcionario | null>(null);
  readonly isLoading   = signal(false);
  private matParam     = '';

  // ---------------------------------------------------------------------------
  // Breadcrumb
  // ---------------------------------------------------------------------------
  readonly breadcrumb: PoBreadcrumb = {
    items: [
      { label: 'RH' },
      { label: 'Funcionários', link: '/rh/funcionarios' },
      { label: 'Detalhe' },
    ],
  };

  // ---------------------------------------------------------------------------
  // Helpers de exibição
  // ---------------------------------------------------------------------------
  readonly escolaridadeMap: Record<string, string> = {
    '1':  'Analfabeto',
    '2':  'Fundamental Incompleto',
    '3':  'Fundamental Completo',
    '4':  'Médio Incompleto',
    '5':  'Médio Completo',
    '6':  'Superior Incompleto',
    '7':  'Superior Completo',
    '8':  'Pós-Graduação',
    '9':  'Mestrado',
    '10': 'Doutorado',
  };

  readonly deficienciaMap: Record<string, string> = {
    '0': 'Não',
    '1': 'Física',
    '2': 'Auditiva',
    '3': 'Visual',
    '4': 'Mental',
    '5': 'Múltipla',
  };

  readonly situacaoMap: Record<string, string> = {
    A: 'Ativo',
    I: 'Inativo',
    F: 'Afastado',
  };

  readonly tipoContratoMap: Record<string, string> = {
    CLT: 'CLT',
    PJ:  'PJ',
    EST: 'Estagiário',
  };

  label(value: string | undefined, map: Record<string, string>): string {
    if (!value) return '—';
    return map[value] ?? value;
  }

  currency(value: number | undefined): string {
    if (value == null) return '—';
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  text(value: string | undefined): string {
    return value ?? '—';
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------
  ngOnInit(): void {
    const mat = this.route.snapshot.paramMap.get('mat');
    if (mat) {
      this.matParam = mat;
      this.loadFuncionario(mat);
    } else {
      this.notification.error('Matrícula não informada.');
      this.goBack();
    }
  }

  // ---------------------------------------------------------------------------
  // Carregamento
  // ---------------------------------------------------------------------------
  private loadFuncionario(mat: string): void {
    this.isLoading.set(true);

    this.service
      .getById(mat)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (funcionario) => {
          this.funcionario.set(funcionario);
          this.isLoading.set(false);
        },
        error: () => {
          this.notification.error('Erro ao carregar dados do funcionário.');
          this.isLoading.set(false);
          this.goBack();
        },
      });
  }

  // ---------------------------------------------------------------------------
  // Navegação
  // ---------------------------------------------------------------------------
  navigateToEdit(): void {
    this.router.navigate(['/rh/funcionarios', this.matParam, 'editar']);
  }

  goBack(): void {
    this.router.navigate(['/rh/funcionarios']);
  }
}
