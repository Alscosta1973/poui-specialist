import { spawn, ChildProcess } from 'node:child_process';
import * as net from 'node:net';

export interface PortRange {
  start: number;
  end: number;
}

export type CheckPortFreeFn = (port: number) => Promise<boolean>;
export type ProbePortFn = (port: number) => Promise<boolean>;
export type SpawnDevServerFn = (cwd: string, port: number) => ChildProcess;
export type SleepFn = (ms: number) => Promise<void>;
export type ClockFn = () => number;

function defaultCheckPortFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => server.close(() => resolve(true)));
    server.listen(port, '127.0.0.1');
  });
}

function defaultProbePort(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host: '127.0.0.1' });
    const finish = (result: boolean) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(result);
    };
    socket.setTimeout(1500);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
  });
}

/** `ng` resolve para `ng.cmd` no Windows — `shell: true` é necessário para o
 * spawn funcionar (mesmo motivo documentado em buildVerify.ts). Sem texto do
 * usuário no comando, então não é risco de injeção. */
function defaultSpawnDevServer(cwd: string, port: number): ChildProcess {
  return spawn('ng', ['serve', '--port', String(port)], {
    cwd,
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

const defaultSleep: SleepFn = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function findFreePort(
  range: PortRange = { start: 4200, end: 4209 },
  checkFree: CheckPortFreeFn = defaultCheckPortFree,
): Promise<number | null> {
  for (let port = range.start; port <= range.end; port++) {
    if (await checkFree(port)) {
      return port;
    }
  }
  return null;
}

export interface WaitForServerOptions {
  timeoutMs?: number;
  intervalMs?: number;
}

export async function waitForServerReady(
  port: number,
  options: WaitForServerOptions = {},
  probe: ProbePortFn = defaultProbePort,
  sleep: SleepFn = defaultSleep,
  clock: ClockFn = Date.now,
): Promise<boolean> {
  const timeoutMs = options.timeoutMs ?? 120000;
  const intervalMs = options.intervalMs ?? 3000;
  const deadline = clock() + timeoutMs;

  if (await probe(port)) {
    return true;
  }
  while (clock() < deadline) {
    await sleep(intervalMs);
    if (await probe(port)) {
      return true;
    }
  }
  return false;
}

export function spawnDevServer(cwd: string, port: number, spawnFn: SpawnDevServerFn = defaultSpawnDevServer): ChildProcess {
  return spawnFn(cwd, port);
}
