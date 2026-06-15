import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  DestroyRef,
  HostListener,
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
export class ConciliacaoCartaoComponent implements OnInit, AfterViewInit {
  private readonly service      = inject(ConciliacaoCartaoService);
  private readonly notification = inject(PoNotificationService);
  private readonly destroyRef   = inject(DestroyRef);
  private readonly cdr          = inject(ChangeDetectorRef);

  banco     = '341';
  agencia   = '00001';
  conta     = '000001';
  tolerancia = 0.01; // equivale ao MV NL_CONCIL2 — diferença máxima de valor aceita na conciliação

  readonly loading       = signal(false);
  readonly movimentos    = signal<MovimentoAdquirente[]>([]);
  readonly contasReceber = signal<ContaReceber[]>([]);
  readonly marcadoAdq    = signal<MovimentoAdquirente | null>(null);
  readonly marcadoRec    = signal<ContaReceber | null>(null);

  readonly totalMovimentos  = computed(() =>
    this.movimentos().reduce((s, m) => s + m.vlLiquido, 0)
  );
  readonly totalSelecionado = computed(() => this.marcadoAdq()?.vlLiquido ?? 0);

  readonly contagemAdq = computed(() =>
    this.movimentos().reduce((acc, r) => {
      acc[r.status] = (acc[r.status] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  );

  readonly contagemRec = computed(() =>
    this.contasReceber().reduce((acc, r) => {
      acc[r.status] = (acc[r.status] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  );

  private readonly _winH = signal(window.innerHeight);

  readonly browseHeight = computed(() => {
    const hasStatusBar = this.marcadoAdq() !== null;
    return Math.max(180, this._winH() - (hasStatusBar ? 456 : 420));
  });

  readonly legendas: { status: StatusConciliacao; label: string }[] = [
    { status: '1', label: 'Não Conciliado' },
    { status: '2', label: 'Conciliado'     },
    { status: '3', label: 'Baixado'        },
    { status: '4', label: 'Não Encontrado' },
    { status: '5', label: 'Com Erro'       },
    { status: '6', label: 'Taxa com Erro'  },
  ];

  readonly colunasAdq: PoTableColumn[] = [
    { property: 'status',      label: 'St.',     width: '28px',  type: 'columnTemplate' },
    { property: 'dtPagamento', label: 'Pgto',    width: '84px',  type: 'date', format: 'dd/MM/yyyy' },
    { property: 'titulo',      label: 'Título',  width: '52px'  },
    { property: 'numPedido',   label: 'Pedido',  width: '62px'  },
    { property: 'numParcela',  label: 'Par.',    width: '38px'  },
    { property: 'vlBruto',     label: 'V.Bruto', width: '68px',  type: 'columnTemplate' },
    { property: 'vlTaxa',      label: 'V.Taxa',  width: '64px',  type: 'columnTemplate' },
    { property: 'vlLiquido',   label: 'V.Líq.',  width: '68px',  type: 'columnTemplate' },
  ];

  readonly colunasRec: PoTableColumn[] = [
    { property: 'status',    label: 'St.',     width: '28px',  type: 'columnTemplate' },
    { property: 'pedido',    label: 'Pedido',  width: '66px'  },
    { property: 'emissao',   label: 'Emissão', width: '84px',  type: 'date', format: 'dd/MM/yyyy' },
    { property: 'numTitulo', label: 'Título',  width: '50px'  },
    { property: 'parcela',   label: 'Par.',    width: '38px'  },
    { property: 'valor',     label: 'Valor',   width: '68px',  type: 'columnTemplate' },
    { property: 'vlTaxa',    label: 'V.Taxa',  width: '64px',  type: 'columnTemplate' },
    { property: 'vlLiquido', label: 'V.Líq.',  width: '66px',  type: 'columnTemplate' },
  ];

  ngOnInit(): void {
    this.carregar();
  }

  ngAfterViewInit(): void {
    this._winH.set(window.innerHeight);
  }

  @HostListener('window:resize')
  onResize(): void {
    this._winH.set(window.innerHeight);
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

  // po-table commits the selection internally before firing (p-selected).
  // Deferring with setTimeout(0) lets the event cycle finish before replacing
  // the items array — po-table reinitializes $selected on the next detection pass.
  private rejectAdqSelection(_itemId: string): void {
    setTimeout(() => {
      this.movimentos.update(movs => movs.map(m => ({ ...m, $selected: m.id === this.marcadoAdq()?.id })));
      this.cdr.markForCheck();
    }, 0);
  }

  private rejectRecSelection(_itemId: string): void {
    setTimeout(() => {
      this.contasReceber.update(recs => recs.map(r => ({ ...r, $selected: r.id === this.marcadoRec()?.id })));
      this.cdr.markForCheck();
    }, 0);
  }

  // SetMrkAll: bloqueia marcar-todos no Browse01 (Adquirentes)
  onAllSelectedAdq(_rows: MovimentoAdquirente[]): void {
    this.notification.warning('Somente pode marcar um registro por vez.');
    setTimeout(() => {
      this.movimentos.update(movs => movs.map(m => ({ ...m, $selected: false })));
      this.cdr.markForCheck();
    }, 0);
  }

  // SetMrkAll: bloqueia marcar-todos no Browse02 (Contas a Receber)
  onAllSelectedRec(_rows: ContaReceber[]): void {
    this.notification.warning('Somente pode marcar um registro por vez.');
    setTimeout(() => {
      this.contasReceber.update(recs => recs.map(r => ({ ...r, $selected: false })));
      this.cdr.markForCheck();
    }, 0);
  }

  // RegMark01 — marcar Browse01: seleção única, somente status '1'
  onSelectAdq(item: MovimentoAdquirente): void {
    if (item.status !== '1') {
      this.notification.warning('Status do registro diferente de "Não Conciliado".');
      this.rejectAdqSelection(item.id);
      return;
    }
    // Já existe marcação em Browse01 com registro diferente (equivale ao controle MV_PAR60)
    const prev = this.marcadoAdq();
    if (prev && prev.id !== item.id) {
      this.notification.warning('Já existe marcação não conciliada.');
      this.rejectAdqSelection(item.id);
      return;
    }
    this.marcadoAdq.set(item);
    // Limpa Browse02 ao marcar Browse01
    this.marcadoRec.set(null);
    this.contasReceber.update(recs => recs.map(r => ({ ...r, $selected: false })));
    this.cdr.markForCheck();
  }

  // RegMark01 — desmarcar Browse01: desvincular os dois registros se havia titulo linkado
  onUnselectAdq(item: MovimentoAdquirente): void {
    const current = this.movimentos().find(m => m.id === item.id) ?? item;
    if (current.titulo) {
      this._desvinculaAdq(current);
    }
    if (this.marcadoAdq()?.id === item.id) {
      this.marcadoAdq.set(null);
      this.marcadoRec.set(null);
    }
    this.cdr.markForCheck();
  }

  // RegMark02 — marcar Browse02: requer Browse01 marcado, valida parcela e tolerância de valor
  onSelectRec(item: ContaReceber): void {
    const adq = this.marcadoAdq();
    // Marcação inicial deve ser pelo Adquirente
    if (!adq) {
      this.notification.warning('Marcação inicial deve ser pelo Adquirente.');
      this.rejectRecSelection(item.id);
      return;
    }
    if (item.status !== '1') {
      this.notification.warning('Status do registro diferente de "Não Conciliado".');
      this.rejectRecSelection(item.id);
      return;
    }
    // Valida parcela (equivale a TT_XNUMPAR == TT_PARCELA)
    if (item.parcela !== adq.numParcela) {
      this.notification.warning(
        `Parcela para Conciliação não coincidem. Adquirente: ${adq.numParcela} | Título: ${item.parcela}.`
      );
      this.rejectRecSelection(item.id);
      return;
    }
    // Valida tolerância de valor (equivale a |TT_XVLBRUT - TT_VALOR| <= NL_CONCIL2)
    const difValor = Math.abs(adq.vlBruto - item.valor);
    if (difValor > this.tolerancia) {
      this.notification.warning(
        `Dados para Conciliação não coincidem. Diferença de valor: ${this.fmtVal(difValor)}.`
      );
      this.rejectRecSelection(item.id);
      return;
    }
    // Desvincular seleção anterior de Browse02 se houver
    const prev = this.marcadoRec();
    if (prev && prev.id !== item.id) {
      this.contasReceber.update(recs => recs.map(r => r.id === prev.id ? { ...r, $selected: false } : r));
    }
    // Vincula os dois registros: status → '2' (Conciliado), titulo do adq = numTitulo do SE1
    const adqCurrent = this.movimentos().find(m => m.id === adq.id) ?? adq;
    this.movimentos.update(movs =>
      movs.map(m => m.id === adq.id
        ? { ...m, status: '2' as StatusConciliacao, titulo: item.numTitulo }
        : m
      )
    );
    this.contasReceber.update(recs =>
      recs.map(r => r.id === item.id
        ? { ...r, status: '2' as StatusConciliacao }
        : r
      )
    );
    // Atualiza os sinais com o estado vinculado
    this.marcadoAdq.set({ ...adqCurrent, status: '2' as StatusConciliacao, titulo: item.numTitulo });
    this.marcadoRec.set({ ...item, status: '2' as StatusConciliacao });
    this.cdr.markForCheck();
  }

  // RegMark02 — desmarcar Browse02: desvincular os dois registros se estava conciliado
  onUnselectRec(item: ContaReceber): void {
    const current = this.contasReceber().find(r => r.id === item.id) ?? item;
    if (current.status === '2') {
      // Localiza o adquirente vinculado pelo titulo e parcela
      const adqVinc = this.movimentos().find(
        m => m.titulo === current.numTitulo && m.numParcela === current.parcela
      );
      if (adqVinc) {
        this.movimentos.update(movs =>
          movs.map(m => m.id === adqVinc.id
            ? { ...m, status: '1' as StatusConciliacao, titulo: '', $selected: false }
            : m
          )
        );
        this.marcadoAdq.set(null);
      }
      this.contasReceber.update(recs =>
        recs.map(r => r.id === current.id
          ? { ...r, status: '1' as StatusConciliacao, $selected: false }
          : r
        )
      );
    }
    if (this.marcadoRec()?.id === item.id) {
      this.marcadoRec.set(null);
    }
    this.cdr.markForCheck();
  }

  // Desvincola adquirente e o título SE1 correspondente (usado em onUnselectAdq)
  private _desvinculaAdq(adq: MovimentoAdquirente): void {
    this.contasReceber.update(recs =>
      recs.map(r =>
        r.numTitulo === adq.titulo && r.parcela === adq.numParcela
          ? { ...r, status: '1' as StatusConciliacao, $selected: false }
          : r
      )
    );
    this.movimentos.update(movs =>
      movs.map(m =>
        m.id === adq.id
          ? { ...m, status: '1' as StatusConciliacao, titulo: '', $selected: false }
          : m
      )
    );
    this.marcadoRec.set(null);
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
