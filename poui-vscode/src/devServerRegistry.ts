import { exec } from 'node:child_process';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { ChildProcess } from 'node:child_process';
import { defaultProbePort, findFreePort, ProbePortFn, spawnDevServer, waitForServerReady } from './devServer';

/** Guarda a última porta que a extensão subiu pra cada workspace, num arquivo
 * fora do repositório (sobrevive a `F5`/reload do Extension Development Host,
 * já que o estado em memória do processo da extensão se perde nesses casos —
 * achado real: um `ng serve` de uma sessão de debug anterior ficou órfão e
 * uma nova sessão não tinha como saber que ele existia). Chave por hash do
 * caminho absoluto do workspace, pra não colidir entre projetos diferentes. */
function statePath(workspaceRoot: string): string {
  const key = crypto.createHash('sha1').update(workspaceRoot).digest('hex').slice(0, 16);
  return path.join(os.tmpdir(), `poui-devserver-${key}.json`);
}

export async function readTrackedPort(workspaceRoot: string): Promise<number | null> {
  try {
    const raw = await fs.readFile(statePath(workspaceRoot), 'utf8');
    const parsed: unknown = JSON.parse(raw);
    const port = (parsed as { port?: unknown } | null)?.port;
    return typeof port === 'number' ? port : null;
  } catch {
    return null;
  }
}

export async function writeTrackedPort(workspaceRoot: string, port: number): Promise<void> {
  // `workspaceRoot` no conteúdo é só pra depuração humana (inspecionar a pasta
  // temp e saber de qual projeto é cada arquivo) — a lógica de busca nunca lê
  // esse campo, ela já calcula o hash do workspace atual pra achar o arquivo.
  await fs.writeFile(statePath(workspaceRoot), JSON.stringify({ port, workspaceRoot }), 'utf8');
}

export async function clearTrackedPort(workspaceRoot: string): Promise<void> {
  await fs.rm(statePath(workspaceRoot), { force: true });
}

export interface EnsureDevServerDeps {
  probePort: ProbePortFn;
  findFreePort: () => Promise<number | null>;
  spawnDevServer: (cwd: string, port: number) => ChildProcess;
  waitForServerReady: (port: number) => Promise<boolean>;
  readTrackedPort: (workspaceRoot: string) => Promise<number | null>;
  writeTrackedPort: (workspaceRoot: string, port: number) => Promise<void>;
}

const defaultDeps: EnsureDevServerDeps = {
  probePort: defaultProbePort,
  findFreePort: () => findFreePort(),
  spawnDevServer: (cwd, port) => spawnDevServer(cwd, port),
  waitForServerReady: (port) => waitForServerReady(port),
  readTrackedPort,
  writeTrackedPort,
};

export type EnsureDevServerResult =
  | { ok: true; port: number; reused: boolean }
  | { ok: false; errorMessage: string };

/** Reaproveita um dev server já em execução pra este workspace (checado via
 * probe de verdade na porta, não só "existe um arquivo de estado") — só sobe
 * um `ng serve` novo se não houver nenhum rastreado ou se ele não estiver
 * mais respondendo. Preview e E2E chamam esta função em vez de duplicar
 * find-port/spawn/wait cada um com a própria cópia. */
export async function ensureDevServer(
  workspaceRoot: string,
  outputChannel: { appendLine(v: string): void },
  deps: Partial<EnsureDevServerDeps> = {},
): Promise<EnsureDevServerResult> {
  const d: EnsureDevServerDeps = { ...defaultDeps, ...deps };

  const trackedPort = await d.readTrackedPort(workspaceRoot);
  if (trackedPort !== null && (await d.probePort(trackedPort))) {
    outputChannel.appendLine(`Reaproveitando dev server já em execução na porta ${trackedPort}...`);
    return { ok: true, port: trackedPort, reused: true };
  }

  const port = await d.findFreePort();
  if (port === null) {
    return {
      ok: false,
      errorMessage:
        'portas 4200-4209 estão todas em uso. Encerre um dos servidores em execução ou rode `ng serve --port 4210` manualmente.',
    };
  }
  if (port !== 4200) {
    outputChannel.appendLine(`⚠ Porta 4200 em uso. Usando a porta ${port} para não interferir em outros projetos.`);
  }

  outputChannel.appendLine(`Iniciando dev server na porta ${port}...`);
  const devServer = d.spawnDevServer(workspaceRoot, port);
  let stderrTail = '';
  devServer.stderr?.on('data', (chunk: Buffer) => {
    stderrTail = (stderrTail + chunk.toString()).slice(-2000);
  });

  const ready = await d.waitForServerReady(port);
  if (!ready) {
    return {
      ok: false,
      errorMessage: `o servidor Angular não respondeu em 120 segundos.${stderrTail ? ` Últimas linhas: ${stderrTail}` : ' Verifique se há erros de compilação.'}`,
    };
  }

  await d.writeTrackedPort(workspaceRoot, port);
  return { ok: true, port, reused: false };
}

