# Motor de IA — sinalização de capacidades (poui-vscode) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adiciona um campo `capabilities` ao `EngineAdapter` de `poui-vscode` para que `codex`/`gemini` deixem de ignorar silenciosamente restrições/recursos que `generateReview`, `generateE2e` e `generateScreenshot` hoje assumem sem checar — cada um desses 3 comandos passa a avisar o usuário (via output channel) quando o motor configurado não garante o que o comando precisa, sem bloquear a execução. Também troca `EngineId` inline por import em 8 arquivos e blinda `agentRuntime.ts` contra um `parseLine` que lança exceção.

**Architecture:** `EngineCapabilities` é um objeto de 3 flags booleanas (`restrictsTools`, `supportsMcp`, `supportsVision`) declarado por cada adapter (`claudeAdapter`/`codexAdapter`/`geminiAdapter`), lido pelos 3 comandos afetados via `getEngineAdapter(engineId).capabilities` — sem nova abstração além disso (nenhuma UI nova, nenhum bloqueio, nenhuma configuração nova).

**Tech Stack:** TypeScript, `node:child_process`/`node:readline` (sem dependências novas), Mocha + `ts-node` para testes unitários (`npm run test:unit`), `tsc` para compilação (`npm run compile`).

**Spec:** Este plano fecha um achado (Important, parqueado deliberadamente) da revisão final de branch do PR #1 (`docs/superpowers/plans/2026-09-04-vscode-multi-engine-plan.md`, já mesclado em `master`) — não há um documento de spec dedicado para este follow-up. O spec original (`docs/superpowers/specs/2026-09-04-vscode-extension-multi-engine-design.md`, seção "Tratamento de erro e capacidade") já estabelece a política "avisa e tenta mesmo assim" para capacidade não suportada — esse plano aplica essa política, com o usuário confirmando o mesmo comportamento também para o caso de `generateReview` (ver decisão abaixo).

## Global Constraints

- Comportamento do motor `claude` não pode mudar — mesmos argumentos de CLI, mesmo parsing, mesmos testes passando com as mesmas asserções.
- Nenhuma dependência npm nova.
- Sem subpastas novas em `src/`; testes em `src/test/unit/<nome>.test.ts` (sem subpastas).
- Author dos commits: Andre Costa (git config já configurado — não alterar).
- Rodar `npm run compile` e `npm run test:unit` depois de cada task, com saída verde, antes de commitar.
- **Capacidade não suportada por um motor: avisa (via output channel) e tenta mesmo assim — nunca bloqueia o comando.** Decisão confirmada pelo usuário nesta sessão para os 3 casos deste plano (restrição de ferramentas do `generateReview`, MCP do `generateE2e`, visão do `generateScreenshot`), mantendo consistência com a política já adotada no spec original para qualquer outra capacidade.
- Nenhum arquivo de comando (`generate*.ts`) tem teste unitário próprio hoje (gap pré-existente, fora de escopo) — a garantia dos Tasks 3-5 vem de compilação limpa + verificação manual do texto do aviso, não de teste automatizado.

---

## Task 1: `EngineCapabilities` — tipo, 3 adapters, e os 3 fakes de teste que quebram

**Files:**
- Modify: `poui-vscode/src/engineTypes.ts` (adiciona `EngineCapabilities` + campo `capabilities` em `EngineAdapter`)
- Modify: `poui-vscode/src/claudeAdapter.ts`
- Modify: `poui-vscode/src/codexAdapter.ts`
- Modify: `poui-vscode/src/geminiAdapter.ts`
- Modify: `poui-vscode/src/test/unit/claudeAdapter.test.ts`
- Modify: `poui-vscode/src/test/unit/codexAdapter.test.ts`
- Modify: `poui-vscode/src/test/unit/geminiAdapter.test.ts`
- Modify: `poui-vscode/src/test/unit/agentRuntime.test.ts` (3 object literais tipados `EngineAdapter` — `makeFakeAdapter` e 2 adapters inline — quebram de compilar assim que `capabilities` vira obrigatório; corrigidos nesta mesma task, sem mudar o comportamento de nenhum teste existente)

