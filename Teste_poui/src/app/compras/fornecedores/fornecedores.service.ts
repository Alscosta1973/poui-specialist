/**
 * @generated  poui-specialist v1.7.0 — refactor from FORN001.prw (SA2)
 * @author     Andre Costa <andre.andrelscosta@gmail.com>
 * @license    Uso permitido · redistribuição proibida sem autorização escrita
 * @see        https://github.com/Alscosta1973/poui-specialist
 */
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Fornecedor } from './models/fornecedor.model';

@Injectable({ providedIn: 'root' })
export class FornecedoresService {
  private readonly http    = inject(HttpClient);
  private readonly baseUrl = '/rest/api/custom/v1/fornecedores';

  getAll(page = 1, query = ''): Observable<{ items: Fornecedor[]; hasNext: boolean }> {
    let url = `${this.baseUrl}?page=${page}`;
    if (query) url += `&q=${encodeURIComponent(query)}`;
    return this.http.get<{ items: Fornecedor[]; hasNext: boolean }>(url);
  }
}
