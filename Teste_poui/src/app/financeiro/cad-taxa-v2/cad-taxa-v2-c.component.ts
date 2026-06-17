/**
 * @generated  poui-specialist v1.3
 * @author     Andre Costa <andre.andrelscosta@gmail.com>
 * @license    Uso permitido · redistribuição proibida sem autorização escrita
 * @see        https://github.com/Alscosta1973/poui-specialist
 */

import {
  Component,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  OnDestroy,
  inject,
  signal,
} from '@angular/core';
import { Subscription } from 'rxjs';
import {
  PoButtonModule,
  PoDividerModule,
  PoDynamicModule,
  PoDynamicFormField,
  PoNotificationService,
  PoPageModule,
  PoTableAction,
  PoTableColumn,
  PoTableModule,
} from '@po-ui/ng-components';

// ── Fórmula fiel ao BuildAntecipacao do cadtaxa.prw ──────────────────────────
// nValor   = Round(((1 + nTaxaFixa/100)^X - 1) * 100, 2)
// nParcela = Round((nAcumulo + nValor) / X, 2)
// nAcumulo += nValor
function buildAntec(txFixa: number): { parcela: number; taxa: number }[] {
  let acumulo = 0;
  return Array.from({ length: 24 }, (_, i) => {
    const x    = i + 1;
    const val  = Math.round(((Math.pow(1 + txFixa / 100, x) - 1) * 100) * 100) / 100;
    const taxa = Math.round(((acumulo + val) / x) * 100) / 100;
    acumulo   += val;
    return { parcela: x, taxa };
  });
}

interface ModalItem {
  item:      string;
  modalDesc: string;
  parce1:    number;
  parce2:    number;
  txperc:    number;
}

const DEMO_MODAIS: ModalItem[] = [
  { item: '01', modalDesc: 'CRÉDITO',      parce1: 1, parce2: 1,  txperc: 2.50 },
  { item: '02', modalDesc: 'CRÉDITO',      parce1: 2, parce2: 6,  txperc: 3.20 },
  { item: '03', modalDesc: 'CRÉDITO',      parce1: 7, parce2: 12, txperc: 4.10 },
  { item: '04', modalDesc: 'DÉBITO',       parce1: 1, parce2: 1,  txperc: 1.20 },
  { item: '05', modalDesc: 'PIX',          parce1: 1, parce2: 1,  txperc: 0.99 },
  { item: '06', modalDesc: 'BOLETO',       parce1: 1, parce2: 1,  txperc: 1.50 },
  { item: '07', modalDesc: 'TX.MAQUINETA',parce1: 1, parce2: 1,  txperc: 0.50 },
];

