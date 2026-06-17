/**
 * @generated  poui-specialist v1.3
 * @author     Andre Costa <andre.andrelscosta@gmail.com>
 * @license    Uso permitido · redistribuição proibida sem autorização escrita
 * @see        https://github.com/Alscosta1973/poui-specialist
 */

import { Component, ChangeDetectionStrategy } from '@angular/core';
import {
  PoDividerModule,
  PoDynamicModule,
  PoDynamicFormField,
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

const DEMO_MODAIS = [
  { item: '01', modalDesc: 'CRÉDITO',       parce1: 1, parce2: 1,  txperc: 2.50 },
  { item: '02', modalDesc: 'CRÉDITO',       parce1: 2, parce2: 6,  txperc: 3.20 },
  { item: '03', modalDesc: 'CRÉDITO',       parce1: 7, parce2: 12, txperc: 4.10 },
  { item: '04', modalDesc: 'DÉBITO',        parce1: 1, parce2: 1,  txperc: 1.20 },
  { item: '05', modalDesc: 'PIX',           parce1: 1, parce2: 1,  txperc: 0.99 },
  { item: '06', modalDesc: 'BOLETO',        parce1: 1, parce2: 1,  txperc: 1.50 },
  { item: '07', modalDesc: 'TX.MAQUINETA', parce1: 1, parce2: 1,  txperc: 0.50 },
];

const DEMO_ANTEC = buildAntec(1.5);

@Component({
  selector: 'app-cad-taxa-v2-a',
  standalone: true,
  imports: [PoPageModule, PoTableModule, PoDynamicModule, PoDividerModule],
  templateUrl: './cad-taxa-v2-a.component.html',
  styleUrl: './cad-taxa-v2-a.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CadTaxaV2AComponent {
  readonly title = 'Cadastro de Taxas — Layout A: Formulário Único';

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

  readonly colsModal: PoTableColumn[] = [
    { property: 'item',      label: 'Item',        width: '8%' },
    { property: 'modalDesc', label: 'Modalidade',  width: '22%' },
    { property: 'parce1',    label: 'Parc. De',    width: '14%', type: 'number' },
    { property: 'parce2',    label: 'Parc. Até',   width: '14%', type: 'number' },
    { property: 'txperc',    label: 'Taxa (%)',     width: '14%', type: 'number', format: '1.2-2' },
  ];

  readonly modais = DEMO_MODAIS;

  readonly colsAntec: PoTableColumn[] = [
    { property: 'parcela', label: 'Parcelas',  width: '30%', type: 'number' },
    { property: 'taxa',    label: 'Taxa (%)',  width: '30%', type: 'number', format: '1.2-2' },
  ];

  readonly antecipacoes = DEMO_ANTEC;

  readonly tableActions: PoTableAction[] = [
    { label: 'Excluir', icon: 'po-icon-delete', type: 'danger', action: () => {} },
  ];

  onSave(): void {}
  onCancel(): void {}
}
