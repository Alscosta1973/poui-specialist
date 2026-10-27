#!/usr/bin/env node
/**
 * Logo do cliente em app PO-UI (customização) — padrão visual TOTVS (skills/poui-patterns/padrao-totvs.md).
 *
 * Sem logo do cliente o app fica com o logo TOTVS. Com logo:
 *   - menu aberto   → logo com o nome   (p-logo)
 *   - menu recolhido → só o símbolo     (p-short-logo)
 *   - avatar da barra → o mesmo símbolo
 *
 * Uso (CLI, sem dependências — só Node >= 18):
 *   node client-logo.cjs list  <arquivo.docx|imagem.png ...> --out <pasta>
 *        extrai as imagens (do .docx: word/media) para <pasta> e imprime JSON
 *        [{ file, width, height, role: 'nome'|'simbolo'|'tela' }]
 *   node client-logo.cjs apply <projeto> --cliente <Nome> --nome <png> [--simbolo <png>]
 *        remove o fundo, corta as bordas, gera o símbolo a partir do logo com nome (se --simbolo
 *        faltar), grava em public/assets/logos/ e liga app.html / app.ts. Imprime JSON do que mudou.
 *
 * O mesmo módulo é usado pela extensão VS Code (comando "PO-UI: Logo do Cliente").
 * @author Andre Costa
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

// ───────────────────────────── zip (.docx) ─────────────────────────────

/** Entradas de um zip pelo diretório central (stored/deflate). */
function readZip(buf) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('arquivo não é um zip/docx válido');
  const total = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const entries = [];
  for (let n = 0; n < total; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) break;
    const method = buf.readUInt16LE(p + 10);
    const compSize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);
    entries.push({
      name,
      read() {
        const lNameLen = buf.readUInt16LE(local + 26);
        const lExtraLen = buf.readUInt16LE(local + 28);
        const start = local + 30 + lNameLen + lExtraLen;
        const raw = buf.subarray(start, start + compSize);
        return method === 0 ? Buffer.from(raw) : zlib.inflateRawSync(raw);
      },
    });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

// ───────────────────────────── PNG ─────────────────────────────

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

const PNG_SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function isPng(buf) {
  return buf.length > 8 && buf.subarray(0, 8).equals(PNG_SIG);
}

/** Largura/altura de PNG (ou null para outros formatos). */
function pngSize(buf) {
  return isPng(buf) ? { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) } : null;
}

/** Decodifica PNG 8 bits (RGB, RGBA, cinza, cinza+alfa, paleta), sem entrelaçamento → RGBA. */
function decodePng(buf) {
  if (!isPng(buf)) throw new Error('não é PNG');
  let p = 8;
  let ihdr;
  let palette;
  let trns;
  const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p);
    const type = buf.toString('ascii', p + 4, p + 8);
    const data = buf.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') {
      ihdr = {
        width: data.readUInt32BE(0),
        height: data.readUInt32BE(4),
        depth: data[8],
        color: data[9],
        interlace: data[12],
      };
    } else if (type === 'PLTE') palette = data;
    else if (type === 'tRNS') trns = data;
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    p += 12 + len;
  }
  const { width, height, depth, color, interlace } = ihdr;
  if (depth !== 8 || interlace !== 0 || ![0, 2, 3, 4, 6].includes(color)) {
    throw new Error(`PNG não suportado (profundidade ${depth}, cor ${color}, entrelaçado ${interlace})`);
  }
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[color];
  const stride = width * channels;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const pixels = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const out = pixels.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? pixels.subarray((y - 1) * stride, y * stride) : null;
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? out[x - channels] : 0;
      const b = prev ? prev[x] : 0;
      const c = prev && x >= channels ? prev[x - channels] : 0;
      let v = line[x];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const pa = Math.abs(b - c);
        const pb = Math.abs(a - c);
        const pc = Math.abs(a + b - 2 * c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      out[x] = v & 0xff;
    }
  }
  const rgba = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const s = i * channels;
    let r;
    let g;
    let bl;
    let al = 255;
    if (color === 6) [r, g, bl, al] = [pixels[s], pixels[s + 1], pixels[s + 2], pixels[s + 3]];
    else if (color === 2) [r, g, bl] = [pixels[s], pixels[s + 1], pixels[s + 2]];
    else if (color === 0) r = g = bl = pixels[s];
    else if (color === 4) {
      r = g = bl = pixels[s];
      al = pixels[s + 1];
    }    else {
      const idx = pixels[s];
      [r, g, bl] = [palette[idx * 3], palette[idx * 3 + 1], palette[idx * 3 + 2]];
      if (trns && idx < trns.length) al = trns[idx];
    }
    rgba.set([r, g, bl, al], i * 4);
  }
  return { width, height, data: rgba };
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

