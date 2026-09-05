/** Escapa um argumento pra uma string literal de PowerShell de aspas
 * simples — só precisa dobrar aspas simples internas. Diferente de
 * `cmd.exe`, aceita quebra de linha literal dentro da string sem quebrar
 * o comando, o que é crítico aqui: os prompts desta extensão são
 * frequentemente multi-linha. */
function quotePowerShellArg(arg: string): string {
  return `'${arg.replace(/'/g, "''")}'`;
}

/** Monta um script PowerShell de uma linha (`& <comando> <args...>`) que
 * invoca o binário via o operador de chamada `&`, com cada argumento
 * corretamente escapado.
 *
 * Necessário no Windows por dois motivos, ambos confirmados via teste
 * manual real nesta sessão: (1) codex/gemini são instalados pelo npm
 * como shims `.cmd`/`.ps1` (não `.exe` nativo) — `spawn()` sem uma
 * camada de shell falha com "spawn <cmd> ENOENT" pra eles; (2) uma
 * tentativa anterior de corrigir isso invocando via `cmd.exe`
 * (`shell: true` + escapagem manual de linha de comando) quebrava com
 * prompts multi-linha — `cmd.exe` não aceita quebra de linha literal
 * dentro de UM comando, cortando o texto (e os argumentos que viriam
 * depois, como `--skip-trust`) no meio. PowerShell aceita uma string de
 * aspas simples com quebra de linha embutida sem nenhum tratamento
 * especial, e `spawn('powershell.exe', [...])` sem `shell:true`
 * funciona sem o problema do shim porque `powershell.exe` em si é um
 * `.exe` nativo. */
export function buildPowerShellInvocation(command: string, args: string[]): string {
  return ['&', quotePowerShellArg(command), ...args.map(quotePowerShellArg)].join(' ');
}