**Interfaces:**
- Produces: `EngineCapabilities` (novo tipo em `engineTypes.ts`), `EngineAdapter.capabilities: EngineCapabilities` — consumido pelas Tasks 3, 4 e 5 via `getEngineAdapter(engineId).capabilities`.
- Consumes: nada (a interface `EngineAdapter` já existe; esta task só adiciona um campo a ela).

### Passo a passo

- [ ] **Step 1: Escrever os 3 testes de capabilities (falhando)**

Em `poui-vscode/src/test/unit/claudeAdapter.test.ts`, dentro do bloco `describe('claudeAdapter.parseLine', ...)`, logo depois do teste `'exposes the claude id and binary name'` (a última `it(...)` antes do `});` que fecha esse describe), adicione:

```ts

  it('exposes capabilities: full support (tools restriction, MCP, vision)', () => {
    assert.deepStrictEqual(claudeAdapter.capabilities, {
      restrictsTools: true,
      supportsMcp: true,
      supportsVision: true,
    });
  });
```

Em `poui-vscode/src/test/unit/codexAdapter.test.ts`, dentro do bloco `describe('codexAdapter.parseLine', ...)`, logo depois do teste `'exposes the codex id and binary name'`, adicione:

```ts

  it('exposes capabilities: no tool restriction, no MCP, vision unconfirmed but assumed supported', () => {
    assert.deepStrictEqual(codexAdapter.capabilities, {
      restrictsTools: false,
      supportsMcp: false,
      supportsVision: true,
    });
  });
```

Em `poui-vscode/src/test/unit/geminiAdapter.test.ts`, dentro do bloco `describe('geminiAdapter.parseLine', ...)`, logo depois do teste `'exposes the gemini id and binary name'`, adicione:

```ts

  it('exposes capabilities: no tool restriction, no MCP, no vision (documented gap)', () => {
    assert.deepStrictEqual(geminiAdapter.capabilities, {
      restrictsTools: false,
      supportsMcp: false,
      supportsVision: false,
    });
  });
```

- [ ] **Step 2: Rodar os 3 arquivos de teste e confirmar que falham**

Run: `cd poui-vscode && npx mocha --require ts-node/register --timeout 15000 "src/test/unit/claudeAdapter.test.ts" "src/test/unit/codexAdapter.test.ts" "src/test/unit/geminiAdapter.test.ts"`
Expected: FAIL nos 3 novos testes — `claudeAdapter.capabilities`/`codexAdapter.capabilities`/`geminiAdapter.capabilities` são `undefined` (o campo ainda não existe), então `assert.deepStrictEqual(undefined, {...})` falha.

- [ ] **Step 3: Adicionar `EngineCapabilities` e o campo `capabilities` em `engineTypes.ts`**

Em `poui-vscode/src/engineTypes.ts`, logo antes de `export interface EngineAdapter {`, adicione:

```ts
export interface EngineCapabilities {
  /** Se true, o motor respeita `RunAgentOptions.tools`/`allowedTools` para
   * restringir quais ferramentas o agente pode usar — usado por comandos
   * como `poui.review` que dependem de rodar sem Write/Edit. */
  restrictsTools: boolean;
  /** Se true, o motor suporta `RunAgentOptions.mcpConfig` — usado hoje só
   * por `poui.generate.e2e` para dar acesso ao MCP do Playwright. */
  supportsMcp: boolean;
  /** Se true, o motor pode processar uma imagem enviada no prompt — usado
   * por `poui.generate.screenshot`. */
  supportsVision: boolean;
}

```

Dentro de `export interface EngineAdapter {`, entre a linha `binaryName: string;` e a linha `buildCommand(`, adicione uma nova linha:

```ts
  /** O que este motor garante ou não garante hoje — usado pelos comandos
   * que dependem de uma garantia específica (restrição de ferramentas,
   * MCP, visão) pra avisar o usuário em vez de assumir silenciosamente
   * que a garantia vale pra qualquer motor selecionado. */
  capabilities: EngineCapabilities;
```

- [ ] **Step 4: Declarar `capabilities` nos 3 adapters**

Em `poui-vscode/src/claudeAdapter.ts`, troque:

```ts
export const claudeAdapter: EngineAdapter = {
  id: 'claude',
  binaryName: 'claude',
  buildCommand,
  parseLine,
};
```

