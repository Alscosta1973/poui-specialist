// @generated poui-specialist v1.0
// Service: FuncionariosService | Tabela Protheus: SRA

import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Funcionario,
  FuncionarioForm,
  FuncionariosParams,
  FuncionariosResponse,
} from '../models/funcionario.model';
import { TENANT_ID } from '../rh.tokens';

@Injectable({ providedIn: 'root' })
export class FuncionariosService {
  private readonly http = inject(HttpClient);
  private readonly tenantId = inject(TENANT_ID);
  private readonly baseUrl = '/rh/funcionarios';

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /**
   * Monta o HttpHeaders com o tenant obrigatório.
   * O valor de X-Tenant-Id vem do token TENANT_ID injetado.
   */
  private headers(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'X-Tenant-Id': this.tenantId,
    });
  }

  // ---------------------------------------------------------------------------
  // CRUD
  // ---------------------------------------------------------------------------

  /**
   * GET /rh/funcionarios?filial=01&page=1&pageSize=20
   * Retorna lista paginada de funcionários.
   */
  getAll(params: FuncionariosParams = {}): Observable<FuncionariosResponse> {
    let httpParams = new HttpParams()
      .set('filial', params.filial ?? '01')
      .set('page', String(params.page ?? 1))
      .set('pageSize', String(params.pageSize ?? 20));

    if (params.nome) {
      httpParams = httpParams.set('nome', params.nome);
    }
    if (params.situacao) {
      httpParams = httpParams.set('situacao', params.situacao);
    }

    return this.http.get<FuncionariosResponse>(this.baseUrl, {
      headers: this.headers(),
      params: httpParams,
    });
  }

  /**
   * GET /rh/funcionarios/:mat?filial=01
   * Retorna um funcionário pela matrícula.
   */
  getById(mat: string, filial = '01'): Observable<Funcionario> {
    const httpParams = new HttpParams().set('filial', filial);
    return this.http.get<Funcionario>(`${this.baseUrl}/${mat}`, {
      headers: this.headers(),
      params: httpParams,
    });
  }

  /**
   * POST /rh/funcionarios
   * Cria um novo funcionário.
   */
  create(data: FuncionarioForm): Observable<Funcionario> {
    return this.http.post<Funcionario>(this.baseUrl, data, {
      headers: this.headers(),
    });
  }

  /**
   * PUT /rh/funcionarios/:mat
   * Atualiza os dados de um funcionário existente.
   */
  update(mat: string, data: FuncionarioForm): Observable<Funcionario> {
    return this.http.put<Funcionario>(`${this.baseUrl}/${mat}`, data, {
      headers: this.headers(),
    });
  }

  /**
   * DELETE /rh/funcionarios/:mat
   * Remove um funcionário pelo matrícula.
   */
  remove(mat: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${mat}`, {
      headers: this.headers(),
    });
  }
}
