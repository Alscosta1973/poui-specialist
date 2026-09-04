# Motor de IA plugável (poui-vscode) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer `poui-vscode` suportar Claude Code CLI, Codex CLI e Gemini CLI por trás de um único setting (`poui.aiEngine`), sem duplicar comandos nem quebrar o comportamento atual (default `claude` preserva tudo como está hoje).

**Architecture:** Extrai a lógica hoje presa em `agentRuntime.ts` (montagem de argumentos + parsing de `stream-json` do Claude) para um `EngineAdapter` por motor (`claudeAdapter.ts`/`codexAdapter.ts`/`geminiAdapter.ts`), selecionado por um registro (`engineRegistry.ts`). `agentRuntime.ts` vira orquestração genérica (`runAgent`) que consome eventos normalizados (`NormalizedEvent[]`) devolvidos por `adapter.parseLine(line)`, mantendo o mesmo laço `readline`/sink/`filesWritten`/`isAuthError` que já existe. Os 8 comandos que hoje chamam `runClaudeAgent`/`checkClaudeCliAvailable` diretamente passam a ler `poui.aiEngine` e repassar o `engineId`.

**Tech Stack:** TypeScript, `node:child_process`/`node:readline` (sem dependências novas), Mocha + `ts-node` para testes unitários (`npm run test:unit`), `tsc` para compilação (`npm run compile`).

**Spec:** `docs/superpowers/specs/2026-09-04-vscode-extension-multi-engine-design.md` (seções "Decisão de arquitetura", "Componentes novos", "Configuração", "Tratamento de erro e capacidade" — a seção "Documentação in-app" fica para um plano separado).

## Global Constraints

- Comportamento do motor `claude` **não pode mudar** — é o default, preserva 100% do que já existe hoje (mesmos argumentos de CLI, mesmo parsing, mesmos testes passando com as mesmas asserções).
- Nenhuma dependência npm nova — tudo via `node:child_process`/`node:readline`, igual ao padrão já usado.
- Seguir o estilo de arquivo plano já usado no projeto: sem subpastas novas em `src/` (tudo direto em `src/`, mesmo padrão de `agentRuntime.ts`/`buildFixLoop.ts`/`cliCheck.ts`); testes em `src/test/unit/<nome>.test.ts` (sem subpastas), mesmo padrão dos ~30 arquivos de teste existentes.
- Todo `SpawnFn`/`RunVersionCheck` deve continuar injetável para teste (mesmo padrão de dependency injection já usado em `agentRuntime.ts`/`cliCheck.ts`) — nunca `spawn`/`execFile` direto sem uma função injetável por trás.
- Author dos commits: Andre Costa (`git config` já configurado no ambiente — não alterar).
- Rodar `npm run compile` e `npm run test:unit` depois de cada task, com saída verde, antes de commitar.

---

## Task 1: `engineTypes.ts` + `claudeAdapter.ts` (extração comportamento-preservando)

**Files:**
- Create: `poui-vscode/src/engineTypes.ts`
- Create: `poui-vscode/src/claudeAdapter.ts`
- Create: `poui-vscode/src/test/unit/claudeAdapter.test.ts`
- Modify: `poui-vscode/src/agentRuntime.ts:1-63` (remove `RunAgentOptions`/`OutputSink`/`GenerateResult`/`SpawnFn`/`SpawnedProcess`/`ALLOWED_TOOLS`/`buildArgs`/`describeResultFailure`, re-exporta os tipos de `engineTypes.ts` — o resto do arquivo muda na Task 6, não nesta)

**Interfaces:**
- Produces (usado pelas Tasks 2-10):
  ```ts
  // engineTypes.ts
  export type EngineId = 'claude' | 'codex' | 'gemini';

  export type NormalizedEvent =
    | { kind: 'text'; text: string }
    | { kind: 'tool_use'; name: string; input: unknown }
    | { kind: 'auth_error' }
    | { kind: 'result'; success: true }
    | { kind: 'result'; success: false; errorMessage: string };

  export interface RunAgentOptions {
    cwd: string;
    systemPrompt: string;
    userPrompt: string;
    model?: string;
    effort?: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
    tools?: string;
    mcpConfig?: string;
    allowedTools?: string;
    addDir?: string;
  }

  export interface OutputSink {
    appendLine(value: string): void;
  }

  export interface GenerateResult {
    filesWritten: string[];
    succeeded: boolean;
    errorMessage?: string;
    isAuthError?: boolean;
  }

  export interface SpawnedProcess {
    stdout: NodeJS.ReadableStream;
    stderr: NodeJS.ReadableStream;
    on(event: 'error', listener: (err: Error) => void): unknown;
    on(event: 'close', listener: (code: number | null) => void): unknown;
  }

  export type SpawnFn = (
    command: string,
    args: string[],
    options: { cwd: string; env: NodeJS.ProcessEnv },
  ) => SpawnedProcess;

  export interface EngineAdapter {
    id: EngineId;
    /** Nome do binário — usado tanto para checagem de disponibilidade
     * (`<binaryName> --version`) quanto como `command` de spawn. */
    binaryName: string;
    buildCommand(
      options: RunAgentOptions,
      systemPromptFile: string,
      mcpConfigFile?: string,
    ): { command: string; args: string[] };
    /** Função pura — uma linha de stdout vira 0+ eventos normalizados. Nunca
     * lança: JSON inválido ou tipo de mensagem desconhecido devolve []. */
    parseLine(line: string): NormalizedEvent[];
  }
  ```
- Consumes: nada (arquivo raiz do resto do subsistema).

### Passo a passo

- [ ] **Step 1: Criar `engineTypes.ts` com a interface acima**

Escreva exatamente o bloco `Produces` acima em `poui-vscode/src/engineTypes.ts` (sem lógica, só tipos — nenhum teste dedicado, é um arquivo de tipos puro).

- [ ] **Step 2: Escrever os testes de `claudeAdapter.parseLine` (falhando)**

Crie `poui-vscode/src/test/unit/claudeAdapter.test.ts`:

```ts
import * as assert from 'node:assert';
import { claudeAdapter } from '../../claudeAdapter';

function line(message: unknown): string {
  return JSON.stringify(message);
}

function assistantMessage(content: unknown[], error?: string) {
  return { type: 'assistant', error, message: { role: 'assistant', content } };
}

describe('claudeAdapter.parseLine', () => {
  it('emits text and tool_use events from an assistant message', () => {
    const events = claudeAdapter.parseLine(
      line(
        assistantMessage([
          { type: 'text', text: 'Planejando arquivos...' },
          { type: 'tool_use', name: 'Write', input: { file_path: 'src/app/a/a.component.ts' } },
        ]),
      ),
    );
    assert.deepStrictEqual(events, [
      { kind: 'text', text: 'Planejando arquivos...' },
      { kind: 'tool_use', name: 'Write', input: { file_path: 'src/app/a/a.component.ts' } },
    ]);
  });

  it('emits a successful result event', () => {
    const events = claudeAdapter.parseLine(
      line({ type: 'result', subtype: 'success', is_error: false, result: 'done' }),
    );
    assert.deepStrictEqual(events, [{ kind: 'result', success: true }]);
  });

  it('emits a failed result event joining the error list', () => {
    const events = claudeAdapter.parseLine(
      line({ type: 'result', subtype: 'error', is_error: true, errors: ['tool execution failed', 'aborted'] }),
    );
    assert.deepStrictEqual(events, [
      { kind: 'result', success: false, errorMessage: 'tool execution failed; aborted' },
    ]);
  });

  it('falls back to the result subtype when the error list is empty', () => {
    const events = claudeAdapter.parseLine(
      line({ type: 'result', subtype: 'error_max_turns', is_error: true, errors: [] }),
    );
    assert.deepStrictEqual(events, [{ kind: 'result', success: false, errorMessage: 'error_max_turns' }]);
  });

  it('falls back to a generic message when both result and errors are absent', () => {
    const events = claudeAdapter.parseLine(line({ type: 'result', subtype: 'error', is_error: true }));
    assert.deepStrictEqual(events, [
      { kind: 'result', success: false, errorMessage: 'o agente terminou com erro.' },
    ]);
  });

  it('emits auth_error when an assistant message reports authentication_failed', () => {
    const events = claudeAdapter.parseLine(line(assistantMessage([], 'authentication_failed')));
    assert.deepStrictEqual(events, [{ kind: 'auth_error' }]);
  });

  it('emits auth_error when an assistant message reports oauth_org_not_allowed', () => {
    const events = claudeAdapter.parseLine(line(assistantMessage([], 'oauth_org_not_allowed')));
    assert.deepStrictEqual(events, [{ kind: 'auth_error' }]);
  });

  it('emits auth_error before the result event when api_error_status is 401', () => {
    const events = claudeAdapter.parseLine(
      line({
        type: 'result',
        subtype: 'success',
        is_error: true,
        result: 'invalid x-api-key',
        api_error_status: 401,
      }),
    );
    assert.deepStrictEqual(events, [
      { kind: 'auth_error' },
      { kind: 'result', success: false, errorMessage: 'invalid x-api-key' },
    ]);
  });

  it('emits auth_error before the result event when api_error_status is 403', () => {
    const events = claudeAdapter.parseLine(
      line({ type: 'result', subtype: 'error', is_error: true, errors: ['forbidden'], api_error_status: 403 }),
    );
    assert.deepStrictEqual(events[0], { kind: 'auth_error' });
  });

  it('returns an empty array for unparseable JSON', () => {
    assert.deepStrictEqual(claudeAdapter.parseLine('not json'), []);
  });

  it('returns an empty array for message types other than assistant/result', () => {
    assert.deepStrictEqual(claudeAdapter.parseLine(line({ type: 'system', subtype: 'init' })), []);
  });

  it('exposes the claude id and binary name', () => {
    assert.strictEqual(claudeAdapter.id, 'claude');
    assert.strictEqual(claudeAdapter.binaryName, 'claude');
  });
});

describe('claudeAdapter.buildCommand', () => {
  it('builds the same args the CLI has always received', () => {
    const { command, args } = claudeAdapter.buildCommand(
      { cwd: '/tmp/workspace', systemPrompt: 'sys', userPrompt: 'gera um componente' },
      '/tmp/system-prompt.txt',
    );
    assert.strictEqual(command, 'claude');
    assert.deepStrictEqual(args, [
      '-p',
      'gera um componente',
      '--append-system-prompt-file',
      '/tmp/system-prompt.txt',
      '--output-format',
      'stream-json',
      '--verbose',
      '--tools',
      'Read,Write,Edit,Glob,Grep',
      '--permission-mode',
      'acceptEdits',
      '--setting-sources',
      '',
    ]);
  });

  it('adds --add-dir, --model, --effort, --mcp-config and --allowedTools when provided', () => {
    const { args } = claudeAdapter.buildCommand(
      {
        cwd: '/tmp/workspace',
        systemPrompt: 'sys',
        userPrompt: 'u',
        tools: 'Read,Glob,Grep',
        addDir: '/tmp/advpl',
        model: 'claude-opus-5',
        effort: 'high',
        allowedTools: 'mcp__playwright__browser_navigate',
      },
      '/tmp/system-prompt.txt',
      '/tmp/mcp-config.json',
    );
    assert.deepStrictEqual(args, [
      '-p',
      'u',
      '--append-system-prompt-file',
      '/tmp/system-prompt.txt',
      '--output-format',
      'stream-json',
      '--verbose',
      '--tools',
      'Read,Glob,Grep',
      '--permission-mode',
      'acceptEdits',
      '--setting-sources',
      '',
      '--add-dir',
      '/tmp/advpl',
      '--model',
      'claude-opus-5',
      '--effort',
      'high',
      '--mcp-config',
      '/tmp/mcp-config.json',
      '--strict-mcp-config',
      '--allowedTools',
      'mcp__playwright__browser_navigate',
    ]);
  });
});
```