por:

```ts
export const claudeAdapter: EngineAdapter = {
  id: 'claude',
  binaryName: 'claude',
  capabilities: { restrictsTools: true, supportsMcp: true, supportsVision: true },
  buildCommand,
  parseLine,
};
```

Em `poui-vscode/src/codexAdapter.ts`, troque:

```ts
export const codexAdapter: EngineAdapter = {
  id: 'codex',
  binaryName: 'codex',
  buildCommand,
  parseLine,
};
```

por:

```ts
export const codexAdapter: EngineAdapter = {
  id: 'codex',
  binaryName: 'codex',
  // TODO(codex): restrictsTools/supportsMcp confirmados como false porque
  // buildCommand acima não usa options.tools/allowedTools/mcpConfig hoje —
  // não há flag documentada publicamente pra isso ainda (ver spec, seção
  // "Riscos", itens 1-2). supportsVision fica true por falta de evidência
  // em contrário — nenhuma pesquisa encontrou um gap de visão documentado
  // pro Codex (diferente do Gemini); validar quando houver acesso real a
  // uma conta Codex.
  capabilities: { restrictsTools: false, supportsMcp: false, supportsVision: true },
  buildCommand,
  parseLine,
};
```

Em `poui-vscode/src/geminiAdapter.ts`, troque:

```ts
export const geminiAdapter: EngineAdapter = {
  id: 'gemini',
  binaryName: 'gemini',
  buildCommand,
  parseLine,
};
```

por:

```ts
export const geminiAdapter: EngineAdapter = {
  id: 'gemini',
  binaryName: 'gemini',
  // TODO(gemini): restrictsTools/supportsMcp confirmados como false porque
  // buildCommand acima não usa options.tools/allowedTools/mcpConfig hoje —
  // não há flag documentada publicamente pra isso ainda (ver spec, seção
  // "Riscos", item 2). supportsVision é false porque o gap de visão do
  // Gemini CLI está confirmado e documentado no spec (seção "Riscos").
  capabilities: { restrictsTools: false, supportsMcp: false, supportsVision: false },
  buildCommand,
  parseLine,
};
```

- [ ] **Step 5: Corrigir os 3 objetos `EngineAdapter` fake em `agentRuntime.test.ts` (senão o compile quebra)**

`capabilities` agora é obrigatório na interface `EngineAdapter` — os 3 objetos literais tipados `EngineAdapter` em `poui-vscode/src/test/unit/agentRuntime.test.ts` precisam do campo, senão `npm run compile` falha (nenhum comportamento de teste muda, é só satisfazer o tipo).

Na função `makeFakeAdapter` (perto do topo do arquivo), troque:

```ts
function makeFakeAdapter(eventsByLine: Record<string, NormalizedEvent[]>): EngineAdapter {
  return {
    id: 'claude',
    binaryName: 'fake-cli',
    buildCommand: () => ({ command: 'fake-cli', args: [] }),
    parseLine: (line: string) => eventsByLine[line] ?? [],
  };
}
```

por:

```ts
function makeFakeAdapter(eventsByLine: Record<string, NormalizedEvent[]>): EngineAdapter {
  return {
    id: 'claude',
    binaryName: 'fake-cli',
    capabilities: { restrictsTools: true, supportsMcp: true, supportsVision: true },
    buildCommand: () => ({ command: 'fake-cli', args: [] }),
    parseLine: (line: string) => eventsByLine[line] ?? [],
  };
}
```

No teste que verifica o ciclo de vida do temp-file no caminho de sucesso (o `const adapter: EngineAdapter = {` cujo `buildCommand` lê `systemPromptFile`/`mcpConfigFile` de forma síncrona), adicione a mesma linha `capabilities: { restrictsTools: true, supportsMcp: true, supportsVision: true },` logo depois de `binaryName: 'fake-cli',`:

```ts
    const adapter: EngineAdapter = {
      id: 'claude',
      binaryName: 'fake-cli',
      capabilities: { restrictsTools: true, supportsMcp: true, supportsVision: true },
      buildCommand: (_options, systemPromptFile, mcpConfigFile) => {
```