@Component({
  selector: 'app-cad-taxa-v2-c',
  standalone: true,
  imports: [PoPageModule, PoTableModule, PoDynamicModule, PoDividerModule, PoButtonModule],
  templateUrl: './cad-taxa-v2-c.component.html',
  styleUrl: './cad-taxa-v2-c.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CadTaxaV2CComponent implements OnDestroy {
  private readonly cdr          = inject(ChangeDetectorRef);
  private readonly notification = inject(PoNotificationService);

  readonly title = 'Cadastro de Taxas de Cartão';

  // ── Cabeçalho ────────────────────────────────────────────────────
  headerValues: Record<string, unknown> = { adm: '46', band: 'VISA', txFixa: 1.5 };

  readonly headerFields: PoDynamicFormField[] = [
    {
      property: 'adm', label: 'Administradora', gridColumns: 4,
      options: [{ value: '46', label: '46 - BLU' }, { value: '47', label: '47 - CIELO' }],
    },
    {
      property: 'band', label: 'Bandeira', gridColumns: 4,
      options: ['VISA','MASTER','AMEX','ELO','HIPERCARD','BOLETO','PIXCIELO','UNKNOW']
        .map(v => ({ value: v, label: v })),
    },
    { property: 'txFixa', label: 'Taxa Fixa (%)', gridColumns: 4, type: 'number', decimalsLength: 2 },
  ];

  // ── Antecipações — recalculadas ao mudar Taxa Fixa ────────────────
  readonly colsAntec: PoTableColumn[] = [
    { property: 'parcela', label: 'Parc.', width: '40%', type: 'number' },
    { property: 'taxa',    label: 'Taxa%', width: '60%', type: 'number', format: '1.2-2' },
  ];

  readonly antecipacoes = signal(buildAntec(1.5));

  // (p-value-change) NÃO existe nesta versão do PO-UI.
  // A forma correta é receber o NgForm via (p-form) e assinar form.valueChanges,
  // que dispara em cada keystroke do po-decimal (via callOnChange no onInput).
  private formSub: Subscription | null = null;
  private _lastTx = 1.5;

  onFormInit(form: any): void {
    if (!form?.valueChanges) return;
    this.formSub?.unsubscribe();
    this.formSub = form.valueChanges.subscribe((val: Record<string, unknown>) => {
      this.headerValues = { ...val };
      const tx = Number(val['txFixa'] ?? 0);
      if (tx > 0 && tx !== this._lastTx) {
        this._lastTx = tx;
        this.antecipacoes.set(buildAntec(tx));
      }
    });
  }

  ngOnDestroy(): void {
    this.formSub?.unsubscribe();
  }

  // ── Modalidades ──────────────────────────────────────────────────
  readonly colsModal: PoTableColumn[] = [
    { property: 'item',      label: 'Item',   width: '10%' },
    { property: 'modalDesc', label: 'Modal.', width: '24%' },
    { property: 'parce1',    label: 'De',     width: '12%', type: 'number' },
    { property: 'parce2',    label: 'Até',    width: '12%', type: 'number' },
    { property: 'txperc',    label: 'Taxa%',  width: '16%', type: 'number', format: '1.2-2' },
  ];

  readonly modais = signal<ModalItem[]>([...DEMO_MODAIS]);

  readonly tableActions: PoTableAction[] = [
    { label: 'Editar',  icon: 'po-icon-edit',  action: (row: ModalItem) => this.startEdit(row) },
    { label: 'Excluir', icon: 'po-icon-delete', type: 'danger', action: (row: ModalItem) => this.doDelete(row) },
  ];

  // ── Formulário inline de Modalidade ─────────────────────────────
  readonly showForm  = signal(false);
  readonly formTitle = signal('Incluir Modalidade');

  formRow: Record<string, unknown> = {};
  private editingRow: ModalItem | null = null;

  readonly modalFields: PoDynamicFormField[] = [
    {
      property: 'modalDesc', label: 'Modalidade', required: true, gridColumns: 3,
      options: [
        { value: 'CRÉDITO',      label: 'CRÉDITO' },
        { value: 'DÉBITO',       label: 'DÉBITO' },
        { value: 'PIX',          label: 'PIX' },
        { value: 'BOLETO',       label: 'BOLETO' },
        { value: 'TX.MAQUINETA',label: 'TX.MAQUINETA' },
      ],
    },
    { property: 'parce1', label: 'Parc. De',  required: true, type: 'number', gridColumns: 3 },
    { property: 'parce2', label: 'Parc. Até', required: true, type: 'number', gridColumns: 3 },
    { property: 'txperc', label: 'Taxa (%)',  required: true, type: 'number', decimalsLength: 2, gridColumns: 3 },
  ];

  startAdd(): void {
    this.editingRow = null;
    this.formRow    = {};
    this.formTitle.set('Incluir Modalidade');
    this.showForm.set(true);
    this.cdr.markForCheck();
  }

  startEdit(row: ModalItem): void {
    this.editingRow = row;
    this.formRow    = { ...row };
    this.formTitle.set('Alterar Modalidade');
    this.showForm.set(true);
    this.cdr.markForCheck();
  }

  confirmRow(): void {
    const parce1 = Number(this.formRow['parce1'] ?? 0);
    const parce2 = Number(this.formRow['parce2'] ?? 0);
    const modal  = String(this.formRow['modalDesc'] ?? '');

    const erro = this.validate(parce1, parce2, modal);
    if (erro) {
      this.notification.error(erro);
      return;
    }

    let lista: ModalItem[];

    if (this.editingRow) {
      lista = this.modais().map(m =>
        m === this.editingRow ? { ...m, ...this.formRow } as ModalItem : m
      );
    } else {
      const novo: ModalItem = {
        item:      '00',
        modalDesc: modal,
        parce1,
        parce2,
        txperc: Number(this.formRow['txperc'] ?? 0),
      };
      lista = [...this.modais(), novo];
    }

    // Reorder fiel ao ReorderZB4: Modal ASC → Parcela De ASC → Parcela Até ASC
    this.modais.set(this.reorderAndRenumber(lista));

    this.notification.success(this.editingRow ? 'Modalidade alterada.' : 'Modalidade incluída.');
    this.showForm.set(false);
    this.editingRow = null;
  }

  cancelForm(): void {
    this.showForm.set(false);
    this.editingRow = null;
  }

  private doDelete(row: ModalItem): void {
    const filtered = this.modais().filter(m => m !== row);
    this.modais.set(this.reorderAndRenumber(filtered));
    this.notification.success('Modalidade excluída.');
  }

  // ── Validações — fiel ao ArrNormalize do cadtaxa.prw ─────────────
  // Regra 1: Parcela De não pode ser maior que Parcela Até
  // Regra 2: Sem sobreposição de faixas dentro da mesma modalidade
  private validate(parce1: number, parce2: number, modal: string): string | null {
    if (!modal) {
      return 'Informe a Modalidade.';
    }

    if (parce1 <= 0 || parce2 <= 0) {
      return 'Parcela De e Parcela Até devem ser maiores que zero.';
    }

    if (parce1 > parce2) {
      return `Parcela De (${parce1}) maior que Parcela Até (${parce2}).`;
    }

    // Verifica sobreposição nas linhas da mesma modalidade (exceto a linha em edição)
    const mesmaMod = this.modais().filter(m => m.modalDesc === modal && m !== this.editingRow);

    for (const ex of mesmaMod) {
      const overlap = parce1 <= ex.parce2 && parce2 >= ex.parce1;
      if (overlap) {
        return (
          `Sobreposição de parcelas — Modalidade: ${modal}\n` +
          `Novo: De ${parce1} Até ${parce2} | ` +
          `Item ${ex.item}: De ${ex.parce1} Até ${ex.parce2}.`
        );
      }
    }

    return null;
  }

  // ── Reordenação — fiel ao ReorderZB4 do cadtaxa.prw ─────────────
  // Ordena: Modal ASC → Parcela De ASC → Parcela Até ASC e renumera
  private reorderAndRenumber(list: ModalItem[]): ModalItem[] {
    return [...list]
      .sort((a, b) => {
        if (a.modalDesc !== b.modalDesc) return a.modalDesc.localeCompare(b.modalDesc);
        if (a.parce1    !== b.parce1)    return a.parce1 - b.parce1;
        return a.parce2 - b.parce2;
      })
      .map((m, i) => ({ ...m, item: String(i + 1).padStart(2, '0') }));
  }

  onSave(): void {}
  onCancel(): void {}
}
