/**
 * @generated  poui-specialist v1.3
 * @author     Andre Costa <andre.andrelscosta@gmail.com>
 * @license    Uso permitido · redistribuição proibida sem autorização escrita
 * @see        https://github.com/Alscosta1973/poui-specialist
 */

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Parceiro, ParceiroFilter, ParceiroListResponse } from './parceiro.model';

@Injectable({ providedIn: 'root' })
export class ParceirosService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/faturamento/v1/parceiros';

  list(page: number, pageSize: number, filters?: ParceiroFilter): Observable<ParceiroListResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    if (filters) {
      if (filters.codigo)      params = params.set('codigo', filters.codigo);
      if (filters.nome)        params = params.set('nome', filters.nome);
      if (filters.cnpjCpf)     params = params.set('cnpjCpf', filters.cnpjCpf);
      if (filters.tipoPessoa)  params = params.set('tipoPessoa', filters.tipoPessoa);
      if (filters.situacao)    params = params.set('situacao', filters.situacao);
      if (filters.uf)          params = params.set('uf', filters.uf);
      if (filters.municipio)   params = params.set('municipio', filters.municipio);
    }

    return this.http.get<ParceiroListResponse>(this.baseUrl, { params });
  }

  search(term: string, page: number, pageSize: number): Observable<ParceiroListResponse> {
    const params = new HttpParams()
      .set('search', term)
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    return this.http.get<ParceiroListResponse>(this.baseUrl, { params });
  }

  getById(codigo: string, loja: string): Observable<Parceiro> {
    return this.http.get<Parceiro>(`${this.baseUrl}/${codigo}/${loja}`);
  }

  create(parceiro: Omit<Parceiro, 'codigo' | 'loja' | 'dataCadastro'>): Observable<Parceiro> {
    return this.http.post<Parceiro>(this.baseUrl, parceiro);
  }

  update(codigo: string, loja: string, parceiro: Partial<Parceiro>): Observable<Parceiro> {
    return this.http.put<Parceiro>(`${this.baseUrl}/${codigo}/${loja}`, parceiro);
  }

  delete(codigo: string, loja: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${codigo}/${loja}`);
  }
}