- [ ] **Step 3: Rodar os testes e confirmar que falham por módulo ausente**

Run: `cd poui-vscode && npx mocha --require ts-node/register --timeout 15000 "src/test/unit/claudeAdapter.test.ts"`
Expected: FAIL — `Cannot find module '../../claudeAdapter'`.

- [ ] **Step 4: Implementar `claudeAdapter.ts`**

```ts
import { EngineAdapter, NormalizedEvent, RunAgentOptions } from './engineTypes';

const ALLOWED_TOOLS = 'Read,Write,Edit,Glob,Grep';

function buildCommand(
  options: RunAgentOptions,
  systemPromptFile: string,
  mcpConfigFile?: string,
): { command: string; args: string[] } {
  const args = [
    '-p',
    options.userPrompt,
    '--append-system-prompt-file',
    systemPromptFile,
    '--output-format',
    'stream-json',
    '--verbose',
    '--tools',
    options.tools ?? ALLOWED_TOOLS,
    '--permission-mode',
    'acceptEdits',
    '--setting-sources',
    '',
  ];
  if (options.addDir) {
    args.push('--add-dir', options.addDir);
  }
  if (options.model) {
    args.push('--model', options.model);
  }
  if (options.effort) {
    args.push('--effort', options.effort);
  }
  if (mcpConfigFile) {
    args.push('--mcp-config', mcpConfigFile, '--strict-mcp-config');
  }
  if (options.allowedTools) {
    args.push('--allowedTools', options.allowedTools);
  }
  return { command: 'claude', args };
}

function describeResultFailure(message: { subtype: string; result?: string; errors?: string[] }): string {
  if (message.subtype === 'success') {
    return message.result || 'o agente terminou com erro.';
  }
  return message.errors && message.errors.length > 0 ? message.errors.join('; ') : message.subtype;
}

function parseLine(line: string): NormalizedEvent[] {
  let message: Record<string, unknown>;
  try {
    message = JSON.parse(line);
  } catch {
    return [];
  }

  if (message.type === 'assistant') {
    const assistantMessage = message as {
      error?: string;
      message: { content: Array<{ type: string; text?: string; name?: string; input?: unknown }> };
    };
    const events: NormalizedEvent[] = [];
    if (assistantMessage.error === 'authentication_failed' || assistantMessage.error === 'oauth_org_not_allowed') {
      events.push({ kind: 'auth_error' });
    }
    for (const block of assistantMessage.message.content) {
      if (block.type === 'text' && typeof block.text === 'string') {
        events.push({ kind: 'text', text: block.text });
      } else if (block.type === 'tool_use' && typeof block.name === 'string') {
        events.push({ kind: 'tool_use', name: block.name, input: block.input });
      }
    }
    return events;
  }

  if (message.type === 'result') {
    const resultMessage = message as {
      subtype: string;
      is_error: boolean;
      result?: string;
      errors?: string[];
      api_error_status?: number | null;
    };
    const events: NormalizedEvent[] = [];
    if (resultMessage.api_error_status === 401 || resultMessage.api_error_status === 403) {
      events.push({ kind: 'auth_error' });
    }
    if (resultMessage.is_error) {
      events.push({ kind: 'result', success: false, errorMessage: describeResultFailure(resultMessage) });
    } else {
      events.push({ kind: 'result', success: true });
    }
    return events;
  }

  return [];
}

export const claudeAdapter: EngineAdapter = {
  id: 'claude',
  binaryName: 'claude',
  buildCommand,
  parseLine,
};
```

- [ ] **Step 5: Rodar os testes e confirmar que passam**

Run: `cd poui-vscode && npx mocha --require ts-node/register --timeout 15000 "src/test/unit/claudeAdapter.test.ts"`
Expected: PASS — 14 testes verdes.

- [ ] **Step 6: Atualizar `agentRuntime.ts` para importar os tipos de `engineTypes.ts`**

Remova de `agentRuntime.ts` as declarações de `RunAgentOptions`/`OutputSink`/`GenerateResult`/`SpawnedProcess`/`SpawnFn`/`ALLOWED_TOOLS`/`buildArgs`/`describeResultFailure` (linhas 8-133 do arquivo atual) e substitua o topo do arquivo por:

```ts
import { spawn } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import * as readline from 'node:readline';
import { randomUUID } from 'node:crypto';
import { EngineAdapter, GenerateResult, OutputSink, RunAgentOptions, SpawnedProcess, SpawnFn } from './engineTypes';

export type { GenerateResult, OutputSink, RunAgentOptions, SpawnedProcess, SpawnFn } from './engineTypes';
```

O `export type { ... }` preserva `import { OutputSink } from './agentRuntime'` funcionando sem alterar nenhum dos 8 arquivos que já importam esses tipos de lá — só a Task 6 vai mudar o resto do corpo de `agentRuntime.ts` (a função em si). Deixe `runClaudeAgent` como está por enquanto (ainda vai ser usada — a troca pra `runAgent` acontece na Task 6).

- [ ] **Step 7: Compilar e confirmar que nada quebrou**

Run: `cd poui-vscode && npm run compile`
Expected: sem erros de TypeScript.

- [ ] **Step 8: Rodar a suíte inteira e confirmar 100% verde**

Run: `cd poui-vscode && npm run test:unit`
Expected: todos os testes (incluindo os 259+14 novos) passam.

- [ ] **Step 9: Commit**

```bash
git add poui-vscode/src/engineTypes.ts poui-vscode/src/claudeAdapter.ts poui-vscode/src/test/unit/claudeAdapter.test.ts poui-vscode/src/agentRuntime.ts
git commit -m "refactor(vscode-ext): extract claudeAdapter from agentRuntime

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01NxpSQ4JM3ikEXc47MDQ4mG"
```

---

## Task 2: `codexAdapter.ts`

**Files:**
- Create: `poui-vscode/src/codexAdapter.ts`
- Create: `poui-vscode/src/test/unit/codexAdapter.test.ts`

**Interfaces:**
- Consumes: `EngineAdapter`, `NormalizedEvent`, `RunAgentOptions` de `./engineTypes` (Task 1).
- Produces: `codexAdapter: EngineAdapter` (`id: 'codex'`) — consumido pelo `engineRegistry.ts` na Task 4.

**Nota de risco (do spec, seção "Riscos e pontos de validação pendentes", itens 1 e 2)**: os flags confirmados por documentação oficial nesta sessão são só `codex exec --json <prompt>`. Model/effort/tools/addDir/mcp **não têm flag documentado publicamente confirmado** — o mapeamento abaixo é a melhor hipótese com base no padrão do Codex CLI (`--sandbox`/`--full-access` para auto-aprovar, citado na pesquisa da sessão anterior), marcada com comentário `// TODO(codex)` no código. **Antes de considerar este adapter pronto para uso real, rode `codex exec --help` numa máquina com Codex instalado e ajuste os flags abaixo caso divirjam** — isso é esperado, não uma falha desta task.

### Passo a passo

- [ ] **Step 1: Escrever os testes de `codexAdapter.parseLine` (falhando)**

Crie `poui-vscode/src/test/unit/codexAdapter.test.ts`:

