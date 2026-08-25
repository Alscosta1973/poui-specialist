import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

const execAsync = promisify(exec);

export interface SetupResult {
  success: boolean;
  steps: string[];
  errorMessage?: string;
}

export const PLAYWRIGHT_CONFIG_CONTENT = `import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: process.env['PO_E2E_BASE_URL'] ?? 'http://localhost:4200',
  },
  reporter: 'list',
});
`;

const GITIGNORE_PATTERNS = ['/test-results', '/playwright-report', '/.playwright-mcp', '/blob-report', '/playwright/.cache'];

/** Retorna só os padrões que ainda não aparecem no `.gitignore` existente —
 * evita duplicar entradas se o comando rodar mais de uma vez. */
export function buildGitignoreAdditions(existingGitignoreContent: string): string {
  const missing = GITIGNORE_PATTERNS.filter((pattern) => !existingGitignoreContent.includes(pattern));
  if (missing.length === 0) {
    return '';
  }
  return `\n# Playwright (poui-e2e / PO-UI: Gerar Teste E2E)\n${missing.join('\n')}\n`;
}

export async function configurePlaywright(
  workspaceRoot: string,
  sink: { appendLine(v: string): void },
): Promise<SetupResult> {
  const steps: string[] = [];
  try {
    sink.appendLine('Instalando @playwright/test (npm install)...');
    await execAsync('npm install --save-dev @playwright/test', {
      cwd: workspaceRoot,
      timeout: 300000,
      maxBuffer: 10 * 1024 * 1024,
    });
    steps.push('@playwright/test instalado');

    sink.appendLine('Instalando o browser Chromium (npx playwright install chromium)...');
    await execAsync('npx playwright install chromium', {
      cwd: workspaceRoot,
      timeout: 300000,
      maxBuffer: 10 * 1024 * 1024,
    });
    steps.push('Chromium instalado');

    const configPath = path.join(workspaceRoot, 'playwright.config.ts');
    const alreadyExists = await fs
      .access(configPath)
      .then(() => true)
      .catch(() => false);
    if (!alreadyExists) {
      await fs.writeFile(configPath, PLAYWRIGHT_CONFIG_CONTENT, 'utf8');
      steps.push('playwright.config.ts criado');
    }

    const gitignorePath = path.join(workspaceRoot, '.gitignore');
    const gitignoreContent = await fs.readFile(gitignorePath, 'utf8').catch(() => null);
    if (gitignoreContent !== null) {
      const additions = buildGitignoreAdditions(gitignoreContent);
      if (additions) {
        await fs.writeFile(gitignorePath, gitignoreContent + additions, 'utf8');
        steps.push('.gitignore atualizado com os artefatos efêmeros do Playwright');
      }
    }

    return { success: true, steps };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, steps, errorMessage };
  }
}
