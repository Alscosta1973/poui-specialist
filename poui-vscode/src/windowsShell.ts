/** Escapa um único argumento seguindo a regra do runtime C da Microsoft (a
 * mesma que `CommandLineToArgvW` espera) — trata sequências de barras
 * invertidas consecutivas antes de uma aspas de forma especial. Devolve o
 * argumento sem aspas quando ele não contém espaço/tab/aspas (nenhuma
 * escapagem necessária). */
function quoteWindowsArg(arg: string): string {
  if (arg.length > 0 && !/[ \t"]/.test(arg)) {
    return arg;
  }
  let result = '"';
  for (let i = 0; i <= arg.length; i++) {
    let backslashCount = 0;
    while (i < arg.length && arg[i] === '\\') {
      backslashCount++;
      i++;
    }
    if (i === arg.length) {
      result += '\\'.repeat(backslashCount * 2);
      break;
    } else if (arg[i] === '"') {
      result += '\\'.repeat(backslashCount * 2 + 1) + '"';
    } else {
      result += '\\'.repeat(backslashCount) + arg[i];
    }
  }
  return result + '"';
}

/** Monta uma única string de linha de comando, com cada argumento
 * corretamente escapado.
 *
 * Necessário no Windows quando `shell: true` é usado pra invocar um shim
 * `.cmd`/`.ps1` do npm (ex.: os binários de codex/gemini, que não são
 * `.exe` nativos — ver `agentRuntime.ts`/`cliCheck.ts`): passar
 * `command`+`args` separadamente pro `spawn`/`execFile` com `shell: true`
 * deixa o Node fazer sua própria escapagem por argumento, que o script de
 * shim (`%*` dentro do `.cmd`) reprocessa e corrompe fronteiras de
 * argumento em valores com espaço — achado confirmado via teste manual
 * real (um prompt com espaço virava "positional prompt" duplicado junto
 * com o `-p`). Montar a linha inteira nós mesmos, com a escapagem correta,
 * e mandar pro spawn/execFile como uma string única (sem `args` separado)
 * evita essa dupla reinterpretação. */
export function buildWindowsCommandLine(command: string, args: string[]): string {
  return [command, ...args].map(quoteWindowsArg).join(' ');
}
