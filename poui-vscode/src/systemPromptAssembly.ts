import * as fs from 'node:fs/promises';
import * as path from 'node:path';

const NON_INTERACTIVE_PREAMBLE = [
  'Os arquivos de referência abaixo (agente/skill + templates + quirks PO-UI) já foram',
  'carregados nesta mensagem — não tente ler novamente os caminhos relativos',
  '`skills/...` ou `agents/...` mencionados no texto, eles não existem no',
  'workspace do usuário. Gere os arquivos finais diretamente no workspace aberto.',
  'Esta é uma execução não interativa, de um único turno: não há como fazer',
  'perguntas ao usuário nem receber respostas, portanto não peça confirmação,',
  'não apresente a lista de arquivos para aprovação e não aguarde autorização',
  'para criar diretórios — escreva os arquivos diretamente. Não crie os',
  'diretórios `skills/`, `agents/` ou `commands/` no workspace do usuário:',
  'esses caminhos se referem aos arquivos internos de referência deste plugin,',
  'não a algo que deva ser criado aqui. Você não tem acesso à ferramenta Bash',
  `nesta execução, então não tente rodar \`node --version\`: o Node.js detectado`,
  `pelo ambiente que está te executando é \`${process.version}\` — use esse valor`,
  'diretamente onde os arquivos de referência pedirem a versão do Node (ex: no',
  'cabeçalho `@node` dos arquivos gerados), sem tentar detectar de outra forma.',
].join(' ');

/** Concatena os arquivos de referência (relativos a `assetsDir`) com marcadores de
 * origem e o preâmbulo padrão de execução não interativa — reaproveitado por todo
 * fluxo que monta um system prompt a partir de arquivos de skill/agente sincronizados. */
export async function assembleSystemPrompt(referenceFiles: string[], assetsDir: string): Promise<string> {
  const sections = await Promise.all(
    referenceFiles.map(async (file) => {
      const filePath = path.join(assetsDir, file);
      const content = await fs.readFile(filePath, 'utf8');
      return `<!-- source: ${file} -->\n${content}`;
    }),
  );

  return [NON_INTERACTIVE_PREAMBLE, ...sections].join('\n\n---\n\n');
}