```ts
import * as assert from 'node:assert';
import { codexAdapter } from '../../codexAdapter';

function line(event: unknown): string {
  return JSON.stringify(event);
}

describe('codexAdapter.parseLine', () => {
  it('emits nothing for thread.started (session bookkeeping only)', () => {
    assert.deepStrictEqual(codexAdapter.parseLine(line({ type: 'thread.started', thread_id: 't1' })), []);
  });

  it('emits text for an item.completed agent_message', () => {
    const events = codexAdapter.parseLine(
      line({
        type: 'item.completed',
        item: { type: 'agent_message', text: 'Planejando arquivos...' },
      }),
    );
    assert.deepStrictEqual(events, [{ kind: 'text', text: 'Planejando arquivos...' }]);
  });

  it('emits tool_use for an item.completed file_change/command_execution item', () => {
    const events = codexAdapter.parseLine(
      line({
        type: 'item.completed',
        item: { type: 'file_change', name: 'Write', path: 'src/app/a/a.component.ts' },
      }),
    );
    assert.deepStrictEqual(events, [
      { kind: 'tool_use', name: 'Write', input: { file_path: 'src/app/a/a.component.ts' } },
    ]);
  });

  it('emits a successful result on turn.completed', () => {
    const events = codexAdapter.parseLine(line({ type: 'turn.completed', usage: {} }));
    assert.deepStrictEqual(events, [{ kind: 'result', success: true }]);
  });

  it('emits a failed result with the error message on turn.failed', () => {
    const events = codexAdapter.parseLine(
      line({ type: 'turn.failed', error: { message: 'sandbox denied write outside workspace' } }),
    );
    assert.deepStrictEqual(events, [
      { kind: 'result', success: false, errorMessage: 'sandbox denied write outside workspace' },
    ]);
  });

  it('emits auth_error when the failure message mentions authentication', () => {
    const events = codexAdapter.parseLine(
      line({ type: 'turn.failed', error: { message: 'authentication required: run codex login' } }),
    );
    assert.deepStrictEqual(events, [
      { kind: 'auth_error' },
      { kind: 'result', success: false, errorMessage: 'authentication required: run codex login' },
    ]);
  });

  it('returns an empty array for unparseable JSON', () => {
    assert.deepStrictEqual(codexAdapter.parseLine('not json'), []);
  });

  it('exposes the codex id and binary name', () => {
    assert.strictEqual(codexAdapter.id, 'codex');
    assert.strictEqual(codexAdapter.binaryName, 'codex');
  });
});

describe('codexAdapter.buildCommand', () => {
  it('builds exec --json with the prompt and confirmed sandbox auto-approve flag', () => {
    const { command, args } = codexAdapter.buildCommand(
      { cwd: '/tmp/workspace', systemPrompt: 'sys', userPrompt: 'gera um componente' },
      '/tmp/system-prompt.txt',
    );
    assert.strictEqual(command, 'codex');
    assert.deepStrictEqual(args, [
      'exec',
      '--json',
      '--sandbox',
      'workspace-write',
      '--append-system-prompt-file',
      '/tmp/system-prompt.txt',
      'gera um componente',
    ]);
  });

  it('adds --add-dir when provided', () => {
    const { args } = codexAdapter.buildCommand(
      { cwd: '/tmp/workspace', systemPrompt: 'sys', userPrompt: 'u', addDir: '/tmp/advpl' },
      '/tmp/system-prompt.txt',
    );
    assert.ok(args.includes('--add-dir'));
    assert.ok(args.includes('/tmp/advpl'));
  });
});
```

- [ ] **Step 2: Rodar e confirmar falha**

Run: `cd poui-vscode && npx mocha --require ts-node/register --timeout 15000 "src/test/unit/codexAdapter.test.ts"`
Expected: FAIL — módulo ausente.

- [ ] **Step 3: Implementar `codexAdapter.ts`**

```ts
import { EngineAdapter, NormalizedEvent, RunAgentOptions } from './engineTypes';

// TODO(codex): flags de --model/--effort/--tools/--mcp-config não confirmados
// publicamente (ver spec 2026-09-04-vscode-extension-multi-engine-design.md,
// seção "Riscos", itens 1-2). Validar com `codex exec --help` numa máquina
// real antes de considerar este adapter pronto para uso — só --json,
// --sandbox e --append-system-prompt-file/--add-dir estão confirmados.
function buildCommand(
  options: RunAgentOptions,
  systemPromptFile: string,
  _mcpConfigFile?: string,
): { command: string; args: string[] } {
  const args = ['exec', '--json', '--sandbox', 'workspace-write', '--append-system-prompt-file', systemPromptFile];
  if (options.addDir) {
    args.push('--add-dir', options.addDir);
  }
  args.push(options.userPrompt);
  return { command: 'codex', args };
}

function parseLine(line: string): NormalizedEvent[] {
  let message: Record<string, unknown>;
  try {
    message = JSON.parse(line);
  } catch {
    return [];
  }

  if (message.type === 'item.completed') {
    const item = (message as { item?: Record<string, unknown> }).item;
    if (item?.type === 'agent_message' && typeof item.text === 'string') {
      return [{ kind: 'text', text: item.text }];
    }
    if (
      (item?.type === 'file_change' || item?.type === 'command_execution') &&
      typeof item.name === 'string' &&
      typeof item.path === 'string'
    ) {
      return [{ kind: 'tool_use', name: item.name, input: { file_path: item.path } }];
    }
    return [];
  }

  if (message.type === 'turn.completed') {
    return [{ kind: 'result', success: true }];
  }

  if (message.type === 'turn.failed') {
    const error = (message as { error?: { message?: string } }).error;
    const errorMessage = error?.message ?? 'o agente terminou com erro.';
    const events: NormalizedEvent[] = [];
    if (/authentication|unauthorized|401|403|login/i.test(errorMessage)) {
      events.push({ kind: 'auth_error' });
    }
    events.push({ kind: 'result', success: false, errorMessage });
    return events;
  }

  return [];
}

export const codexAdapter: EngineAdapter = {
  id: 'codex',
  binaryName: 'codex',
  buildCommand,
  parseLine,
};
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `cd poui-vscode && npx mocha --require ts-node/register --timeout 15000 "src/test/unit/codexAdapter.test.ts"`
Expected: PASS — 10 testes verdes.

- [ ] **Step 5: Compilar**

Run: `cd poui-vscode && npm run compile`
Expected: sem erros.

- [ ] **Step 6: Commit**

```bash
git add poui-vscode/src/codexAdapter.ts poui-vscode/src/test/unit/codexAdapter.test.ts
git commit -m "feat(vscode-ext): add codexAdapter (Codex CLI engine, unvalidated flags)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01NxpSQ4JM3ikEXc47MDQ4mG"
```

---

## Task 3: `geminiAdapter.ts`

**Files:**
- Create: `poui-vscode/src/geminiAdapter.ts`
- Create: `poui-vscode/src/test/unit/geminiAdapter.test.ts`

**Interfaces:**
- Consumes: `EngineAdapter`, `NormalizedEvent`, `RunAgentOptions` de `./engineTypes` (Task 1).
- Produces: `geminiAdapter: EngineAdapter` (`id: 'gemini'`) — consumido pelo `engineRegistry.ts` na Task 4.

**Nota de risco (do spec, itens 3-5)**: schema `stream-json` confirmado por documentação oficial (`init`/`message`/`tool_use`/`tool_result`/`error`/`result`). **Auth**: doc oficial confirma que precisa de `GEMINI_API_KEY`/`GOOGLE_API_KEY` no ambiente — diferente de Claude/Codex, não reaproveita sessão pessoal. **Bug conhecido**: `--output-format json` (não `stream-json`) encerra em erro de tool não-fatal — não afeta este adapter diretamente (usamos `stream-json`), mas documentar no código.

### Passo a passo

- [ ] **Step 1: Escrever os testes de `geminiAdapter.parseLine` (falhando)**

Crie `poui-vscode/src/test/unit/geminiAdapter.test.ts`:

```ts
import * as assert from 'node:assert';
import { geminiAdapter } from '../../geminiAdapter';

function line(event: unknown): string {
  return JSON.stringify(event);
}

describe('geminiAdapter.parseLine', () => {
  it('emits nothing for init (session bookkeeping only)', () => {
    assert.deepStrictEqual(geminiAdapter.parseLine(line({ type: 'init', sessionId: 's1' })), []);
  });

  it('emits text for an assistant message chunk', () => {
    const events = geminiAdapter.parseLine(
      line({ type: 'message', role: 'assistant', content: 'Planejando arquivos...' }),
    );
    assert.deepStrictEqual(events, [{ kind: 'text', text: 'Planejando arquivos...' }]);
  });

  it('ignores user message chunks', () => {
    assert.deepStrictEqual(
      geminiAdapter.parseLine(line({ type: 'message', role: 'user', content: 'gera um componente' })),
      [],
    );
  });

  it('emits tool_use for a tool_use event with a Write/Edit call', () => {
    const events = geminiAdapter.parseLine(
      line({ type: 'tool_use', name: 'write_file', args: { file_path: 'src/app/a/a.component.ts' } }),
    );
    assert.deepStrictEqual(events, [
      { kind: 'tool_use', name: 'write_file', input: { file_path: 'src/app/a/a.component.ts' } },
    ]);
  });

  it('emits auth_error for a dedicated error event mentioning authentication', () => {
    const events = geminiAdapter.parseLine(
      line({ type: 'error', message: 'Please set GEMINI_API_KEY to run in non-interactive mode' }),
    );
    assert.deepStrictEqual(events, [{ kind: 'auth_error' }]);
  });

  it('does not emit auth_error for an unrelated error event', () => {
    const events = geminiAdapter.parseLine(line({ type: 'error', message: 'tool call failed: invalid path' }));
    assert.deepStrictEqual(events, []);
  });

  it('emits a successful result', () => {
    const events = geminiAdapter.parseLine(line({ type: 'result', status: 'success', stats: {} }));
    assert.deepStrictEqual(events, [{ kind: 'result', success: true }]);
  });

  it('emits a failed result with the error message', () => {
    const events = geminiAdapter.parseLine(
      line({ type: 'result', status: 'error', error: { message: 'tool call failed: invalid path' } }),
    );
    assert.deepStrictEqual(events, [
      { kind: 'result', success: false, errorMessage: 'tool call failed: invalid path' },
    ]);
  });

  it('returns an empty array for unparseable JSON', () => {
    assert.deepStrictEqual(geminiAdapter.parseLine('not json'), []);
  });

  it('exposes the gemini id and binary name', () => {
    assert.strictEqual(geminiAdapter.id, 'gemini');
    assert.strictEqual(geminiAdapter.binaryName, 'gemini');
  });
});

