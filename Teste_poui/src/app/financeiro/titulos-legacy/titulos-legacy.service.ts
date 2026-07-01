/**
 * @generated  poui-specialist v1.7.0
 * @author     Andre Costa <andre.andrelscosta@gmail.com>
 * @license    Uso permitido · redistribuição proibida sem autorização escrita
 * @see        https://github.com/Alscosta1973/poui-specialist
 */
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TituloLegacy } from './models/titulo-legacy.model';

@Injectable({ providedIn: 'root' })
export class TitulosLegacyService {
  private readonly http    = inject(HttpClient);
  private readonly baseUrl = '/rest/api/custom/v1/titulos';

  getAll(query = ''): Observable<{ items: TituloLegacy[]; hasNext: boolean }> {
    const params = query ? `?q=${encodeURIComponent(query)}` : '';
    return this.http.get<{ items: TituloLegacy[]; hasNext: boolean }>(
      `${this.baseUrl}${params}`,
    );
  }
}
