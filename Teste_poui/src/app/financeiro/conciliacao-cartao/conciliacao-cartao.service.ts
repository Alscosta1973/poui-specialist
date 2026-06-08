import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import {
  ConfirmarConciliacaoRequest,
  ContaReceber,
  MovimentoAdquirente,
  StatusConciliacao,
} from './models/conciliacao-cartao.model';

@Injectable({ providedIn: 'root' })
export class ConciliacaoCartaoService {

  carregarMovimentos(_banco: string, _agencia: string, _conta: string): Observable<MovimentoAdquirente[]> {
    return of(MOCK_MOVIMENTOS).pipe(delay(700));
  }

  carregarTitulos(_banco: string, _agencia: string, _conta: string): Observable<ContaReceber[]> {
    return of(MOCK_TITULOS).pipe(delay(700));
  }

  automatico(_banco: string, _agencia: string, _conta: string): Observable<{ movimentos: string[]; titulos: string[] }> {
    return of({ movimentos: ['M001', 'M002'], titulos: ['R001', 'R002'] }).pipe(delay(1000));
  }

  confirmar(_req: ConfirmarConciliacaoRequest): Observable<void> {
    return of(undefined).pipe(delay(1500));
  }
}

const s = (v: string): StatusConciliacao => v as StatusConciliacao;

const MOCK_MOVIMENTOS: MovimentoAdquirente[] = [
  { id: 'M001', dtPagamento: '2025-01-10', titulo: 'NF001', numPedido: 'PED001', numParcela: '001', vlBruto: 1000.00, vlTaxa:  30.00, vlLiquido:  970.00, status: s('1'), lote: 'LOT001' },
  { id: 'M002', dtPagamento: '2025-01-12', titulo: 'NF002', numPedido: 'PED002', numParcela: '001', vlBruto: 2500.00, vlTaxa:  75.00, vlLiquido: 2425.00, status: s('1'), lote: 'LOT001' },
  { id: 'M003', dtPagamento: '2025-01-15', titulo: 'NF003', numPedido: 'PED003', numParcela: '002', vlBruto:  800.00, vlTaxa:  24.00, vlLiquido:  776.00, status: s('2'), lote: 'LOT001' },
  { id: 'M004', dtPagamento: '2025-01-18', titulo: 'NF004', numPedido: 'PED004', numParcela: '001', vlBruto: 3200.00, vlTaxa:  96.00, vlLiquido: 3104.00, status: s('3'), lote: 'LOT002' },
  { id: 'M005', dtPagamento: '2025-01-20', titulo: 'NF005', numPedido: 'PED005', numParcela: '001', vlBruto:  650.00, vlTaxa:  19.50, vlLiquido:  630.50, status: s('4'), lote: 'LOT002' },
  { id: 'M006', dtPagamento: '2025-01-22', titulo: 'NF006', numPedido: 'PED006', numParcela: '003', vlBruto: 1800.00, vlTaxa:  54.00, vlLiquido: 1746.00, status: s('5'), lote: 'LOT002' },
  { id: 'M007', dtPagamento: '2025-01-25', titulo: 'NF007', numPedido: 'PED007', numParcela: '001', vlBruto:  920.00, vlTaxa:  27.60, vlLiquido:  892.40, status: s('6'), lote: 'LOT003' },
];

const MOCK_TITULOS: ContaReceber[] = [
  { id: 'R001', pedido: 'PED001', emissao: '2025-01-05', numTitulo: 'NF001', parcela: '001', valor: 1000.00, vlTaxa:  30.00, prefixo: 'NF', vlLiquido:  970.00, status: s('1') },
  { id: 'R002', pedido: 'PED002', emissao: '2025-01-08', numTitulo: 'NF002', parcela: '001', valor: 2500.00, vlTaxa:  75.00, prefixo: 'NF', vlLiquido: 2425.00, status: s('1') },
  { id: 'R003', pedido: 'PED003', emissao: '2025-01-10', numTitulo: 'NF003', parcela: '002', valor:  800.00, vlTaxa:  24.00, prefixo: 'NF', vlLiquido:  776.00, status: s('2') },
  { id: 'R004', pedido: 'PED004', emissao: '2025-01-12', numTitulo: 'NF004', parcela: '001', valor: 3200.00, vlTaxa:  96.00, prefixo: 'NF', vlLiquido: 3104.00, status: s('3') },
  { id: 'R005', pedido: 'PED005', emissao: '2025-01-14', numTitulo: 'NF005', parcela: '001', valor:  650.00, vlTaxa:  19.50, prefixo: 'NF', vlLiquido:  630.50, status: s('4') },
  { id: 'R006', pedido: 'PED006', emissao: '2025-01-16', numTitulo: 'NF006', parcela: '003', valor: 1800.00, vlTaxa:  54.00, prefixo: 'NF', vlLiquido: 1746.00, status: s('5') },
  { id: 'R007', pedido: 'PED007', emissao: '2025-01-18', numTitulo: 'NF007', parcela: '001', valor:  920.00, vlTaxa:  27.60, prefixo: 'NF', vlLiquido:  892.40, status: s('6') },
];