describe('geminiAdapter.buildCommand', () => {
  it('builds -p with stream-json output and the confirmed auto-approve flag', () => {
    const { command, args } = geminiAdapter.buildCommand(
      { cwd: '/tmp/workspace', systemPrompt: 'sys', userPrompt: 'gera um componente' },
      '/tmp/system-prompt.txt',
    );
    assert.strictEqual(command, 'gemini');
    assert.deepStrictEqual(args, [
      '-p',
      'gera um componente',
      '--output-format',
      'stream-json',
      '--approval-mode',
      'yolo',
      '--system-prompt-file',
      '/tmp/system-prompt.txt',
    ]);
  });
});
```

- [ ] **Step 2: Rodar e confirmar falha**

Run: `cd poui-vscode && npx mocha --require ts-node/register --timeout 15000 "src/test/unit/geminiAdapter.test.ts"`
Expected: FAIL — módulo ausente.

- [ ] **Step 3: Implementar `geminiAdapter.ts`**

```ts
import { EngineAdapter, NormalizedEvent, RunAgentOptions } from './engineTypes';

// TODO(gemini): --system-prompt-file/--add-dir equivalentes não confirmados
// publicamente (ver spec, seção "Riscos", item 2). Doc oficial confirma
// GEMINI_API_KEY/GOOGLE_API_KEY como exigência de auth headless (item 3) —
// diferente de Claude/Codex, não reaproveita sessão pessoal. Validar com
// `gemini --help` numa máquina real antes de considerar pronto.
function buildCommand(
  options: RunAgentOptions,
  systemPromptFile: string,
  _mcpConfigFile?: string,
): { command: string; args: string[] } {
  const args = [
    '-p',
    options.userPrompt,
    '--output-format',
    'stream-json',
    '--approval-mode',
    'yolo',
    '--system-prompt-file',
    systemPromptFile,
  ];
  return { command: 'gemini', args };
}

function parseLine(line: string): NormalizedEvent[] {
  let message: Record<string, unknown>;
  try {
    message = JSON.parse(line);
  } catch {
    return [];
  }

  if (message.type === 'message') {
    const msg = message as { role?: string; content?: string };
    if (msg.role === 'assistant' && typeof msg.content === 'string') {
      return [{ kind: 'text', text: msg.content }];
    }
    return [];
  }

  if (message.type === 'tool_use') {
    const call = message as { name?: string; args?: { file_path?: string } };
    if (typeof call.name === 'string' && typeof call.args?.file_path === 'string') {
      return [{ kind: 'tool_use', name: call.name, input: { file_path: call.args.file_path } }];
    }
    return [];
  }

  if (message.type === 'error') {
    const err = message as { message?: string };
    const errorMessage = err.message ?? '';
    // Achado confirmado nesta sessão (doc oficial gemini-cli): modo headless
    // exige GEMINI_API_KEY/GOOGLE_API_KEY — trata a mensagem correspondente
    // como falha de autenticação, não como erro genérico de execução.
    if (/authentication|unauthorized|401|403|api key|api_key/i.test(errorMessage)) {
      return [{ kind: 'auth_error' }];
    }
    return [];
  }

  if (message.type === 'result') {
    const result = message as { status: string; error?: { message?: string } };
    if (result.status === 'success') {
      return [{ kind: 'result', success: true }];
    }
    return [
      { kind: 'result', success: false, errorMessage: result.error?.message ?? 'o agente terminou com erro.' },
    ];
  }

  return [];
}

export const geminiAdapter: EngineAdapter = {
  id: 'gemini',
  binaryName: 'gemini',
  buildCommand,
  parseLine,
};
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `cd poui-vscode && npx mocha --require ts-node/register --timeout 15000 "src/test/unit/geminiAdapter.test.ts"`
Expected: PASS — 11 testes verdes.

- [ ] **Step 5: Compilar**

Run: `cd poui-vscode && npm run compile`
Expected: sem erros.

- [ ] **Step 6: Commit**

```bash
git add poui-vscode/src/geminiAdapter.ts poui-vscode/src/test/unit/geminiAdapter.test.ts
git commit -m "feat(vscode-ext): add geminiAdapter (Gemini CLI engine, unvalidated flags)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01NxpSQ4JM3ikEXc47MDQ4mG"
```

---

## Task 4: `engineRegistry.ts`

**Files:**
- Create: `poui-vscode/src/engineRegistry.ts`
- Create: `poui-vscode/src/test/unit/engineRegistry.test.ts`

**Interfaces:**
- Consumes: `claudeAdapter` (Task 1), `codexAdapter` (Task 2), `geminiAdapter` (Task 3), `EngineAdapter`/`EngineId` de `./engineTypes`.
- Produces: `getEngineAdapter(id: EngineId): EngineAdapter` — consumido por `cliCheck.ts` (Task 5) e `agentRuntime.ts` (Task 6).

### Passo a passo

- [ ] **Step 1: Escrever o teste (falhando)**

Crie `poui-vscode/src/test/unit/engineRegistry.test.ts`:

```ts
import * as assert from 'node:assert';
import { getEngineAdapter } from '../../engineRegistry';
import { claudeAdapter } from '../../claudeAdapter';
import { codexAdapter } from '../../codexAdapter';
import { geminiAdapter } from '../../geminiAdapter';

describe('getEngineAdapter', () => {
  it('returns the claude adapter for "claude"', () => {
    assert.strictEqual(getEngineAdapter('claude'), claudeAdapter);
  });

  it('returns the codex adapter for "codex"', () => {
    assert.strictEqual(getEngineAdapter('codex'), codexAdapter);
  });

  it('returns the gemini adapter for "gemini"', () => {
    assert.strictEqual(getEngineAdapter('gemini'), geminiAdapter);
  });
});
```

- [ ] **Step 2: Rodar e confirmar falha**

Run: `cd poui-vscode && npx mocha --require ts-node/register --timeout 15000 "src/test/unit/engineRegistry.test.ts"`
Expected: FAIL — módulo ausente.

- [ ] **Step 3: Implementar `engineRegistry.ts`**

```ts
import { EngineAdapter, EngineId } from './engineTypes';
import { claudeAdapter } from './claudeAdapter';
import { codexAdapter } from './codexAdapter';
import { geminiAdapter } from './geminiAdapter';

export function getEngineAdapter(id: EngineId): EngineAdapter {
  switch (id) {
    case 'claude':
      return claudeAdapter;
    case 'codex':
      return codexAdapter;
    case 'gemini':
      return geminiAdapter;
  }
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `cd poui-vscode && npx mocha --require ts-node/register --timeout 15000 "src/test/unit/engineRegistry.test.ts"`
Expected: PASS — 3 testes verdes.

- [ ] **Step 5: Compilar e commit**

```bash
cd poui-vscode && npm run compile
git add poui-vscode/src/engineRegistry.ts poui-vscode/src/test/unit/engineRegistry.test.ts
git commit -m "feat(vscode-ext): add engineRegistry to select the configured AI engine

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01NxpSQ4JM3ikEXc47MDQ4mG"
```

---

## Task 5: Generalizar `cliCheck.ts`

**Files:**
- Modify: `poui-vscode/src/cliCheck.ts` (arquivo inteiro, ~29 linhas)
- Modify: `poui-vscode/src/test/unit/cliCheck.test.ts` (arquivo inteiro, ~32 linhas)

**Interfaces:**
- Consumes: `getEngineAdapter` de `./engineRegistry` (Task 4), `EngineId` de `./engineTypes`.
- Produces: `checkEngineAvailable(engineId: EngineId, run?: RunVersionCheck): Promise<CliCheckResult>` — substitui `checkClaudeCliAvailable` em todos os 8 arquivos de comando (Tasks 8-10).

### Passo a passo

- [ ] **Step 1: Reescrever o teste (falhando)**

Substitua o conteúdo de `poui-vscode/src/test/unit/cliCheck.test.ts` por:

```ts
import * as assert from 'node:assert';
import { checkEngineAvailable, RunVersionCheck } from '../../cliCheck';

