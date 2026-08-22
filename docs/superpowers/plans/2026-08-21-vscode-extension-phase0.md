# Extensão VS Code poui-specialist — Fase 0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone VS Code extension (`poui-vscode/`) that embeds the Claude Agent SDK directly (own Anthropic API key, no Claude Code CLI/license dependency) and ships one working end-to-end command — "PO-UI: Gerar Page List" — as proof of concept before porting the rest of the poui-specialist catalog.

**Architecture:** A thin VS Code extension (command palette + `SecretStorage` + `OutputChannel`) wraps `@anthropic-ai/claude-agent-sdk`'s `query()`. The extension composes the system prompt itself, by concatenating the plugin's existing `agents/code-generator-list.md` plus the 5 reference files its own "conditional load map" names for `page-list` — this sidesteps the fact that those files don't exist inside the user's Angular workspace. `cwd` is pinned to the open workspace folder, which is what scopes the agent's built-in file tools instead of a reimplemented sandbox.

**Tech Stack:** TypeScript, VS Code Extension API (`vscode` ^1.90), `@anthropic-ai/claude-agent-sdk` (ESM, loaded via dynamic `import()` from CommonJS), Mocha for unit tests, `@vscode/test-electron` for one activation smoke test, `esbuild`-free (plain `tsc`) build.

**Spec:** `docs/superpowers/specs/2026-08-21-vscode-extension-phase0-design.md` — read it alongside this plan; this plan resolves the two open questions it flagged (see Global Constraints).

## Global Constraints

- Project lives at `poui-vscode/` inside this same repo (`poui-specialist`), not a separate repo — keeps the source-of-truth agent/skill files and the extension that reuses them in one place for Fase 0.
- Node.js >= `18.19.0` (matches the plugin's own minimum, see `agents/code-generator-list.md` Phase 3).
- `@anthropic-ai/claude-agent-sdk` ships as `"type": "module"` (ESM-only, confirmed via `npm view`) — the extension itself compiles to CommonJS (`tsconfig.json` `"module": "commonjs"`), and loads the SDK via `await import('@anthropic-ai/claude-agent-sdk')` inside `agentRuntime.ts`. Never `require()` it directly — that throws `ERR_REQUIRE_ESM`.
- `tsconfig.json` uses `"moduleResolution": "bundler"` so `tsc` can read the SDK's ESM `exports` map for types while still emitting CommonJS.
- **Resolved — open question 1 (permissionMode):** use `permissionMode: 'bypassPermissions'` with `allowDangerouslySkipPermissions: true` on every `query()` call. The safety boundary is `cwd` (the agent's file tools cannot leave the open workspace folder), not per-write interactive confirmation — matching how the current plugin already writes files without per-file y/n prompts once the plan is approved.
- **Resolved — open question 2 (`.claude/` auto-load):** not used in Fase 0. The extension pre-reads and concatenates the 6 needed markdown files into `systemPrompt` itself (see Task 4), with an explicit preamble telling the model not to re-`Read` the relative `skills/...`/`agents/...` paths mentioned inside them. Simpler and fully within the extension's control; revisit `.claude/` auto-load as an optimization in a later phase once more of the catalog is ported.
- Anthropic API key is read **only** from `vscode.SecretStorage` (`context.secrets`) via the `poui.setApiKey` command — never from `process.env.ANTHROPIC_API_KEY` on the user's machine, never hardcoded.
- Default model `claude-opus-5`, default effort `high`, both overridable via `poui.model` / `poui.effort` settings (`contributes.configuration`).
- Fast unit tests (Mocha, plain `ts-node`, no Electron) cover every module that doesn't need the live `vscode` API by depending on narrow interfaces instead of importing `vscode` at runtime. `@vscode/test-electron` is used for exactly one integration smoke test (command registration) — keep it to that; don't grow it into a duplicate of the unit suite.
- REST path convention: use `/rest/api/custom/v1/<plural-kebab>` (the concrete example the agent file's Phase 3 substitution table uses for `{{apiPath}}`), not the shorter `/api/custom/v1/...` form that appears only in the Naming Conventions table — the two disagree in the source file; this plan standardizes on the Phase 3 form since that's what actually gets written into generated code.

---

## Task 1: Extension scaffold + working test harness

**Files:**
- Create: `poui-vscode/package.json`
- Create: `poui-vscode/tsconfig.json`
- Create: `poui-vscode/.vscodeignore`
- Create: `poui-vscode/.vscode/launch.json`
- Create: `poui-vscode/.vscode/tasks.json`
- Create: `poui-vscode/src/extension.ts`
- Create: `poui-vscode/src/test/runTest.ts`
- Create: `poui-vscode/src/test/suite/index.ts`
- Create: `poui-vscode/src/test/suite/extension.test.ts`
- Create: `poui-vscode/src/test/unit/smoke.test.ts`
- Modify: `.gitignore` (repo root)

**Interfaces:**
- Produces: `activate(context: vscode.ExtensionContext): void` and `deactivate(): void`, exported from `src/extension.ts` — every later task adds command registrations inside `activate`.
- Produces: npm scripts `compile`, `test:unit`, `test` — later tasks' test steps run through these.

- [ ] **Step 1: Scaffold project config**

Create `poui-vscode/package.json`:

```json
{
  "name": "poui-vscode",
  "displayName": "PO-UI Specialist",
  "description": "Gera componentes Angular PO-UI integrados ao Protheus REST diretamente no VS Code, sem depender do Claude Code CLI.",
  "version": "0.0.1",
  "publisher": "andre-costa",
  "private": true,
  "license": "MIT",
  "engines": {
    "vscode": "^1.90.0",
    "node": ">=18.19.0"
  },
  "categories": ["Other"],
  "activationEvents": [],
  "main": "./out/extension.js",
  "contributes": {
    "commands": [
      { "command": "poui.generate.pageList", "title": "PO-UI: Gerar Page List" },
      { "command": "poui.setApiKey", "title": "PO-UI: Configurar API Key" }
    ],
    "configuration": {
      "title": "PO-UI Specialist",
      "properties": {
        "poui.model": {
          "type": "string",
          "default": "claude-opus-5",
          "description": "Modelo Claude usado para gerar código."
        },
        "poui.effort": {
          "type": "string",
          "enum": ["low", "medium", "high", "xhigh", "max"],
          "default": "high",
          "description": "Nível de esforço/raciocínio do modelo."
        }
      }
    }
  },
  "scripts": {
    "sync-prompts": "node scripts/sync-prompts.mjs",
    "compile": "npm run sync-prompts && tsc -p ./",
    "watch": "tsc -watch -p ./",
    "pretest": "npm run compile",
    "test": "node ./out/test/runTest.js",
    "test:unit": "mocha --require ts-node/register \"src/test/unit/**/*.test.ts\""
  },
  "dependencies": {
    "@anthropic-ai/claude-agent-sdk": "^0.3.239"
  },
  "devDependencies": {
    "@types/mocha": "^10.0.10",
    "@types/node": "^22.0.0",
    "@types/vscode": "^1.90.0",
    "@vscode/test-electron": "^3.1.0",
    "glob": "^11.0.0",
    "mocha": "^11.8.0",
    "ts-node": "^10.9.2",
    "typescript": "^5.7.0"
  }
}
```

Create `poui-vscode/tsconfig.json`:

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "moduleResolution": "bundler",
    "target": "ES2022",
    "lib": ["ES2022"],
    "outDir": "out",
    "rootDir": "src",
    "sourceMap": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*.ts"]
}
```

Create `poui-vscode/.vscodeignore`:

```
.vscode/**
src/**
scripts/**
.gitignore
tsconfig.json
**/*.map
node_modules/**
.vscode-test/**
```

Create `poui-vscode/.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Run Extension",
      "type": "extensionHost",
      "request": "launch",
      "args": ["--extensionDevelopmentPath=${workspaceFolder}"],
      "outFiles": ["${workspaceFolder}/out/**/*.js"],
      "preLaunchTask": "npm: compile"
    }
  ]
}
```

Create `poui-vscode/.vscode/tasks.json`:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "type": "npm",
      "script": "compile",
      "problemMatcher": ["$tsc"],
      "group": { "kind": "build", "isDefault": true }
    }
  ]
}
```

