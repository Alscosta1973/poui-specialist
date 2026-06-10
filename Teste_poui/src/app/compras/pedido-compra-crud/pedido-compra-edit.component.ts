/**
 * @generated  poui-specialist v1.0
 * @author     Andre Costa <andre.andrelscosta@gmail.com>
 * @license    Uso permitido · redistribuição proibida sem autorização escrita
 * @see        https://github.com/Alscosta1973/poui-specialist
 */
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, EMPTY } from 'rxjs';
import {
  PoButtonModule,
  PoDividerModule,
  PoFieldModule,
  PoNotificationService,
  PoPageModule,
  PoTableColumn,
  PoTableModule,
} from '@po-ui/ng-components';
import { CommonModule } from '@angular/common';

import { PedidoCompraCrudService } from '../pedido-compra-crud.service';
import { ItemCompraForm, PedidoCompraForm, PedidoCompraItem } from '../models/pedido-compra-crud.model';

const DEMO_PEDIDOS: PedidoCompraItem[] = [
  {
    numero: '000001', emissao: '2026-01-10', fornecedor: 'METALURGICA BRASILFOR LTDA',
    loja: '01', condPagto: '028', observacao: 'Pedido urgente — entrega em 5 dias úteis.',
    totalPedido: 48750.00,
    itens: [
      { produto: 'ACO001', descricao: 'Aço carbono 1020 barra redonda', unidade: 'KG', quantidade: 500, valorUnit: 8.50, valorTotal: 4250.00 },
      { produto: 'ACO002', descricao: 'Aço inox 304 chapa 2mm', unidade: 'KG', quantidade: 200, valorUnit: 32.50, valorTotal: 6500.00 },
      { produto: 'TUB001', descricao: 'Tubo aço galvanizado 2"', unidade: 'PC', quantidade: 100, valorUnit: 380.00, valorTotal: 38000.00 },
    ],
  },
  {
    numero: '000002', emissao: '2026-02-03', fornecedor: 'DISTRIBUIDORA QUIMICOR S.A.',
    loja: '01', condPagto: '030', observacao: '',
    totalPedido: 12340.50,
    itens: [
      { produto: 'QUI001', descricao: 'Solvente industrial 200L', unidade: 'LT', quantidade: 200, valorUnit: 28.90, valorTotal: 5780.00 },
      { produto: 'QUI002', descricao: 'Detergente industrial 5L', unidade: 'UN', quantidade: 100, valorUnit: 65.60, valorTotal: 6560.50 },
    ],
  },
  {
    numero: '000003', emissao: '2026-02-18', fornecedor: 'ACOS ESPECIAIS NORTECO LTDA',
    loja: '02', condPagto: '028', observacao: 'Verificar certificado de qualidade.',
    totalPedido: 97200.00,
    itens: [
      { produto: 'ACO003', descricao: 'Aço ferramenta D2 barra', unidade: 'KG', quantidade: 800, valorUnit: 121.50, valorTotal: 97200.00 },
    ],
  },
  {
    numero: '000004', emissao: '2026-03-05', fornecedor: 'PLASTICOS INDUMAX INDUSTRIA',
    loja: '01', condPagto: '000', observacao: 'Pedido cancelado — fornecedor sem estoque.',
    totalPedido: 6580.75, itens: [],
  },
  {
    numero: '000005', emissao: '2026-04-22', fornecedor: 'ROLAMENTOS E MANCAIS TECNO',
    loja: '03', condPagto: '028', observacao: '',
    totalPedido: 23415.90,
    itens: [
      { produto: 'ROL001', descricao: 'Rolamento rígido de esferas 6205', unidade: 'UN', quantidade: 50, valorUnit: 185.00, valorTotal: 9250.00 },
      { produto: 'ROL002', descricao: 'Rolamento cônico 30207', unidade: 'UN', quantidade: 30, valorUnit: 472.20, valorTotal: 14165.90 },
    ],
  },
];

