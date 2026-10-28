import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

/** Arquivo lido pela skill `poui-license-check` do plugin `poui-specialist`
 * (Claude Code). Sozinho ele não libera nada — guarda só o hash da máquina,
 * e a skill confirma no Worker (`/license/status`) que esse hash está na
 * allowlist de dev antes de pular a data fixa do beta. Assim o
 * "Desbloquear Modo Dev" da extensão vale também pro plugin, sem a skill
 * precisar do `vscode.env.machineId` (que fora do VS Code não existe). */
export const PLUGIN_DEV_FLAG_FILENAME = 'poui-specialist-dev.json';

export function pluginDevFlagPath(homeDir: string = os.homedir()): string {
  return path.join(homeDir, '.claude', PLUGIN_DEV_FLAG_FILENAME);
}

export function writePluginDevFlag(machineHash: string, homeDir: string = os.homedir(), now: Date = new Date()): string {
  const filePath = pluginDevFlagPath(homeDir);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const content = { plugin: 'poui-specialist', machineHash, unlockedAt: now.toISOString() };
  fs.writeFileSync(filePath, `${JSON.stringify(content, null, 2)}\n`, 'utf8');
  return filePath;
}
