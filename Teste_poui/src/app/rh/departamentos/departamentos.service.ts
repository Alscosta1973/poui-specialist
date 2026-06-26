/**
 * @generated  poui-specialist v1.3
 * @author     Andre Costa <andre.andrelscosta@gmail.com>
 * @license    Uso permitido · redistribuição proibida sem autorização escrita
 * @see        https://github.com/Alscosta1973/poui-specialist
 */
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TENANT_ID } from '../rh.tokens';
import { Departamento, DepartamentosResponse } from './departamento.model';

export interface GetDepartamentosParams {
  page?: number;
  pageSize?: number;
  q?: string;
  [key: string]: unknown;
}

@Injectable({ providedIn: 'root' })
export class DepartamentosService {
  private readonly http     = inject(HttpClient);
  private readonly tenantId = inject(TENANT_ID);
  private readonly baseUrl  = '/rest/rh/v1/departamentos';

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /**
   * Monta os HttpHeaders com Content-Type e X-Tenant-Id.
   */
  private headers(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'X-Tenant-Id':  this.tenantId,
    });
  }

  private cleanParams(params: Record<string, unknown>): Record<string, string> {
    return Object.fromEntries(
      Object.entries(params)
        .filter(([, v]) => v !== null && v !== undefined && v !== '')
        .map(([k, v]) => [k, String(v)]),
    );
  }

  // ---------------------------------------------------------------------------
  // CRUD
  // ---------------------------------------------------------------------------

  /**
   * GET /rest/rh/v1/departamentos?page=1&pageSize=10
   * Retorna lista paginada de departamentos.
   */
  getAll(params: GetDepartamentosParams = {}): Observable<DepartamentosResponse> {
    const httpParams = new HttpParams({
      fromObject: this.cleanParams(params as Record<string, unknown>),
    });
    return this.http.get<DepartamentosResponse>(this.baseUrl, {
      headers: this.headers(),
      params:  httpParams,
    });
  }

  /**
   * GET /rest/rh/v1/departamentos/:codDepto
   * Retorna um departamento pelo código.
   */
  getById(codDepto: string): Observable<Departamento> {
    return this.http.get<Departamento>(`${this.baseUrl}/${codDepto}`, {
      headers: this.headers(),
    });
  }

  /**
   * POST /rest/rh/v1/departamentos
   * Cria um novo departamento.
   */
  create(data: Partial<Departamento>): Observable<Departamento> {
    return this.http.post<Departamento>(this.baseUrl, data, {
      headers: this.headers(),
    });
  }

  /**
   * PUT /rest/rh/v1/departamentos/:codDepto
   * Atualiza os dados de um departamento existente.
   */
  update(codDepto: string, data: Partial<Departamento>): Observable<Departamento> {
    return this.http.put<Departamento>(`${this.baseUrl}/${codDepto}`, data, {
      headers: this.headers(),
    });
  }

  /**
   * DELETE /rest/rh/v1/departamentos/:codDepto
   * Remove um departamento pelo código.
   */
  delete(codDepto: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${codDepto}`, {
      headers: this.headers(),
    });
  }
}
