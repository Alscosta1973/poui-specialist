// @generated poui-specialist v1.0
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  ActionResponse,
  FolhaResponse,
} from './processamento-folha/processamento-folha.model';

@Injectable({ providedIn: 'root' })
export class ProcessamentoFolhaService {
  private readonly http = inject(HttpClient);
  readonly apiUrl = '/rest/api/custom/v1/rh/folha';

  getAll(params: { page?: number; pageSize?: number; q?: string }): Observable<FolhaResponse> {
    let p = new HttpParams()
      .set('page',     String(params.page     ?? 1))
      .set('pageSize', String(params.pageSize ?? 10));
    if (params.q) p = p.set('q', params.q);
    return this.http.get<FolhaResponse>(this.apiUrl, { params: p });
  }

  executarAcao(
    endpoint: string,
    payload: { id: string } | { ids: string[] },
  ): Observable<ActionResponse> {
    return this.http.post<ActionResponse>(`/rest/api/custom/v1${endpoint}`, payload);
  }
}