describe('checkEngineAvailable', () => {
  it('reports available with the trimmed version when the command succeeds', async () => {
    const run: RunVersionCheck = async () => ({ stdout: '2.1.238 (Claude Code)\n' });
    const result = await checkEngineAvailable('claude', run);
    assert.deepStrictEqual(result, { available: true, version: '2.1.238 (Claude Code)' });
  });

  it('reports unavailable with the error message when the command is not found', async () => {
    const run: RunVersionCheck = async () => {
      throw new Error('spawn claude ENOENT');
    };
    const result = await checkEngineAvailable('claude', run);
    assert.strictEqual(result.available, false);
    assert.strictEqual(result.errorMessage, 'spawn claude ENOENT');
  });

  it('invokes the claude binary and --version flag for engine "claude"', async () => {
    let capturedCommand: string | undefined;
    let capturedArgs: string[] | undefined;
    const run: RunVersionCheck = async (command, args) => {
      capturedCommand = command;
      capturedArgs = args;
      return { stdout: '2.1.238' };
    };
    await checkEngineAvailable('claude', run);
    assert.strictEqual(capturedCommand, 'claude');
    assert.deepStrictEqual(capturedArgs, ['--version']);
  });

  it('invokes the codex binary and --version flag for engine "codex"', async () => {
    let capturedCommand: string | undefined;
    const run: RunVersionCheck = async (command) => {
      capturedCommand = command;
      return { stdout: 'codex-cli 1.0.0' };
    };
    await checkEngineAvailable('codex', run);
    assert.strictEqual(capturedCommand, 'codex');
  });

  it('invokes the gemini binary and --version flag for engine "gemini"', async () => {
    let capturedCommand: string | undefined;
    const run: RunVersionCheck = async (command) => {
      capturedCommand = command;
      return { stdout: '0.5.0' };
    };
    await checkEngineAvailable('gemini', run);
    assert.strictEqual(capturedCommand, 'gemini');
  });
});
```

- [ ] **Step 2: Rodar e confirmar falha**

Run: `cd poui-vscode && npx mocha --require ts-node/register --timeout 15000 "src/test/unit/cliCheck.test.ts"`
Expected: FAIL — `checkEngineAvailable` não existe.

- [ ] **Step 3: Reescrever `cliCheck.ts`**

```ts
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { EngineId } from './engineTypes';
import { getEngineAdapter } from './engineRegistry';

const execFileAsync = promisify(execFile);

export interface CliCheckResult {
  available: boolean;
  version?: string;
  errorMessage?: string;
}

export type RunVersionCheck = (command: string, args: string[]) => Promise<{ stdout: string }>;

async function defaultRunVersionCheck(command: string, args: string[]): Promise<{ stdout: string }> {
  const { stdout } = await execFileAsync(command, args);
  return { stdout };
}

