import * as path from 'node:path';
import { runBuild, parseBuildErrors, BuildError, RunBuildFn } from './buildVerify';
import { runAgent, GenerateResult, OutputSink, RunAgentOptions } from './agentRuntime';
import { EngineId } from './engineTypes';

const MAX_FIX_ATTEMPTS = 3;

export interface BuildFixOptions {
  cwd: string;
  /** Caminhos (relativos ao `cwd` ou absolutos) dos arquivos escritos pela
   * geração original — só erros nesses arquivos disparam uma correção. */
  filesWritten: string[];
  /** Mesmo system prompt usado na geração original — já carrega as regras/
   * quirks certas do tipo, reaproveitadas para a correção. */
  systemPrompt: string;
  engineId: EngineId;
  model?: string;
  effort?: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
}

export interface BuildFixResult {
  finalSuccess: boolean;
  /** Total de builds executados (1 inicial + 1 por tentativa de correção que chegou a rodar). */
  attempts: number;
  fixedFiles: string[];
  remainingErrors: BuildError[];
  preexistingErrors: BuildError[];
}

type AgentRunner = (options: RunAgentOptions, sink: OutputSink, engineId: EngineId) => Promise<GenerateResult>;

function normalize(cwd: string, file: string): string {
  return path.resolve(cwd, file).toLowerCase();
}

function buildFixUserPrompt(errors: BuildError[], filesToFix: string[]): string {
  const errorSummary = errors
    .map((e) => `${e.file}${e.line ? `:${e.line}:${e.column}` : ''} — ${e.message}`)
    .join('\n');
  return [
    'O build do projeto falhou com os seguintes erros nos arquivos que você acabou de gerar:',
    '',
    errorSummary,
    '',
    `Corrija apenas estes arquivos: ${filesToFix.join(', ')}.`,
    'Use Read para ler o arquivo antes de editar, e Edit para aplicar a correção mínima',
    'necessária. Não reescreva o arquivo inteiro nem modifique nenhum outro arquivo.',
  ].join('\n');
}

export async function runBuildFixLoop(
  options: BuildFixOptions,
  sink: OutputSink,
  buildRunner: RunBuildFn = runBuild,
  agentRunner: AgentRunner = runAgent,
): Promise<BuildFixResult> {
  const writtenSet = new Set(options.filesWritten.map((f) => normalize(options.cwd, f)));
  const fixedFiles: string[] = [];

  let buildResult = await buildRunner(options.cwd);
  let totalBuilds = 1;

  if (buildResult.success) {
    sink.appendLine(`✓ Build passou na tentativa ${totalBuilds}.`);
    return { finalSuccess: true, attempts: totalBuilds, fixedFiles, remainingErrors: [], preexistingErrors: [] };
  }

  let allErrors = parseBuildErrors(buildResult.output);

  for (let fixAttempt = 1; fixAttempt <= MAX_FIX_ATTEMPTS; fixAttempt++) {
    const ourErrors = allErrors.filter((e) => e.file && writtenSet.has(normalize(options.cwd, e.file)));
    const preexisting = allErrors.filter((e) => !e.file || !writtenSet.has(normalize(options.cwd, e.file)));

    if (ourErrors.length === 0) {
      sink.appendLine(
        '✗ Build falhou, mas nenhum erro está nos arquivos gerados — não corrigindo automaticamente.',
      );
      return { finalSuccess: false, attempts: totalBuilds, fixedFiles, remainingErrors: allErrors, preexistingErrors: preexisting };
    }

    const filesToFix = [...new Set(ourErrors.map((e) => e.file as string))];
    sink.appendLine(
      `✗ Build falhou com ${ourErrors.length} erro(s) nos arquivos gerados — corrigindo (tentativa ${fixAttempt}/${MAX_FIX_ATTEMPTS})...`,
    );

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

    for (const file of filesToFix) {
      if (!fixedFiles.includes(file)) {
        fixedFiles.push(file);
      }
    }

    if (!fixResult.succeeded) {
      sink.appendLine(`✗ Falha ao tentar corrigir: ${fixResult.errorMessage ?? 'erro desconhecido'}.`);
      return { finalSuccess: false, attempts: totalBuilds, fixedFiles, remainingErrors: allErrors, preexistingErrors: preexisting };
    }

    buildResult = await buildRunner(options.cwd);
    totalBuilds++;

    if (buildResult.success) {
      sink.appendLine(`✓ Build passou na tentativa ${totalBuilds}.`);
      return { finalSuccess: true, attempts: totalBuilds, fixedFiles, remainingErrors: [], preexistingErrors: preexisting };
    }

    allErrors = parseBuildErrors(buildResult.output);
  }

  const finalPreexisting = allErrors.filter((e) => !e.file || !writtenSet.has(normalize(options.cwd, e.file)));
  const finalOurCount = allErrors.length - finalPreexisting.length;
  sink.appendLine(`✗ ${finalOurCount} erro(s) restante(s) após ${MAX_FIX_ATTEMPTS} tentativas de correção.`);
  return { finalSuccess: false, attempts: totalBuilds, fixedFiles, remainingErrors: allErrors, preexistingErrors: finalPreexisting };
}
