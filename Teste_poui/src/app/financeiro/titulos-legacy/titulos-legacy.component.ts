/**
 * @generated  poui-specialist v1.7.0
 * @author     Andre Costa <andre.andrelscosta@gmail.com>
 * @license    Uso permitido · redistribuição proibida sem autorização escrita
 * @see        https://github.com/Alscosta1973/poui-specialist
 *
 * Wave 12 — standalone-migrate
 * BEFORE (NgModule pattern — pré-migração):
 *   @NgModule({ declarations: [TitulosLegacyComponent], imports: [CommonModule] })
 *   constructor(private service: TitulosLegacyService, private notification: PoNotificationService)
 *   @Input() titulo: string = 'Títulos';
 *   @Output() acaoExecutada = new EventEmitter<string>();
 *   loading = false; items: TituloLegacy[] = [];
 *   private destroy$ = new Subject<void>();
 *   ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }
 *   .pipe(takeUntil(this.destroy$))
 *   // sem ChangeDetectionStrategy.OnPush
 */
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnInit,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  PoNotificationService,
  PoPageFilter,
  PoPageModule,
  PoTableColumn,
  PoTableModule,
} from '@po-ui/ng-components';
import { TitulosLegacyService } from './titulos-legacy.service';
import { TituloLegacy } from './models/titulo-legacy.model';

@Component({
  selector: 'app-titulos-legacy',
  standalone: true,
  imports: [PoPageModule, PoTableModule],
  templateUrl: './titulos-legacy.component.html',
  styleUrl: './titulos-legacy.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TitulosLegacyComponent implements OnInit, AfterViewInit {
  private readonly service      = inject(TitulosLegacyService);
  private readonly notification = inject(PoNotificationService);
  private readonly cdr          = inject(ChangeDetectorRef);
  private readonly destroyRef   = inject(DestroyRef);

  readonly items   = signal<TituloLegacy[]>([]);
  readonly loading = signal(false);
  readonly hasNext = signal(false);

  readonly titulo        = input<string>('Títulos');
  readonly acaoExecutada = output<string>();

  readonly cols: PoTableColumn[] = [
    { property: 'codigo',     label: 'Código',     width: '10%' },
    { property: 'emissao',    label: 'Emissão',    type: 'date', format: 'dd/MM/yyyy', width: '12%' },
    { property: 'vencimento', label: 'Vencimento', type: 'date', format: 'dd/MM/yyyy', width: '12%' },
    { property: 'valor',      label: 'Valor',      type: 'currency', format: 'BRL', width: '12%' },
    { property: 'cliente',    label: 'Cliente' },
    { property: 'status',     label: 'Status',     width: '8%' },
  ];

  readonly filterSettings: PoPageFilter = {
    placeholder: 'Buscar por código ou cliente...',
    action: (q: string) => this.onSearch(q),
  };

  ngOnInit(): void { this.load(); }

  ngAfterViewInit(): void { setTimeout(() => this.cdr.detectChanges()); }

  onSearch(query: string): void { this.load(query); }

  onAcao(acao: string): void { this.acaoExecutada.emit(acao); }

  private load(query = ''): void {
    this.loading.set(true);
    this.service.getAll(query)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.items.set(res.items);
          this.hasNext.set(res.hasNext);
          this.loading.set(false);
        },
        error: () => {
          this.notification.error('Erro ao carregar títulos.');
          this.loading.set(false);
        },
      });
  }
}
