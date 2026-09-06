// poui-vscode/src/runAgentForCommand.ts
import { CredentialContext, getCredentialEnv } from './engineCredentials';
import { runAgent, GenerateResult, OutputSink, RunAgentOptions, SpawnFn } from './agentRuntime';
import { EngineId } from './engineTypes';

const TIMEOUT_RESULT: GenerateResult = {
  filesWritten: [],
  succeeded: false,
  errorMessage: 'tempo esgotado aguardando resposta do motor.',
};

/** Ponto único de injeção de credencial (Abordagem B) — resolve a
 * credencial salva pro motor e delega pro `runAgent` já existente.
 * `timeoutMs` é opcional e SEM valor default: só a validação de
 * `poui.configureEngine` passa um valor — geração real e o loop de
 * correção de build (que já levam bem mais que 30s) não devem ter teto. */
export async function runAgentForCommand(
  context: CredentialContext,
  engineId: EngineId,
  options: RunAgentOptions,
  sink: OutputSink,
  spawnFn?: SpawnFn,
  timeoutMs?: number,
): Promise<GenerateResult> {
  const credentialEnv = await getCredentialEnv(context, engineId);
  const runPromise = runAgent(options, sink, engineId, spawnFn, credentialEnv);
  if (timeoutMs === undefined) {
    return runPromise;
  }
  return Promise.race([
    runPromise,
    new Promise<GenerateResult>((resolve) => {
      setTimeout(() => resolve(TIMEOUT_RESULT), timeoutMs);
    }),
  ]);
}

/** Fecha sobre `context`/`spawnFn` e devolve uma função no formato exato
 * do tipo `AgentRunner` de `buildFixLoop.ts` — usado pra injetar
 * credencial no loop de correção de build sem duplicar a resolução em
 * cada um dos três comandos que o chamam (ver Task 7). Nunca passa
 * `timeoutMs` — correção de build é geração real, sem teto de 30s. */
export function createAgentRunner(
  context: CredentialContext,
  spawnFn?: SpawnFn,
): (options: RunAgentOptions, sink: OutputSink, engineId: EngineId) => Promise<GenerateResult> {
  return (options, sink, engineId) => runAgentForCommand(context, engineId, options, sink, spawnFn);
}