No teste que verifica a limpeza do temp-file no caminho de falha (o segundo `const adapter: EngineAdapter = {`, cujo `buildCommand` só captura `systemPromptFile`), aplique a mesma adição:

```ts
    const adapter: EngineAdapter = {
      id: 'claude',
      binaryName: 'fake-cli',
      capabilities: { restrictsTools: true, supportsMcp: true, supportsVision: true },
      buildCommand: (_options, systemPromptFile) => {
```

- [ ] **Step 6: Rodar os 3 arquivos de teste de adapter e confirmar que passam**

Run: `cd poui-vscode && npx mocha --require ts-node/register --timeout 15000 "src/test/unit/claudeAdapter.test.ts" "src/test/unit/codexAdapter.test.ts" "src/test/unit/geminiAdapter.test.ts"`
Expected: PASS — os 3 novos testes de capabilities verdes, mais todos os testes que já existiam nesses 3 arquivos continuam verdes.

- [ ] **Step 7: Compilar e rodar a suíte inteira**

Run: `cd poui-vscode && npm run compile`
Expected: sem erros de TypeScript (isso confirma que os 3 fakes em `agentRuntime.test.ts` foram corrigidos corretamente).

Run: `cd poui-vscode && npm run test:unit`
Expected: 100% verde (298 testes + os 3 novos desta task = 301).

- [ ] **Step 8: Commit**

```bash
git add poui-vscode/src/engineTypes.ts poui-vscode/src/claudeAdapter.ts poui-vscode/src/codexAdapter.ts poui-vscode/src/geminiAdapter.ts poui-vscode/src/test/unit/claudeAdapter.test.ts poui-vscode/src/test/unit/codexAdapter.test.ts poui-vscode/src/test/unit/geminiAdapter.test.ts poui-vscode/src/test/unit/agentRuntime.test.ts
git commit -m "feat(vscode-ext): add EngineCapabilities to EngineAdapter

Declares what each engine does and doesn't honor today
(restrictsTools/supportsMcp/supportsVision) — consumed by the next
tasks so generateReview/generateE2e/generateScreenshot can warn
instead of silently assuming a guarantee that codex/gemini don't
provide.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 2: Trocar `EngineId` inline por import em 7 arquivos de comando

**Files:**
- Modify: `poui-vscode/src/generateComponent.ts:1-8,45`
- Modify: `poui-vscode/src/generateConnect.ts:1-15,32`
- Modify: `poui-vscode/src/generateDocs.ts:1-6,19`
- Modify: `poui-vscode/src/generateE2e.ts:1-10,50`
- Modify: `poui-vscode/src/generateReview.ts:1-5,34`
- Modify: `poui-vscode/src/generateScreenshot.ts:1-8,40`
- Modify: `poui-vscode/src/generateTest.ts:1-7,28`

**Interfaces:**
- Consumes: `EngineId` de `./engineTypes` (já existe, só nunca foi importado nesses 7 arquivos).
- Produces: nada novo — troca cosmética de tipo, sem mudança de comportamento em runtime.

Todos os 7 arquivos têm a mesma linha, com o mesmo tipo inline `<'claude' | 'codex' | 'gemini'>`. Essa é uma correção mecânica idêntica repetida 7 vezes — trate como um único lote de edições, não como 7 decisões separadas.

### Passo a passo

- [ ] **Step 1: `generateComponent.ts`**

No topo do arquivo, adicione a import (depois da linha `import { runAgent } from './agentRuntime';` — confirme o nome exato da linha de import de `runAgent`/`checkEngineAvailable` já presente no arquivo antes de inserir, a ordem relativa às outras imports não importa):

```ts
import { EngineId } from './engineTypes';
```

Na linha (por volta da 45):
```ts
    const engineId = vscode.workspace.getConfiguration('poui').get<'claude' | 'codex' | 'gemini'>('aiEngine', 'claude');
```
troque por:
```ts
    const engineId = vscode.workspace.getConfiguration('poui').get<EngineId>('aiEngine', 'claude');
