// poui-vscode/src/test/unit/vscodeStub.ts
//
// Fake mínimo do módulo 'vscode', usado só pelo test:unit (mocha + ts-node,
// sem Extension Host real). Cobre apenas a superfície que requireLicense.ts /
// activateLicense.ts / licenseStatusBar.ts realmente chamam. Compartilhado
// entre todos os arquivos de teste via require.cache (mesmo caminho
// absoluto) — ver registerVscodeStub.ts pro hook que injeta este arquivo no
// lugar de 'vscode'.

type AnyFn = (...args: unknown[]) => unknown;

export const commandRegistry = new Map<string, AnyFn>();
export const executedCommands: string[] = [];
export const shownErrorMessages: string[] = [];
export const shownInfoMessages: string[] = [];

let quickPickResult: unknown;
let inputBoxResult: string | undefined;

export function setNextQuickPick(value: unknown): void {
  quickPickResult = value;
}

export function setNextInputBox(value: string | undefined): void {
  inputBoxResult = value;
}

export function resetVscodeStub(): void {
  commandRegistry.clear();
  executedCommands.length = 0;
  shownErrorMessages.length = 0;
  shownInfoMessages.length = 0;
  quickPickResult = undefined;
  inputBoxResult = undefined;
  env.machineId = 'test-machine-id';
}

export const env = {
  machineId: 'test-machine-id',
  openExternal: async (): Promise<boolean> => true,
};

export const Uri = {
  parse: (value: string) => ({ toString: () => value }),
};

export const ProgressLocation = { Notification: 15 };

export const window = {
  showErrorMessage: async (message: string, ..._items: string[]): Promise<string | undefined> => {
    shownErrorMessages.push(message);
    return undefined;
  },
  showInformationMessage: async (message: string, ..._items: string[]): Promise<string | undefined> => {
    shownInfoMessages.push(message);
    return undefined;
  },
  showQuickPick: async (_items: unknown, _options?: unknown): Promise<unknown> => quickPickResult,
  showInputBox: async (_options?: unknown): Promise<string | undefined> => inputBoxResult,
  withProgress: async <T>(_options: unknown, task: () => Promise<T> | T): Promise<T> => task(),
};

export const commands = {
  registerCommand: (id: string, callback: AnyFn): { dispose: () => void } => {
    commandRegistry.set(id, callback);
    return { dispose: () => commandRegistry.delete(id) };
  },
  executeCommand: async (id: string, ...args: unknown[]): Promise<unknown> => {
    executedCommands.push(id);
    const callback = commandRegistry.get(id);
    return callback ? callback(...args) : undefined;
  },
};

export const workspace = {
  getConfiguration: (_section?: string) => ({
    get: <T>(_key: string, fallback?: T): T | undefined => fallback,
  }),
};
