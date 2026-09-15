import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

/** Achado real (2026-09-15): `~/.gemini/settings.json` guarda
 * `security.auth.selectedType`, e esse valor tem prioridade sobre a env var
 * `GEMINI_API_KEY` — se ficou `"oauth-personal"` de uma tentativa anterior
 * de "Login gratuito" (a opção que removemos depois que o Google
 * descontinuou o tier individual, ver `configureEngineLogic.ts`), o CLI
 * insiste em tentar OAuth e falha com `IneligibleTierError`/"Failed to sign
 * in", mesmo com uma API key válida configurada. Preserva qualquer outra
 * chave já presente no arquivo (ex: `ide.hasSeenNudge`) — só corrige o tipo
 * de autenticação. */
export function withGeminiApiKeyAuthType(existingContent: string | undefined): string {
  let settings: Record<string, unknown> = {};
  if (existingContent) {
    try {
      const parsed: unknown = JSON.parse(existingContent);
      if (parsed && typeof parsed === 'object') {
        settings = parsed as Record<string, unknown>;
      }
    } catch {
      settings = {};
    }
  }
  const security = { ...((settings.security as Record<string, unknown> | undefined) ?? {}) };
  const auth = { ...((security.auth as Record<string, unknown> | undefined) ?? {}) };
  auth.selectedType = 'gemini-api-key';
  security.auth = auth;
  settings.security = security;
  return JSON.stringify(settings, null, 2) + '\n';
}

export async function ensureGeminiApiKeyAuthType(): Promise<void> {
  const settingsPath = path.join(os.homedir(), '.gemini', 'settings.json');
  let existing: string | undefined;
  try {
    existing = await fs.readFile(settingsPath, 'utf8');
  } catch {
    existing = undefined;
  }
  await fs.mkdir(path.dirname(settingsPath), { recursive: true });
  await fs.writeFile(settingsPath, withGeminiApiKeyAuthType(existing), 'utf8');
}
