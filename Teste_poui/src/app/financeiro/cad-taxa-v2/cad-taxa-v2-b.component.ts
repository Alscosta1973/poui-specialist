/**
 * @generated  poui-specialist v1.3
 * @author     Andre Costa <andre.andrelscosta@gmail.com>
 * @license    Uso permitido · redistribuição proibida sem autorização escrita
 * @see        https://github.com/Alscosta1973/poui-specialist
 */

import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import {
  PoDividerModule,
  PoDynamicModule,
  PoDynamicViewField,
  PoPageAction,
  PoPageModule,
  PoTableAction,
  PoTableColumn,
  PoTableModule,
} from '@po-ui/ng-components';

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

const DEMO_MASTER = [
  { adm: '46', admDesc: 'BLU',   band: 'VISA',      txFixa: 1.50, qtdModal: 7 },
  { adm: '46', admDesc: 'BLU',   band: 'MASTER',    txFixa: 1.50, qtdModal: 7 },
  { adm: '46', admDesc: 'BLU',   band: 'ELO',       txFixa: 1.50, qtdModal: 5 },
  { adm: '46', admDesc: 'BLU',   band: 'AMEX',      txFixa: 1.50, qtdModal: 3 },
  { adm: '47', admDesc: 'CIELO', band: 'VISA',      txFixa: 1.80, qtdModal: 7 },
  { adm: '47', admDesc: 'CIELO', band: 'MASTER',    txFixa: 1.80, qtdModal: 7 },
  { adm: '47', admDesc: 'CIELO', band: 'HIPERCARD', txFixa: 1.80, qtdModal: 4 },
];

const DEMO_MODAIS = [
  { item: '01', modalDesc: 'CRÉDITO',       parce1: 1, parce2: 1,  txperc: 2.50 },
  { item: '02', modalDesc: 'CRÉDITO',       parce1: 2, parce2: 6,  txperc: 3.20 },
  { item: '03', modalDesc: 'CRÉDITO',       parce1: 7, parce2: 12, txperc: 4.10 },
  { item: '04', modalDesc: 'DÉBITO',        parce1: 1, parce2: 1,  txperc: 1.20 },
  { item: '05', modalDesc: 'PIX',           parce1: 1, parce2: 1,  txperc: 0.99 },
  { item: '06', modalDesc: 'BOLETO',        parce1: 1, parce2: 1,  txperc: 1.50 },
  { item: '07', modalDesc: 'TX.MAQUINETA', parce1: 1, parce2: 1,  txperc: 0.50 },
];

@Component({
  selector: 'app-cad-taxa-v2-b',
  standalone: true,
  imports: [PoPageModule, PoTableModule, PoDynamicModule, PoDividerModule],
  templateUrl: './cad-taxa-v2-b.component.html',
  styleUrl: './cad-taxa-v2-b.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CadTaxaV2BComponent {
  readonly title = 'Cadastro de Taxas — Layout B: Browse + Detalhe';

  readonly selectedRow = signal<typeof DEMO_MASTER[0] | null>(null);

  readonly pageActions: PoPageAction[] = [
    { label: 'Incluir', action: () => {} },
    { label: 'Editar',  action: () => {} },
    { label: 'Excluir', action: () => {}, type: 'danger' },
  ];

  readonly colsMaster: PoTableColumn[] = [
    { property: 'admDesc',  label: 'Administradora', width: '18%' },
    { property: 'band',     label: 'Bandeira',        width: '18%' },
    { property: 'txFixa',   label: 'Taxa Fixa (%)',   width: '18%', type: 'number', format: '1.2-2' },
    { property: 'qtdModal', label: 'Modalidades',     width: '14%', type: 'number' },
  ];

  readonly masterItems = DEMO_MASTER;

  readonly detailFields: PoDynamicViewField[] = [
    { property: 'admDesc', label: 'Administradora' },
    { property: 'band',    label: 'Bandeira' },
    { property: 'txFixa',  label: 'Taxa Fixa (%)',  type: 'number', format: '1.2-2' },
  ];

  readonly colsModal: PoTableColumn[] = [
    { property: 'item',      label: 'Item',        width: '8%' },
    { property: 'modalDesc', label: 'Modalidade',  width: '22%' },
    { property: 'parce1',    label: 'Parc. De',    width: '14%', type: 'number' },
    { property: 'parce2',    label: 'Parc. Até',   width: '14%', type: 'number' },
    { property: 'txperc',    label: 'Taxa (%)',     width: '14%', type: 'number', format: '1.2-2' },
  ];

  readonly colsAntec: PoTableColumn[] = [
    { property: 'parcela', label: 'Parc.', width: '25%', type: 'number' },
    { property: 'taxa',    label: 'Taxa (%)', width: '35%', type: 'number', format: '1.2-2' },
  ];

  readonly modais = DEMO_MODAIS;

  antecipacoes: { parcela: number; taxa: number }[] = [];

  get detailTitle(): string {
    const r = this.selectedRow();
    return r ? `Detalhe — ${r.admDesc} / ${r.band}` : '';
  }

  onRowSelect(row: typeof DEMO_MASTER[0]): void {
    this.selectedRow.set(row);
    this.antecipacoes = buildAntec(row.txFixa);
  }

  onRowUnselect(): void {
    this.selectedRow.set(null);
    this.antecipacoes = [];
  }

  readonly tableActions: PoTableAction[] = [
    { label: 'Excluir', icon: 'po-icon-delete', type: 'danger', action: () => {} },
  ];
}