@Component({
  selector: 'app-pedido-compra-edit',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    PoPageModule,
    PoFieldModule,
    PoButtonModule,
    PoDividerModule,
    PoTableModule,
  ],
  templateUrl: './pedido-compra-edit.component.html',
  styleUrl: './pedido-compra-edit.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PedidoCompraEditComponent implements OnInit {
  private readonly service = inject(PedidoCompraCrudService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly notification = inject(PoNotificationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly isEdit = signal(false);
  readonly loading = signal(false);
  private recordNumero = '';

  // -------------------------------------------------------------------------
  // Formulário principal
  // -------------------------------------------------------------------------
  form: FormGroup = this.fb.group({
    numero:    [{ value: '', disabled: true }],
    emissao:   ['', Validators.required],
    fornecedor:['', [Validators.required, Validators.maxLength(6)]],
    loja:      ['', [Validators.required, Validators.maxLength(2)]],
    condPagto: ['', Validators.maxLength(3)],
    observacao:['', Validators.maxLength(250)],
    itens:     this.fb.array([]),
  });

  // -------------------------------------------------------------------------
  // Accessor conveniente para o FormArray de itens
  // -------------------------------------------------------------------------
  get itensArray(): FormArray {
    return this.form.get('itens') as FormArray;
  }

  get totalGeral(): number {
    return this.itensArray.controls.reduce((acc, ctrl) => {
      return acc + (ctrl.get('valorTotal')?.value ?? 0);
    }, 0);
  }

  get pageTitle(): string {
    return this.isEdit() ? 'Editar Pedido de Compra' : 'Novo Pedido de Compra';
  }

  // -------------------------------------------------------------------------
  // Colunas da grade (informativas — a grade é editável via FormArray)
  // -------------------------------------------------------------------------
  readonly colunasProduto: PoTableColumn[] = [
    { property: 'produto',    label: 'Produto',     width: '15%' },
    { property: 'descricao',  label: 'Descrição',   width: '30%' },
    { property: 'unidade',    label: 'UN',          width: '7%'  },
    { property: 'quantidade', label: 'Quantidade',  width: '13%', type: 'number', format: '1.2-2' },
    { property: 'valorUnit',  label: 'Vlr Unitário',width: '15%', type: 'currency', format: 'BRL' },
    { property: 'valorTotal', label: 'Total',       width: '15%', type: 'currency', format: 'BRL' },
  ];

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------
  ngOnInit(): void {
    const params = this.route.snapshot.params;
    if (params['numero']) {
      this.recordNumero = params['numero'];
      this.isEdit.set(true);
      this.loadRecord();
    } else {
      // Modo inclusão: começa com uma linha vazia
      this.adicionarItem();
    }
  }

  // -------------------------------------------------------------------------
  // Operações da grade de itens
  // -------------------------------------------------------------------------
  private criarLinhaItem(item?: Partial<ItemCompraForm>): FormGroup {
    return this.fb.group({
      produto:    [item?.produto    ?? '', [Validators.required, Validators.maxLength(15)]],
      descricao:  [{ value: item?.descricao ?? '', disabled: true }],
      unidade:    [item?.unidade    ?? '', Validators.maxLength(2)],
      quantidade: [item?.quantidade ?? null, [Validators.required, Validators.min(0.01)]],
      valorUnit:  [item?.valorUnit  ?? null, [Validators.required, Validators.min(0.01)]],
      valorTotal: [{ value: item?.valorTotal ?? 0, disabled: true }],
    });
  }

  adicionarItem(): void {
    this.itensArray.push(this.criarLinhaItem());
    this.cdr.markForCheck();
  }

  removerItem(index: number): void {
    this.itensArray.removeAt(index);
    this.cdr.markForCheck();
  }

  /** Recalcula valorTotal da linha ao alterar quantidade ou valorUnit. */
  recalcularLinha(index: number): void {
    const linha = this.itensArray.at(index);
    const qtd  = Number(linha.get('quantidade')?.value ?? 0);
    const vlr  = Number(linha.get('valorUnit')?.value  ?? 0);
    const total = qtd * vlr;
    linha.get('valorTotal')?.setValue(total, { emitEvent: false });
    this.cdr.markForCheck();
  }

  /** Stub para consulta de produto: em produção chame o service aqui. */
  onProdutoBlur(index: number): void {
    const linha    = this.itensArray.at(index);
    const produto  = linha.get('produto')?.value ?? '';
    if (produto) {
      // TODO: chamar service.getProduto(produto) e preencher descricao e unidade
      linha.get('descricao')?.setValue(`Descrição de ${produto}`, { emitEvent: false });
    }
  }

  // -------------------------------------------------------------------------
  // Salvar / Cancelar
  // -------------------------------------------------------------------------
  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notification.warning('Preencha todos os campos obrigatórios antes de salvar.');
      return;
    }

    const payload = this.buildPayload();
    this.loading.set(true);

    const request$ = this.isEdit()
      ? this.service.update(this.recordNumero, payload)
      : this.service.create(payload);

    request$
      .pipe(
        catchError((err) => {
          this.notification.error(this.parseError(err));
          this.loading.set(false);
          return EMPTY;
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        this.notification.success(
          this.isEdit() ? 'Pedido atualizado com sucesso.' : 'Pedido criado com sucesso.'
        );
        this.loading.set(false);
        this.goBack();
      });
  }

  goBack(): void {
    this.router.navigate(['/compras/pedido-compra-crud']);
  }

  // -------------------------------------------------------------------------
  // Helpers privados
  // -------------------------------------------------------------------------
  private buildPayload(): Partial<PedidoCompraForm> {
    const raw = this.form.getRawValue() as PedidoCompraForm;
    return {
      ...raw,
      itens: raw.itens.map((item) => ({
        ...item,
        valorTotal: (item.quantidade ?? 0) * (item.valorUnit ?? 0),
      })),
    };
  }

  private loadRecord(): void {
    this.loading.set(true);
    this.service
      .getById(this.recordNumero)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (record) => {
          // Limpa o FormArray e repopula com os itens do registro
          this.itensArray.clear();
          (record.itens ?? []).forEach((item) =>
            this.itensArray.push(this.criarLinhaItem(item))
          );

          this.form.patchValue({
            numero:     record.numero,
            emissao:    record.emissao,
            fornecedor: record.fornecedor,
            loja:       record.loja,
            condPagto:  record.condPagto,
            observacao: record.observacao,
          });

          this.loading.set(false);
          this.cdr.markForCheck();
        },
        error: () => {
          const demo = DEMO_PEDIDOS.find(p => p.numero === this.recordNumero) ?? null;
          if (demo) {
            this.itensArray.clear();
            (demo.itens ?? []).forEach(item => this.itensArray.push(this.criarLinhaItem(item)));
            this.form.patchValue({
              numero: demo.numero, emissao: demo.emissao, fornecedor: demo.fornecedor,
              loja: demo.loja, condPagto: demo.condPagto, observacao: demo.observacao,
            });
            this.notification.warning('Dados demo — serviço indisponível.');
          } else {
            this.notification.error('Pedido não encontrado.');
            this.goBack();
          }
          this.loading.set(false);
          this.cdr.markForCheck();
        },
      });
  }

  private parseError(err: any): string {
    try {
      const errObj = JSON.parse(err.error?.errorMessage ?? '{}');
      if (!errObj.code) return err.error?.message ?? 'Erro ao processar a requisição.';
      const msg    = decodeURIComponent(escape(errObj.message ?? ''));
      const detail = errObj.detailedMessage
        ? ` — ${decodeURIComponent(escape(errObj.detailedMessage))}`
        : '';
      return `Erro ${errObj.code}: ${msg}${detail}`;
    } catch {
      return err.error?.message ?? 'Erro ao processar a requisição.';
    }
  }

  /** Expõe controles do FormArray para o template de forma tipada. */
  itemControls(): AbstractControl[] {
    return this.itensArray.controls;
  }
}
