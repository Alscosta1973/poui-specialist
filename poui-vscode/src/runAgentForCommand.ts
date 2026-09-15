// poui-vscode/src/runAgentForCommand.ts
import { CredentialContext, getCredentialEnv } from './engineCredentials';
import { runAgent, GenerateResult, OutputSink, RunAgentOptions, SpawnFn } from './agentRuntime';
import { EngineId } from './engineTypes';

// Achado real (2026-09-15): motores com camada gratuita (Gemini) fazem
// retry-with-backoff sozinhos em erro 503 ("alta demanda") do servidor do
// Google, e isso pode passar de 60s — não é erro nosso nem credencial
// errada, é o servidor do provedor mesmo. Mensagem explica isso em vez de
// só dizer "timeout" seco, pra não parecer bug da extensão.
export const TIMEOUT_ERROR_MESSAGE =
  'tempo esgotado aguardando resposta do motor — se for um motor com camada gratuita (ex: Gemini), pode ser alta demanda temporária no servidor; tente de novo em alguns instantes.';

const TIMEOUT_RESULT: GenerateResult = {
  filesWritten: [],
  succeeded: false,
  errorMessage: TIMEOUT_ERROR_MESSAGE,
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
