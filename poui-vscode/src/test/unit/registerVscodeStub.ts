// poui-vscode/src/test/unit/registerVscodeStub.ts
//
// Fora do Extension Host real (mocha + ts-node puro, como o test:unit roda)
// não existe módulo 'vscode' de verdade — só dentro do processo que o
// @vscode/test-electron sobe pra suite/. Este hook redireciona
// `require('vscode')` pra vscodeStub.ts durante o test:unit, registrado via
// --require no script "test:unit" do package.json.
import * as path from 'node:path';
// eslint-disable-next-line @typescript-eslint/no-var-requires
import Module = require('node:module');

const stubPath = path.resolve(__dirname, './vscodeStub.ts');
const ModuleAny = Module as unknown as {
  _resolveFilename: (request: string, ...rest: unknown[]) => string;
};
const originalResolveFilename = ModuleAny._resolveFilename;

ModuleAny._resolveFilename = function (request: string, ...rest: unknown[]): string {
  if (request === 'vscode') {
    return stubPath;
  }
  return originalResolveFilename(request, ...rest);
};