/** Codifica RGBA 8 bits em PNG. */
function encodePng({ width, height, data }) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) data.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  return Buffer.concat([PNG_SIG, chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

// ───────────────────────────── tratamento da imagem ─────────────────────────────

/**
 * Fundo opaco e uniforme (os 4 cantos com a mesma cor) vira transparente, com borda suave.
 * Imagem que já tem fundo transparente fica como está. Devolve se removeu.
 */
function removeBackground(img, tolerance = 6, soft = 24) {
  const { width: w, height: h, data } = img;
  const px = (x, y) => (y * w + x) * 4;
  const cantos = [px(0, 0), px(w - 1, 0), px(0, h - 1), px(w - 1, h - 1)];
  if (cantos.some((i) => data[i + 3] < 250)) return false;
  const [r0, g0, b0] = [data[cantos[0]], data[cantos[0] + 1], data[cantos[0] + 2]];
  const dist = (i) => Math.max(Math.abs(data[i] - r0), Math.abs(data[i + 1] - g0), Math.abs(data[i + 2] - b0));
  if (cantos.some((i) => dist(i) > 12)) return false;
  for (let i = 0; i < data.length; i += 4) {
    const d = dist(i);
    if (d <= tolerance) data[i + 3] = 0;
    else if (d <= soft) data[i + 3] = Math.round((data[i + 3] * (d - tolerance)) / (soft - tolerance));
  }
  return true;
}

/** Recorta para a área com conteúdo (alfa > 0), com margem. */
function trim(img, pad = 2) {
  const { width: w, height: h, data } = img;
  let [x0, y0, x1, y1] = [w, h, -1, -1];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (data[(y * w + x) * 4 + 3] > 0) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  if (x1 < 0) return img;
  return crop(img, Math.max(0, x0 - pad), Math.max(0, y0 - pad), Math.min(w - 1, x1 + pad), Math.min(h - 1, y1 + pad));
}

function crop(img, x0, y0, x1, y1) {
  const w = x1 - x0 + 1;
  const h = y1 - y0 + 1;
  const data = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) img.data.copy(data, y * w * 4, ((y + y0) * img.width + x0) * 4, ((y + y0) * img.width + x1 + 1) * 4);
  return { width: w, height: h, data };
}

/**
 * Símbolo a partir do logo com nome (logo horizontal: símbolo à esquerda, nome à direita): a forma
 * conectada que começa no pixel mais à esquerda — partes a até `join` px de distância contam como a
 * mesma forma (detalhes do símbolo), o texto separado fica de fora mesmo que fique embaixo de uma
 * "asa" do símbolo. Se essa forma ocupar quase o logo todo, não há símbolo separável → null.
 */
function deriveSymbol(img, join = 2) {
  const { width: w, height: h, data } = img;
  const on = (x, y) => data[(y * w + x) * 4 + 3] > 16;
  // ponto de partida: primeiro pixel com conteúdo da coluna mais à esquerda
  let start = -1;
  for (let x = 0; x < w && start < 0; x++)
    for (let y = 0; y < h; y++)
      if (on(x, y)) {
        start = y * w + x;
        break;
      }
  if (start < 0) return null;
  const seen = new Uint8Array(w * h);
  const fila = [start];
  seen[start] = 1;
  let [x0, y0, x1, y1] = [w, h, -1, -1];
  while (fila.length) {
    const k = fila.pop();
    const cx = k % w;
    const cy = (k - cx) / w;
    if (cx < x0) x0 = cx;
    if (cx > x1) x1 = cx;
    if (cy < y0) y0 = cy;
    if (cy > y1) y1 = cy;
    for (let dy = -join - 1; dy <= join + 1; dy++)
      for (let dx = -join - 1; dx <= join + 1; dx++) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const n = ny * w + nx;
        if (!seen[n] && on(nx, ny)) {
          seen[n] = 1;
          fila.push(n);
        }
      }
  }
  if (x1 - x0 + 1 > w * 0.85) return null;
  const out = crop(img, x0, y0, x1, y1);
  // só os pixels da forma do símbolo (o texto que cai dentro do recorte fica transparente)
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++)
      if (!seen[y * w + x]) {
        const o = ((y - y0) * out.width + (x - x0)) * 4;
        // mantém a borda suave (alfa baixo) colada na forma
        out.data[o + 3] = data[(y * w + x) * 4 + 3] <= 16 && vizinho(seen, w, h, x, y) ? out.data[o + 3] : 0;
      }
  return trim(out);
}

