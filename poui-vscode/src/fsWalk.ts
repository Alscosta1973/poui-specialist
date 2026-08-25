import * as fs from 'node:fs/promises';
import * as path from 'node:path';

/** Anda recursivamente a partir de `rootDir`, retornando o caminho absoluto
 * de todo arquivo cujo nome satisfaça `matcher`. */
export async function findFiles(rootDir: string, matcher: (fileName: string) => boolean): Promise<string[]> {
  const results: string[] = [];

  async function walk(dir: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }
      if (matcher(entry.name)) {
        results.push(fullPath);
      }
    }
  }

  await walk(rootDir);
  return results;
}
