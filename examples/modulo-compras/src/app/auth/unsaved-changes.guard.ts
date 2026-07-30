/**
 * @generated  poui-specialist v1.10.0
 * @author     Andre Costa <andre.andrelscosta@gmail.com>
 * @license    Uso permitido · redistribuição proibida sem autorização escrita
 * @see        https://github.com/Alscosta1973/poui-specialist
 */
import { CanDeactivateFn } from '@angular/router';

/** Interface que componentes com formulário devem implementar */
export interface HasUnsavedChanges {
  hasUnsavedChanges(): boolean;
}

/**
 * Impede navegação acidental para fora de um formulário com alterações
 * não salvas, exibindo uma confirmação nativa ao usuário.
 *
 * Uso: canDeactivate: [unsavedChangesGuard]
 */
export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = (component) => {
  if (!component.hasUnsavedChanges()) {
    return true;
  }
  return confirm('Há alterações não salvas. Deseja sair mesmo assim?');
};