function vizinho(seen, w, h, x, y) {
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < w && ny < h && seen[ny * w + nx]) return true;
    }
  return false;
}

/** Papel provável de uma imagem: logo com nome (largo), símbolo (quase quadrado) ou tela (print grande). */
function suggestRole(width, height) {
  if (width > 900 || height > 600) return 'tela';
  return width / height >= 1.6 ? 'nome' : 'simbolo';
}

/** Remove fundo + recorta; PNG não suportado volta como está. */
function prepareLogo(buf) {
  if (!isPng(buf)) return { buffer: buf, img: null, background: false, note: 'não é PNG — usado sem tratamento' };
  let img;
  try {
    img = decodePng(buf);
  } catch (e) {
    return { buffer: buf, img: null, background: false, note: e.message };
  }
  const background = removeBackground(img);
  img = trim(img);
  return { buffer: encodePng(img), img, background, note: '' };
}

// ───────────────────────────── aplicar no projeto ─────────────────────────────

function slug(s) {
  return (
    String(s)
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'cliente'
  );
}

/** Liga os logos no app.html (p-logo, p-short-logo, p-logo-alt). */
function patchAppHtml(html, logoNome, logoSimbolo, cliente) {
  const menu = /<po-menu\b[^>]*>/i.exec(html);
  if (!menu) throw new Error('app.html sem <po-menu>');
  let tag = menu[0];
  const set = (t, attr, value) => {
    const re = new RegExp(`(\\s)${attr}="[^"]*"`);
    if (re.test(t)) return t.replace(re, `$1${attr}="${value}"`);
    const indent = (/\n(\s+)\S/.exec(t) || [, ' '])[1];
    return t.replace(/\s*(\/?>)$/, `\n${indent}${attr}="${value}"$1`);
  };
  tag = set(tag, 'p-logo', logoNome);
  tag = set(tag, 'p-short-logo', logoSimbolo);
  tag = set(tag, 'p-logo-alt', cliente);
  return html.slice(0, menu.index) + tag + html.slice(menu.index + menu[0].length);
}