Create the minimal `poui-vscode/src/extension.ts` (later tasks add command registrations here):

```typescript
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext): void {
  const outputChannel = vscode.window.createOutputChannel('PO-UI');
  context.subscriptions.push(outputChannel);
}

export function deactivate(): void {}
```

- [ ] **Step 2: Add `.gitignore` entries for the new project**

Append to `.gitignore` (repo root):

```

# Extensão VS Code (poui-vscode) — build/test artifacts
poui-vscode/out/
poui-vscode/.vscode-test/
poui-vscode/assets/agent-prompts/
!poui-vscode/package-lock.json
```

(`node_modules/` and `package-lock.json` are already ignored repo-wide by the existing rules above; the last line re-allows `poui-vscode/package-lock.json`, mirroring the exception already made for `examples/modulo-compras/package-lock.json`.)

- [ ] **Step 3: Install dependencies and verify compile**

Run:
```bash
cd poui-vscode && npm install && npm run sync-prompts 2>&1 | head -5
```
Expected: `npm install` succeeds. `sync-prompts` will fail with "Cannot find module './scripts/sync-prompts.mjs'" at this point — that's expected, the script is created in Task 4. Create a temporary no-op placeholder so `compile` works for this task only:

```bash
mkdir -p poui-vscode/scripts && cat > poui-vscode/scripts/sync-prompts.mjs <<'EOF'
console.log('sync-prompts: no-op placeholder (real script lands in Task 4)');
EOF
```

Then run:
```bash
cd poui-vscode && npm run compile
```
Expected: exits 0, `out/extension.js` exists.

- [ ] **Step 4: Write the test harness (unit + integration)**

Create `poui-vscode/src/test/unit/smoke.test.ts`:

```typescript
import * as assert from 'node:assert';

describe('test harness smoke test', () => {
  it('runs a trivial assertion', () => {
    assert.strictEqual(1 + 1, 2);
  });
});
```

Create `poui-vscode/src/test/runTest.ts`:

```typescript
import * as path from 'node:path';
import { runTests } from '@vscode/test-electron';

async function main(): Promise<void> {
  try {
    const extensionDevelopmentPath = path.resolve(__dirname, '../../');
    const extensionTestsPath = path.resolve(__dirname, './suite/index');
    await runTests({ extensionDevelopmentPath, extensionTestsPath });
  } catch (err) {
    console.error('Failed to run tests', err);
    process.exit(1);
  }
}

void main();
```

Create `poui-vscode/src/test/suite/index.ts`:

```typescript
import * as path from 'node:path';
import Mocha from 'mocha';
import { glob } from 'glob';

export async function run(): Promise<void> {
  const mocha = new Mocha({ ui: 'bdd', color: true, timeout: 20000 });
  const testsRoot = path.resolve(__dirname, '.');
  const files = await glob('**/*.test.js', { cwd: testsRoot });
  files.forEach((file) => mocha.addFile(path.resolve(testsRoot, file)));

  return new Promise((resolve, reject) => {
    mocha.run((failures) => {
      if (failures > 0) {
        reject(new Error(`${failures} tests failed.`));
      } else {
        resolve();
      }
    });
  });
}
```

