import * as fs from 'node:fs/promises';
import * as path from 'node:path';

/** Confere se `workspaceRoot` é de fato a raiz de um projeto Angular — usado
 * antes de chamar o CLI pra evitar rodar uma geração inteira (custando tempo
 * e créditos de trial) num workspace errado (ex: a raiz de um monorepo que
 * engloba o projeto Angular, mas não é ela mesma). Achado real: um workspace
 * aberto sem `angular.json` chega até o fim da geração e só falha na
 * verificação de build, com uma mensagem em prosa do próprio agente em vez
 * de um erro direto da extensão. */
export async function isAngularWorkspace(workspaceRoot: string): Promise<boolean> {
  try {
    await fs.access(path.join(workspaceRoot, 'angular.json'));
    return true;
  } catch {
    return false;
  }
}
