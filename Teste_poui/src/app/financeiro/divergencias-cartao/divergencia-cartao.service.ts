import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, delay } from 'rxjs';
import {
  DivergenciaCartao, DivergenciaCartaoResponse,
  SummaryCard, RegularizarRequest, TxOk
} from './divergencia-cartao.model';

const BANDEIRAS = ['Visa', 'Mastercard', 'Elo', 'Amex', 'Hipercard'];
const DIST: TxOk[] = [
  '1','1','1','1','1','1','1','1','1','1','1','1',
  '2','2','2','2','2',
  '3','3','3',
  '4','4','4','4','4','4','4','4',
  '5','5','5','5','5','5','5','5','5','5','5','5','5','5','5','5','5','5','5',
];

function rnd(min: number, max: number): number {
  return +(Math.random() * (max - min) + min).toFixed(2);
}

function buildMock(): DivergenciaCartao[] {
  return DIST.map((txok, i) => {
    const vlbrut = rnd(300, 5000);
    const parc   = [1, 1, 1, 2, 3, 6][i % 6];
    const txcto  = rnd(1.5, 4.0);
    const txAdm  = txok === '1' || txok === '3' ? txcto + rnd(0.3, 1.2) : txcto;
    const txAdcl = txok === '2' || txok === '3' ? txcto + rnd(0.2, 0.9) : txcto;
    const vlLiq  = +(vlbrut - vlbrut * txcto / 100).toFixed(2);
    const vlRliq = +(vlbrut - vlbrut * txAdm / 100).toFixed(2);
    const difBlu = +(vlLiq - vlRliq * parc).toFixed(2);
    const d      = 1 + (i % 28);
    return {
      ZB1_DTTRAN: `2026-04-${String(d).padStart(2, '0')}`,
      ZB1_NSU:    `NSU${String(i + 1).padStart(4, '0')}`,
      ZB1_BAND:   BANDEIRAS[i % BANDEIRAS.length],
      ZB1_VLBRUT: vlbrut,
      ZB1_PARCTT: parc,
      ZB1_ZB4PER: txcto,
      ZB1_TXADM:  txAdm,
      ZB1_VLRLIQ: vlRliq,
      ZB1_TXADCL: txAdcl,
      ZB1_TXOK:   txok,
      TT_VLVLIQ:  vlLiq,
      TT_DIFBLU:  difBlu,
      TT_DIFORT:  0,
    };
  });
}

function buildSummary(items: DivergenciaCartao[]): SummaryCard[] {
  const map: Record<string, SummaryCard> = {
    '1': { txok: '1', label: 'MDR',               color: 'color-07', qtd: 0, vlrLiqContrato: 0, difBluOrt: 0 },
    '2': { txok: '2', label: 'Antecipação',        color: 'color-08', qtd: 0, vlrLiqContrato: 0, difBluOrt: 0 },
    '3': { txok: '3', label: 'MDR + Antecipação',  color: 'color-06', qtd: 0, vlrLiqContrato: 0, difBluOrt: 0 },
    '4': { txok: '4', label: 'Em Acordo',          color: 'color-09', qtd: 0, vlrLiqContrato: 0, difBluOrt: 0 },
    '5': { txok: '5', label: 'Regularizado',       color: 'color-11', qtd: 0, vlrLiqContrato: 0, difBluOrt: 0 },
  };
  for (const r of items) {
    const s = map[r.ZB1_TXOK];
    if (s) { s.qtd++; s.vlrLiqContrato += r.TT_VLVLIQ; s.difBluOrt += r.TT_DIFBLU; }
  }
  return Object.values(map);
}

@Injectable({ providedIn: 'root' })
export class DivergenciaCartaoService {
  private readonly apiBase = '/rest/api/custom/v1/divergencias-cartao';
  private readonly _mock = buildMock();

  constructor(private http: HttpClient) {}

  getAll(txok?: string): Observable<DivergenciaCartaoResponse> {
    const items = txok ? this._mock.filter(r => r.ZB1_TXOK === txok) : [...this._mock];
    return of({ items, hasNext: false, summary: buildSummary(this._mock) }).pipe(delay(300));
  }

  regularizar(body: RegularizarRequest): Observable<void> {
    body.nsus.forEach(nsu => {
      const r = this._mock.find(x => x.ZB1_NSU === nsu && x.ZB1_TXOK === '4');
      if (r) r.ZB1_TXOK = '5';
    });
    return of(undefined).pipe(delay(600));
  }

  revalidarTaxa(): Observable<void> {
    return of(undefined).pipe(delay(1000));
  }

  gravarObservacao(nsu: string, obs: string): Observable<void> {
    const r = this._mock.find(x => x.ZB1_NSU === nsu);
    if (r) r.ZB1_OBS = obs;
    return of(undefined).pipe(delay(200));
  }

  getSummary(): Observable<SummaryCard[]> {
    return of(buildSummary(this._mock)).pipe(delay(200));
  }
}
