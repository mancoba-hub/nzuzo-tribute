// Generates the app icons (a gold candle on a dark background) as PNG files.
// Run with: npm run icons
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

// ---- PNG encoding (no dependencies) ----
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
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePNG(size, pixelFn) {
  const raw = Buffer.alloc(size * (1 + size * 3));
  let off = 0;
  for (let y = 0; y < size; y++) {
    raw[off++] = 0; // no filter
    for (let x = 0; x < size; x++) {
      const [r, g, b] = pixelFn(x, y, size);
      raw[off++] = Math.max(0, Math.min(255, Math.round(r)));
      raw[off++] = Math.max(0, Math.min(255, Math.round(g)));
      raw[off++] = Math.max(0, Math.min(255, Math.round(b)));
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour RGB
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---- drawing ----
function insideRR(u, v, x0, y0, x1, y1, r) {
  if (u < x0 || u > x1 || v < y0 || v > y1) return false;
  const dx = Math.max(x0 + r - u, u - (x1 - r), 0);
  const dy = Math.max(y0 + r - v, v - (y1 - r), 0);
  return dx * dx + dy * dy <= r * r;
}

function pixel(x, y, size) {
  const u = (x + 0.5) / size;
  const v = (y + 0.5) / size;

  // dark background with a soft vertical gradient
  let r = 13 + 14 * v;
  let g = 17 + 16 * v;
  let b = 23 + 18 * v;

  // soft gold glow behind the flame
  const glowD = Math.hypot(u - 0.5, (v - 0.4) * 1.1);
  const glow = Math.max(0, 1 - glowD / 0.34);
  r += 62 * glow * 0.55;
  g += 46 * glow * 0.55;
  b += 18 * glow * 0.55;

  // candle body
  if (insideRR(u, v, 0.415, 0.54, 0.585, 0.88, 0.03)) {
    const shade = 1 - Math.abs(u - 0.5) * 0.9 - Math.max(0, v - 0.72) * 0.15;
    return [245 * shade, 238 * shade, 222 * shade];
  }

  // wick
  if (insideRR(u, v, 0.494, 0.485, 0.506, 0.545, 0.004)) return [46, 42, 36];

  // flame (teardrop with a pointed tip)
  const ft = (0.545 - v) / (0.545 - 0.14); // 1 at the tip, 0 at the base
  if (ft > 0 && ft <= 1) {
    const tip = Math.min(1, (v - 0.14) / 0.09);
    const halfWidth = 0.095 * Math.pow(ft, 0.7) * (0.3 + 0.7 * ft) * tip;
    const d = Math.abs(u - 0.5);
    if (d <= halfWidth) {
      const k = d / halfWidth; // 0 = centre, 1 = edge
      const coreR = 250, coreG = 214, coreB = 140;
      const edgeR = 232, edgeG = 148, edgeB = 58;
      const t = Math.min(1, k / 0.85);
      return [
        coreR + (edgeR - coreR) * t,
        coreG + (edgeG - coreG) * t,
        coreB + (edgeB - coreB) * t,
      ];
    }
  }

  // soft shadow under the candle
  const shD = Math.hypot((u - 0.5) / 0.13, (v - 0.905) / 0.04);
  if (shD < 1) {
    const fade = 1 - 0.55 * (1 - shD);
    r *= fade; g *= fade; b *= fade;
  }

  return [r, g, b];
}

// ---- generate ----
const outDir = path.join(__dirname, "..", "public", "icons");
fs.mkdirSync(outDir, { recursive: true });

for (const size of [192, 512]) {
  const file = path.join(outDir, `icon-${size}.png`);
  fs.writeFileSync(file, encodePNG(size, pixel));
  console.log(`Wrote ${file}`);
}
