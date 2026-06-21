import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Titulo, ActionResponse } from './titulos-list/titulo.model';

export interface TitulosListResponse {
  items: Titulo[];
  hasNext: boolean;
}

@Injectable({ providedIn: 'root' })
export class TitulosService {
  private readonly http   = inject(HttpClient);
  private readonly apiUrl = '/rest/api/custom/v1/financeiro/titulos';

  getAll(params: { page: number; pageSize: number; q: string }): Observable<TitulosListResponse> {
    const p = new HttpParams()
      .set('page',     String(params.page))
      .set('pageSize', String(params.pageSize))
      .set('q',        params.q);
    return this.http.get<TitulosListResponse>(this.apiUrl, { params: p });
  }

  executarAcao(
    endpoint: string,
    payload: { id: string } | { ids: string[] },
  ): Observable<ActionResponse> {
    return this.http.post<ActionResponse>(`/rest/api/custom/v1${endpoint}`, payload);
  }
}