Create `poui-vscode/src/test/suite/extension.test.ts`:

```typescript
import * as assert from 'node:assert';
import * as vscode from 'vscode';

describe('extension packaging', () => {
  it('is present in the extension host', () => {
    const ext = vscode.extensions.getExtension('andre-costa.poui-vscode');
    assert.ok(ext, 'expected the poui-vscode extension to be discoverable');
  });
});
```

- [ ] **Step 5: Run both test suites to verify the harness works**

Run: `cd poui-vscode && npm run test:unit`
Expected: 1 passing test (`test harness smoke test`).

Run: `cd poui-vscode && npm test`
Expected: downloads a VS Code test build on first run (needs internet access), then 1 passing test (`extension packaging`). If offline, skip this run for now and re-verify in Task 6 once network is available — do not block the rest of the plan on it.

- [ ] **Step 6: Commit**

```bash
git add poui-vscode/package.json poui-vscode/tsconfig.json poui-vscode/.vscodeignore \
  poui-vscode/.vscode/launch.json poui-vscode/.vscode/tasks.json poui-vscode/src/extension.ts \
  poui-vscode/src/test/runTest.ts poui-vscode/src/test/suite/index.ts \
  poui-vscode/src/test/suite/extension.test.ts poui-vscode/src/test/unit/smoke.test.ts \
  poui-vscode/scripts/sync-prompts.mjs .gitignore
git commit -m "feat(vscode-ext): scaffold extension project and test harness"
```

---

## Task 2: Entity naming helper (`naming.ts`)

**Files:**
- Create: `poui-vscode/src/naming.ts`
- Test: `poui-vscode/src/test/unit/naming.test.ts`

**Interfaces:**
- Produces: `deriveEntityNaming(rawName: string): EntityNaming` and `isValidModuleName(module: string): boolean`, both pure functions with no `vscode` dependency — Task 6 (`generatePageList.ts`) and Task 4 (`promptBuilder.ts`) consume `EntityNaming`.
- `EntityNaming` shape: `{ entityPascal: string; entityKebab: string; entityKebabPlural: string; componentClass: string; selector: string; serviceClass: string; serviceFileBase: string; defaultApiPath: string; wasAutoCorrected: boolean }`

- [ ] **Step 1: Write the failing tests**

Create `poui-vscode/src/test/unit/naming.test.ts`:

```typescript
import * as assert from 'node:assert';
import { deriveEntityNaming, isValidModuleName } from '../../naming';

describe('deriveEntityNaming', () => {
  it('derives all conventions from a PascalCase plural name', () => {
    const naming = deriveEntityNaming('Pedidos');
    assert.strictEqual(naming.entityPascal, 'Pedidos');
    assert.strictEqual(naming.entityKebab, 'pedidos');
    assert.strictEqual(naming.entityKebabPlural, 'pedidos');
    assert.strictEqual(naming.componentClass, 'PedidosListComponent');
    assert.strictEqual(naming.selector, 'app-pedidos-list');
    assert.strictEqual(naming.serviceClass, 'PedidosService');
    assert.strictEqual(naming.serviceFileBase, 'pedidos.service');
    assert.strictEqual(naming.defaultApiPath, '/rest/api/custom/v1/pedidos');
    assert.strictEqual(naming.wasAutoCorrected, false);
  });

  it('auto-corrects a lowercase-first name to PascalCase and flags it', () => {
    const naming = deriveEntityNaming('fornecedores');
    assert.strictEqual(naming.entityPascal, 'Fornecedores');
    assert.strictEqual(naming.wasAutoCorrected, true);
  });

  it('splits multi-word input and kebab-cases it', () => {
    const naming = deriveEntityNaming('Nota Fiscal');
    assert.strictEqual(naming.entityPascal, 'NotaFiscal');
    assert.strictEqual(naming.entityKebab, 'nota-fiscal');
    assert.strictEqual(naming.entityKebabPlural, 'nota-fiscals');
    assert.strictEqual(naming.componentClass, 'NotaFiscalListComponent');
  });

  it('throws on an empty name', () => {
    assert.throws(() => deriveEntityNaming('   '), /não pode ser vazio/);
  });
});

describe('isValidModuleName', () => {
  it('accepts lowercase kebab module names', () => {
    assert.strictEqual(isValidModuleName('financeiro'), true);
    assert.strictEqual(isValidModuleName('contas-a-pagar'), true);
  });

  it('rejects names with spaces, uppercase, or a leading digit', () => {
    assert.strictEqual(isValidModuleName('Financeiro'), false);
    assert.strictEqual(isValidModuleName('contas a pagar'), false);
    assert.strictEqual(isValidModuleName('1financeiro'), false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd poui-vscode && npm run test:unit`
Expected: FAIL — `Cannot find module '../../naming'`.

- [ ] **Step 3: Implement `naming.ts`**

Create `poui-vscode/src/naming.ts`:

