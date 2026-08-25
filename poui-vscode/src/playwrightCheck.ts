import * as fs from 'node:fs/promises';
import * as path from 'node:path';

const CONFIG_FILE_NAMES = ['playwright.config.ts', 'playwright.config.js'];

/** `Gerar Teste E2E` roda `@playwright/test` — igual ao `isKarmaConfigured`
 * pra `test`, checa se o projeto já tem o config antes de gerar, avisando
 * (sem bloquear) quando não tiver. */
export async function isPlaywrightConfigured(workspaceRoot: string): Promise<boolean> {
  for (const fileName of CONFIG_FILE_NAMES) {
    const exists = await fs
      .access(path.join(workspaceRoot, fileName))
      .then(() => true)
      .catch(() => false);
    if (exists) {
      return true;
    }
  }
  return false;
}
