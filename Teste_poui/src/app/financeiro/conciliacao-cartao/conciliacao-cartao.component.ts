import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';
import {
  PoButtonModule,
  PoFieldModule,
  PoNotificationService,
  PoPageModule,
  PoTableColumn,
  PoTableModule,
} from '@po-ui/ng-components';
import { ConciliacaoCartaoService } from './conciliacao-cartao.service';
import {
  ConfirmarConciliacaoRequest,
  ContaReceber,
  MovimentoAdquirente,
  StatusConciliacao,
} from './models/conciliacao-cartao.model';

@Component({
  selector: 'app-conciliacao-cartao',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PoPageModule,
    PoTableModule,
    PoButtonModule,
    PoFieldModule,
  ],
  templateUrl: './conciliacao-cartao.component.html',
  styleUrl: './conciliacao-cartao.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConciliacaoCartaoComponent implements OnInit {
  private readonly service      = inject(ConciliacaoCartaoService);
  private readonly notification = inject(PoNotificationService);
  private readonly destroyRef   = inject(DestroyRef);
  private readonly cdr          = inject(ChangeDetectorRef);

  banco   = '341';
  agencia = '00001';
  conta   = '000001';

  readonly loading       = signal(false);
  readonly movimentos    = signal<MovimentoAdquirente[]>([]);
  readonly contasReceber = signal<ContaReceber[]>([]);
  readonly marcadoAdq    = signal<MovimentoAdquirente | null>(null);
  readonly marcadoRec    = signal<ContaReceber | null>(null);

  readonly totalMovimentos  = computed(() =>
    this.movimentos().reduce((s, m) => s + m.vlLiquido, 0)
  );
  readonly totalSelecionado = computed(() => this.marcadoAdq()?.vlLiquido ?? 0);

  readonly browseHeight = 350;

  readonly legendas: { status: StatusConciliacao; label: string }[] = [
    { status: '1', label: 'Não Conciliado' },
    { status: '2', label: 'Conciliado'     },
    { status: '3', label: 'Baixado'        },
    { status: '4', label: 'Não Encontrado' },
    { status: '5', label: 'Com Erro'       },
    { status: '6', label: 'Taxa com Erro'  },
  ];

  readonly colunasAdq: PoTableColumn[] = [
    { property: 'status',      label: 'St.',         width: '40px',  type: 'columnTemplate' },
    { property: 'dtPagamento', label: 'Dt Pgto',     width: '95px',  type: 'date', format: 'dd/MM/yyyy' },
    { property: 'titulo',      label: 'Título',      width: '80px'  },
    { property: 'numPedido',   label: 'Num. Pedido', width: '95px'  },
    { property: 'numParcela',  label: 'Par.',        width: '50px'  },
    { property: 'vlBruto',     label: 'Vl Bruto',    width: '90px',  type: 'columnTemplate' },
    { property: 'vlTaxa',      label: 'Vl Taxa',     width: '80px',  type: 'columnTemplate' },
    { property: 'vlLiquido',   label: 'Vl Líquido',  width: '90px',  type: 'columnTemplate' },
  ];

  readonly colunasRec: PoTableColumn[] = [
    { property: 'status',    label: 'St.',         width: '40px',  type: 'columnTemplate' },
    { property: 'pedido',    label: 'Pedido',      width: '80px'  },
    { property: 'emissao',   label: 'Emissão',     width: '95px',  type: 'date', format: 'dd/MM/yyyy' },
    { property: 'numTitulo', label: 'Título',      width: '80px'  },
    { property: 'parcela',   label: 'Par.',        width: '50px'  },
    { property: 'valor',     label: 'Valor',       width: '90px',  type: 'columnTemplate' },
    { property: 'vlTaxa',    label: 'Vl Taxa',     width: '80px',  type: 'columnTemplate' },
    { property: 'vlLiquido', label: 'Vl Líquido',  width: '90px',  type: 'columnTemplate' },
  ];

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    if (!this.banco || !this.agencia || !this.conta) {
      this.notification.warning('Informe Banco, Agência e Conta para carregar.');
      return;
    }
    this.loading.set(true);
    this.marcadoAdq.set(null);
    this.marcadoRec.set(null);
    forkJoin({
      movimentos: this.service.carregarMovimentos(this.banco, this.agencia, this.conta),
      titulos:    this.service.carregarTitulos(this.banco, this.agencia, this.conta),
    })
    .pipe(
      finalize(() => this.loading.set(false)),
      takeUntilDestroyed(this.destroyRef),
    )
    .subscribe({
      next: ({ movimentos, titulos }) => {
        this.movimentos.set(movimentos);
        this.contasReceber.set(titulos);
        this.cdr.markForCheck();
      },
      error: () => this.notification.error('Erro ao carregar dados.'),
    });
  }

  automatico(): void {
    this.loading.set(true);
    this.service.automatico(this.banco, this.agencia, this.conta)
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ movimentos, titulos }) => {
          this.movimentos.update(movs =>
            movs.map(m => movimentos.includes(m.id) ? { ...m, status: '2' as StatusConciliacao } : m)
          );
          this.contasReceber.update(recs =>
            recs.map(r => titulos.includes(r.id) ? { ...r, status: '2' as StatusConciliacao } : r)
          );
          this.notification.success(`${movimentos.length} registro(s) conciliado(s) automaticamente.`);
          this.cdr.markForCheck();
        },
        error: () => this.notification.error('Erro na conciliação automática.'),
      });
  }

  confirmar(): void {
    const adq = this.marcadoAdq();
    const rec = this.marcadoRec();
    if (!adq || !rec) {
      this.notification.warning('Marque um Movimento Adquirente e um Título para confirmar.');
      return;
    }
    const req: ConfirmarConciliacaoRequest = {
      banco:       this.banco,
      agencia:     this.agencia,
      conta:       this.conta,
      movimentoId: adq.id,
      tituloId:    rec.id,
    };
    this.loading.set(true);
    this.service.confirmar(req)
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.notification.success('Título baixado com sucesso.');
          this.movimentos.update(movs =>
            movs.map(m => m.id === adq.id ? { ...m, status: '3' as StatusConciliacao, $selected: false } : m)
          );
          this.contasReceber.update(recs =>
            recs.map(r => r.id === rec.id ? { ...r, status: '3' as StatusConciliacao, $selected: false } : r)
          );
          this.marcadoAdq.set(null);
          this.marcadoRec.set(null);
          this.cdr.markForCheck();
        },
        error: () => this.notification.error('Erro ao confirmar baixa.'),
      });
  }

  cancelar(): void {
    this.banco = '';
    this.agencia = '';
    this.conta = '';
    this.movimentos.set([]);
    this.contasReceber.set([]);
    this.marcadoAdq.set(null);
    this.marcadoRec.set(null);
    this.cdr.markForCheck();
  }

  // ── Browse01: seleção única — somente status '1'
  onSelectAdq(item: MovimentoAdquirente): void {
    if (item.status !== '1') {
      this.notification.warning(`Apenas registros "Não Conciliados" podem ser marcados.`);
      this.movimentos.update(movs => movs.map(m => m.id === item.id ? { ...m, $selected: false } : m));
      this.cdr.markForCheck();
      return;
    }
    const prev = this.marcadoAdq();
    if (prev && prev.id !== item.id) {
      this.movimentos.update(movs => movs.map(m => m.id === prev.id ? { ...m, $selected: false } : m));
    }
    this.marcadoAdq.set(item);
    // Limpa seleção de Browse02 ao trocar Browse01
    this.marcadoRec.set(null);
    this.contasReceber.update(recs => recs.map(r => ({ ...r, $selected: false })));
    this.cdr.markForCheck();
  }

  onUnselectAdq(item: MovimentoAdquirente): void {
    if (this.marcadoAdq()?.id === item.id) {
      this.marcadoAdq.set(null);
      this.marcadoRec.set(null);
    }
    this.cdr.markForCheck();
  }

  onAllSelectedAdq(_items: MovimentoAdquirente[]): void {
    this.notification.warning('Somente pode marcar um registro por vez.');
    this.movimentos.update(movs => movs.map(m => ({ ...m, $selected: false })));
    this.marcadoAdq.set(null);
    this.cdr.markForCheck();
  }

  // ── Browse02: requer Browse01 marcado, valida parcela
  onSelectRec(item: ContaReceber): void {
    const adq = this.marcadoAdq();
    if (!adq) {
      this.notification.warning('Marque primeiro um Movimento Adquirente.');
      this.contasReceber.update(recs => recs.map(r => r.id === item.id ? { ...r, $selected: false } : r));
      this.cdr.markForCheck();
      return;
    }
    if (item.status !== '1') {
      this.notification.warning(`Apenas títulos "Não Conciliados" podem ser marcados.`);
      this.contasReceber.update(recs => recs.map(r => r.id === item.id ? { ...r, $selected: false } : r));
      this.cdr.markForCheck();
      return;
    }
    if (item.parcela !== adq.numParcela) {
      this.notification.warning(`Parcela não confere: Adquirente ${adq.numParcela} × Título ${item.parcela}.`);
      this.contasReceber.update(recs => recs.map(r => r.id === item.id ? { ...r, $selected: false } : r));
      this.cdr.markForCheck();
      return;
    }
    const prev = this.marcadoRec();
    if (prev && prev.id !== item.id) {
      this.contasReceber.update(recs => recs.map(r => r.id === prev.id ? { ...r, $selected: false } : r));
    }
    this.marcadoRec.set(item);
    this.cdr.markForCheck();
  }

  onUnselectRec(item: ContaReceber): void {
    if (this.marcadoRec()?.id === item.id) {
      this.marcadoRec.set(null);
    }
    this.cdr.markForCheck();
  }

  onAllSelectedRec(_items: ContaReceber[]): void {
    this.notification.warning('Somente pode marcar um registro por vez.');
    this.contasReceber.update(recs => recs.map(r => ({ ...r, $selected: false })));
    this.marcadoRec.set(null);
    this.cdr.markForCheck();
  }

  statusLabel(status: StatusConciliacao): string {
    const map: Record<StatusConciliacao, string> = {
      '1': 'Não Conciliado',
      '2': 'Conciliado',
      '3': 'Baixado',
      '4': 'Não Encontrado',
      '5': 'Com Erro',
      '6': 'Taxa com Erro',
    };
    return map[status];
  }

  fmtVal(v: number): string {
    return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}
