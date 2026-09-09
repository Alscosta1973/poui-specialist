// poui-vscode/src/test/unit/reloadModule.ts
//
// requireLicense.ts guarda estado em variáveis de módulo (sessionStatus,
// initPromise) — cada teste precisa de uma instância zerada, senão o
// resultado de um teste vaza pro próximo via require.cache.
export function reloadModule<T>(modulePath: string): T {
  const resolved = require.resolve(modulePath);
  delete require.cache[resolved];
  return require(modulePath) as T;
}