export async function checkEngineAvailable(
  engineId: EngineId,
  run: RunVersionCheck = defaultRunVersionCheck,
): Promise<CliCheckResult> {
  const adapter = getEngineAdapter(engineId);
  try {
    const { stdout } = await run(adapter.binaryName, ['--version']);
    return { available: true, version: stdout.trim() };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { available: false, errorMessage };
  }
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `cd poui-vscode && npx mocha --require ts-node/register --timeout 15000 "src/test/unit/cliCheck.test.ts"`
Expected: PASS — 5 testes verdes.

- [ ] **Step 5: Compilar**

Run: `cd poui-vscode && npm run compile`
Expected: **vai falhar** — os 8 arquivos de comando ainda importam `checkClaudeCliAvailable`, que não existe mais. Isso é esperado: a migração deles é a Task 9/10. Confirme que o único erro reportado é "`checkClaudeCliAvailable` não é exportado por `./cliCheck`" nos 8 arquivos — nenhum outro erro de tipo.

- [ ] **Step 6: Commit**

```bash
git add poui-vscode/src/cliCheck.ts poui-vscode/src/test/unit/cliCheck.test.ts
git commit -m "refactor(vscode-ext): generalize cliCheck to checkEngineAvailable

Breaks compilation of the 8 command files that still call
checkClaudeCliAvailable — fixed by the migration tasks that follow.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01NxpSQ4JM3ikEXc47MDQ4mG"
```

---

## Task 6: Reescrever `agentRuntime.ts` para `runAgent` genérico

**Files:**
- Modify: `poui-vscode/src/agentRuntime.ts` (corpo da função `runClaudeAgent`, linhas 135-264 do arquivo atual — o topo já foi ajustado na Task 1)
- Modify: `poui-vscode/src/test/unit/agentRuntime.test.ts` (arquivo inteiro — vira teste de orquestração com um adapter fake, não mais fixtures do Claude)

**Interfaces:**
- Consumes: `getEngineAdapter` de `./engineRegistry` (Task 4), `EngineId`/`NormalizedEvent`/`EngineAdapter` de `./engineTypes`.
- Produces: `runAgent(options: RunAgentOptions, sink: OutputSink, engineId: EngineId, spawnFn?: SpawnFn): Promise<GenerateResult>` — consumido pelas Tasks 8-10 (substitui `runClaudeAgent` em todos os 8 arquivos de comando) e pela Task 8 (`buildFixLoop.ts`).

### Passo a passo

- [ ] **Step 1: Escrever o teste de orquestração com adapter fake (falhando)**

Substitua o conteúdo de `poui-vscode/src/test/unit/agentRuntime.test.ts` por:

```ts
import * as assert from 'node:assert';
import { EventEmitter } from 'node:events';
import { Readable } from 'node:stream';
import { runAgent, OutputSink, SpawnFn, SpawnedProcess } from '../../agentRuntime';
import { EngineAdapter, NormalizedEvent } from '../../engineTypes';

class RecordingSink implements OutputSink {
  readonly lines: string[] = [];
  appendLine(value: string): void {
    this.lines.push(value);
  }
}

/** Fake `child_process`-like objeto — cada `lines[i]` já é o texto bruto de
 * uma linha de stdout (o fake adapter abaixo devolve os eventos certos pra
 * cada uma via um mapa, sem precisar reimplementar JSON de verdade). */
function makeFakeProcess(options: { lines?: string[]; exitCode?: number | null; spawnError?: Error }): SpawnedProcess {
  const emitter = new EventEmitter();
  const stdout = Readable.from((options.lines ?? []).map((l) => `${l}\n`));
  const stderr = new Readable({ read() { this.push(null); } });

  if (options.spawnError) {
    setImmediate(() => emitter.emit('error', options.spawnError));
  } else {
    stdout.on('end', () => {
      setImmediate(() => emitter.emit('close', options.exitCode ?? 0));
    });
  }

  return {
    stdout,
    stderr,
    on: (event: string, listener: (...args: unknown[]) => void) => emitter.on(event, listener),
  } as unknown as SpawnedProcess;
}

/** Adapter fake — mapeia cada linha bruta (ex: "L1") para uma lista de
 * NormalizedEvent pré-definida, sem parsear JSON de verdade. Testa só a
 * orquestração do runAgent (sink, filesWritten, isAuthError, finish),
 * não a lógica de um adapter real (já coberta em claudeAdapter.test.ts). */
function makeFakeAdapter(eventsByLine: Record<string, NormalizedEvent[]>): EngineAdapter {
  return {
    id: 'claude',
    binaryName: 'fake-cli',
    buildCommand: () => ({ command: 'fake-cli', args: [] }),
    parseLine: (line: string) => eventsByLine[line] ?? [],
  };
}

describe('runAgent', () => {
  it('streams text to the sink and collects files from Write/Edit tool_use events', async () => {
    const sink = new RecordingSink();
    const adapter = makeFakeAdapter({
      L1: [
        { kind: 'text', text: 'Planejando arquivos...' },
        { kind: 'tool_use', name: 'Write', input: { file_path: 'src/app/a/a.component.ts' } },
      ],
      L2: [
        { kind: 'tool_use', name: 'Edit', input: { file_path: 'src/app/app.routes.ts' } },
        { kind: 'tool_use', name: 'Read', input: { file_path: 'package.json' } },
      ],
      L3: [{ kind: 'result', success: true }],
    });
    const spawnFn: SpawnFn = () => makeFakeProcess({ lines: ['L1', 'L2', 'L3'] });

    const result = await runAgentWithAdapter(adapter, { cwd: '/tmp/workspace', systemPrompt: 'sys', userPrompt: 'u' }, sink, spawnFn);

    assert.strictEqual(result.succeeded, true);
    assert.ok(!result.isAuthError);
    assert.deepStrictEqual(result.filesWritten, ['src/app/a/a.component.ts', 'src/app/app.routes.ts']);
    assert.ok(sink.lines.some((l) => l.includes('Planejando arquivos')));
    assert.ok(sink.lines.some((l) => l.includes('→ Write')));
  });

  it('reports failure with the error message from a failed result event', async () => {
    const sink = new RecordingSink();
    const adapter = makeFakeAdapter({
      L1: [{ kind: 'result', success: false, errorMessage: 'tool execution failed; aborted' }],
    });
    const spawnFn: SpawnFn = () => makeFakeProcess({ lines: ['L1'] });

    const result = await runAgentWithAdapter(adapter, { cwd: '/tmp/workspace', systemPrompt: 'sys', userPrompt: 'u' }, sink, spawnFn);

    assert.strictEqual(result.succeeded, false);
    assert.strictEqual(result.errorMessage, 'tool execution failed; aborted');
    assert.ok(sink.lines.some((l) => l.includes('falha ao executar o agente')));
  });

  it('flags isAuthError when an auth_error event precedes the failed result', async () => {
    const sink = new RecordingSink();
    const adapter = makeFakeAdapter({
      L1: [{ kind: 'auth_error' }, { kind: 'result', success: false, errorMessage: 'invalid x-api-key' }],
    });
    const spawnFn: SpawnFn = () => makeFakeProcess({ lines: ['L1'] });

    const result = await runAgentWithAdapter(adapter, { cwd: '/tmp/workspace', systemPrompt: 'sys', userPrompt: 'u' }, sink, spawnFn);

    assert.strictEqual(result.succeeded, false);
    assert.strictEqual(result.isAuthError, true);
  });

  it('flags isAuthError when an auth_error event arrives on an earlier line than the result', async () => {
    const sink = new RecordingSink();
    const adapter = makeFakeAdapter({
      L1: [{ kind: 'auth_error' }],
      L2: [{ kind: 'result', success: false, errorMessage: 'blocked' }],
    });
    const spawnFn: SpawnFn = () => makeFakeProcess({ lines: ['L1', 'L2'] });

    const result = await runAgentWithAdapter(adapter, { cwd: '/tmp/workspace', systemPrompt: 'sys', userPrompt: 'u' }, sink, spawnFn);

    assert.strictEqual(result.isAuthError, true);
  });

  it('falls back to a text-based auth pattern in the error message when no auth_error event fired', async () => {
    const sink = new RecordingSink();
    const adapter = makeFakeAdapter({
      L1: [{ kind: 'result', success: false, errorMessage: 'request failed: 401 unauthorized' }],
    });
    const spawnFn: SpawnFn = () => makeFakeProcess({ lines: ['L1'] });

    const result = await runAgentWithAdapter(adapter, { cwd: '/tmp/workspace', systemPrompt: 'sys', userPrompt: 'u' }, sink, spawnFn);

    assert.strictEqual(result.isAuthError, true);
  });

  it('reports failure when the spawned process errors before emitting any line', async () => {
    const sink = new RecordingSink();
    const adapter = makeFakeAdapter({});
    const spawnFn: SpawnFn = () => makeFakeProcess({ spawnError: new Error('spawn fake-cli ENOENT') });

    const result = await runAgentWithAdapter(adapter, { cwd: '/tmp/workspace', systemPrompt: 'sys', userPrompt: 'u' }, sink, spawnFn);

    assert.strictEqual(result.succeeded, false);
    assert.strictEqual(result.errorMessage, 'spawn fake-cli ENOENT');
  });

  it('picks the adapter matching the engineId via the real registry', async () => {
    const sink = new RecordingSink();
    // claude é o default do registry — confirma que runAgent(..., 'claude', ...)
    // realmente delega pro claudeAdapter real (não a um fake), sem precisar
    // duplicar os testes de parsing já cobertos em claudeAdapter.test.ts.
    const spawnFn: SpawnFn = () =>
      makeFakeProcess({ lines: [JSON.stringify({ type: 'result', subtype: 'success', is_error: false })] });

    const result = await runAgent({ cwd: '/tmp/workspace', systemPrompt: 'sys', userPrompt: 'u' }, sink, 'claude', spawnFn);

    assert.strictEqual(result.succeeded, true);
  });
});
```

Note o helper `runAgentWithAdapter` usado nos 6 primeiros testes — ele injeta o adapter fake diretamente, sem passar pelo registry real (evita precisar de um `engineId` fictício mapeado no registry só pra teste). Esse helper é implementado no `agentRuntime.ts` do Step 3 abaixo, exportado só pra teste (não faz parte da API pública usada pelos comandos).

- [ ] **Step 2: Rodar e confirmar falha**

Run: `cd poui-vscode && npx mocha --require ts-node/register --timeout 15000 "src/test/unit/agentRuntime.test.ts"`
Expected: FAIL — `runAgent`/`runAgentWithAdapter` não existem ainda (o arquivo ainda exporta só `runClaudeAgent`).

- [ ] **Step 3: Reescrever o corpo de `agentRuntime.ts`**

Substitua tudo a partir de `const ALLOWED_TOOLS` (removido na Task 1) até o fim do arquivo por:

```ts
function defaultSpawn(
  command: string,
  args: string[],
  options: { cwd: string; env: NodeJS.ProcessEnv },
): SpawnedProcess {
  return spawn(command, args, {
    cwd: options.cwd,
    env: options.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  }) as unknown as SpawnedProcess;
}

function buildSubprocessEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  delete env.ANTHROPIC_API_KEY;
  delete env.ANTHROPIC_AUTH_TOKEN;
  delete env.ANTHROPIC_BASE_URL;
  return env;
}

/** Núcleo da orquestração — recebe o adapter já resolvido, pra permitir
 * testar com um fake sem depender do registry real. `runAgent` (abaixo) é a
 * função pública que os comandos chamam; ela só resolve o adapter e delega. */
export async function runAgentWithAdapter(
  adapter: EngineAdapter,
  options: RunAgentOptions,
  sink: OutputSink,
  spawnFn: SpawnFn = defaultSpawn,
): Promise<GenerateResult> {
  const filesWritten: string[] = [];
  let isAuthError = false;
  const systemPromptFile = path.join(os.tmpdir(), `poui-system-prompt-${randomUUID()}.txt`);
  const mcpConfigFile = options.mcpConfig
    ? path.join(os.tmpdir(), `poui-mcp-config-${randomUUID()}.json`)
    : undefined;

  try {
    await fs.writeFile(systemPromptFile, options.systemPrompt, 'utf8');
    if (mcpConfigFile && options.mcpConfig) {
      await fs.writeFile(mcpConfigFile, options.mcpConfig, 'utf8');
    }

    const { command, args } = adapter.buildCommand(options, systemPromptFile, mcpConfigFile);
    const child = spawnFn(command, args, { cwd: options.cwd, env: buildSubprocessEnv() });

    let stderrOutput = '';
    child.stderr.on('data', (chunk: Buffer | string) => {
      stderrOutput += chunk.toString();
    });

    const rl = readline.createInterface({ input: child.stdout });

    return await new Promise<GenerateResult>((resolve) => {
      let finished = false;
      const finish = (value: GenerateResult) => {
        if (!finished) {
          finished = true;
          resolve(value);
        }
      };

      rl.on('line', (line) => {
        if (!line.trim()) {
          return;
        }
        for (const event of adapter.parseLine(line)) {
          if (event.kind === 'text') {
            sink.appendLine(event.text);
          } else if (event.kind === 'tool_use') {
            sink.appendLine(`→ ${event.name} ${JSON.stringify(event.input)}`);
            const input = event.input as { file_path?: unknown } | null | undefined;
            if ((event.name === 'Write' || event.name === 'Edit') && typeof input?.file_path === 'string') {
              filesWritten.push(input.file_path);
            }
          } else if (event.kind === 'auth_error') {
            isAuthError = true;
          } else if (event.kind === 'result') {
            if (event.success) {
              finish({ filesWritten, succeeded: true });
            } else {
              isAuthError = isAuthError || /authentication|unauthorized|401|403/i.test(event.errorMessage);
              sink.appendLine(`✗ falha ao executar o agente: ${event.errorMessage}`);
              finish({ filesWritten, succeeded: false, errorMessage: event.errorMessage, isAuthError });
            }
          }
        }
      });

      child.on('error', (error) => {
        if (finished) {
          return;
        }
        sink.appendLine(`✗ falha ao executar o agente: ${error.message}`);
        finish({ filesWritten, succeeded: false, errorMessage: error.message, isAuthError });
      });

      child.on('close', () => {
        if (finished) {
          return;
        }
        const errorMessage = stderrOutput.trim() || 'o processo encerrou sem retornar um resultado.';
        sink.appendLine(`✗ falha ao executar o agente: ${errorMessage}`);
        finish({ filesWritten, succeeded: false, errorMessage, isAuthError });
      });
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    sink.appendLine(`✗ falha ao executar o agente: ${errorMessage}`);
    return { filesWritten, succeeded: false, errorMessage, isAuthError };
  } finally {
    await fs.rm(systemPromptFile, { force: true });
    if (mcpConfigFile) {
      await fs.rm(mcpConfigFile, { force: true });
    }
  }
}

export async function runAgent(
  options: RunAgentOptions,
  sink: OutputSink,
  engineId: EngineId,
  spawnFn: SpawnFn = defaultSpawn,
): Promise<GenerateResult> {
  return runAgentWithAdapter(getEngineAdapter(engineId), options, sink, spawnFn);
}
```

E ajuste o `import` no topo (adicionado na Task 1) para incluir `EngineAdapter`/`EngineId` e `getEngineAdapter`:

```ts
import { EngineAdapter, EngineId, GenerateResult, OutputSink, RunAgentOptions, SpawnedProcess, SpawnFn } from './engineTypes';
import { getEngineAdapter } from './engineRegistry';
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `cd poui-vscode && npx mocha --require ts-node/register --timeout 15000 "src/test/unit/agentRuntime.test.ts"`
Expected: PASS — 7 testes verdes.

- [ ] **Step 5: Compilar**

Run: `cd poui-vscode && npm run compile`
Expected: os mesmos erros de "checkClaudeCliAvailable ausente" da Task 5 continuam (esperado — resolvidos nas Tasks 8-10), mas agora **também** aparecem erros de "`runClaudeAgent` não é exportado por `./agentRuntime`" nos mesmos 8 arquivos. Confirme que nenhum outro tipo de erro aparece.

- [ ] **Step 6: Commit**

```bash
git add poui-vscode/src/agentRuntime.ts poui-vscode/src/test/unit/agentRuntime.test.ts
git commit -m "refactor(vscode-ext): agentRuntime becomes generic runAgent over EngineAdapter

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01NxpSQ4JM3ikEXc47MDQ4mG"
```

---

## Task 7: Setting `poui.aiEngine`

**Files:**
- Modify: `poui-vscode/package.json` (bloco `contributes.configuration.properties`)
- Modify: `poui-vscode/README.md` (seção inicial, uma frase)

**Interfaces:**
- Consumes: nada.
- Produces: configuração `poui.aiEngine` lida via `vscode.workspace.getConfiguration('poui').get<EngineId>('aiEngine', 'claude')` — usada pelas Tasks 8-10 em cada arquivo de comando.

### Passo a passo

- [ ] **Step 1: Adicionar o setting em `package.json`**

Em `poui-vscode/package.json`, dentro de `contributes.configuration.properties`, depois do bloco `"poui.effort"` (linha 46 do arquivo atual, antes do `}` que fecha `properties`):

```json
        "poui.aiEngine": {
          "type": "string",
          "enum": ["claude", "codex", "gemini"],
          "enumDescriptions": [
            "Claude Code CLI — motor padrão, validado de ponta a ponta.",
            "Codex CLI (OpenAI) — suporte experimental, alguns flags ainda não confirmados em execução real.",
            "Gemini CLI (Google) — suporte experimental; exige GEMINI_API_KEY/GOOGLE_API_KEY no ambiente."
          ],
          "default": "claude",
          "description": "Motor de IA usado pelos comandos que dependem de raciocínio (gerar, revisar, conectar, etc)."
        }