```typescript
export interface EntityNaming {
  entityPascal: string;
  entityKebab: string;
  entityKebabPlural: string;
  componentClass: string;
  selector: string;
  serviceClass: string;
  serviceFileBase: string;
  defaultApiPath: string;
  wasAutoCorrected: boolean;
}

export function toPascalCase(raw: string): string {
  return raw
    .trim()
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

export function toKebabCase(pascal: string): string {
  return pascal.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

function pluralize(kebab: string): string {
  return kebab.endsWith('s') ? kebab : `${kebab}s`;
}

export function deriveEntityNaming(rawName: string): EntityNaming {
  if (!rawName || !rawName.trim()) {
    throw new Error('Nome da entidade não pode ser vazio.');
  }

  const inputTrimmed = rawName.trim();
  const entityPascal = toPascalCase(inputTrimmed);
  const wasAutoCorrected = entityPascal !== inputTrimmed;
  const entityKebab = toKebabCase(entityPascal);
  const entityKebabPlural = pluralize(entityKebab);

  return {
    entityPascal,
    entityKebab,
    entityKebabPlural,
    componentClass: `${entityPascal}ListComponent`,
    selector: `app-${entityKebab}-list`,
    serviceClass: `${entityPascal}Service`,
    serviceFileBase: `${entityKebab}.service`,
    defaultApiPath: `/rest/api/custom/v1/${entityKebabPlural}`,
    wasAutoCorrected,
  };
}

export function isValidModuleName(module: string): boolean {
  return /^[a-z][a-z0-9-]*$/.test(module.trim());
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd poui-vscode && npm run test:unit`
Expected: PASS — all `deriveEntityNaming` and `isValidModuleName` tests green.

- [ ] **Step 5: Commit**

```bash
git add poui-vscode/src/naming.ts poui-vscode/src/test/unit/naming.test.ts
git commit -m "feat(vscode-ext): add entity naming derivation helper"
```

---

## Task 3: API key storage (`apiKey.ts`)

**Files:**
- Create: `poui-vscode/src/apiKey.ts`
- Test: `poui-vscode/src/test/unit/apiKey.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `SecretStorageLike` interface (`get`, `store`, `delete`, each returning a `Thenable`), `getApiKey(secrets: SecretStorageLike): Promise<string | undefined>`, `setApiKey(secrets: SecretStorageLike, value: string): Promise<void>`. `vscode.SecretStorage` satisfies `SecretStorageLike` structurally — Task 6 passes `context.secrets` directly, no adapter needed.

- [ ] **Step 1: Write the failing tests**

Create `poui-vscode/src/test/unit/apiKey.test.ts`:

```typescript
import * as assert from 'node:assert';
import { getApiKey, setApiKey, SecretStorageLike } from '../../apiKey';

class FakeSecretStorage implements SecretStorageLike {
  private readonly store_ = new Map<string, string>();

  async get(key: string): Promise<string | undefined> {
    return this.store_.get(key);
  }

  async store(key: string, value: string): Promise<void> {
    this.store_.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.store_.delete(key);
  }
}

