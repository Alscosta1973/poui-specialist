import * as assert from 'node:assert';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { buildAppComponentHtml, buildAppComponentTs } from '../../scaffolding';
import { buildLogoPickItems, LogoImage } from '../../generateClientLogo';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const logo = require('../../../../skills/poui-logo/client-logo.cjs');

type Img = { width: number; height: number; data: Buffer };

/** Imagem RGBA com fundo opaco cinza (como um logo colado no Word). */
function canvas(w: number, h: number, fundo = [242, 242, 242, 255]): Img {
  const data = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) data.set(fundo, i * 4);
  return { width: w, height: h, data };
}

function rect(img: Img, x0: number, y0: number, x1: number, y1: number, cor = [0, 120, 60, 255]): void {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) img.data.set(cor, (y * img.width + x) * 4);
}

const alpha = (img: Img, x: number, y: number) => img.data[(y * img.width + x) * 4 + 3];

/** Logo horizontal: símbolo (haste + "asa" larga em cima) e, separado, um bloco de "texto" embaixo da asa. */
function logoComNome(): Img {
  const img = canvas(60, 30);
  rect(img, 2, 2, 30, 4); // asa do símbolo, passa por cima do texto
  rect(img, 6, 2, 9, 27); // haste do símbolo
  rect(img, 16, 12, 55, 20); // nome, separado da asa por 7 px
  return img;
}

describe('client-logo.cjs — imagem', () => {
  it('PNG: encode/decode preserves pixels', () => {
    const img = logoComNome();
    const volta = logo.decodePng(logo.encodePng(img));
    assert.strictEqual(volta.width, 60);
    assert.strictEqual(volta.height, 30);
    assert.ok(volta.data.equals(img.data));
  });

  it('removes an opaque uniform background and leaves already transparent images alone', () => {
    const img = logoComNome();
    assert.strictEqual(logo.removeBackground(img), true);
    assert.strictEqual(alpha(img, 0, 0), 0);
    assert.strictEqual(alpha(img, 7, 10), 255, 'symbol stays opaque');

    const transparente = canvas(10, 10, [0, 0, 0, 0]);
    rect(transparente, 3, 3, 6, 6);
    assert.strictEqual(logo.removeBackground(transparente), false);
  });

  it('derives the symbol from the logo with name, leaving out the text under the symbol "wing"', () => {
    const img = logoComNome();
    logo.removeBackground(img);
    const s = logo.deriveSymbol(logo.trim(img, 0));
    assert.ok(s, 'symbol found');
    assert.ok(s.width <= 31 && s.width >= 28, `width ${s.width} ~ wing`);
    // ponto do "texto" que cai dentro do recorte do símbolo ficou transparente
    let opacosDoTexto = 0;
    for (let y = 0; y < s.height; y++) for (let x = 14; x < s.width; x++) if (y >= 10 && alpha(s, x, y) > 0) opacosDoTexto++;
    assert.strictEqual(opacosDoTexto, 0);
  });

  it('returns null when there is no separable symbol (single wide shape)', () => {
    const img = canvas(40, 10, [0, 0, 0, 0]);
    rect(img, 0, 2, 39, 6);
    assert.strictEqual(logo.deriveSymbol(img), null);
  });

  it('suggests the role from the image size', () => {
    assert.strictEqual(logo.suggestRole(307, 157), 'nome');
    assert.strictEqual(logo.suggestRole(91, 103), 'simbolo');
    assert.strictEqual(logo.suggestRole(1907, 857), 'tela');
  });
});

describe('client-logo.cjs — shell', () => {
  it('points p-logo/p-short-logo/p-logo-alt of the TOTVS shell menu to the client logos', () => {
    const html = logo.patchAppHtml(buildAppComponentHtml(), 'assets/logos/ffm-nome.png', 'assets/logos/ffm.png', 'FFM');
    assert.ok(html.includes('p-logo="assets/logos/ffm-nome.png"'));
    assert.ok(html.includes('p-short-logo="assets/logos/ffm.png"'));
    assert.ok(html.includes('p-logo-alt="FFM"'));
    assert.ok(!html.includes('totvs'));
    assert.ok(html.includes('[p-automatic-toggle]="true"'), 'rest of the menu untouched');
  });

  it('adds missing logo attributes to a menu without them', () => {
    const html = logo.patchAppHtml('<po-menu [p-menus]="menus"></po-menu>', 'a.png', 'b.png', 'X');
    assert.match(html, /<po-menu \[p-menus\]="menus"\s+p-logo="a.png"\s+p-short-logo="b.png"\s+p-logo-alt="X">/);
  });

  it('switches the profile avatar constant and reports when there is none', () => {
    const ts = logo.patchAppTs(buildAppComponentTs(false, 'X'), 'assets/logos/ffm.png');
    assert.ok(ts.includes("export const AVATAR_TOTVS = 'assets/logos/ffm.png';"));
    assert.strictEqual(logo.patchAppTs('export class App {}', 'a.png'), null);
  });

  it('applies to a scaffolded project: writes both logos and wires menu + avatar', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'poui-logo-test-'));
    await fs.mkdir(path.join(root, 'src', 'app'), { recursive: true });
    await fs.writeFile(path.join(root, 'src', 'app', 'app.html'), buildAppComponentHtml());
    await fs.writeFile(path.join(root, 'src', 'app', 'app.ts'), buildAppComponentTs(false, 'X'));
    const nome = path.join(root, 'logo.png');
    await fs.writeFile(nome, logo.encodePng(logoComNome()));

    const r = logo.applyClientLogo(root, { cliente: 'Fundação Teste', nome });

    assert.deepStrictEqual(r.files, ['assets/logos/fundacao-teste-nome.png', 'assets/logos/fundacao-teste.png']);
    assert.ok(r.avatar);
    assert.ok(r.notes.some((n: string) => /fundo removido/.test(n)));
    assert.ok(r.notes.some((n: string) => /símbolo gerado/.test(n)));
    const simbolo = logo.decodePng(await fs.readFile(path.join(root, 'public', 'assets', 'logos', 'fundacao-teste.png')));
    const comNome = logo.decodePng(await fs.readFile(path.join(root, 'public', 'assets', 'logos', 'fundacao-teste-nome.png')));
    assert.ok(simbolo.width < comNome.width, 'symbol is narrower than the full logo');
    const html = await fs.readFile(path.join(root, 'src', 'app', 'app.html'), 'utf8');
    assert.ok(html.includes('p-logo="assets/logos/fundacao-teste-nome.png"'));
    assert.ok(html.includes('p-short-logo="assets/logos/fundacao-teste.png"'));
    const ts = await fs.readFile(path.join(root, 'src', 'app', 'app.ts'), 'utf8');
    assert.ok(ts.includes("= 'assets/logos/fundacao-teste.png';"));
  });
});

describe('buildLogoPickItems', () => {
  it('lists the preferred role first and screenshots last, with size and hint', () => {
    const imgs: LogoImage[] = [
      { file: '/t/tela.png', width: 1900, height: 800, role: 'tela' },
      { file: '/t/simbolo.png', width: 90, height: 100, role: 'simbolo' },
      { file: '/t/nome.png', width: 307, height: 157, role: 'nome' },
    ];
    const itens = buildLogoPickItems(imgs, 'nome');
    assert.deepStrictEqual(itens.map((i) => i.label), ['nome.png', 'simbolo.png', 'tela.png']);
    assert.strictEqual(itens[0].description, '307×157 — parece logo com nome');
  });
});