```

- [ ] **Step 2: `generateConnect.ts`**

Mesmo padrão do Step 1: adicionar `import { EngineId } from './engineTypes';` no topo, e trocar a linha (por volta da 32) `get<'claude' | 'codex' | 'gemini'>('aiEngine', 'claude')` por `get<EngineId>('aiEngine', 'claude')`.

- [ ] **Step 3: `generateDocs.ts`**

Mesmo padrão: import no topo, linha ~19 trocada.

- [ ] **Step 4: `generateE2e.ts`**

Mesmo padrão: import no topo, linha ~50 trocada.

- [ ] **Step 5: `generateReview.ts`**

Mesmo padrão: import no topo, linha ~34 trocada.

- [ ] **Step 6: `generateScreenshot.ts`**

Mesmo padrão: import no topo, linha ~40 trocada.

- [ ] **Step 7: `generateTest.ts`**

Mesmo padrão: import no topo, linha ~28 trocada.

- [ ] **Step 8: Compilar e rodar a suíte inteira**

Run: `cd poui-vscode && npm run compile`
Expected: sem erros de TypeScript — `EngineId` é exatamente `'claude' | 'codex' | 'gemini'`, então o tipo do `.get<...>()` não muda, só a forma de referenciá-lo.

Run: `cd poui-vscode && npm run test:unit`
Expected: 100% verde, mesma contagem da Task 1 (nenhum destes 7 arquivos tem teste unitário próprio).

- [ ] **Step 9: Commit**

```bash
git add poui-vscode/src/generateComponent.ts poui-vscode/src/generateConnect.ts poui-vscode/src/generateDocs.ts poui-vscode/src/generateE2e.ts poui-vscode/src/generateReview.ts poui-vscode/src/generateScreenshot.ts poui-vscode/src/generateTest.ts
git commit -m "refactor(vscode-ext): import EngineId instead of inlining the literal union in 7 command files

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 3: Aviso de capacidade em `generateReview.ts` (restrictsTools)

**Files:**
- Modify: `poui-vscode/src/generateReview.ts`

**Interfaces:**
- Consumes: `getEngineAdapter` de `./engineRegistry` (já existe desde antes deste plano), `EngineAdapter.capabilities.restrictsTools` (Task 1).
- Produces: nada novo — só um `outputChannel.appendLine` condicional.

### Passo a passo

- [ ] **Step 1: Import**

No topo do arquivo, adicione:

```ts
import { getEngineAdapter } from './engineRegistry';
```

- [ ] **Step 2: Aviso logo após o output channel ficar visível**

Localize este trecho (perto do fim do arquivo, onde o output channel já foi limpo/mostrado e a linha "Revisando..." já foi escrita):

```ts
    outputChannel.clear();
    outputChannel.show(true);
    outputChannel.appendLine(`Revisando ${relativePath} (foco: ${focusChoice.label})...`);

    const assetsDir = path.join(context.extensionUri.fsPath, 'assets', 'agent-prompts');
```

Troque por (adiciona o bloco de aviso entre as duas partes já existentes):

```ts
    outputChannel.clear();
    outputChannel.show(true);
    outputChannel.appendLine(`Revisando ${relativePath} (foco: ${focusChoice.label})...`);

    if (!getEngineAdapter(engineId).capabilities.restrictsTools) {
      outputChannel.appendLine(
        `⚠ o motor "${engineId}" não garante que a revisão seja somente-leitura (restrição de ferramentas não suportada) — o agente pode escrever no workspace durante a revisão.`,
      );
    }

    const assetsDir = path.join(context.extensionUri.fsPath, 'assets', 'agent-prompts');
```

- [ ] **Step 3: Compilar**

Run: `cd poui-vscode && npm run compile`
Expected: sem erros.

- [ ] **Step 4: Verificação manual do texto (não há teste unitário para comandos)**

Leia o arquivo modificado e confirme visualmente: (a) o aviso só aparece quando `capabilities.restrictsTools` é `false` — para `claude` (capabilities de Task 1: `restrictsTools: true`) o bloco `if` nunca executa; (b) o comando continua chamando `runAgent` normalmente logo depois, sem `return` — não bloqueia.

- [ ] **Step 5: Rodar a suíte inteira**

Run: `cd poui-vscode && npm run test:unit`
Expected: 100% verde, mesma contagem da Task 2.

- [ ] **Step 6: Commit**

