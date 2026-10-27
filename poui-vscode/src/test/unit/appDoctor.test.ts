import * as assert from 'node:assert';
import * as zlib from 'node:zlib';
import {
  listZipEntries,
  readZipEntry,
  analyzeAppPackage,
  analyzeAppRoot,
  formatDoctorReport,
  DoctorFinding,
} from '../../appDoctor';

/** Zip mínimo (deflate) — só para os testes; mesmo layout que 7-Zip/Compress-Archive geram. */
function buildZip(files: { name: string; data?: string }[]): Buffer {
  const locais: Buffer[] = [];
  const centrais: Buffer[] = [];
  let offset = 0;
  for (const f of files) {
    const nome = Buffer.from(f.name, 'utf8');
    const bruto = Buffer.from(f.data ?? '', 'utf8');
    const dir = f.name.endsWith('/');
    const dados = dir ? Buffer.alloc(0) : zlib.deflateRawSync(bruto);
    const metodo = dir ? 0 : 8;
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(metodo, 8);
    local.writeUInt32LE(dados.length, 18);
    local.writeUInt32LE(bruto.length, 22);
    local.writeUInt16LE(nome.length, 26);
    locais.push(local, nome, dados);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(metodo, 10);
    central.writeUInt32LE(dados.length, 20);
    central.writeUInt32LE(bruto.length, 24);
    central.writeUInt16LE(nome.length, 28);
    central.writeUInt32LE(offset, 42);
    centrais.push(central, nome);
    offset += 30 + nome.length + dados.length;
  }
  const cd = Buffer.concat(centrais);
  const fim = Buffer.alloc(22);
  fim.writeUInt32LE(0x06054b50, 0);
  fim.writeUInt16LE(files.length, 8);
  fim.writeUInt16LE(files.length, 10);
  fim.writeUInt32LE(cd.length, 12);
  fim.writeUInt32LE(offset, 16);
  return Buffer.concat([...locais, cd, fim]);
}

const INDEX = '<html><base href="/"><script src="main-ABC.js"></script></html>';
const okZip = () =>
  buildZip([
    { name: 'rca-poui/' },
    { name: 'rca-poui/index.html', data: INDEX },
    { name: 'rca-poui/main-ABC.js', data: 'x' },
    { name: 'rca-poui/assets/' },
    { name: 'rca-poui/assets/data/appConfig.json', data: '{}' },
  ]);
const nivel = (fs: DoctorFinding[], l: DoctorFinding['level']) => fs.filter((f) => f.level === l);

describe('listZipEntries / readZipEntry', () => {
  it('lists every entry of the central directory', () => {
    assert.deepStrictEqual(listZipEntries(okZip()), [
      'rca-poui/',
      'rca-poui/index.html',
      'rca-poui/main-ABC.js',
      'rca-poui/assets/',
      'rca-poui/assets/data/appConfig.json',
    ]);
  });

  it('reads (inflates) one entry', () => {
    assert.strictEqual(readZipEntry(okZip(), 'rca-poui/index.html'), INDEX);
    assert.strictEqual(readZipEntry(okZip(), 'nao/existe.html'), undefined);
  });

  it('throws a clear error for something that is not a zip', () => {
    assert.throws(() => listZipEntries(Buffer.from('nao e zip')), /zip/i);
  });
});

