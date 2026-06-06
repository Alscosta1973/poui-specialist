import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  ConfirmarRequest,
  DivergenciaCartao,
  RegularizarRequest,
  RevalidarTaxaRequest,
  SalvarObsRequest,
} from './divergencia-cartao.model';

@Injectable({ providedIn: 'root' })
export class DivergenciaCartaoService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/divergencias-cartao';

  listar(): Observable<DivergenciaCartao[]> {
    return this.http.get<DivergenciaCartao[]>(this.baseUrl);
  }

  confirmar(body: ConfirmarRequest): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/confirmar`, body);
  }

  regularizar(body: RegularizarRequest): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/regularizar`, body);
  }

  revalidarTaxa(body: RevalidarTaxaRequest): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/revalidar-taxa`, body);
  }

  salvarObs(body: SalvarObsRequest): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/obs`, body);
  }

  relatorio(): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/relatorio`, { responseType: 'blob' });
  }

  exportar(): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/exportar`, { responseType: 'blob' });
  }
}
