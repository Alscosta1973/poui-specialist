import * as fs from 'node:fs/promises';
import * as path from 'node:path';

interface AngularJsonProject {
  architect?: Record<string, { builder?: string } | undefined>;
  targets?: Record<string, { builder?: string } | undefined>;
}

interface AngularJson {
  projects?: Record<string, AngularJsonProject | undefined>;
}

/** `Gerar Teste Unitário` produz specs Jasmine — só fazem sentido se algum
 * projeto do workspace tiver um target `test` usando um builder de Karma
 * (`@angular/build:karma` ou o legado `@angular-devkit/build-angular:karma`).
 * Sem isso, `ng test` falha mesmo com o spec correto — achado testando de
 * verdade um projeto Angular 21 recém-criado sem test runner configurado. */
export async function isKarmaConfigured(workspaceRoot: string): Promise<boolean> {
  let angularJson: AngularJson;
  try {
    const raw = await fs.readFile(path.join(workspaceRoot, 'angular.json'), 'utf8');
    angularJson = JSON.parse(raw);
  } catch {
    return false;
  }

  for (const project of Object.values(angularJson.projects ?? {})) {
    const testTarget = project?.architect?.test ?? project?.targets?.test;
    if (testTarget?.builder && /karma/i.test(testTarget.builder)) {
      return true;
    }
  }
  return false;
}