```bash
git add poui-vscode/src/generateReview.ts
git commit -m "feat(vscode-ext): warn when the configured engine doesn't guarantee a read-only review

codex/gemini adapters don't honor RunAgentOptions.tools yet, so the
read-only restriction poui.review depends on silently doesn't hold on
those 2 engines — now surfaced as a warning in the output channel
(warn and still attempt, per the project's existing capability policy).

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 4: Aviso de capacidade em `generateE2e.ts` (supportsMcp)

**Files:**
- Modify: `poui-vscode/src/generateE2e.ts`

**Interfaces:**
- Consumes: `getEngineAdapter` de `./engineRegistry`, `EngineAdapter.capabilities.supportsMcp` (Task 1).
- Produces: nada novo.

### Passo a passo

- [ ] **Step 1: Import**

No topo do arquivo, adicione:

```ts
import { getEngineAdapter } from './engineRegistry';
```

- [ ] **Step 2: Aviso logo após a linha "Gerando teste E2E..."**

Localize:

```ts
    const previewUrl = `http://localhost:${port}/${registration.routeSegment}`;
    outputChannel.appendLine(`Gerando teste E2E para ${relativePath} contra ${previewUrl}...`);

    const assetsDir = path.join(context.extensionUri.fsPath, 'assets', 'agent-prompts');
```

Troque por:

```ts
    const previewUrl = `http://localhost:${port}/${registration.routeSegment}`;
    outputChannel.appendLine(`Gerando teste E2E para ${relativePath} contra ${previewUrl}...`);

    if (!getEngineAdapter(engineId).capabilities.supportsMcp) {
      outputChannel.appendLine(
        `⚠ o motor "${engineId}" não suporta MCP — o agente não terá acesso às ferramentas do Playwright (browser_navigate/browser_snapshot/browser_wait_for) e a geração do teste E2E pode falhar ou ficar incompleta.`,
      );
    }

    const assetsDir = path.join(context.extensionUri.fsPath, 'assets', 'agent-prompts');
```

- [ ] **Step 3: Compilar**

Run: `cd poui-vscode && npm run compile`
Expected: sem erros.

- [ ] **Step 4: Verificação manual do texto**

Confirme visualmente: o aviso só aparece quando `capabilities.supportsMcp` é `false` (claude tem `supportsMcp: true`, então nunca vê esse aviso); o comando continua chamando `runAgent` com `mcpConfig: buildPlaywrightMcpConfig()` normalmente logo depois, sem `return`.

- [ ] **Step 5: Rodar a suíte inteira**

Run: `cd poui-vscode && npm run test:unit`
Expected: 100% verde.

- [ ] **Step 6: Commit**

```bash
git add poui-vscode/src/generateE2e.ts
git commit -m "feat(vscode-ext): warn when the configured engine doesn't support MCP (Playwright tools)

codex/gemini adapters silently drop RunAgentOptions.mcpConfig, so
generateE2e's Playwright MCP tools are unavailable on those 2 engines
— now surfaced as a warning before the agent runs (warn and still
attempt).

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 5: Aviso de capacidade em `generateScreenshot.ts` (supportsVision)

**Files:**
- Modify: `poui-vscode/src/generateScreenshot.ts`

**Interfaces:**
- Consumes: `getEngineAdapter` de `./engineRegistry`, `EngineAdapter.capabilities.supportsVision` (Task 1).
- Produces: nada novo.

### Passo a passo

- [ ] **Step 1: Import**

No topo do arquivo, adicione:

```ts
import { getEngineAdapter } from './engineRegistry';
```

- [ ] **Step 2: Aviso logo após ler `engineId`**

Localize:

```ts
    const engineId = vscode.workspace.getConfiguration('poui').get<EngineId>('aiEngine', 'claude');

    let analysisSystemPrompt: string;
```

(a linha do `engineId` já deve estar usando `EngineId` — resultado da Task 2 — não `'claude' | 'codex' | 'gemini'` inline.)

Troque por:

```ts
    const engineId = vscode.workspace.getConfiguration('poui').get<EngineId>('aiEngine', 'claude');

    if (!getEngineAdapter(engineId).capabilities.supportsVision) {
      outputChannel.appendLine(
        `⚠ o motor "${engineId}" pode não suportar entrada de imagem — a análise do screenshot pode falhar ou ignorar a imagem enviada.`,
      );
    }

    let analysisSystemPrompt: string;
```