describe('apiKey', () => {
  it('returns undefined when no key was ever stored', async () => {
    const secrets = new FakeSecretStorage();
    assert.strictEqual(await getApiKey(secrets), undefined);
  });

  it('stores and retrieves a trimmed key', async () => {
    const secrets = new FakeSecretStorage();
    await setApiKey(secrets, '  sk-ant-fake-key  ');
    assert.strictEqual(await getApiKey(secrets), 'sk-ant-fake-key');
  });

  it('rejects an empty or whitespace-only key', async () => {
    const secrets = new FakeSecretStorage();
    await assert.rejects(() => setApiKey(secrets, '   '), /vazia/);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd poui-vscode && npm run test:unit`
Expected: FAIL — `Cannot find module '../../apiKey'`.

- [ ] **Step 3: Implement `apiKey.ts`**

Create `poui-vscode/src/apiKey.ts`:

```typescript
const SECRET_KEY = 'poui.anthropicApiKey';

export interface SecretStorageLike {
  get(key: string): Thenable<string | undefined>;
  store(key: string, value: string): Thenable<void>;
  delete(key: string): Thenable<void>;
}

export async function getApiKey(secrets: SecretStorageLike): Promise<string | undefined> {
  return secrets.get(SECRET_KEY);
}

export async function setApiKey(secrets: SecretStorageLike, value: string): Promise<void> {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error('API key vazia.');
  }
  await secrets.store(SECRET_KEY, trimmed);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd poui-vscode && npm run test:unit`
Expected: PASS — all 3 `apiKey` tests green.

- [ ] **Step 5: Commit**

```bash
git add poui-vscode/src/apiKey.ts poui-vscode/src/test/unit/apiKey.test.ts
git commit -m "feat(vscode-ext): add SecretStorage-backed API key module"
```

---

## Task 4: Prompt composer + prompt asset sync (`promptBuilder.ts`, `scripts/sync-prompts.mjs`)

**Files:**
- Create: `poui-vscode/scripts/sync-prompts.mjs` (replaces the Task 1 placeholder)
- Create: `poui-vscode/src/promptBuilder.ts`
- Test: `poui-vscode/src/test/unit/promptBuilder.test.ts`

**Interfaces:**
- Consumes: `EntityNaming` from Task 2 (`naming.ts`).
- Produces: `buildPageListSystemPrompt(assetsDir: string): Promise<string>` and `buildPageListUserPrompt(naming: EntityNaming, moduleName: string, apiPath: string): string` — Task 6 (`generatePageList.ts`) calls both.

- [ ] **Step 1: Replace the placeholder sync script with the real one**

Create `poui-vscode/scripts/sync-prompts.mjs` (overwrite the Task 1 placeholder):

```javascript
import { mkdir, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');
const destDir = path.resolve(here, '..', 'assets', 'agent-prompts');

const sources = [
  ['agents/code-generator-list.md', 'code-generator-list.md'],
  ['skills/poui-code-generation/templates-page-list.md', 'templates-page-list.md'],
  ['skills/poui-code-generation/templates-service.md', 'templates-service.md'],
  ['skills/poui-components/table-components.md', 'table-components.md'],
  ['skills/poui-patterns/po-ui-quirks-table.md', 'po-ui-quirks-table.md'],
  ['skills/poui-patterns/po-ui-quirks-onpush.md', 'po-ui-quirks-onpush.md'],
];

async function main() {
  await mkdir(destDir, { recursive: true });
  for (const [src, dest] of sources) {
    const from = path.join(repoRoot, src);
    const to = path.join(destDir, dest);
    await copyFile(from, to);
    console.log(`synced ${src} -> assets/agent-prompts/${dest}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

Run it once to populate the assets used by later manual/integration steps:
```bash
cd poui-vscode && npm run sync-prompts
```
Expected: 6 lines of `synced ...` output, `poui-vscode/assets/agent-prompts/` now has 6 files (gitignored per Task 1).

- [ ] **Step 2: Write the failing tests**

Create `poui-vscode/src/test/unit/promptBuilder.test.ts`:

```typescript
import * as assert from 'node:assert';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { buildPageListSystemPrompt, buildPageListUserPrompt } from '../../promptBuilder';
import { deriveEntityNaming } from '../../naming';

describe('buildPageListSystemPrompt', () => {
  it('concatenates all 6 reference files with source markers and a preamble', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'poui-prompt-'));
    const fixtures: Record<string, string> = {
      'code-generator-list.md': 'MARKER_AGENT',
      'templates-page-list.md': 'MARKER_TEMPLATE_PAGE_LIST',
      'templates-service.md': 'MARKER_TEMPLATE_SERVICE',
      'table-components.md': 'MARKER_TABLE_COMPONENTS',
      'po-ui-quirks-table.md': 'MARKER_QUIRKS_TABLE',
      'po-ui-quirks-onpush.md': 'MARKER_QUIRKS_ONPUSH',
    };
    for (const [file, content] of Object.entries(fixtures)) {
      await fs.writeFile(path.join(tmpDir, file), content, 'utf8');
    }

    const prompt = await buildPageListSystemPrompt(tmpDir);

    for (const marker of Object.values(fixtures)) {
      assert.ok(prompt.includes(marker), `expected prompt to include ${marker}`);
    }
    assert.ok(
      prompt.toLowerCase().includes('não tente ler novamente'),
      'expected the preamble warning about not re-reading relative paths',
    );
  });

  it('rejects when a reference file is missing', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'poui-prompt-missing-'));
    await assert.rejects(() => buildPageListSystemPrompt(tmpDir));
  });
});

describe('buildPageListUserPrompt', () => {
  it('includes entity, module, endpoint and derived names', () => {
    const naming = deriveEntityNaming('Pedidos');
    const prompt = buildPageListUserPrompt(naming, 'financeiro', '/rest/api/custom/v1/pedidos');

    assert.ok(prompt.includes('Pedidos'));
    assert.ok(prompt.includes('financeiro'));
    assert.ok(prompt.includes('/rest/api/custom/v1/pedidos'));
    assert.ok(prompt.includes('PedidosListComponent'));
    assert.ok(prompt.includes('PedidosService'));
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd poui-vscode && npm run test:unit`
Expected: FAIL — `Cannot find module '../../promptBuilder'`.

- [ ] **Step 4: Implement `promptBuilder.ts`**

Create `poui-vscode/src/promptBuilder.ts`:

```typescript
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { EntityNaming } from './naming';

const PAGE_LIST_PROMPT_FILES = [
  'code-generator-list.md',
  'templates-page-list.md',
  'templates-service.md',
  'table-components.md',
  'po-ui-quirks-table.md',
  'po-ui-quirks-onpush.md',
] as const;

export async function buildPageListSystemPrompt(assetsDir: string): Promise<string> {
  const sections = await Promise.all(
    PAGE_LIST_PROMPT_FILES.map(async (file) => {
      const filePath = path.join(assetsDir, file);
      const content = await fs.readFile(filePath, 'utf8');
      return `<!-- source: ${file} -->\n${content}`;
    }),
  );

  const preamble = [
    'Os arquivos de referência abaixo (agente + templates + quirks PO-UI) já foram',
    'carregados nesta mensagem — não tente ler novamente os caminhos relativos',
    '`skills/...` ou `agents/...` mencionados no texto, eles não existem no',
    'workspace do usuário. Gere os arquivos finais diretamente no workspace aberto.',
  ].join(' ');

  return [preamble, ...sections].join('\n\n---\n\n');
}

export function buildPageListUserPrompt(
  naming: EntityNaming,
  moduleName: string,
  apiPath: string,
): string {
  return [
    `Gere um componente page-list para a entidade "${naming.entityPascal}".`,
    `Módulo: ${moduleName}`,
    `Endpoint REST Protheus: ${apiPath}`,
    `Classe do componente: ${naming.componentClass}`,
    `Seletor: ${naming.selector}`,
    `Service: ${naming.serviceClass} (arquivo ${naming.serviceFileBase}.ts)`,
    `Diretório de destino: src/app/${moduleName}/${naming.entityKebab}-list/`,
  ].join('\n');
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd poui-vscode && npm run test:unit`
Expected: PASS — all `promptBuilder` tests green.

- [ ] **Step 6: Commit**

```bash
git add poui-vscode/scripts/sync-prompts.mjs poui-vscode/src/promptBuilder.ts \
  poui-vscode/src/test/unit/promptBuilder.test.ts
git commit -m "feat(vscode-ext): compose system/user prompts from bundled reference files"
```

---

## Task 5: Agent SDK runtime wrapper (`agentRuntime.ts`)

**Files:**
- Create: `poui-vscode/src/agentRuntime.ts`
- Test: `poui-vscode/src/test/unit/agentRuntime.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks directly (takes plain strings for prompt/cwd/apiKey — Task 6 wires in the real values).
- Produces: `OutputSink` interface (`appendLine(value: string): void` — `vscode.OutputChannel` satisfies it structurally), `GenerateResult` (`{ filesWritten: string[]; succeeded: boolean; errorMessage?: string }`), `runGeneratePageList(options: RunGenerateOptions, sink: OutputSink, loadQuery?): Promise<GenerateResult>` — Task 6 calls this with `sink = outputChannel` and the default `loadQuery`.

- [ ] **Step 1: Write the failing tests**

Create `poui-vscode/src/test/unit/agentRuntime.test.ts`:

```typescript
import * as assert from 'node:assert';
import { runGeneratePageList, OutputSink } from '../../agentRuntime';

class RecordingSink implements OutputSink {
  readonly lines: string[] = [];
  appendLine(value: string): void {
    this.lines.push(value);
  }
}

async function fakeQuery(messages: unknown[]) {
  async function* generator() {
    for (const message of messages) {
      yield message;
    }
  }
  return (_params: unknown) => generator();
}

describe('runGeneratePageList', () => {
  it('streams text and tool_use messages to the sink and collects written files', async () => {
    const sink = new RecordingSink();
    const messages = [
      { type: 'text', text: 'Planejando arquivos...' },
      {
        type: 'tool_use',
        name: 'Write',
        input: { file_path: 'src/app/financeiro/pedidos-list/pedidos-list.component.ts', content: '...' },
      },
      { type: 'tool_result', content: 'ok' },
    ];

    const result = await runGeneratePageList(
      {
        cwd: '/tmp/workspace',
        apiKey: 'sk-ant-fake',
        systemPrompt: 'system',
        userPrompt: 'user',
      },
      sink,
      (() => fakeQuery(messages)) as unknown as Parameters<typeof runGeneratePageList>[2],
    );

    assert.strictEqual(result.succeeded, true);
    assert.deepStrictEqual(result.filesWritten, [
      'src/app/financeiro/pedidos-list/pedidos-list.component.ts',
    ]);
    assert.ok(sink.lines.some((line) => line.includes('Planejando arquivos')));
    assert.ok(sink.lines.some((line) => line.includes('Write')));
  });

  it('returns succeeded: false and records the error when loading the SDK fails', async () => {
    const sink = new RecordingSink();
    const loadQuery = async () => {
      throw new Error('rede indisponível');
    };

    const result = await runGeneratePageList(
      { cwd: '/tmp/workspace', apiKey: 'sk-ant-fake', systemPrompt: 'system', userPrompt: 'user' },
      sink,
      loadQuery as unknown as Parameters<typeof runGeneratePageList>[2],
    );

    assert.strictEqual(result.succeeded, false);
    assert.strictEqual(result.errorMessage, 'rede indisponível');
    assert.ok(sink.lines.some((line) => line.includes('falha ao executar o agente')));
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd poui-vscode && npm run test:unit`
Expected: FAIL — `Cannot find module '../../agentRuntime'`.

- [ ] **Step 3: Implement `agentRuntime.ts`**

Create `poui-vscode/src/agentRuntime.ts`:

```typescript
export interface OutputSink {
  appendLine(value: string): void;
}

export interface GenerateResult {
  filesWritten: string[];
  succeeded: boolean;
  errorMessage?: string;
}

export interface RunGenerateOptions {
  cwd: string;
  apiKey: string;
  systemPrompt: string;
  userPrompt: string;
  model?: string;
  effort?: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
}

type QueryFn = typeof import('@anthropic-ai/claude-agent-sdk').query;

async function defaultLoadQuery(): Promise<QueryFn> {
  const sdk = await import('@anthropic-ai/claude-agent-sdk');
  return sdk.query;
}

export async function runGeneratePageList(
  options: RunGenerateOptions,
  sink: OutputSink,
  loadQuery: () => Promise<QueryFn> = defaultLoadQuery,
): Promise<GenerateResult> {
  const filesWritten: string[] = [];

  try {
    const query = await loadQuery();
    const stream = query({
      prompt: options.userPrompt,
      options: {
        cwd: options.cwd,
        systemPrompt: options.systemPrompt,
        model: options.model ?? 'claude-opus-5',
        env: { ...process.env, ANTHROPIC_API_KEY: options.apiKey },
        permissionMode: 'bypassPermissions',
        allowDangerouslySkipPermissions: true,
      },
    });

    for await (const message of stream as AsyncIterable<Record<string, unknown>>) {
      if (message.type === 'text' && typeof message.text === 'string') {
        sink.appendLine(message.text);
      } else if (message.type === 'tool_use') {
        sink.appendLine(`→ ${message.name as string} ${JSON.stringify(message.input)}`);
        const input = message.input as Record<string, unknown> | undefined;
        const toolName = message.name as string;
        if ((toolName === 'Write' || toolName === 'Edit') && typeof input?.file_path === 'string') {
          filesWritten.push(input.file_path);
        }
      } else if (message.type === 'tool_result') {
        sink.appendLine('✓ resultado da ferramenta recebido');
      }
    }

    return { filesWritten, succeeded: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    sink.appendLine(`✗ falha ao executar o agente: ${errorMessage}`);
    return { filesWritten, succeeded: false, errorMessage };
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd poui-vscode && npm run test:unit`
Expected: PASS — both `runGeneratePageList` tests green.

- [ ] **Step 5: Commit**

```bash
git add poui-vscode/src/agentRuntime.ts poui-vscode/src/test/unit/agentRuntime.test.ts
git commit -m "feat(vscode-ext): wrap Claude Agent SDK query() with streaming sink"
```

---

## Task 6: Wire the command end-to-end (`generatePageList.ts`, `extension.ts`)

**Files:**
- Create: `poui-vscode/src/generatePageList.ts`
- Modify: `poui-vscode/src/extension.ts`
- Modify: `poui-vscode/src/test/suite/extension.test.ts`

**Interfaces:**
- Consumes: `deriveEntityNaming`, `isValidModuleName` (Task 2); `getApiKey`, `setApiKey` (Task 3); `buildPageListSystemPrompt`, `buildPageListUserPrompt` (Task 4); `runGeneratePageList` (Task 5).
- Produces: `registerGeneratePageListCommand(context: vscode.ExtensionContext, outputChannel: vscode.OutputChannel): vscode.Disposable`, registered as the `poui.generate.pageList` command. `activate()` also registers `poui.setApiKey`.

- [ ] **Step 1: Extend the integration test first**

Modify `poui-vscode/src/test/suite/extension.test.ts` to assert both commands are registered:

```typescript
import * as assert from 'node:assert';
import * as vscode from 'vscode';

describe('extension packaging', () => {
  it('is present in the extension host', () => {
    const ext = vscode.extensions.getExtension('andre-costa.poui-vscode');
    assert.ok(ext, 'expected the poui-vscode extension to be discoverable');
  });

  it('registers both poui commands after activation', async () => {
    const ext = vscode.extensions.getExtension('andre-costa.poui-vscode');
    await ext?.activate();
    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes('poui.generate.pageList'));
    assert.ok(commands.includes('poui.setApiKey'));
  });
});
```

- [ ] **Step 2: Run the integration test to verify it fails**

Run: `cd poui-vscode && npm test`
Expected: FAIL — `poui.generate.pageList` / `poui.setApiKey` are declared in `package.json` but never registered by `activate()` yet, so `getCommands(true)` may include the palette entry but invoking/activation-based checks fail, or the second assertion fails outright. (If your VS Code version already reports contributed-but-unregistered commands as present, this step's failure will instead surface in Task 7's manual QA when the command errors out with "command not found" on invocation — note that in the QA checklist and proceed; the important verification is Step 4 below passing once `activate()` is wired.)

- [ ] **Step 3: Implement `generatePageList.ts` and wire it into `extension.ts`**

Create `poui-vscode/src/generatePageList.ts`:

```typescript
import * as vscode from 'vscode';
import * as path from 'node:path';
import { deriveEntityNaming, isValidModuleName } from './naming';
import { buildPageListSystemPrompt, buildPageListUserPrompt } from './promptBuilder';
import { getApiKey } from './apiKey';
import { runGeneratePageList } from './agentRuntime';

export function registerGeneratePageListCommand(
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel,
): vscode.Disposable {
  return vscode.commands.registerCommand('poui.generate.pageList', async () => {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      void vscode.window.showErrorMessage(
        'PO-UI: abra uma pasta de projeto Angular antes de gerar um componente.',
      );
      return;
    }

    const apiKey = await getApiKey(context.secrets);
    if (!apiKey) {
      const choice = await vscode.window.showErrorMessage(
        'PO-UI: configure a API key da Anthropic antes de gerar código.',
        'Configurar API Key',
      );
      if (choice === 'Configurar API Key') {
        await vscode.commands.executeCommand('poui.setApiKey');
      }
      return;
    }

    const rawName = await vscode.window.showInputBox({
      prompt: 'Nome da entidade (ex: Pedidos)',
      validateInput: (value) => (value.trim() ? undefined : 'Informe um nome.'),
    });
    if (!rawName) {
      return;
    }

    const moduleName = await vscode.window.showInputBox({
      prompt: 'Módulo Angular de destino (ex: financeiro)',
      validateInput: (value) =>
        isValidModuleName(value) ? undefined : 'Use minúsculas, números e hífen, começando por letra.',
    });
    if (!moduleName) {
      return;
    }

    const naming = deriveEntityNaming(rawName);
    if (naming.wasAutoCorrected) {
      void vscode.window.showWarningMessage(
        `PO-UI: nome corrigido para PascalCase: ${naming.entityPascal}.`,
      );
    }

    const apiPathInput = await vscode.window.showInputBox({
      prompt: 'Endpoint REST Protheus (Enter para usar o padrão)',
      value: naming.defaultApiPath,
    });
    if (apiPathInput === undefined) {
      return;
    }
    const resolvedApiPath = apiPathInput.trim() || naming.defaultApiPath;

    outputChannel.clear();
    outputChannel.show(true);
    outputChannel.appendLine(`Gerando page-list para ${naming.entityPascal} em ${moduleName}...`);

    const assetsDir = path.join(context.extensionUri.fsPath, 'assets', 'agent-prompts');
    const systemPrompt = await buildPageListSystemPrompt(assetsDir);
    const userPrompt = buildPageListUserPrompt(naming, moduleName, resolvedApiPath);

    const result = await runGeneratePageList(
      {
        cwd: workspaceFolder.uri.fsPath,
        apiKey,
        systemPrompt,
        userPrompt,
        model: vscode.workspace.getConfiguration('poui').get<string>('model'),
      },
      outputChannel,
    );

    if (!result.succeeded) {
      void vscode.window.showErrorMessage(
        `PO-UI: falha ao gerar componente — ${result.errorMessage ?? 'erro desconhecido'}.`,
      );
      return;
    }

    if (result.filesWritten.length === 0) {
      void vscode.window.showWarningMessage('PO-UI: o agente terminou sem gerar arquivos.');
      return;
    }

    const openChoice = await vscode.window.showInformationMessage(
      `PO-UI: ${result.filesWritten.length} arquivo(s) gerado(s).`,
      'Abrir arquivo gerado',
    );
    if (openChoice === 'Abrir arquivo gerado') {
      const firstFile = path.isAbsolute(result.filesWritten[0])
        ? result.filesWritten[0]
        : path.join(workspaceFolder.uri.fsPath, result.filesWritten[0]);
      const doc = await vscode.workspace.openTextDocument(firstFile);
      await vscode.window.showTextDocument(doc);
    }
  });
}
```

Replace `poui-vscode/src/extension.ts` with:

```typescript
import * as vscode from 'vscode';
import { setApiKey } from './apiKey';
import { registerGeneratePageListCommand } from './generatePageList';

export function activate(context: vscode.ExtensionContext): void {
  const outputChannel = vscode.window.createOutputChannel('PO-UI');
  context.subscriptions.push(outputChannel);

  context.subscriptions.push(
    vscode.commands.registerCommand('poui.setApiKey', async () => {
      const value = await vscode.window.showInputBox({
        prompt: 'API key da Anthropic (ANTHROPIC_API_KEY)',
        password: true,
        ignoreFocusOut: true,
      });
      if (!value) {
        return;
      }
      try {
        await setApiKey(context.secrets, value);
        void vscode.window.showInformationMessage('PO-UI: API key configurada.');
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        void vscode.window.showErrorMessage(`PO-UI: ${message}`);
      }
    }),
  );

  context.subscriptions.push(registerGeneratePageListCommand(context, outputChannel));
}

export function deactivate(): void {}
```

- [ ] **Step 4: Run the full test suite to verify it passes**

Run: `cd poui-vscode && npm run test:unit && npm test`
Expected: PASS — all unit tests (naming, apiKey, promptBuilder, agentRuntime) and both integration tests (`is present`, `registers both poui commands after activation`) green.

- [ ] **Step 5: Commit**

```bash
git add poui-vscode/src/generatePageList.ts poui-vscode/src/extension.ts \
  poui-vscode/src/test/suite/extension.test.ts
git commit -m "feat(vscode-ext): wire PO-UI: Gerar Page List end to end"
```

---

## Task 7: Manual QA against `examples/modulo-compras` + extension README

**Files:**
- Create: `poui-vscode/README.md`

**Interfaces:**
- Consumes: the fully wired extension from Task 6. No new production interfaces — this task is verification + developer docs.

- [ ] **Step 1: Write the extension README**

Create `poui-vscode/README.md`:

```markdown
# PO-UI Specialist — extensão VS Code (Fase 0)

Prova de conceito: gera um componente Angular PO-UI `page-list` diretamente
do VS Code, sem depender do Claude Code CLI. Usa o Claude Agent SDK
embutido, autenticado com sua própria API key da Anthropic.

## Rodando em desenvolvimento

1. `cd poui-vscode && npm install`
2. Pressione **F5** no VS Code (roda a task `npm: compile` e abre um
   "Extension Development Host")
3. No host de desenvolvimento, rode `PO-UI: Configurar API Key` na paleta
   (`Ctrl+Shift+P`) e informe sua `ANTHROPIC_API_KEY`
4. Abra uma pasta de projeto Angular (ex: `examples/modulo-compras` deste
   repo) como workspace do host de desenvolvimento
5. Rode `PO-UI: Gerar Page List` na paleta, informe o nome da entidade e o
   módulo de destino

## Testes

- `npm run test:unit` — testes rápidos (Mocha, sem Electron)
- `npm test` — testes de integração via `@vscode/test-electron` (baixa um
  binário do VS Code na primeira execução — precisa de internet)

## Escopo desta fase

Só o comando `PO-UI: Gerar Page List` (tipo `page-list`) está implementado.
Os demais tipos de geração e os outros comandos do plugin `poui-specialist`
ficam para fases futuras — ver
`docs/superpowers/specs/2026-08-21-vscode-extension-phase0-design.md`.
```

- [ ] **Step 2: Manual QA checklist — run and record the result of each scenario**

With the Extension Development Host running (F5) and `examples/modulo-compras` (module `compras`) open as the workspace:

1. **Sem workspace aberto**: close the workspace folder, run `PO-UI: Gerar Page List` → expect the error "abra uma pasta de projeto Angular antes de gerar um componente" and no further prompts.
2. **Sem API key configurada**: with a workspace open but before running `PO-UI: Configurar API Key`, run `PO-UI: Gerar Page List` → expect the error with the "Configurar API Key" button, clicking it opens the key input box.
3. **Nome em minúsculas**: configure the API key, run the command again with entity name `fornecedores` → expect the warning "nome corrigido para PascalCase: Fornecedores" and generation to continue.
4. **Módulo inválido**: type `Compras Financeiro` (contains a space/uppercase) in the module prompt → expect inline validation message blocking submission until corrected to `compras`.
5. **Caminho feliz**: entity `Fornecedores`, module `compras`, accept the default endpoint → expect streaming output in the "PO-UI" output channel, a final notification with the file count, and clicking "Abrir arquivo gerado" opens the generated `.component.ts`.
6. **Build real**: from a terminal, `cd examples/modulo-compras && npm run build` (or `ng build`) → expect it to compile with the newly generated files included, no TypeScript errors.

Record the outcome of each of the 6 scenarios (pass/fail + notes) in the PR description or commit message body when this task is closed out.

- [ ] **Step 3: Commit**

```bash
git add poui-vscode/README.md
git commit -m "docs(vscode-ext): add Fase 0 README and manual QA checklist"
```