export interface ExecResult {
  stdout: string;
  stderr: string;
}
export type ExecFn = (command: string) => Promise<ExecResult>;

const defaultExec: ExecFn = (command) =>
  new Promise((resolve, reject) => {
    exec(command, { windowsHide: true }, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      resolve({ stdout, stderr });
    });
  });

/** Resolve qual PID está de fato ouvindo a porta via `netstat -ano`. Não dá
 * pra confiar no `pid` do `ChildProcess` retornado por `spawn(..., {shell:
 * true})` no Windows: é o PID do `cmd.exe` que fez a ponte pro `ng.cmd`, não
 * o do `node.exe` real por trás do `ng serve` — o mesmo motivo pelo qual
 * `checkPortFree` já testa binds reais em vez de inspecionar processos.
 *
 * **Sem `-p TCP`** — achado real testando contra um `ng serve` de verdade
 * nesta sessão: o Angular CLI bindou em `[::1]:<porta>` (IPv6 loopback), e
 * `netstat -ano -p TCP` **omite silenciosamente as entradas IPv6** no
 * Windows (mesmo elas aparecendo como protocolo "TCP" no `netstat -ano`
 * sem filtro) — `killPort` resolvia `null`, nunca matava o processo real, e
 * o dev server sobrevivia ao "kill". `netstat -ano` sem filtro lista as
 * duas famílias.
 *
 * O regex casa só o **endereço local** (logo após `TCP`/`TCP6` e espaços) —
 * `netstat` também lista a porta como endereço remoto em conexões
 * `TIME_WAIT`/`ESTABLISHED` (ex.: alguém que already conectou nela), o que
 * daria falso positivo se apenas `includes(':<porta> ')` fosse usado. */
export async function findPidListeningOnPort(port: number, execFn: ExecFn = defaultExec): Promise<number | null> {
  let stdout: string;
  try {
    ({ stdout } = await execFn('netstat -ano'));
  } catch {
    return null;
  }
  const localAddressPattern = new RegExp(`^\\s*TCP6?\\s+\\S+:${port}\\s`, 'i');
  const line = stdout
    .split(/\r?\n/)
    .find((l) => localAddressPattern.test(l) && /LISTENING/i.test(l));
  if (!line) {
    return null;
  }
  const match = /(\d+)\s*$/.exec(line.trim());
  return match ? Number(match[1]) : null;
}

export async function killPort(port: number, execFn: ExecFn = defaultExec): Promise<void> {
  const pid = await findPidListeningOnPort(port, execFn);
  if (pid === null) {
    return;
  }
  try {
    await execFn(`taskkill /F /PID ${pid}`);
  } catch {
    // Já morto ou sem permissão — nada mais a fazer.
  }
}

/** Chamado ao desativar a extensão (`context.subscriptions`) pra cada
 * workspace aberto — encerra o dev server que a própria extensão deixou de
 * pé (se ainda estiver vivo) e limpa o arquivo de estado, pra não deixar
 * processos rodando depois que a janela do VS Code fecha. */
export async function stopTrackedServer(workspaceRoot: string, execFn: ExecFn = defaultExec): Promise<void> {
  const port = await readTrackedPort(workspaceRoot);
  if (port === null) {
    return;
  }
  await killPort(port, execFn);
  await clearTrackedPort(workspaceRoot);
}
