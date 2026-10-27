import * as zlib from 'node:zlib';

/** Diagnóstico de um app PO-UI publicado no Protheus via `FwCallApp`: confere
 * o `Resource/<projeto>.app` e o que o AppServer extraiu em
 * `<RootPath>/http-root/app-root`. Lógica pura (sem vscode) — ver generateDoctor.ts. */

export interface DoctorFinding {
  level: 'ok' | 'info' | 'warn' | 'error';
  message: string;
  hint?: string;
}

export interface AppRootEntry {
  name: string;
  isDir: boolean;
}

const EOCD = 0x06054b50;
const CENTRAL = 0x02014b50;
const LOCAL = 0x04034b50;

function findEndOfCentralDirectory(zip: Buffer): number {
  // registro final tem 22 bytes + comentario de ate 64 KB
  const inicio = Math.max(0, zip.length - 22 - 0xffff);
  for (let i = zip.length - 22; i >= inicio; i--) {
    if (zip.readUInt32LE(i) === EOCD) {
      return i;
    }
  }
  throw new Error('arquivo não é um zip válido (diretório central não encontrado)');
}

interface CentralEntry {
  name: string;
  method: number;
  compressedSize: number;
  localOffset: number;
}

function readCentralDirectory(zip: Buffer): CentralEntry[] {
  if (zip.length < 22) {
    throw new Error('arquivo não é um zip válido (pequeno demais)');
  }
  const fim = findEndOfCentralDirectory(zip);
  const total = zip.readUInt16LE(fim + 10);
  let pos = zip.readUInt32LE(fim + 16);
  const entradas: CentralEntry[] = [];
  for (let i = 0; i < total; i++) {
    if (zip.readUInt32LE(pos) !== CENTRAL) {
      throw new Error('arquivo não é um zip válido (diretório central corrompido)');
    }
    const tamNome = zip.readUInt16LE(pos + 28);
    const tamExtra = zip.readUInt16LE(pos + 30);
    const tamComent = zip.readUInt16LE(pos + 32);
    entradas.push({
      name: zip.toString('utf8', pos + 46, pos + 46 + tamNome).replace(/\\/g, '/'),
      method: zip.readUInt16LE(pos + 10),
      compressedSize: zip.readUInt32LE(pos + 20),
      localOffset: zip.readUInt32LE(pos + 42),
    });
    pos += 46 + tamNome + tamExtra + tamComent;
  }
  return entradas;
}

/** Nomes das entradas do zip, na ordem do diretório central. */
export function listZipEntries(zip: Buffer): string[] {
  return readCentralDirectory(zip).map((e) => e.name);
}

/** Conteúdo (texto) de uma entrada do zip, ou `undefined` se não existir. */
export function readZipEntry(zip: Buffer, name: string): string | undefined {
  const entrada = readCentralDirectory(zip).find((e) => e.name === name);
  if (!entrada) {
    return undefined;
  }
  const pos = entrada.localOffset;
  if (zip.readUInt32LE(pos) !== LOCAL) {
    throw new Error(`zip corrompido em ${name}`);
  }
  const inicio = pos + 30 + zip.readUInt16LE(pos + 26) + zip.readUInt16LE(pos + 28);
  const dados = zip.subarray(inicio, inicio + entrada.compressedSize);
  return (entrada.method === 8 ? zlib.inflateRawSync(dados) : dados).toString('utf8');
}

const HINT_PACKAGE = 'Gere o pacote de novo com "PO-UI: Empacotar Projeto (.app)" (ou /poui-specialist:package) e recompile o .app no RPO.';

/** Estrutura do `.app`: o `UNZIPAPP` do `FwCallApp` espera a pasta `<projeto>/` na raiz do zip. */
export function analyzeAppPackage(entries: string[], projectName: string): DoctorFinding[] {
  const raiz = `${projectName}/`;
  if (entries.length === 0) {
    return [{ level: 'error', message: 'O .app está vazio.', hint: HINT_PACKAGE }];
  }
  const achados: DoctorFinding[] = [];
  const primeiros = [...new Set(entries.map((e) => e.split('/')[0]))];

  if (entries.some((e) => e.startsWith('dist/'))) {
    achados.push({
      level: 'error',
      message: 'O zip tem o prefixo dist/ — a raiz precisa ser a pasta do projeto, não dist/.',
      hint: HINT_PACKAGE,
    });
  } else if (entries.some((e) => !e.includes('/'))) {
    achados.push({
      level: 'error',
      message: `Arquivos soltos na raiz do zip (sem a pasta ${raiz}).`,
      hint:
        'O FwCallApp extrai tudo direto em http-root/app-root/ e a rotina fica presa em "Verificando atualizações...". ' +
        HINT_PACKAGE,
    });
  } else if (!primeiros.includes(projectName)) {
    achados.push({
      level: 'error',
      message: `A pasta raiz do zip é ${primeiros.map((p) => p + '/').join(', ')}, mas o FwCallApp procura ${raiz}.`,
      hint: HINT_PACKAGE,
    });
  }

  if (achados.length === 0 && !entries.includes(`${raiz}index.html`)) {
    achados.push({
      level: 'error',
      message: `${raiz}index.html não está no pacote.`,
      hint:
        'Build com a saída em dist/<projeto>/browser/: ajuste architect.build.options.outputPath para ' +
        '{ "base": "dist/<projeto>", "browser": "" } (o package corrige isso) e empacote de novo.',
    });
  }

  if (achados.length === 0) {
    achados.push({ level: 'ok', message: `Pacote com ${raiz} na raiz e ${raiz}index.html (${entries.length} entradas).` });
  }
  return achados;
}