describe('analyzeAppPackage', () => {
  it('accepts a package with <project>/ as the zip root and index.html inside it', () => {
    const fs = analyzeAppPackage(listZipEntries(okZip()), 'rca-poui');
    assert.strictEqual(nivel(fs, 'error').length, 0);
    assert.ok(nivel(fs, 'ok').some((f) => f.message.includes('rca-poui/')));
  });

  it('flags a flat package (files at the zip root) and explains the FwCallApp hang', () => {
    const flat = buildZip([{ name: 'index.html', data: INDEX }, { name: 'main-ABC.js', data: 'x' }]);
    const erros = nivel(analyzeAppPackage(listZipEntries(flat), 'rca-poui'), 'error');
    assert.strictEqual(erros.length, 1);
    assert.match(erros[0].message, /raiz do zip/);
    assert.match(erros[0].hint ?? '', /Verificando atualiza/);
    assert.match(erros[0].hint ?? '', /package/);
  });

  it('flags a dist/<project>/ prefix', () => {
    const z = buildZip([{ name: 'dist/rca-poui/index.html', data: INDEX }]);
    const erros = nivel(analyzeAppPackage(listZipEntries(z), 'rca-poui'), 'error');
    assert.ok(erros.some((e) => /dist\//.test(e.message)));
  });

  it('flags a root folder with a different name than the project', () => {
    const z = buildZip([{ name: 'outro/' }, { name: 'outro/index.html', data: INDEX }]);
    const erros = nivel(analyzeAppPackage(listZipEntries(z), 'rca-poui'), 'error');
    assert.ok(erros.some((e) => /outro\//.test(e.message)));
  });

  it('flags a missing index.html (browser/ subfolder build)', () => {
    const z = buildZip([{ name: 'rca-poui/' }, { name: 'rca-poui/browser/index.html', data: INDEX }]);
    const erros = nivel(analyzeAppPackage(listZipEntries(z), 'rca-poui'), 'error');
    assert.ok(erros.some((e) => /index\.html/.test(e.message)));
    assert.ok(erros.some((e) => /outputPath/.test(e.hint ?? '')));
  });

  it('flags an empty package', () => {
    const erros = nivel(analyzeAppPackage([], 'rca-poui'), 'error');
    assert.strictEqual(erros.length, 1);
  });
});

describe('analyzeAppRoot', () => {
  const entries = listZipEntries(okZip());

  it('warns about loose files left by a flat package extracted at app-root/', () => {
    const listing = [
      { name: 'index.html', isDir: false },
      { name: 'main-ABC.js', isDir: false },
      { name: 'rca-poui.app', isDir: false },
      { name: 'assets', isDir: true },
      { name: 'protheuslib-tface_env_x', isDir: true },
      { name: 'rca-poui_env_protheus_local', isDir: true },
    ];
    const avisos = nivel(analyzeAppRoot(listing, entries, 'rca-poui', {}), 'warn');
    const sobra = avisos.find((a) => /soltos/.test(a.message));
    assert.ok(sobra, JSON.stringify(avisos));
    for (const n of ['index.html', 'main-ABC.js', 'rca-poui.app', 'assets']) {
      assert.ok(sobra!.message.includes(n), n);
    }
    assert.ok(!sobra!.message.includes('protheuslib-tface_env_x'));
  });

  // o FwCallApp reescreve o index.html na extracao (base href + scripts do preindex):
  // a versao e conferida pelo bundle main-<hash>.js, nao pelo index.html
  it('reports the extracted folder and says it matches the current package', () => {
    const env = { 'rca-poui_env_protheus_local': ['index.html', 'main-ABC.js', 'assets'] };
    const fs = analyzeAppRoot([{ name: 'rca-poui_env_protheus_local', isDir: true }], entries, 'rca-poui', env);
    assert.strictEqual(nivel(fs, 'warn').length, 0);
    assert.ok(nivel(fs, 'ok').some((f) => f.message.includes('rca-poui_env_protheus_local')));
  });

  it('warns when the extracted bundle differs from the package (stale RPO / not reopened)', () => {
    const env = { 'rca-poui_env_protheus_local': ['index.html', 'main-OLD.js'] };
    const fs = analyzeAppRoot([{ name: 'rca-poui_env_protheus_local', isDir: true }], entries, 'rca-poui', env);
    const aviso = nivel(fs, 'warn').find((f) => /diferente/.test(f.message));
    assert.ok(aviso);
    assert.match(aviso!.hint ?? '', /RPO/);
  });

  it('informs when the app was never extracted in this RootPath', () => {
    const fs = analyzeAppRoot([{ name: 'preindex_env_x', isDir: true }], entries, 'rca-poui', {});
    assert.ok(nivel(fs, 'info').some((f) => /ainda n[aã]o foi extra/.test(f.message)));
  });
});

describe('formatDoctorReport', () => {
  it('prints one line per finding with its icon and hint, and a final verdict', () => {
    const texto = formatDoctorReport([
      { level: 'ok', message: 'pacote ok' },
      { level: 'error', message: 'quebrado', hint: 'rode o package' },
    ]);
    assert.match(texto, /✓ pacote ok/);
    assert.match(texto, /✗ quebrado/);
    assert.match(texto, /→ rode o package/);
    assert.match(texto, /1 problema/);
  });

  it('says everything is fine when there are no errors or warnings', () => {
    assert.match(formatDoctorReport([{ level: 'ok', message: 'pacote ok' }]), /Nenhum problema/);
  });
});