```

- [ ] **Step 2: Validar o JSON**

Run: `cd poui-vscode && node -e "JSON.parse(require('fs').readFileSync('package.json', 'utf8')); console.log('ok')"`
Expected: `ok` (sem `SyntaxError`).

- [ ] **Step 3: Atualizar `README.md`**

No parágrafo de abertura de `poui-vscode/README.md` (linha 11, depois de "sem API key separada, mas dependente do CLI instalado na máquina."), adicione:

```markdown
A partir da versão com motor plugável, o CLI usado é escolhido pelo setting
`poui.aiEngine` (`claude`/`codex`/`gemini`, default `claude`) — Codex e
Gemini ainda são suporte experimental, ver
`docs/superpowers/specs/2026-09-04-vscode-extension-multi-engine-design.md`
para as limitações conhecidas de cada um.
```

- [ ] **Step 4: Commit**

```bash
git add poui-vscode/package.json poui-vscode/README.md
git commit -m "feat(vscode-ext): add poui.aiEngine setting (claude/codex/gemini)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01NxpSQ4JM3ikEXc47MDQ4mG"
```

---

## Task 8: `buildFixLoop.ts` — suporte a `engineId`

**Files:**
- Modify: `poui-vscode/src/buildFixLoop.ts` (inteiro, ~122 linhas)
- Modify: `poui-vscode/src/test/unit/buildFixLoop.test.ts` (chamadas a `runBuildFixLoop`, ~7 ocorrências)

**Interfaces:**
- Consumes: `runAgent` de `./agentRuntime` (Task 6), `EngineId` de `./engineTypes`.
- Produces: `BuildFixOptions.engineId: EngineId` (campo novo, obrigatório) — consumido pelas Task 9 (`generateComponent.ts`, `generateConnect.ts`, `generateScreenshot.ts`, os 3 chamadores de `runBuildFixLoop`).

### Passo a passo

- [ ] **Step 1: Atualizar `buildFixLoop.test.ts` para passar `engineId` (falhando)**

Em `poui-vscode/src/test/unit/buildFixLoop.test.ts`, todas as 5 chamadas a `runBuildFixLoop({ cwd: CWD, filesWritten: WRITTEN, systemPrompt: 'sys' }, ...)` ganham `engineId: 'claude'`:

```ts
{ cwd: CWD, filesWritten: WRITTEN, systemPrompt: 'sys', engineId: 'claude' },
```

- [ ] **Step 2: Rodar e confirmar falha de tipo**

Run: `cd poui-vscode && npx tsc --noEmit -p .`
Expected: FAIL — `Object literal may only specify known properties, and 'engineId' does not exist in type 'BuildFixOptions'`.

- [ ] **Step 3: Adicionar `engineId` a `BuildFixOptions` e repassar pro `agentRunner`**

Em `buildFixLoop.ts`:

```ts
import * as path from 'node:path';
import { runBuild, parseBuildErrors, BuildError, RunBuildFn } from './buildVerify';
import { runAgent, GenerateResult, OutputSink, RunAgentOptions } from './agentRuntime';
import { EngineId } from './engineTypes';

const MAX_FIX_ATTEMPTS = 3;

export interface BuildFixOptions {
  cwd: string;
  filesWritten: string[];
  systemPrompt: string;
  engineId: EngineId;
  model?: string;
  effort?: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
}
```

E o tipo/uso do `agentRunner`:

```ts
type AgentRunner = (options: RunAgentOptions, sink: OutputSink, engineId: EngineId) => Promise<GenerateResult>;

