// @generated poui-specialist v1.0
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface DashRhData {
  totalAtivos: number;
  admissoesMes: number;
  desligamentosMes: number;
  mediaSalarial: number;
  distribuicaoPorDepto: { depto: string; count: number }[];
  evolucaoHeadcount: { mes: string; count: number }[];
}

@Injectable({ providedIn: 'root' })
export class IndicadoresRhService {
  private readonly http = inject(HttpClient);
  readonly apiUrl = '/rest/api/custom/v1/rh/indicadores';

  getIndicadores(): Observable<DashRhData> {
    return this.http.get<DashRhData>(this.apiUrl);
  }
}