/** Avatar do perfil no app.ts: troca o caminho da constante AVATAR_* (shell do padrão TOTVS). */
function patchAppTs(ts, logoSimbolo) {
  const re = /(export const AVATAR_\w+\s*=\s*')[^']*(')/;
  return re.test(ts) ? ts.replace(re, `$1${logoSimbolo}$2`) : null;
}

/** Arquivo do shell (Angular 21: app.html/app.ts; legado: app.component.*). */
function shellFiles(projectRoot) {
  for (const base of ['app', 'app.component']) {
    const html = path.join(projectRoot, 'src', 'app', `${base}.html`);
    if (fs.existsSync(html)) return { html, ts: path.join(projectRoot, 'src', 'app', `${base}.ts`) };
  }
  throw new Error('shell não encontrado (src/app/app.html)');
}

/**
 * Aplica o logo do cliente: grava public/assets/logos/<slug>-nome.png e <slug>.png e liga o shell.
 * @returns {{files: string[], html: boolean, avatar: boolean, notes: string[]}}
 */
function applyClientLogo(projectRoot, { cliente, nome, simbolo }) {
  const notes = [];
  const id = slug(cliente);
  const dir = path.join(projectRoot, 'public', 'assets', 'logos');
  fs.mkdirSync(dir, { recursive: true });

  const pNome = prepareLogo(fs.readFileSync(nome));
  if (pNome.note) notes.push(`logo com nome: ${pNome.note}`);
  if (pNome.background) notes.push('logo com nome: fundo removido');
  const extNome = isPng(pNome.buffer) ? '.png' : path.extname(nome);
  const arqNome = `${id}-nome${extNome}`;
  fs.writeFileSync(path.join(dir, arqNome), pNome.buffer);

  let bufSimbolo;
  let extSimbolo = '.png';
  if (simbolo) {
    const pS = prepareLogo(fs.readFileSync(simbolo));
    if (pS.note) notes.push(`símbolo: ${pS.note}`);
    if (pS.background) notes.push('símbolo: fundo removido');
    bufSimbolo = pS.buffer;
    if (!isPng(bufSimbolo)) extSimbolo = path.extname(simbolo);
  } else {
    const derivado = pNome.img && deriveSymbol(pNome.img);
    if (derivado) notes.push('símbolo gerado a partir do logo com nome (parte à esquerda)');
    else notes.push('sem símbolo separado: o menu recolhido usa o logo inteiro');
    bufSimbolo = derivado ? encodePng(derivado) : pNome.buffer;
    if (!isPng(bufSimbolo)) extSimbolo = extNome;
  }
  const arqSimbolo = `${id}${extSimbolo}`;
  fs.writeFileSync(path.join(dir, arqSimbolo), bufSimbolo);

  const logoNome = `assets/logos/${arqNome}`;
  const logoSimbolo = `assets/logos/${arqSimbolo}`;
  const shell = shellFiles(projectRoot);
  fs.writeFileSync(shell.html, patchAppHtml(fs.readFileSync(shell.html, 'utf8'), logoNome, logoSimbolo, cliente));
  let avatar = false;
  if (fs.existsSync(shell.ts)) {
    const novo = patchAppTs(fs.readFileSync(shell.ts, 'utf8'), logoSimbolo);
    if (novo !== null) {
      fs.writeFileSync(shell.ts, novo);
      avatar = true;
    } else notes.push('app.ts sem constante AVATAR_*: configure o avatar do p-profile manualmente');
  }
  return { files: [logoNome, logoSimbolo], html: true, avatar, notes };
}

/** Extrai imagens de .docx (word/media) e/ou copia imagens soltas para outDir. */
function listImages(inputs, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const out = [];
  const add = (nome, buf) => {
    const file = path.join(outDir, nome);
    fs.writeFileSync(file, buf);
    const size = pngSize(buf);
    out.push({ file, width: size?.width ?? null, height: size?.height ?? null, role: size ? suggestRole(size.width, size.height) : 'nome' });
  };
  for (const input of inputs) {
    const buf = fs.readFileSync(input);
    if (/\.docx$/i.test(input)) {
      for (const e of readZip(buf).filter((x) => /^word\/media\/[^/]+\.(png|jpe?g|gif|svg)$/i.test(x.name))) {
        add(`${path.basename(input, '.docx')}-${path.basename(e.name)}`, e.read());
      }
    } else add(path.basename(input), buf);
  }
  return out;
}

module.exports = {
  readZip,
  decodePng,
  encodePng,
  removeBackground,
  trim,
  deriveSymbol,
  suggestRole,
  prepareLogo,
  patchAppHtml,
  patchAppTs,
  applyClientLogo,
  listImages,
  slug,
};

// ───────────────────────────── CLI ─────────────────────────────

if (require.main === module) {
  const [cmd, ...args] = process.argv.slice(2);
  const opt = (k) => {
    const i = args.indexOf(`--${k}`);
    return i >= 0 ? args[i + 1] : undefined;
  };
  try {
    if (cmd === 'list') {
      const inputs = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--out');
      console.log(JSON.stringify(listImages(inputs, opt('out') || path.join(process.cwd(), 'logo-imagens')), null, 2));
    } else if (cmd === 'apply') {
      const [projectRoot] = args;
      if (!projectRoot || !opt('cliente') || !opt('nome')) throw new Error('uso: apply <projeto> --cliente <Nome> --nome <png> [--simbolo <png>]');
      console.log(JSON.stringify(applyClientLogo(projectRoot, { cliente: opt('cliente'), nome: opt('nome'), simbolo: opt('simbolo') }), null, 2));
    } else {
      console.error('uso: client-logo.cjs list <docx|imagem...> --out <pasta> | apply <projeto> --cliente <Nome> --nome <png> [--simbolo <png>]');
      process.exit(2);
    }
  } catch (e) {
    console.error(`client-logo: ${e.message}`);
    process.exit(1);
  }
}
