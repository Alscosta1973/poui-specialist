import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { findFiles } from './fsWalk';

/** Acha interceptors de mock (Passo 2b da skill `poui-connect`) — arquivos
 * `.ts` que implementam `HttpInterceptor`/`HttpInterceptorFn` **e** referenciam
 * o `kebabName` do componente (ex: `req.url.includes('titulos')`). Usado pra
 * só perguntar a preferência de tratamento de interceptor (remover vs.
 * desativar) quando há de fato algo a tratar — evita uma pergunta sem sentido
 * quando o componente já usa HTTP real e não tem nenhum mock. */
export async function findMockInterceptors(rootDir: string, kebabName: string): Promise<string[]> {
  const appDir = path.join(rootDir, 'src', 'app');
  const tsFiles = await findFiles(appDir, (name) => name.endsWith('.ts')).catch(() => [] as string[]);

  const matches: string[] = [];
  for (const filePath of tsFiles) {
    const content = await fs.readFile(filePath, 'utf8').catch(() => '');
    const isInterceptor = /HttpInterceptorFn|implements\s+HttpInterceptor\b/.test(content);
    if (isInterceptor && content.includes(kebabName)) {
      matches.push(filePath);
    }
  }
  return matches;
}