export async function runBuildFixLoop(
  options: BuildFixOptions,
  sink: OutputSink,
  buildRunner: RunBuildFn = runBuild,
  agentRunner: AgentRunner = runAgent,
): Promise<BuildFixResult> {
```

E na chamada dentro do laço (onde hoje é `agentRunner({...}, sink)`):

```ts
    const fixResult = await agentRunner(
      {
        cwd: options.cwd,
        systemPrompt: options.systemPrompt,
        userPrompt: buildFixUserPrompt(ourErrors, filesToFix),
        model: options.model,
        effort: options.effort,
      },
      sink,
      options.engineId,
    );
```

(`BuildFixResult`, o resto do laço `for`, e todo o texto de `sink.appendLine` continuam exatamente como estão — só a assinatura e essa chamada mudam.)

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `cd poui-vscode && npx mocha --require ts-node/register --timeout 15000 "src/test/unit/buildFixLoop.test.ts"`
Expected: PASS — os mesmos testes de antes, agora tipando certo.

- [ ] **Step 5: Compilar**

Run: `cd poui-vscode && npm run compile`
Expected: os erros de `checkClaudeCliAvailable`/`runClaudeAgent` nos 8 arquivos de comando continuam (resolvidos na Task 9/10) — nenhum erro novo relacionado a `buildFixLoop.ts`.

- [ ] **Step 6: Commit**

```bash
git add poui-vscode/src/buildFixLoop.ts poui-vscode/src/test/unit/buildFixLoop.test.ts
git commit -m "refactor(vscode-ext): buildFixLoop threads engineId through to runAgent

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01NxpSQ4JM3ikEXc47MDQ4mG"
```

---

## Task 9: Migrar `generateComponent.ts`, `generateConnect.ts`, `generateScreenshot.ts`

Os 3 comandos que chamam `runBuildFixLoop` depois de gerar — cada um precisa ler `engineId` uma vez e repassar tanto pro `checkEngineAvailable`/`runAgent` quanto pro `runBuildFixLoop`.

**Files:**
- Modify: `poui-vscode/src/generateComponent.ts:5-6,44-51,139-151,171-180`
- Modify: `poui-vscode/src/generateConnect.ts:4-5,31-38,239-247,264-268`
- Modify: `poui-vscode/src/generateScreenshot.ts:6-8,35-40,58-68,139-148,163-175`
- Modify: `poui-vscode/src/test/unit/*` — nenhum destes 3 comandos tem teste unitário próprio hoje (só o teste de integração em `src/test/suite/extension.test.ts`, que só checa registro de comando — nada a mudar lá).

**Interfaces:**
- Consumes: `checkEngineAvailable` (Task 5), `runAgent` (Task 6), `EngineId` (Task 1), `BuildFixOptions.engineId` (Task 8).

### Passo a passo

- [ ] **Step 1: `generateComponent.ts`**

Troque o import (linha 5-6):
```ts
import { checkEngineAvailable } from './cliCheck';
import { runAgent } from './agentRuntime';
```

Logo depois de resolver `workspaceFolder` (antes do bloco `const cliCheck = await checkClaudeCliAvailable();`, linha ~44), leia o engine configurado:

```ts
    const engineId = vscode.workspace.getConfiguration('poui').get<'claude' | 'codex' | 'gemini'>('aiEngine', 'claude');

    const cliCheck = await checkEngineAvailable(engineId);
    if (!cliCheck.available) {
      void vscode.window.showErrorMessage(
        `PO-UI: CLI do motor "${engineId}" não encontrado ou não está no PATH — instale e faça login antes de gerar código.${cliCheck.errorMessage ? ` (${cliCheck.errorMessage})` : ''}`,
      );
      return;
    }
```

Na chamada a `runClaudeAgent(...)` (linha 139), troque o nome da função por `runAgent` e adicione `engineId` como 3º argumento posicional (depois do objeto de opções e do `outputChannel`):

```ts
    const result = await runAgent(
      {
        cwd: workspaceFolder.uri.fsPath,
        systemPrompt,
        userPrompt,
        addDir: sourceFilePath ? path.dirname(sourceFilePath) : undefined,
        model: vscode.workspace.getConfiguration('poui').get<string>('model'),
        effort: vscode.workspace
          .getConfiguration('poui')
          .get<'low' | 'medium' | 'high' | 'xhigh' | 'max'>('effort'),
      },
      outputChannel,
      engineId,
    );
```

Na chamada a `runBuildFixLoop(...)` (linha 171), adicione `engineId` ao objeto de opções:

```ts
    const buildFix = await runBuildFixLoop(
      {
        cwd: workspaceFolder.uri.fsPath,
        filesWritten: result.filesWritten,
        systemPrompt,
        engineId,
        model: vscode.workspace.getConfiguration('poui').get<string>('model'),
        effort: vscode.workspace
          .getConfiguration('poui')
          .get<'low' | 'medium' | 'high' | 'xhigh' | 'max'>('effort'),
      },
      outputChannel,
    );
```

- [ ] **Step 2: `generateConnect.ts`**

Mesmo padrão. Import:
```ts
import { checkEngineAvailable } from './cliCheck';
import { runAgent } from './agentRuntime';
```

Onde hoje é (linha ~32) `const cliCheck = await checkClaudeCliAvailable();`, leia `engineId` antes e passe pro check:

```ts
    const engineId = vscode.workspace.getConfiguration('poui').get<'claude' | 'codex' | 'gemini'>('aiEngine', 'claude');
    const cliCheck = await checkEngineAvailable(engineId);
    if (!cliCheck.available) {
      void vscode.window.showErrorMessage(
        `PO-UI: CLI do motor "${engineId}" não encontrado ou não está no PATH — instale e faça login antes de conectar.${cliCheck.errorMessage ? ` (${cliCheck.errorMessage})` : ''}`,
      );
      return;
    }
```

Na chamada a `runClaudeAgent` (linha ~244, forma compacta `{ cwd: workspaceRoot, systemPrompt, userPrompt, model, effort }`):

```ts
    const result = await runAgent({ cwd: workspaceRoot, systemPrompt, userPrompt, model, effort }, outputChannel, engineId);
```

Na chamada a `runBuildFixLoop` (linha ~265, forma compacta):

```ts
    const buildFix = await runBuildFixLoop(
      { cwd: workspaceRoot, filesWritten: result.filesWritten, systemPrompt, engineId, model, effort },
      outputChannel,
    );
```

- [ ] **Step 3: `generateScreenshot.ts`**

Mesmo padrão. Import:
```ts
import { checkEngineAvailable } from './cliCheck';
import { runAgent } from './agentRuntime';
```

**Nota**: este arquivo não checa CLI disponível hoje (gap pré-existente, fora de escopo desta migração — não adicionar o check aqui, só trocar o motor usado nas 2 chamadas que já existem). Leia `engineId` uma vez, perto de onde `model`/`effort` já são lidos (linha ~36-39):

```ts
    const engineId = vscode.workspace.getConfiguration('poui').get<'claude' | 'codex' | 'gemini'>('aiEngine', 'claude');
```

Na 1ª chamada (`analysisResult`, linha ~58-68), adicione `engineId` como 3º argumento:

```ts
    const analysisResult = await runAgent(
      {
        cwd: workspaceFolder.uri.fsPath,
        systemPrompt: analysisSystemPrompt,
        userPrompt: buildScreenshotUserPrompt(imagePath),
        tools: 'Read,Glob',
        model,
        effort,
      },
      sink,
      engineId,
    );
```

Na 2ª chamada (`result`, linha ~139-148):

```ts
    const result = await runAgent(
      {
        cwd: workspaceFolder.uri.fsPath,
        systemPrompt: genSystemPrompt,
        userPrompt: genUserPromptLines.join('\n'),
        model,
        effort,
      },
      sink,
      engineId,
    );
```

E na chamada a `runBuildFixLoop` (linha ~166-173):

```ts
    const buildFix = await runBuildFixLoop(
      {
        cwd: workspaceFolder.uri.fsPath,
        filesWritten: result.filesWritten,
        systemPrompt: genSystemPrompt,
        engineId,
        model,
        effort,
      },
      sink,
    );
```

- [ ] **Step 4: Compilar**

Run: `cd poui-vscode && npm run compile`
Expected: os erros restantes agora são só nos 4 arquivos ainda não migrados (`generateReview.ts`, `generateDocs.ts`, `generateTest.ts`, `generateE2e.ts`) — nenhum erro em `generateComponent.ts`/`generateConnect.ts`/`generateScreenshot.ts`.

- [ ] **Step 5: Rodar a suíte unitária inteira**

Run: `cd poui-vscode && npm run test:unit`
Expected: todos os testes existentes continuam verdes (nenhum destes 3 arquivos tem teste unitário próprio, então não há teste novo aqui — a garantia vem da compilação limpa + dos testes de `agentRuntime`/`buildFixLoop`/`cliCheck` já cobrindo a lógica que eles chamam).

- [ ] **Step 6: Commit**

```bash
git add poui-vscode/src/generateComponent.ts poui-vscode/src/generateConnect.ts poui-vscode/src/generateScreenshot.ts
git commit -m "feat(vscode-ext): wire poui.aiEngine into component/connect/screenshot commands

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01NxpSQ4JM3ikEXc47MDQ4mG"
```

---

## Task 10: Migrar `generateReview.ts`, `generateDocs.ts`, `generateTest.ts`, `generateE2e.ts`

Os 4 comandos restantes — mesmo padrão da Task 9, sem `runBuildFixLoop` envolvido.

**Files:**
- Modify: `poui-vscode/src/generateReview.ts:3-4,34-40,83-95`
- Modify: `poui-vscode/src/generateDocs.ts:4-5,19-25,59-71`
- Modify: `poui-vscode/src/generateTest.ts:3-4,28-34,109-120`
- Modify: `poui-vscode/src/generateE2e.ts:4-5,50-56,168-180`

### Passo a passo

- [ ] **Step 1: `generateReview.ts`**

Import: `checkEngineAvailable`/`runAgent` no lugar de `checkClaudeCliAvailable`/`runClaudeAgent` (mesmo padrão da Task 9). Antes do `const cliCheck = await checkClaudeCliAvailable();` (linha 34), leia `engineId`:

```ts
    const engineId = vscode.workspace.getConfiguration('poui').get<'claude' | 'codex' | 'gemini'>('aiEngine', 'claude');
    const cliCheck = await checkEngineAvailable(engineId);
    if (!cliCheck.available) {
      void vscode.window.showErrorMessage(
        `PO-UI: CLI do motor "${engineId}" não encontrado ou não está no PATH — instale e faça login antes de revisar código.${cliCheck.errorMessage ? ` (${cliCheck.errorMessage})` : ''}`,
      );
      return;
    }
```

Na chamada a `runClaudeAgent` (linha 83-95), troque pra `runAgent` e adicione `engineId` como 3º argumento (depois de `outputChannel`).

- [ ] **Step 2: `generateDocs.ts`**

Mesmo padrão. `engineId` lido antes do check (linha 19), mensagem de erro ajustada para "antes de consultar", `runAgent` com `engineId` na chamada (linha 59-71).

- [ ] **Step 3: `generateTest.ts`**

Mesmo padrão. `engineId` lido antes do check (linha 28), mensagem "antes de gerar código", `runAgent` com `engineId` (linha 109-120).

- [ ] **Step 4: `generateE2e.ts`**

Mesmo padrão. `engineId` lido antes do check (linha 50), mensagem "antes de gerar código", `runAgent` com `engineId` (linha 168-180) — **preserva** `tools: E2E_TOOLS`, `allowedTools: E2E_MCP_ALLOWED_TOOLS`, `mcpConfig: buildPlaywrightMcpConfig()` exatamente como estão hoje, só adiciona `engineId` como 3º argumento posicional depois do `outputChannel`.

- [ ] **Step 5: Compilar**

Run: `cd poui-vscode && npm run compile`
Expected: **zero erros** — todos os 8 arquivos de comando + `buildFixLoop.ts` migrados.

- [ ] **Step 6: Rodar a suíte unitária inteira**

Run: `cd poui-vscode && npm run test:unit`
Expected: 100% verde — todos os testes antigos preservados + os novos de `claudeAdapter`/`codexAdapter`/`geminiAdapter`/`engineRegistry`/`cliCheck`/`agentRuntime`/`buildFixLoop`.

- [ ] **Step 7: Rodar a suíte de integração (se não houver nenhuma janela do VS Code aberta)**

Run: `cd poui-vscode && npm test`
Expected: PASS. Se falhar por causa de uma janela do VS Code aberta (`@vscode/test-electron` exige zero instâncias rodando — limitação já documentada em sessões anteriores), pule este passo e registre isso na memória do projeto em vez de forçar o fechamento de janelas do usuário sem pedir.

- [ ] **Step 8: Commit**

```bash
git add poui-vscode/src/generateReview.ts poui-vscode/src/generateDocs.ts poui-vscode/src/generateTest.ts poui-vscode/src/generateE2e.ts
git commit -m "feat(vscode-ext): wire poui.aiEngine into review/docs/test/e2e commands

Completes the pluggable AI engine migration — all 13 poui-vscode
commands now honor the poui.aiEngine setting (default 'claude'
preserves current behavior exactly; 'codex'/'gemini' are experimental,
see the design spec's risk section for what's still unvalidated).

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01NxpSQ4JM3ikEXc47MDQ4mG"
```

---

## Self-Review (feito ao escrever este plano)

**Cobertura do spec**: seção "Decisão de arquitetura" → Tasks 1, 6. "Configuração" → Task 7, wiring nas Tasks 9-10. "Componentes novos" (claudeAdapter/codexAdapter/geminiAdapter/registry/cliCheck) → Tasks 1-5. "Tratamento de erro e capacidade" (auth detection genérica) → Task 6; **o aviso específico do `screenshot` em Gemini (item de capacidade) não entrou neste plano** — é um comportamento de UX (mensagem de aviso condicional numa tela específica), fica junto do plano de documentação in-app/i18n (2º plano combinado com o usuário), não da engenharia de motor. "Testes" → todas as tasks têm teste próprio. "Riscos" → comentários `TODO(codex)`/`TODO(gemini)` nas Tasks 2-3, linkados ao spec.

**Fora de escopo confirmado**: seção "Documentação in-app" e "Internacionalização" do spec — ficam pro 2º plano, como já combinado com o usuário.

**Consistência de tipos**: `EngineId` = `'claude' | 'codex' | 'gemini'` usado identicamente em `engineTypes.ts`, `cliCheck.ts`, `buildFixLoop.ts`, e nos 8 comandos. `NormalizedEvent` com `kind` discriminante usado identicamente nos 3 adapters e em `agentRuntime.ts`. `EngineAdapter.buildCommand`/`parseLine` com a mesma assinatura nas Tasks 1-3.