/** Bundle principal (`main-<hash>.js`) do pacote — identifica a versão do build. */
function mainBundle(names: string[]): string | undefined {
  return names.find((n) => /^main(-[A-Za-z0-9]+)?\.js$/.test(n));
}

/**
 * O que o AppServer extraiu em `<RootPath>/http-root/app-root`.
 * @param appRoot itens de primeiro nível de app-root/
 * @param packageEntries entradas do .app atual
 * @param envFiles itens de primeiro nível de cada pasta `<projeto>_env_*` (nome da pasta → arquivos)
 */
export function analyzeAppRoot(
  appRoot: AppRootEntry[],
  packageEntries: string[],
  projectName: string,
  envFiles: Record<string, string[]>,
): DoctorFinding[] {
  const achados: DoctorFinding[] = [];
  const raiz = `${projectName}/`;

  // itens que um pacote "achatado" deixaria soltos na raiz de app-root/
  const doPacote = new Set(
    packageEntries
      .map((e) => (e.startsWith(raiz) ? e.slice(raiz.length) : e))
      .map((e) => e.split('/')[0])
      .filter((n) => n.length > 0),
  );
  doPacote.add(`${projectName}.app`);
  const soltos = appRoot.filter((i) => !i.name.includes('_env_') && doPacote.has(i.name)).map((i) => i.name);
  if (soltos.length > 0) {
    achados.push({
      level: 'warn',
      message: `Itens do app soltos em app-root/ (sobra de um pacote sem a pasta ${raiz}): ${soltos.join(', ')}.`,
      hint: 'Mova esses itens para fora de app-root/ (backup) — não apague as pastas *_env_* de outros apps.',
    });
  }

  const pastas = appRoot.filter((i) => i.isDir && i.name.startsWith(`${projectName}_env_`)).map((i) => i.name);
  if (pastas.length === 0) {
    achados.push({
      level: 'info',
      message: `O app ainda não foi extraído neste RootPath (nenhuma pasta ${projectName}_env_*).`,
      hint: 'Abra a rotina pelo menu do Protheus uma vez; se travar em "Verificando atualizações...", confira o pacote acima.',
    });
    return achados;
  }

  const bundlePacote = mainBundle(packageEntries.map((e) => (e.startsWith(raiz) ? e.slice(raiz.length) : e)));
  for (const pasta of pastas) {
    const arquivos = envFiles[pasta] ?? [];
    const bundleExtraido = mainBundle(arquivos);
    if (bundlePacote && bundleExtraido && bundlePacote !== bundleExtraido) {
      achados.push({
        level: 'warn',
        message: `${pasta}: versão extraída diferente do .app atual (${bundleExtraido} × ${bundlePacote}).`,
        hint: 'Recompile o .app no RPO e reabra a rotina (o FwCallApp só reextrai quando o recurso do RPO muda).',
      });
    } else {
      achados.push({ level: 'ok', message: `${pasta}: extraído${bundleExtraido ? ` (${bundleExtraido})` : ''}.` });
    }
  }
  return achados;
}

const ICONE: Record<DoctorFinding['level'], string> = { ok: '✓', info: 'ℹ', warn: '⚠', error: '✗' };

export function formatDoctorReport(findings: DoctorFinding[]): string {
  const linhas = findings.flatMap((f) => [`${ICONE[f.level]} ${f.message}`, ...(f.hint ? [`   → ${f.hint}`] : [])]);
  const problemas = findings.filter((f) => f.level === 'error' || f.level === 'warn').length;
  linhas.push('');
  linhas.push(problemas === 0 ? 'Nenhum problema encontrado.' : `${problemas} problema(s) encontrado(s).`);
  return linhas.join('\n');
}
