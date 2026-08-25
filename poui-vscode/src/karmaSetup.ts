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

/** Sem `karma-jasmine-html-reporter`/`kjhtml` de propósito — achado real
 * (2026-08-25): esse plugin causa `Cannot assign to read only property
 * 'describe'` em conflito com o builder esbuild `@angular/build:karma` do
 * Angular 21. Sem ele, roda normal. */
export const KARMA_CONFIG_CONTENT = `// Karma configuration file, see link for more information
// https://karma-runner.github.io/1.0/config/configuration-file.html

module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-coverage'),
    ],
    client: {
      jasmine: {},
      clearContext: false,
    },
    coverageReporter: {
      dir: require('path').join(__dirname, './coverage'),
      subdir: '.',
      reporters: [{ type: 'html' }, { type: 'text-summary' }],
    },
    reporters: ['progress'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: true,
    browsers: ['Chrome'],
    singleRun: false,
    restartOnFileChange: true,
  });
};
`;

const KARMA_NPM_PACKAGES = [
  'zone.js',
  'karma',
  'karma-chrome-launcher',
  'karma-jasmine',
  'karma-coverage',
  'jasmine-core',
  '@types/jasmine',
];

interface AngularJsonProjectOptions {
  assets?: unknown;
  styles?: unknown;
  [key: string]: unknown;
}

interface AngularJsonTarget {
  builder?: string;
  options?: AngularJsonProjectOptions;
  [key: string]: unknown;
}

interface AngularJsonProject {
  architect?: Record<string, AngularJsonTarget | undefined>;
}

interface AngularJson {
  projects?: Record<string, AngularJsonProject | undefined>;
}

/** Adiciona um target `test` (builder `@angular/build:karma`) a todo projeto
 * que tenha `build` mas ainda não tenha `test` — reaproveita `assets`/
 * `styles` do próprio target `build` do projeto, já que costumam ser
 * idênticos (mesmos temas PO-UI, mesmos assets estáticos). */
export function addKarmaTestTarget(angularJsonContent: string): string {
  const angularJson: AngularJson = JSON.parse(angularJsonContent);

  for (const project of Object.values(angularJson.projects ?? {})) {
    const architect = project?.architect;
    if (!architect?.build || architect.test) {
      continue;
    }
    const buildOptions = architect.build.options ?? {};
    architect.test = {
      builder: '@angular/build:karma',
      options: {
        tsConfig: 'tsconfig.spec.json',
        polyfills: ['zone.js'],
        karmaConfig: 'karma.conf.js',
        assets: buildOptions.assets ?? [],
        styles: buildOptions.styles ?? [],
      },
    };
  }

  return JSON.stringify(angularJson, null, 2) + '\n';
}

/** `tsconfig.spec.json` costuma ter comentários (`/* ... *\/`), então não dá
 * pra usar `JSON.parse`/`JSON.stringify` sem perder esse conteúdo — troca só
 * o array `"types"` via regex, preservando o resto do arquivo intacto. */
export function ensureJasmineTypes(tsconfigSpecContent: string): string {
  const typesMatch = /"types"\s*:\s*\[([^\]]*)\]/.exec(tsconfigSpecContent);
  if (typesMatch) {
    const current = typesMatch[1];
    if (/"jasmine"/.test(current)) {
      return tsconfigSpecContent;
    }
    return tsconfigSpecContent.replace(typesMatch[0], '"types": [\n      "jasmine"\n    ]');
  }

  const compilerOptionsMatch = /"compilerOptions"\s*:\s*\{/.exec(tsconfigSpecContent);
  if (!compilerOptionsMatch) {
    return tsconfigSpecContent;
  }
  const insertAt = compilerOptionsMatch.index + compilerOptionsMatch[0].length;
  return (
    tsconfigSpecContent.slice(0, insertAt) +
    '\n    "types": ["jasmine"],' +
    tsconfigSpecContent.slice(insertAt)
  );
}

/** Mesmo raciocínio de `ensureJasmineTypes`: `tsconfig.json` costuma ter
 * comentários, então adiciona a referência via regex, sem re-serializar o
 * arquivo inteiro como JSON. Se não houver array `"references"` nenhum,
 * não mexe — melhor deixar pro usuário configurar manualmente do que
 * inventar uma estrutura nova num arquivo que foge do padrão esperado. */
export function ensureSpecReference(tsconfigContent: string): string {
  if (/"\.\/tsconfig\.spec\.json"/.test(tsconfigContent)) {
    return tsconfigContent;
  }
  const referencesMatch = /"references"\s*:\s*\[/.exec(tsconfigContent);
  if (!referencesMatch) {
    return tsconfigContent;
  }
  const insertAt = referencesMatch.index + referencesMatch[0].length;
  return (
    tsconfigContent.slice(0, insertAt) +
    '\n    {\n      "path": "./tsconfig.spec.json"\n    },' +
    tsconfigContent.slice(insertAt)
  );
}

export async function configureKarma(workspaceRoot: string, sink: { appendLine(v: string): void }): Promise<SetupResult> {
  const steps: string[] = [];
  try {
    sink.appendLine('Instalando dependências do Karma (npm install)...');
    await execAsync(`npm install --save-dev ${KARMA_NPM_PACKAGES.join(' ')}`, {
      cwd: workspaceRoot,
      timeout: 300000,
      maxBuffer: 10 * 1024 * 1024,
    });
    steps.push('Dependências instaladas: ' + KARMA_NPM_PACKAGES.join(', '));

    await fs.writeFile(path.join(workspaceRoot, 'karma.conf.js'), KARMA_CONFIG_CONTENT, 'utf8');
    steps.push('karma.conf.js criado');

    const angularJsonPath = path.join(workspaceRoot, 'angular.json');
    const angularJsonContent = await fs.readFile(angularJsonPath, 'utf8');
    await fs.writeFile(angularJsonPath, addKarmaTestTarget(angularJsonContent), 'utf8');
    steps.push('target "test" adicionado em angular.json');

    const tsconfigSpecPath = path.join(workspaceRoot, 'tsconfig.spec.json');
    const tsconfigSpecContent = await fs.readFile(tsconfigSpecPath, 'utf8').catch(() => null);
    if (tsconfigSpecContent !== null) {
      await fs.writeFile(tsconfigSpecPath, ensureJasmineTypes(tsconfigSpecContent), 'utf8');
      steps.push('tsconfig.spec.json ajustado para "types": ["jasmine"]');
    }

    const tsconfigPath = path.join(workspaceRoot, 'tsconfig.json');
    const tsconfigContent = await fs.readFile(tsconfigPath, 'utf8').catch(() => null);
    if (tsconfigContent !== null) {
      await fs.writeFile(tsconfigPath, ensureSpecReference(tsconfigContent), 'utf8');
      steps.push('tsconfig.json referenciando tsconfig.spec.json');
    }

    return { success: true, steps };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, steps, errorMessage };
  }
}