- [ ] **Step 3: Compilar**

Run: `cd poui-vscode && npm run compile`
Expected: sem erros.

- [ ] **Step 4: Verificação manual do texto**

Confirme visualmente: (a) o aviso aparece pra `codex` (capabilities de Task 1: `supportsVision: true` — **não** deveria aparecer) e pra `gemini` (`supportsVision: false` — **deveria** aparecer); releia a Task 1 se a lógica do `if` parecer invertida — o aviso só deve aparecer quando `supportsVision` é `false`; (b) o output channel já foi `clear()`/`show(true)`/`appendLine('Analisando...')` antes deste ponto (linhas anteriores do arquivo), então o aviso é visível assim que aparece, não é apagado por um `clear()` posterior.

- [ ] **Step 5: Rodar a suíte inteira**

Run: `cd poui-vscode && npm run test:unit`
Expected: 100% verde.

- [ ] **Step 6: Commit**

```bash
git add poui-vscode/src/generateScreenshot.ts
git commit -m "feat(vscode-ext): warn when the configured engine may not support vision input

Gemini has a documented, still-open vision/image-input gap — now
surfaced as a warning before the screenshot analysis runs (warn and
still attempt). Deferred from the original docs/i18n follow-up plan
into this one since the capabilities field already exists here.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 6: Blindar `agentRuntime.ts` contra um `parseLine` que lança exceção

**Files:**
- Modify: `poui-vscode/src/agentRuntime.ts`
- Modify: `poui-vscode/src/test/unit/agentRuntime.test.ts`

**Interfaces:**
- Consumes: nada novo.
- Produces: nada novo — comportamento defensivo interno, sem mudança de assinatura pública.

O contrato documentado de `EngineAdapter.parseLine` (`engineTypes.ts`) diz "Função pura... Nunca lança", mas `claudeAdapter`/`codexAdapter`/`geminiAdapter` podem lançar em entrada malformada (ex: uma linha JSON válida mas com `message.message` ausente pro caso `assistant`). Hoje nada em `agentRuntime.ts` protege essa chamada — uma exceção dentro do handler `rl.on('line', ...)` propagaria como uma rejeição não tratada e a `Promise` de `runAgentWithAdapter` nunca resolveria, travando o comando indefinidamente. Esta task adiciona um `try/catch` só ao redor da chamada de `parseLine`, sem mudar nenhum outro comportamento.

### Passo a passo

- [ ] **Step 1: Escrever o teste (falhando)**

Em `poui-vscode/src/test/unit/agentRuntime.test.ts`, dentro do `describe('runAgent', ...)` já existente, adicione um novo teste (usando os helpers `RecordingSink`/`makeFakeProcess`/`makeFakeAdapter` já definidos no topo do arquivo):

```ts

  it('logs a warning and keeps processing when parseLine throws on a malformed line', async () => {
    const sink = new RecordingSink();
    const adapter: EngineAdapter = {
      id: 'claude',
      binaryName: 'fake-cli',
      capabilities: { restrictsTools: true, supportsMcp: true, supportsVision: true },
      buildCommand: () => ({ command: 'fake-cli', args: [] }),
      parseLine: (line: string) => {
        if (line === 'L1') {
          throw new Error('linha malformada');
        }
        return line === 'L2' ? [{ kind: 'result', success: true }] : [];
      },
    };
    const spawnFn: SpawnFn = () => makeFakeProcess({ lines: ['L1', 'L2'] });

    const result = await runAgentWithAdapter(adapter, { cwd: '/tmp/workspace', systemPrompt: 'sys', userPrompt: 'u' }, sink, spawnFn);

    assert.strictEqual(result.succeeded, true);
    assert.ok(sink.lines.some((l) => l.includes('linha malformada')));
  });
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd poui-vscode && npx mocha --require ts-node/register --timeout 15000 "src/test/unit/agentRuntime.test.ts"`
Expected: FAIL no novo teste — sem o `try/catch`, a exceção lançada por `parseLine('L1')` propaga de dentro do handler `rl.on('line', ...)`; o teste trava até o timeout de 15000ms e falha por timeout (não por uma assertion), porque `L2` nunca chega a ser processado.

- [ ] **Step 3: Implementar o `try/catch`**

Em `poui-vscode/src/agentRuntime.ts`, dentro de `runAgentWithAdapter`, localize:

```ts
      rl.on('line', (line) => {
        if (!line.trim()) {
          return;
        }
        for (const event of adapter.parseLine(line)) {
```

Troque por:

```ts
      rl.on('line', (line) => {
        if (!line.trim()) {
          return;
        }
        let events: ReturnType<typeof adapter.parseLine>;
        try {
          events = adapter.parseLine(line);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          sink.appendLine(`⚠ linha de saída do agente ignorada (parse falhou): ${message}`);
          return;
        }
        for (const event of events) {
```

Note que o `for` original já tinha seu próprio corpo (`{ ... }`) — mantenha esse corpo exatamente como está, só troque a linha `for (const event of adapter.parseLine(line)) {` pela nova linha `for (const event of events) {` que agora vem depois do `try/catch`.

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `cd poui-vscode && npx mocha --require ts-node/register --timeout 15000 "src/test/unit/agentRuntime.test.ts"`
Expected: PASS — o novo teste verde, e todos os testes que já existiam em `agentRuntime.test.ts` continuam verdes (o `try/catch` não muda o caminho de sucesso, só protege contra exceção).

- [ ] **Step 5: Compilar e rodar a suíte inteira**

Run: `cd poui-vscode && npm run compile`
Expected: sem erros.

Run: `cd poui-vscode && npm run test:unit`
Expected: 100% verde.

- [ ] **Step 6: Commit**

```bash
git add poui-vscode/src/agentRuntime.ts poui-vscode/src/test/unit/agentRuntime.test.ts
git commit -m "fix(vscode-ext): guard against a throwing EngineAdapter.parseLine

parseLine's contract says it never throws, but all 3 adapters can on
malformed input — an uncaught throw inside the readline handler would
hang the command forever (the promise never resolves). Now caught,
logged to the sink, and the line is skipped so processing continues.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Self-Review (feito ao escrever este plano)

**Cobertura das 3 decisões do usuário**: (1) política "avisa e tenta mesmo assim" pro `generateReview` → Task 3. (2) aviso de visão do Gemini pro `generateScreenshot` incluído neste plano (não deixado pro plano de docs/i18n) → Task 5. (3) os 2 achados Minor (EngineId inline, `parseLine` pode lançar) → Tasks 2 e 6.

**Ordem das tasks**: Task 1 primeiro (todo o resto depende de `capabilities` existir). Task 2 (import de `EngineId`) antes das Tasks 3-5 para evitar que a mesma task edite a mesma linha de tipo duas vezes (Task 2 já deixa `generateReview.ts`/`generateE2e.ts`/`generateScreenshot.ts` com `EngineId` importado antes de essas 3 tasks tocarem os mesmos arquivos de novo). Task 6 é independente e fica por último.

**Risco de sobreposição verificado**: Task 1 já inclui a correção dos 3 fakes `EngineAdapter` em `agentRuntime.test.ts` que quebrariam de compilar assim que `capabilities` virasse campo obrigatório — sem isso, `npm run compile` falharia já na Task 1, antes mesmo da Task 6 (que também mexe no mesmo arquivo de teste) rodar. As Tasks 3/4/5 tocam arquivos distintos entre si (`generateReview.ts`/`generateE2e.ts`/`generateScreenshot.ts`) e não colidem com a Task 6 (`agentRuntime.ts` + seu teste).

**Consistência de tipos**: `EngineCapabilities` com as mesmas 3 chaves (`restrictsTools`/`supportsMcp`/`supportsVision`) usado identicamente na Task 1 (declaração + 3 adapters + 3 testes) e nas Tasks 3-5 (leitura via `getEngineAdapter(engineId).capabilities.<chave>`). Nenhuma task usa um nome de campo diferente do declarado na Task 1.

**Fora de escopo (confirmado com o usuário)**: `model`/`effort`/`addDir` ignorados por codex/gemini não entram no campo `capabilities` deste plano — só os 3 gaps concretos já encontrados na revisão final (tools/mcp/vision). Se o usuário quiser cobrir isso depois, é outro plano.
