/**
 * Generador de iconos PWA (sin dependencias): dibuja la marca "Cabezudo"
 * (cabeza sonriente sobre rojo del tema) con anti-aliasing por supermuestreo
 * 4x y la codifica como PNG truecolor (colorType 2) con zlib de Node.
 *
 * Uso:     node scripts/generate-icons.mjs
 * Salida:  public/icons/icon-192.png  (192x192)
 *          public/icons/icon-512.png  (512x512)
 *
 * Diseño maskable-safe: fondo rojo a sangre completa (#D1121F) y todo el
 * motivo dentro del círculo central del 80% (zona segura de Android).
 * Idempotente y determinista: regenerar tras cambiar la marca.
 */

import { deflateSync } from 'node:zlib';
import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');

// Paleta del tema (coincide con theme_color del manifiesto)
const BG = [209, 18, 31];    // #D1121F rojo Gigantes y Cabezudos
const HEAD = [255, 247, 236]; // #FFF7EC blanco cálido
const DARK = [38, 21, 15];   // #26150F ojos/boca

// --- CRC32 (IEEE 802.3) -----------------------------------------------------
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
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

/** Codifica un buffer RGB (3 bytes/px) como PNG 8-bit truecolor. */
function encodePngRgb(width, height, rgb) {
  const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // color type: truecolor RGB
  const stride = width * 3;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filtro None por scanline
    rgb.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  return Buffer.concat([
    SIGNATURE,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// --- Rasterizador (supermuestreo 4x + promedio) ------------------------------
const SS = 4;

function drawIcon(size) {
  const W = size * SS;
  const H = size * SS;
  const img = Buffer.alloc(W * H * 3);

  // Geometría relativa a H; todo el motivo dentro del círculo seguro (r=0.4).
  const cx = W / 2;
  const headCy = 0.47 * H;
  const headR = 0.295 * H;
  const eyeDx = 0.105 * H;
  const eyeCy = 0.425 * H;
  const eyeR = 0.048 * H;
  const cheekDx = 0.18 * H;
  const cheekR = 0.07 * H;
  const smileCy = 0.375 * H;
  const smileOuter = 0.185 * H;
  const smileInner = 0.115 * H;

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let r = BG[0], g = BG[1], b = BG[2]; // fondo rojo a sangre completa
      const px = x + 0.5;
      const py = y + 0.5;
      const dxh = px - cx;
      const dyh = py - headCy;
      if (dxh * dxh + dyh * dyh <= headR * headR) {
        r = HEAD[0]; g = HEAD[1]; b = HEAD[2];
        const inCircle = (fx, fy, fr) => {
          const dx = px - fx, dy = py - fy;
          return dx * dx + dy * dy <= fr * fr;
        };
        // Mofletes
        if (inCircle(cx + cheekDx, 0.515 * H, cheekR) || inCircle(cx - cheekDx, 0.515 * H, cheekR)) {
          r = BG[0]; g = BG[1]; b = BG[2];
        }
        // Ojos
        if (inCircle(cx + eyeDx, eyeCy, eyeR) || inCircle(cx - eyeDx, eyeCy, eyeR)) {
          r = DARK[0]; g = DARK[1]; b = DARK[2];
        }
        // Sonrisa: sector de corona 25°..155° (hacia abajo)
        const dxs = px - cx, dys = py - smileCy;
        const rs = Math.sqrt(dxs * dxs + dys * dys);
        if (rs <= smileOuter && rs >= smileInner && dys > 0) {
          const deg = (Math.atan2(dys, dxs) * 180) / Math.PI;
          if (deg >= 25 && deg <= 155) { r = DARK[0]; g = DARK[1]; b = DARK[2]; }
        }
      }
      const o = (y * W + x) * 3;
      img[o] = r; img[o + 1] = g; img[o + 2] = b;
    }
  }

  // Decimación SxS (box filter)
  const out = Buffer.alloc(size * size * 3);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const o = ((y * SS + sy) * W + (x * SS + sx)) * 3;
          r += img[o]; g += img[o + 1]; b += img[o + 2];
        }
      }
      const n = SS * SS, o2 = (y * size + x) * 3;
      out[o2] = Math.round(r / n);
      out[o2 + 1] = Math.round(g / n);
      out[o2 + 2] = Math.round(b / n);
    }
  }
  return out;
}

mkdirSync(OUT_DIR, { recursive: true });
for (const size of [192, 512]) {
  const png = encodePngRgb(size, size, drawIcon(size));
  const file = join(OUT_DIR, `icon-${size}.png`);
  writeFileSync(file, png);
  console.log(`OK  ${file}  (${(png.length / 1024).toFixed(1)} KiB)`);
}

// Validación: relee y comprueba la cabecera IHDR
for (const size of [192, 512]) {
  const buf = readFileSync(join(OUT_DIR, `icon-${size}.png`));
  const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
  if (w !== size || h !== size) throw new Error(`IHDR inválido en icon-${size}.png: ${w}x${h}`);
  console.log(`VERIFICADO  icon-${size}.png: ${w}x${h} colorType=${buf[25]} (2=RGB)`);
}
