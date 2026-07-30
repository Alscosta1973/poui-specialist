/**
 * @generated  poui-specialist v1.10.0
 * @author     Andre Costa <andre.andrelscosta@gmail.com>
 * @license    Uso permitido · redistribuição proibida sem autorização escrita
 * @see        https://github.com/Alscosta1973/poui-specialist
 */
import { Injectable, signal } from '@angular/core';

/**
 * Overlay de carregamento global, acionado por `auth.interceptor.ts` em toda
 * requisição HTTP (exceto as marcadas com o header `X-Skip-Loading`).
 *
 * Usa contador interno para suportar requisições concorrentes: o overlay só
 * é ocultado quando a última requisição em andamento finaliza.
 */
@Injectable({ providedIn: 'root' })
export class LoadingService {
  readonly isLoading = signal(false);

  private count = 0;

  show(): void {
    this.count++;
    this.isLoading.set(true);
  }

  hide(): void {
    this.count = Math.max(0, this.count - 1);
    if (this.count === 0) {
      this.isLoading.set(false);
    }
  }
}
